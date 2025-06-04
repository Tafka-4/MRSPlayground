import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { requestPool, pool } from '../config/database.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { redisClient } from '../config/redis.js';

export interface LogMessage {
    type:
        | 'new-log'
        | 'log-update'
        | 'error'
        | 'auth-success'
        | 'auth-failed'
        | 'pong';
    data?: any;
    message?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
    user?: any;
    isAuthenticated?: boolean;
}

class LogWebSocketServer {
    public wss: WebSocketServer;
    private clients: Set<AuthenticatedWebSocket> = new Set();
    private checkInterval: NodeJS.Timeout | null = null;
    private lastCheckTime: Date = new Date();

    constructor(server?: Server) {
        this.wss = new WebSocketServer({
            noServer: true
        });

        this.wss.on('connection', this.handleConnection.bind(this));
        this.startLogMonitoring();
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
                return { success: true, user: JSON.parse(cachedUser) };
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
        try {
            console.log('새로운 WebSocket 연결 시도');

            ws.isAuthenticated = false;

            const authTimeout = setTimeout(() => {
                if (!ws.isAuthenticated) {
                    console.log('WebSocket 인증 타임아웃');
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

                            console.log(
                                `관리자 WebSocket 클라이언트 인증 성공: ${
                                    authResult.user.nickname ||
                                    authResult.user.id
                                }`
                            );

                            this.sendToClient(ws, {
                                type: 'auth-success',
                                message: '인증이 완료되었습니다.'
                            });
                            await this.sendRecentLogs(ws);

                            this.sendToClient(ws, {
                                type: 'new-log',
                                data: {
                                    connected: true,
                                    message:
                                        '실시간 로그 모니터링이 연결되었습니다.'
                                }
                            });
                        } else {
                            console.log(
                                'WebSocket 인증 실패:',
                                authResult.error
                            );
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
                    console.error('WebSocket 메시지 처리 오류:', error);
                }
            });

            ws.on('close', () => {
                clearTimeout(authTimeout);
                this.clients.delete(ws);
                console.log('WebSocket 클라이언트 연결 해제됨');
            });

            ws.on('error', (error) => {
                clearTimeout(authTimeout);
                console.error('WebSocket 오류:', error);
                this.clients.delete(ws);
            });
        } catch (error) {
            console.error('WebSocket 연결 처리 오류:', error);
            ws.close(1011, 'Internal server error');
        }
    }

    private async sendRecentLogs(ws: AuthenticatedWebSocket) {
        try {
            const [logs] = (await requestPool.execute(
                'SELECT * FROM user_requests ORDER BY created_at DESC LIMIT 5'
            )) as any[];

            const userIds = [
                ...new Set(
                    logs
                        .map((log: any) => log.user_id)
                        .filter(
                            (id: any) =>
                                id && typeof id === 'string' && id.trim()
                        )
                )
            ];

            let usersData: any = {};
            if (userIds.length > 0) {
                const placeholders = userIds.map(() => '?').join(',');
                const [users] = (await pool.execute(
                    `SELECT userid, id, nickname, email FROM users WHERE userid IN (${placeholders})`,
                    userIds
                )) as any[];

                usersData = users.reduce((acc: any, user: any) => {
                    if (user.userid) {
                        acc[user.userid] = {
                            username: user.nickname || null,
                            email: user.email || null,
                            login_id: user.id || null
                        };
                    }
                    return acc;
                }, {});
            }

            const enrichedLogs = logs.map((log: any) => ({
                ...log,
                username: usersData[log.user_id]?.username || null,
                email: usersData[log.user_id]?.email || null,
                login_id: usersData[log.user_id]?.login_id || null
            }));

            this.sendToClient(ws, {
                type: 'new-log',
                data: { logs: enrichedLogs, initial: true }
            });
        } catch (error) {
            console.error('최근 로그 전송 오류:', error);
            this.sendToClient(ws, {
                type: 'error',
                message: '최근 로그를 불러오는데 실패했습니다.'
            });
        }
    }

    private startLogMonitoring() {
        this.checkInterval = setInterval(async () => {
            await this.checkForNewLogs();
        }, 5000);
    }

    private async checkForNewLogs() {
        const authenticatedClients = Array.from(this.clients).filter(
            (client) => client.isAuthenticated
        );
        if (authenticatedClients.length === 0) return;

        try {
            const [logs] = (await requestPool.execute(
                'SELECT * FROM user_requests WHERE created_at > ? ORDER BY created_at DESC LIMIT 10',
                [this.lastCheckTime]
            )) as any[];

            if (logs.length > 0) {
                const userIds = [
                    ...new Set(
                        logs
                            .map((log: any) => log.user_id)
                            .filter(
                                (id: any) =>
                                    id && typeof id === 'string' && id.trim()
                            )
                    )
                ];

                let usersData: any = {};
                if (userIds.length > 0) {
                    const placeholders = userIds.map(() => '?').join(',');
                    const [users] = (await pool.execute(
                        `SELECT userid, id, nickname, email FROM users WHERE userid IN (${placeholders})`,
                        userIds
                    )) as any[];

                    usersData = users.reduce((acc: any, user: any) => {
                        if (user.userid) {
                            acc[user.userid] = {
                                username: user.nickname || null,
                                email: user.email || null,
                                login_id: user.id || null
                            };
                        }
                        return acc;
                    }, {});
                }

                const enrichedLogs = logs.map((log: any) => ({
                    ...log,
                    username: usersData[log.user_id]?.username || null,
                    email: usersData[log.user_id]?.email || null,
                    login_id: usersData[log.user_id]?.login_id || null
                }));

                this.broadcast({
                    type: 'new-log',
                    data: { logs: enrichedLogs, new: true }
                });

                this.lastCheckTime = new Date();
            }
        } catch (error) {
            console.error('새로운 로그 확인 오류:', error);
            this.broadcast({
                type: 'error',
                message: '로그 모니터링 중 오류가 발생했습니다.'
            });
        }
    }

    private sendToClient(ws: AuthenticatedWebSocket, message: LogMessage) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private broadcast(message: LogMessage) {
        this.clients.forEach((client) => {
            if (client.isAuthenticated) {
                this.sendToClient(client, message);
            }
        });
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.wss.close();
    }
}

export default LogWebSocketServer;
