import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { redisClient } from '../config/redis.js';
import { generateKey } from '../utils/keygen.js';

export interface KeygenMessage {
    type: 'new-key' | 'error' | 'auth-success' | 'auth-failed' | 'pong';
    data?: any;
    message?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
    user?: any;
    isAuthenticated?: boolean;
}

class KeygenWebSocketServer {
    public wss: WebSocketServer;
    private clients: Set<AuthenticatedWebSocket> = new Set();
    private keyInterval: NodeJS.Timeout | null = null;
    private lastKey: string = '';

    constructor(server?: Server) {
        this.wss = new WebSocketServer({
            noServer: true
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        this.startKeyGeneration();
        console.log(
            'KeygenWebSocketServer initialized and listening on /ws/keygen'
        );
    }

    private async authenticateToken(
        token: string
    ): Promise<{ success: boolean; user?: any; error?: string }> {
        try {
            if (!token) {
                return {
                    success: false,
                    error: 'Token이 제공되지 않았습니다.'
                };
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET as string
            ) as jwt.JwtPayload;

            const cachedUser = await redisClient.get(`user:${decoded.userid}`);
            if (cachedUser) {
                const user = JSON.parse(cachedUser);
                if (user.authority !== 'admin' && user.authority !== 'bot') {
                    return {
                        success: false,
                        error: '관리자 권한이 필요합니다.'
                    };
                }
                return { success: true, user };
            }

            const user = await User.findOne({ userid: decoded.userid });

            if (!user) {
                return { success: false, error: '사용자를 찾을 수 없습니다.' };
            }

            if (user.authority !== 'admin' && user.authority !== 'bot') {
                return { success: false, error: '관리자 권한이 필요합니다.' };
            }

            return { success: true, user };
        } catch (error) {
            console.error('토큰 인증 오류:', error);
            if (error instanceof jwt.JsonWebTokenError) {
                return { success: false, error: '유효하지 않은 토큰입니다.' };
            }
            return {
                success: false,
                error: '인증 처리 중 오류가 발생했습니다.'
            };
        }
    }

    private async handleConnection(
        ws: AuthenticatedWebSocket,
        request: IncomingMessage
    ) {
        console.log(
            `KeygenWebSocket: Connection attempt for path ${
                request.url
            }, headers: ${JSON.stringify(request.headers)}`
        );
        try {
            console.log('새로운 Keygen WebSocket 연결 시도');

            ws.isAuthenticated = false;

            const authTimeout = setTimeout(() => {
                if (!ws.isAuthenticated) {
                    console.log('Keygen WebSocket 인증 타임아웃');
                    this.sendToClient(ws, {
                        type: 'auth-failed',
                        message: '인증 타임아웃입니다.'
                    });
                    ws.close(1008, 'Authentication timeout');
                }
            }, 10000);

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.type === 'ping') {
                        this.sendToClient(ws, { type: 'pong' });
                        return;
                    }

                    if (message.type === 'auth' && !ws.isAuthenticated) {
                        const authResult = await this.authenticateToken(
                            message.token
                        );

                        if (authResult.success) {
                            clearTimeout(authTimeout);
                            ws.user = authResult.user;
                            ws.isAuthenticated = true;
                            this.clients.add(ws);

                            this.sendToClient(ws, {
                                type: 'auth-success',
                                message: '인증이 완료되었습니다.'
                            });

                            this.sendCurrentKey(ws);
                        } else {
                            this.sendToClient(ws, {
                                type: 'auth-failed',
                                message:
                                    authResult.error || '인증에 실패했습니다.'
                            });
                            ws.close(1008, 'Authentication failed');
                        }
                        return;
                    }

                    if (!ws.isAuthenticated) {
                        this.sendToClient(ws, {
                            type: 'auth-failed',
                            message: '먼저 인증이 필요합니다.'
                        });
                        return;
                    }
                } catch (error) {
                    console.error('Keygen WebSocket 메시지 처리 오류:', error);
                }
            });

            ws.on('close', () => {
                clearTimeout(authTimeout);
                this.clients.delete(ws);
                console.log('Keygen WebSocket 클라이언트 연결 해제됨');
            });

            ws.on('error', (error) => {
                clearTimeout(authTimeout);
                console.error('Keygen WebSocket 오류:', error);
                this.clients.delete(ws);
            });
        } catch (error) {
            console.error('Keygen WebSocket 연결 처리 오류:', error);
            ws.close(1011, 'Internal server error');
        }
    }

    private sendCurrentKey(ws: AuthenticatedWebSocket) {
        try {
            const currentKey = generateKey();
            const currentTime = new Date().toISOString();

            this.sendToClient(ws, {
                type: 'new-key',
                data: {
                    key: currentKey,
                    timestamp: currentTime
                }
            });
        } catch (error) {
            console.error('키 전송 오류:', error);
            this.sendToClient(ws, {
                type: 'error',
                message: '키 생성 중 오류가 발생했습니다.'
            });
        }
    }

    private startKeyGeneration() {
        this.keyInterval = setInterval(() => {
            this.broadcastCurrentKey();
        }, 1000);
    }

    private broadcastCurrentKey() {
        if (this.clients.size === 0) {
            return;
        }

        try {
            const currentKey = generateKey();

            if (currentKey !== this.lastKey) {
                const currentTime = new Date().toISOString();
                this.lastKey = currentKey;

                this.broadcast({
                    type: 'new-key',
                    data: {
                        key: currentKey,
                        timestamp: currentTime
                    }
                });
            }
        } catch (error) {
            console.error('키 브로드캐스트 오류:', error);
        }
    }

    private sendToClient(ws: AuthenticatedWebSocket, message: KeygenMessage) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private broadcast(message: KeygenMessage) {
        this.clients.forEach((client) => {
            this.sendToClient(client, message);
        });
    }

    public stop() {
        if (this.keyInterval) {
            clearInterval(this.keyInterval);
            this.keyInterval = null;
        }

        this.clients.forEach((client) => {
            client.close(1001, 'Server shutdown');
        });

        this.wss.close();
    }
}

export default KeygenWebSocketServer;
