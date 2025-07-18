class ApiClient {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    _buildUrl(url, query) {
        let fullUrl = url;
        if (query) {
            const queryParams = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value);
                }
            });
            const queryString = queryParams.toString();
            if (queryString) {
                fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
            }
        }

        if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
            const urlObj = new URL(fullUrl);
            if (
                window.location.protocol === 'https:' &&
                urlObj.protocol === 'http:'
            ) {
                urlObj.protocol = 'https:';
            }
            return urlObj.href;
        }

        const baseUrl = window.location.origin;
        return baseUrl + fullUrl;
    }

    generateRequestId() {
        return crypto.randomUUID();
    }

    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        const requestId = this.generateRequestId();

        const fullUrl = this._buildUrl(url, options.query);

        console.log('API Request Debug:', {
            originalUrl: url,
            fullUrl,
            method: options.method || 'GET',
            hasToken: !!token,
            query: options.query,
            protocol: window.location.protocol,
            origin: window.location.origin
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

            if (
                response.status === 401 &&
                token &&
                !url.includes('/auth/login') &&
                !url.includes('/auth/refresh') &&
                window.location.pathname !== '/login'
            ) {
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
                console.log('API Response:', {
                    url: fullUrl,
                    status: response.status,
                    data
                });
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

    async handleTokenRefresh(originalUrl, originalOptions) {
        this.isRefreshing = true;

        try {
            const newAccessToken = await this.refreshToken();
            if (newAccessToken) {
                this.processQueue(null, newAccessToken);
                originalOptions.headers[
                    'Authorization'
                ] = `Bearer ${newAccessToken}`;

                const requestUrl = this._buildUrl(originalUrl);

                const response = await fetch(requestUrl, originalOptions);
                if (response.ok) {
                    return await response.json();
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    const error = new Error(errorData.message || 'Request failed');
                    error.status = response.status;
                    throw error;
                }
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
                
                const requestUrl = this._buildUrl(prom.url);

                fetch(requestUrl, newOptions)
                    .then((response) => response.json())
                    .then((data) => prom.resolve(data))
                    .catch((err) => prom.reject(err));
            }
        });
        this.failedQueue = [];
    }

    redirectToLogin() {
        localStorage.removeItem('accessToken');
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