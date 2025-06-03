class WebSocketClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000;
        this.listeners = new Map();
        this.endpoint = null;
        this.token = null;
        this.pingInterval = null;
        this.pongTimeout = null;
    }

    connect(endpoint, token) {
        try {
            this.endpoint = endpoint;
            this.token = token;

            const protocol =
                window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const url = `${protocol}//${host}${endpoint}`;

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
                this.sendAuthMessage(this.pendingToken);
                this.startPingPong();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'pong') {
                        this.handlePong();
                        return;
                    }

                    if (message.type === 'auth-success') {
                        console.log('WebSocket 인증 성공');
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        this.emit('connected');
                        return;
                    }

                    if (message.type === 'auth-failed') {
                        console.error('WebSocket 인증 실패:', message.message);
                        this.ws.close(1008, 'Authentication failed');
                        this.emit('auth-failed', message);
                        return;
                    }

                    this.emit('message', message);

                    if (message.type) {
                        this.emit(message.type, message);
                    }
                } catch (error) {
                    console.error('WebSocket 메시지 파싱 오류:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket 연결 종료:', event.code, event.reason);
                this.isConnected = false;
                this.stopPingPong();
                this.emit('disconnected', event);

                if (
                    (event.code === 1006 || event.code !== 1000) &&
                    this.reconnectAttempts < this.maxReconnectAttempts
                ) {
                    console.log(
                        `연결이 비정상적으로 종료됨 (코드: ${event.code}), 재연결 시도...`
                    );
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

    sendAuthMessage(token) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(
                JSON.stringify({
                    type: 'auth',
                    token: token
                })
            );
        }
    }

    startPingPong() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));

                this.pongTimeout = setTimeout(() => {
                    this.ws.close(1000, 'Ping timeout');
                }, 10000);
            }
        }, 30000);
    }

    handlePong() {
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }

    stopPingPong() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }

    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
            30000
        );

        console.log(
            `WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts} (${delay}ms 후)`
        );

        setTimeout(() => {
            if (
                !this.isConnected &&
                this.reconnectAttempts <= this.maxReconnectAttempts
            ) {
                this.connect(this.endpoint, this.token);
            }
        }, delay);
    }

    cleanup() {
        this.stopPingPong();
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
        }
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket이 연결되지 않았습니다.');
        }
    }

    disconnect() {
        this.cleanup();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = this.maxReconnectAttempts;
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('이벤트 리스너 오류:', error);
                }
            });
        }
    }

    isConnectedToServer() {
        return (
            this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN
        );
    }
}

export default WebSocketClient;
