import WebSocket from 'ws';

interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

interface CloseEvent {
    code: number;
    reason: string;
}

class WebSocketClient {
    private ws: WebSocket | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;
    private readonly reconnectInterval = 3000;
    private listeners = new Map<string, Set<Function>>();
    private connectionPoint: string | null = null;
    private token: string | null = null;
    private pingInterval: NodeJS.Timeout | null = null;
    private pongTimeout: NodeJS.Timeout | null = null;
    private pendingToken: string | null = null;
    private periodicReconnectInterval: NodeJS.Timeout | null = null;
    private readonly periodicReconnectTime = 3 * 60 * 60 * 1000;

    connect(connectionPoint: string, token: string): void {
        try {
            this.connectionPoint = connectionPoint;
            this.token = token;

            const protocol =
                process.env.NODE_ENV === 'production' ? 'wss:' : 'ws:';
            const url = `${protocol}//${connectionPoint}`;

            this.cleanup();
            this.ws = new WebSocket(url);
            this.pendingToken = token;

            const connectionTimeout = setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.close();
                    this.emit('error', new Error('Connection timeout'));
                }
            }, 15000);

            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                this.sendAuthMessage(this.pendingToken!);
                this.startPingPong();
                this.startPeriodicReconnect();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(
                        event.data.toString()
                    );

                    if (message.type === 'pong') {
                        this.handlePong();
                        return;
                    }

                    if (message.type === 'auth-success') {
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        this.emit('connected', null);
                        return;
                    }

                    if (message.type === 'auth-failed') {
                        this.ws?.close(1008, 'Authentication failed');
                        this.emit('auth-failed', message);
                        return;
                    }

                    this.emit('message', message);

                    if (message.type) {
                        this.emit(message.type, message);
                    }
                } catch (error) {
                    console.error('Parse error:', error);
                }
            };

            this.ws.onclose = (event) => {
                const closeEvent: CloseEvent = {
                    code: event.code,
                    reason: event.reason
                };

                this.isConnected = false;
                this.stopPingPong();
                this.stopPeriodicReconnect();
                this.emit('disconnected', closeEvent);

                if (
                    (event.code === 1006 || event.code !== 1000) &&
                    this.reconnectAttempts < this.maxReconnectAttempts
                ) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                this.emit('error', error);
            };
        } catch (error) {
            this.emit('error', error);
        }
    }

    private sendAuthMessage(token: string): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(
                JSON.stringify({
                    type: 'auth',
                    token: token
                })
            );
        }
    }

    private startPingPong(): void {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));

                this.pongTimeout = setTimeout(() => {
                    this.ws?.close(1000, 'Ping timeout');
                }, 10000);
            }
        }, 30000);
    }

    private handlePong(): void {
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }

    private stopPingPong(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }

    private startPeriodicReconnect(): void {
        this.stopPeriodicReconnect();

        this.periodicReconnectInterval = setTimeout(() => {
            this.performPeriodicReconnect();
        }, this.periodicReconnectTime);
    }

    private stopPeriodicReconnect(): void {
        if (this.periodicReconnectInterval) {
            clearTimeout(this.periodicReconnectInterval);
            this.periodicReconnectInterval = null;
        }
    }

    private performPeriodicReconnect(): void {
        if (this.isConnected && this.connectionPoint && this.token) {
            this.emit('periodic-reconnect-start', null);

            this.cleanup();
            if (this.ws) {
                this.ws.close(1000, 'Periodic reconnect');
            }

            setTimeout(() => {
                if (this.connectionPoint && this.token) {
                    this.connect(this.connectionPoint, this.token);
                }
            }, 1000);
        }
    }

    private scheduleReconnect(): void {
        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
            30000
        );

        setTimeout(() => {
            if (
                !this.isConnected &&
                this.reconnectAttempts <= this.maxReconnectAttempts
            ) {
                if (this.connectionPoint && this.token) {
                    this.connect(this.connectionPoint, this.token);
                }
            }
        }, delay);
    }

    private cleanup(): void {
        this.stopPingPong();
        this.stopPeriodicReconnect();
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
        }
    }

    send(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected.');
        }
    }

    disconnect(): void {
        this.cleanup();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = this.maxReconnectAttempts;
    }

    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.delete(callback);
        }
    }

    private emit(event: string, data: any): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            });
        }
    }

    isConnectedToServer(): boolean {
        return (
            this.isConnected &&
            this.ws !== null &&
            this.ws.readyState === WebSocket.OPEN
        );
    }
}

export default WebSocketClient;
