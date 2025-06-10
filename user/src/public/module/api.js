class ApiClient {
    constructor() {
        this.baseURL = '';
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    generateRequestId() {
        return crypto.randomUUID();
    }

    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        const requestId = this.generateRequestId();
        const requestOptions = {
            ...options,
            credentials: 'include',
            headers: {
                ...options.headers,
                'X-Request-ID': requestId,
                ...(token && { Authorization: `Bearer ${token}` })
            }
        };

        try {
            const response = await fetch(url, requestOptions);

            if (response.status === 401) {
                if (this.isRefreshing) {
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({
                            resolve,
                            reject,
                            url,
                            options: requestOptions
                        });
                    });
                }
                return this.handleTokenRefresh(url, requestOptions);
            }
            return response;
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    async handleTokenRefresh(originalUrl, originalOptions) {
        this.isRefreshing = true;

        try {
            const newAccessToken = await this.refreshToken();
            if (newAccessToken) {
                this.processQueue(null, newAccessToken);
                originalOptions.headers[
                    'Authorization'
                ] = `Bearer ${newAccessToken}`;
                return await fetch(originalUrl, originalOptions);
            } else {
                this.processQueue(new Error('Token refresh failed'), null);
                this.redirectToLogin();
                return null;
            }
        } catch (error) {
            this.processQueue(error, null);
            this.redirectToLogin();
            return null;
        } finally {
            this.isRefreshing = false;
        }
    }

    async refreshToken() {
        try {
            const response = await fetch('/api/v1/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Request-ID': this.generateRequestId()
                }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                return data.accessToken;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
            return null;
        }
    }

    processQueue(error, token = null) {
        this.failedQueue.forEach((prom) => {
            if (error) {
                prom.reject(error);
            } else {
                const newOptions = {
                    ...prom.options,
                    headers: {
                        ...prom.options.headers,
                        Authorization: `Bearer ${token}`
                    }
                };
                prom.resolve(fetch(prom.url, newOptions));
            }
        });
        this.failedQueue = [];
    }

    redirectToLogin() {
        localStorage.removeItem('accessToken');
        // 세션 쿠키 삭제 ( refreshToken )
        document.cookie =
            'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        if (window.location.pathname !== '/login') {
            window.location.href = '/login?session_expired=true';
        }
    }

    async get(url, options = {}) {
        return this.makeRequest(url, { ...options, method: 'GET' });
    }

    async post(url, body, options = {}) {
        const config = {
            ...options,
            method: 'POST'
        };
        if (body) {
            if (body instanceof FormData) {
                config.body = body;
            } else {
                config.headers = {
                    ...config.headers,
                    'Content-Type': 'application/json'
                };
                config.body = JSON.stringify(body);
            }
        }
        return this.makeRequest(url, config);
    }

    async put(url, body, options = {}) {
        const config = {
            ...options,
            method: 'PUT'
        };
        if (body) {
            if (body instanceof FormData) {
                config.body = body;
            } else {
                config.headers = {
                    ...config.headers,
                    'Content-Type': 'application/json'
                };
                config.body = JSON.stringify(body);
            }
        }
        return this.makeRequest(url, config);
    }

    async delete(url, options = {}) {
        return this.makeRequest(url, { ...options, method: 'DELETE' });
    }
}

const apiClient = new ApiClient();
export default apiClient;
