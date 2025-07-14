class ApiClient {
    constructor() {
        this.failedQueue = [];
        this.baseUrl = '';
        this.isRefreshing = false;
        this.refreshPromise = null;
    }

    generateRequestId() {
        return crypto.randomUUID();
    }

    normalizeUrl(url) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        if (url.startsWith('/')) {
            return url;
        }
        
        return '/' + url;
    }

    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        const requestId = this.generateRequestId();
        const normalizedUrl = this.normalizeUrl(url);
        
        console.log('API Request:', { 
            originalUrl: url, 
            normalizedUrl, 
            method: options.method || 'GET',
            hasToken: !!token,
            timestamp: new Date().toISOString()
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
            const response = await fetch(normalizedUrl, requestOptions)

            if (response.status === 401 && 
                !normalizedUrl.includes('/auth/login') && 
                !normalizedUrl.includes('/auth/refresh') && 
                window.location.pathname !== '/login') {
                
                const errorData = await response.json().catch(() => ({}));
                console.log('401 Error Data:', errorData);
                
                const publicPages = [
                    '/help', 
                    '/contact', 
                    '/feedback', 
                    '/notice', 
                    '/license'
                ];
                const userProfilePattern = /^\/user\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\/activity|\/guestbook)?$/;
                const isPublicPage = publicPages.includes(window.location.pathname) || userProfilePattern.test(window.location.pathname);
                
                if (isPublicPage && errorData.needRefresh === false) {
                    const error = new Error(errorData.message || 'Authentication required');
                    error.status = response.status;
                    error.data = errorData;
                    throw error;
                }
                
                if (errorData.needRefresh === true) {
                    console.log('Token refresh needed, attempting refresh...');
                    
                    if (this.isRefreshing) {
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject, url, options });
                        });
                    }
                    
                    this.isRefreshing = true;
                    this.refreshPromise = this.refreshToken();
                    
                    try {
                        const newToken = await this.refreshPromise;
                        if (newToken) {
                            this.processQueue(null, newToken);
                            
                            const newOptions = {
                                ...options,
                                headers: {
                                    ...options.headers,
                                    'X-Request-ID': this.generateRequestId(),
                                    Authorization: `Bearer ${newToken}`
                                }
                            };
                            
                            this.isRefreshing = false;
                            this.refreshPromise = null;
                            return this.makeRequest(url, newOptions);
                        } else {
                            this.processQueue(new Error('Token refresh failed'), null);
                            this.isRefreshing = false;
                            this.refreshPromise = null;
                            this.redirectToLogin();
                            return null;
                        }
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        this.processQueue(refreshError, null);
                        this.isRefreshing = false;
                        this.refreshPromise = null;
                        this.redirectToLogin();
                        return null;
                    }
                } else {
                    console.log('No token refresh needed, treating as auth error');
                    const error = new Error(errorData.message || 'Authentication required');
                    error.status = response.status;
                    error.data = errorData;
                    throw error;
                }
            }

            if (response.ok) {
                const data = await response.json();
                console.log('API Response Success:', { 
                    url: normalizedUrl, 
                    status: response.status, 
                    data,
                    timestamp: new Date().toISOString()
                });
                
                if (data && typeof data === 'object') {
                    return data;
                } else {
                    throw new Error('Invalid response format');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('API Error:', { 
                    url: normalizedUrl, 
                    status: response.status, 
                    statusText: response.statusText,
                    errorData,
                    timestamp: new Date().toISOString()
                });
                
                const errorMessage = errorData.message || errorData.error || `API request failed: ${response.status} ${response.statusText}`;
                const error = new Error(errorMessage);
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
            console.log('Attempting to refresh token...');
            const response = await fetch('/api/v1/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Request-ID': this.generateRequestId()
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    console.log('Token refreshed successfully');
                    return data.accessToken;
                }
            }
            
            console.log('Token refresh failed, redirecting to login');
            this.redirectToLogin();
            return null;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            this.redirectToLogin();
            return null;
        }
    }

    processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject, url, options }) => {
            if (error) {
                reject(error);
            } else {
                const newOptions = {
                    ...options,
                    headers: {
                        ...options.headers,
                        'X-Request-ID': this.generateRequestId(),
                        Authorization: `Bearer ${token}`
                    }
                };
                
                this.makeRequest(url, newOptions)
                    .then(resolve)
                    .catch(reject);
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
