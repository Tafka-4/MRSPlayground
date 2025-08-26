class ApiClient {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
        try {
            this.baseUrl = (typeof window !== 'undefined' && window.__API_BASE_URL) || 'https://api.magicresearches.com';
        } catch (e) {
            this.baseUrl = 'https://api.magicresearches.com';
        }
    }

    generateRequestId() {
        return crypto.randomUUID();
    }

    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        const requestId = this.generateRequestId();
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
        
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

        const timeoutId = setTimeout(() => {
            console.warn('Request timeout:', fullUrl);
        }, 15000);

        try {
            const response = await fetch(fullUrl, requestOptions);
            clearTimeout(timeoutId);

            if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/refresh') && window.location.pathname !== '/login') {
                if (this.isRefreshing) {
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({
                            resolve,
                            reject,
                            url: fullUrl,
                            options: requestOptions
                        });
                    });
                }
                return this.handleTokenRefresh(fullUrl, requestOptions);
            }

            if (response.ok) {
                const data = await response.json();
                console.log('API Response:', { url: fullUrl, status: response.status, data });
                return this.normalizeResponse(data);
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
            clearTimeout(timeoutId);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('Network error:', error);
                throw new Error('네트워크 연결을 확인해주세요.');
            }
            console.error('Request failed:', error);
            throw error;
        }
    }

    normalizeResponse(data) {
        return {
            code: data.code || 200,
            message: data.message || '성공',
            data: data.data || data,
            details: data.details || {}
        };
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
                const response = await fetch(originalUrl, originalOptions);
                if (response.ok) {
                    const data = await response.json();
                    return this.normalizeResponse(data);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error(errorData.message || 'Request failed');
                    error.status = response.status;
                    throw error;
                }
            }
            this.processQueue(new Error('Token refresh failed'), null);
            this.redirectToLogin();
            throw new Error('Token refresh failed');
        } catch (error) {
            this.processQueue(error, null);
            this.redirectToLogin();
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    async refreshToken() {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Request-ID': this.generateRequestId()
                }
            });

            if (response.ok) {
                const data = await response.json();
                const access = data?.accessToken || data?.data?.accessToken;
                if (access) {
                    localStorage.setItem('accessToken', access);
                    return access;
                }
                return null;
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
                fetch(prom.url, newOptions)
                    .then(response => response.json())
                    .then(data => prom.resolve(this.normalizeResponse(data)))
                    .catch(err => prom.reject(err));
            }
        });
        this.failedQueue = [];
    }

    redirectToLogin() {
        localStorage.removeItem('accessToken');
        document.cookie =
            'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        if (window.location.pathname !== '/login') {
            this.showToast('세션이 만료되었습니다.');
            setTimeout(() => {
                window.location.href = '/login?session_expired=true';
            }, 1500);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async retryRequest(fn, retries = 1) {
        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries || error.status !== 500) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    async get(url, options = {}) {
        const isIdempotent = true;
        const request = () => this.makeRequest(url, { ...options, method: 'GET' });
        return isIdempotent ? this.retryRequest(request) : request();
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
