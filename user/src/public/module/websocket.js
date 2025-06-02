class WebSocketClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000;
        this.listeners = new Map();
    }

    connect(endpoint, token) {
        try {
            const protocol =
                window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const url = `${protocol}//${host}${endpoint}`;

            console.log('WebSocket 연결 시도:', url);

            this.ws = new WebSocket(url);
            this.pendingToken = token;

            this.ws.onopen = () => {
                console.log('WebSocket 연결 성공, 인증 진행 중...');
                this.sendAuthMessage(this.pendingToken);
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

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
                        this.emit(
                            'error',
                            new Error(
                                message.message || 'Authentication failed'
                            )
                        );
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
                this.emit('disconnected', event);

                if (
                    event.code !== 1000 &&
                    this.reconnectAttempts < this.maxReconnectAttempts
                ) {
                    this.scheduleReconnect(endpoint, token);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.emit('error', error);
            };
        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
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

    scheduleReconnect(endpoint, token) {
        this.reconnectAttempts++;
        console.log(
            `WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
        );

        setTimeout(() => {
            if (
                !this.isConnected &&
                this.reconnectAttempts <= this.maxReconnectAttempts
            ) {
                this.connect(endpoint, token);
            }
        }, this.reconnectInterval);
    }

    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket이 연결되지 않았습니다.');
        }
    }

    disconnect() {
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
