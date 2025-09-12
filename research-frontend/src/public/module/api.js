class ApiClient {
    constructor() {
        this.isRefreshing = false;
        this.failedQueue = [];
    }

    _resolveBase() {
        if (typeof window !== 'undefined' && window.__API_ORIGIN) return window.__API_ORIGIN;
        if (typeof window !== 'undefined') {
            const host = window.location.hostname;
            if (host.endsWith('magicresearches.com')) {
                return 'https://api.magicresearches.com';
            }
            return `${window.location.protocol}//api.${host}`;
        }
        return '';
    }

    _getServiceOrigin() {
        if (typeof window === 'undefined') return '';
        if (window.__API_ORIGIN) return window.__API_ORIGIN;
        const host = window.location.hostname;
        if (host.endsWith('magicresearches.com')) {
            return 'https://api.magicresearches.com';
        }
        return `${window.location.protocol}//api.${host}`;
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
            if (window.location.protocol === 'https:' && urlObj.protocol === 'http:') {
                urlObj.protocol = 'https:';
            }
            return urlObj.href;
        }

        if (fullUrl.startsWith('/api/')) {
            const origin = this._getServiceOrigin();
            return origin + fullUrl;
        }
        return window.location.origin + fullUrl;
    }

    generateRequestId() { return crypto.randomUUID(); }

    async makeRequest(url, options = {}) {
        const token = localStorage.getItem('accessToken');
        const requestId = this.generateRequestId();
        const fullUrl = this._buildUrl(url, options.query);
        const requestOptions = {
            ...options,
            credentials: 'include',
            headers: {
                ...options.headers,
                'X-Request-ID': requestId,
                ...(token && { Authorization: `Bearer ${token}` })
            }
        };

        const response = await fetch(fullUrl, requestOptions);
        if (response.ok) return response.json();
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || 'API request failed');
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    async get(url, options = {}) { return this.makeRequest(url, { ...options, method: 'GET' }); }
    async post(url, body, options = {}) {
        const config = { ...options, method: 'POST' };
        if (body) {
            if (body instanceof FormData) config.body = body;
            else { config.headers = { ...config.headers, 'Content-Type': 'application/json' }; config.body = JSON.stringify(body); }
        }
        return this.makeRequest(url, config);
    }
    async put(url, body, options = {}) {
        const config = { ...options, method: 'PUT' };
        if (body) {
            if (body instanceof FormData) config.body = body;
            else { config.headers = { ...config.headers, 'Content-Type': 'application/json' }; config.body = JSON.stringify(body); }
        }
        return this.makeRequest(url, config);
    }
    async delete(url, options = {}) { return this.makeRequest(url, { ...options, method: 'DELETE' }); }
}

const apiClient = new ApiClient();
export default apiClient;


