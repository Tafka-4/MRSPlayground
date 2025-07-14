class ApiClient {
    constructor() {
        this.failedQueue = [];
    }

    generateRequestId() {
        return crypto.randomUUID();
    }

    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        const requestId = this.generateRequestId();
        const fullUrl = url;
        
        console.log('API Request:', { 
            url, 
            fullUrl, 
            method: options.method || 'GET',
            hasToken: !!token 
        });
        
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
            const response = await fetch(fullUrl, requestOptions);

            if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh') && window.location.pathname !== '/login') {
                const publicPages = [
                    '/help', 
                    '/contact', 
                    '/feedback', 
                    '/notice', 
                    '/license'
                ];
                const userProfilePattern = /^\/user\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\/activity|\/guestbook)?$/;
                const isPublicPage = publicPages.includes(window.location.pathname) || userProfilePattern.test(window.location.pathname);
                
                if (isPublicPage) {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error(errorData.message || 'Authentication required');
                    error.status = response.status;
                    error.data = errorData;
                    throw error;
                }
                
                // 토큰 만료 시 즉시 로그아웃 처리
                this.redirectToLogin();
                return null;
            }

            if (response.ok) {
                const data = await response.json();
                console.log('API Response:', { url: fullUrl, status: response.status, data });
                return data;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error:', { 
                    url: fullUrl, 
                    status: response.status, 
                    errorData,
                    statusText: response.statusText
                });
                const error = new Error(errorData.message || 'API request failed');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('Network error:', error);
                throw new Error('네트워크 연결을 확인해주세요.');
            }
            console.error('Request failed:', error);
            throw error;
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
                this.redirectToLogin();
                return null;
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
            this.redirectToLogin();
            return null;
        }
    }

    processQueue(error, token = null) {
        this.failedQueue.forEach((prom) => {
            if (error) {
                prom.reject(error);
            } else {
                this.redirectToLogin();
            }
        });
        this.failedQueue = [];
    }

    redirectToLogin() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUserId');
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
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
