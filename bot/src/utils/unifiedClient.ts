import AuthTokenManager from './authTokenManager.js';
import WebSocketClient from './websocketConnector.js';

interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string | FormData;
    credentials?: RequestCredentials;
    query?: Record<string, any>;
}

class ConnectionClient {
    constructor() {}

    generateRequestId(): string {
        return crypto.randomUUID();
    }

    async makeRequest(
        url: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const requestId = this.generateRequestId();

        const requestOptions: RequestInit = {
            ...options,
            credentials: 'include' as RequestCredentials,
            headers: {
                'X-Request-ID': requestId,
                ...options.headers
            }
        };

        return await fetch(url, requestOptions);
    }

    async get(url: string, options: RequestInit = {}): Promise<Response> {
        return this.makeRequest(url, {
            method: 'GET',
            ...options
        });
    }

    async post(
        url: string,
        data?: any,
        options: RequestInit = {}
    ): Promise<Response> {
        const requestOptions: RequestInit = {
            method: 'POST',
            ...options
        };

        if (data !== undefined && data !== null) {
            if (data instanceof FormData) {
                requestOptions.body = data;
            } else {
                requestOptions.headers = {
                    'Content-Type': 'application/json',
                    ...requestOptions.headers
                };
                requestOptions.body = JSON.stringify(data);
            }
        }

        return this.makeRequest(url, requestOptions);
    }

    async put(
        url: string,
        data?: any,
        options: RequestInit = {}
    ): Promise<Response> {
        const requestOptions: RequestInit = {
            method: 'PUT',
            ...options
        };

        if (data !== undefined && data !== null) {
            if (data instanceof FormData) {
                requestOptions.body = data;
            } else {
                requestOptions.headers = {
                    'Content-Type': 'application/json',
                    ...requestOptions.headers
                };
                requestOptions.body = JSON.stringify(data);
            }
        }

        return this.makeRequest(url, requestOptions);
    }

    async delete(url: string, options: RequestInit = {}): Promise<Response> {
        return this.makeRequest(url, {
            method: 'DELETE',
            ...options
        });
    }
}

class RequestClient {
    private authManager: AuthTokenManager;
    private apiClient: ConnectionClient;
    private wsClient: WebSocketClient;
    private isInitialized: boolean = false;

    constructor() {
        this.authManager = new AuthTokenManager();
        this.apiClient = new ConnectionClient();
        this.wsClient = new WebSocketClient();
    }

    async initialize(): Promise<boolean> {
        try {
            const authSuccess = await this.authManager.initialize();
            if (!authSuccess) {
                return false;
            }

            this.isInitialized = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    async connectWebSocket(connectionPoint: string): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                throw new Error('클라이언트가 초기화되지 않았습니다');
            }

            const token = await this.authManager.ensureValidToken();
            if (!token) {
                throw new Error('유효한 토큰을 가져올 수 없습니다');
            }

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('웹소켓 연결 타임아웃'));
                }, 15000);

                this.wsClient.on('connected', () => {
                    clearTimeout(timeout);
                    resolve(true);
                });

                this.wsClient.on('auth-failed', () => {
                    clearTimeout(timeout);
                    reject(new Error('웹소켓 인증 실패'));
                });

                this.wsClient.on('error', (error: any) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                this.wsClient.connect(connectionPoint, token);
            });
        } catch (error) {
            return false;
        }
    }

    private async makeAuthenticatedRequest(
        url: string,
        options: RequestInit = {}
    ): Promise<any> {
        if (!this.isInitialized) {
            throw new Error('클라이언트가 초기화되지 않았습니다');
        }

        let token = await this.authManager.ensureValidToken();
        if (!token) {
            throw new Error('유효한 토큰을 가져올 수 없습니다');
        }

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...options.headers
            }
        };

        let response = await this.executeRequest(url, requestOptions);

        if (response.status === 401) {
            const refreshed = await this.authManager.refreshToken();
            if (!refreshed) {
                throw new Error('토큰 갱신에 실패했습니다');
            }

            token = await this.authManager.ensureValidToken();
            if (!token) {
                throw new Error('갱신된 토큰을 가져올 수 없습니다');
            }

            requestOptions.headers = {
                ...requestOptions.headers,
                Authorization: `Bearer ${token}`
            };

            response = await this.executeRequest(url, requestOptions);
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    }

    private async executeRequest(
        url: string,
        options: RequestInit
    ): Promise<Response> {
        const method = options.method?.toUpperCase() || 'GET';

        switch (method) {
            case 'GET':
                return await this.apiClient.get(url, options);
            case 'POST':
                return await this.apiClient.post(url, options.body, options);
            case 'PUT':
                return await this.apiClient.put(url, options.body, options);
            case 'DELETE':
                return await this.apiClient.delete(url, options);
            default:
                throw new Error(`지원하지 않는 HTTP 메서드: ${method}`);
        }
    }

    async get(url: string, options: RequestOptions = {}): Promise<any> {
        const { query, ...restOptions } = options;
        let requestUrl = url;

        if (query && typeof query === 'object') {
            const searchParams = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                requestUrl += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        return this.makeAuthenticatedRequest(requestUrl, {
            method: 'GET',
            ...restOptions
        });
    }

    async post(
        url: string,
        data?: any,
        options: RequestOptions = {}
    ): Promise<any> {
        const { query, ...restOptions } = options;
        return this.makeAuthenticatedRequest(url, {
            method: 'POST',
            body: data,
            ...restOptions
        });
    }

    async put(
        url: string,
        data?: any,
        options: RequestOptions = {}
    ): Promise<any> {
        const { query, ...restOptions } = options;
        return this.makeAuthenticatedRequest(url, {
            method: 'PUT',
            body: data,
            ...restOptions
        });
    }

    async delete(url: string, options: RequestOptions = {}): Promise<any> {
        const { query, ...restOptions } = options;
        return this.makeAuthenticatedRequest(url, {
            method: 'DELETE',
            ...restOptions
        });
    }

    sendWebSocketMessage(message: any): void {
        if (!this.wsClient.isConnectedToServer()) {
            throw new Error('웹소켓이 연결되지 않았습니다');
        }
        this.wsClient.send(message);
    }

    onWebSocketMessage(event: string, callback: (data: any) => void): void {
        this.wsClient.on(event, callback);
    }

    offWebSocketMessage(event: string, callback: (data: any) => void): void {
        this.wsClient.off(event, callback);
    }

    isWebSocketConnected(): boolean {
        return this.wsClient.isConnectedToServer();
    }

    isAuthenticated(): boolean {
        return this.authManager.isAuthenticated();
    }

    getCurrentUser(): any {
        return this.authManager.getUser();
    }

    async refreshAuthToken(): Promise<boolean> {
        return await this.authManager.refreshToken();
    }

    disconnectWebSocket(): void {
        this.wsClient.disconnect();
    }

    async logout(): Promise<void> {
        try {
            this.wsClient.disconnect();
            await this.authManager.logout();
            this.isInitialized = false;
        } catch (error) {
            console.error('로그아웃 중 오류:', error);
        }
    }

    destroy(): void {
        this.wsClient.disconnect();
        this.authManager.destroy();
        this.isInitialized = false;
    }
}

const unifiedClient = new RequestClient();

export default unifiedClient;
export { RequestClient };
