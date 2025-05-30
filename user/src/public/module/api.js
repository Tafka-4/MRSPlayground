class ApiClient {
    constructor() {
        this.baseURL = '';
        this.isRefreshing = false;
        this.failedQueue = [];
        this.isRedirecting = false;
        this.refreshAttempts = 0;
        this.maxRefreshAttempts = 3;
    }

    async makeRequest(url, options = {}) {
        if (this.isRedirecting) {
            console.log('리다이렉션 중이므로 요청 취소');
            return null;
        }

        const token = localStorage.getItem('accessToken');
        const requestOptions = {
            ...options,
            credentials: 'include',
            headers: {
                Authorization: `Bearer ${token}`,
                ...options.headers
            }
        };

        let response = await fetch(url, requestOptions);

        if (response.status !== 401) {
            this.refreshAttempts = 0;
            return response;
        }

        console.log('401 에러 발생, 토큰 갱신 시도');

        if (this.refreshAttempts >= this.maxRefreshAttempts) {
            console.log('최대 토큰 갱신 시도 횟수 초과');
            this.forceLogout();
            return null;
        }

        const newToken = await this.refreshToken();
        if (!newToken) {
            console.log('토큰 갱신 실패');
            this.forceLogout();
            return null;
        }

        console.log('토큰 갱신 성공, 요청 재시도');
        requestOptions.headers['Authorization'] = `Bearer ${newToken}`;
        return await fetch(url, requestOptions);
    }

    async refreshToken() {
        if (this.isRedirecting) {
            console.log('리다이렉션 중이므로 토큰 갱신 취소');
            return null;
        }

        if (this.refreshAttempts >= this.maxRefreshAttempts) {
            console.log('최대 토큰 갱신 시도 횟수 초과');
            return null;
        }

        if (this.isRefreshing) {
            console.log('이미 토큰 갱신 중, 대기열에 추가');
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
            });
        }

        console.log(
            `토큰 갱신 시작 (시도 ${this.refreshAttempts + 1}/${
                this.maxRefreshAttempts
            })`
        );
        this.isRefreshing = true;
        this.refreshAttempts++;

        try {
            const refreshResponse = await fetch('/api/v1/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });

            if (!refreshResponse.ok) {
                console.log('토큰 갱신 응답 실패:', refreshResponse.status);
                this.processQueue(new Error('토큰 갱신 실패'), null);
                return null;
            }

            const result = await refreshResponse.json();
            const { accessToken } = result;

            if (!accessToken) {
                console.log('토큰 갱신 응답에 accessToken 없음');
                this.processQueue(new Error('토큰 갱신 실패'), null);
                return null;
            }

            localStorage.setItem('accessToken', accessToken);
            console.log('토큰 갱신 성공');

            this.refreshAttempts = 0;
            this.processQueue(null, accessToken);
            return accessToken;
        } catch (error) {
            console.error('토큰 갱신 중 에러:', error);
            this.processQueue(error, null);
            return null;
        } finally {
            this.isRefreshing = false;
        }
    }

    processQueue(error, token = null) {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });

        this.failedQueue = [];
    }

    clearAllTokens() {
        localStorage.removeItem('accessToken');
        document.cookie =
            'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    forceLogout() {
        if (this.isRedirecting) {
            return;
        }

        this.isRedirecting = true;
        this.clearAllTokens();

        this.failedQueue = [];
        this.isRefreshing = false;
        this.refreshAttempts = 0;

        if (
            window.location.pathname !== '/login' &&
            window.location.pathname !== '/login.html'
        ) {
            setTimeout(() => {
                if (!this.isRedirecting) return;
                window.location.href = '/login';
            }, 200);
        }
    }

    redirectToLogin() {
        this.forceLogout();
    }

    async get(url, options = {}) {
        try {
            return await this.makeRequest(url, {
                method: 'GET',
                ...options
            });
        } catch (error) {
            if (error.message === '토큰 갱신 실패') {
                return null;
            }
            throw error;
        }
    }

    async post(url, data = null, options = {}) {
        const requestOptions = {
            method: 'POST',
            ...options
        };

        if (!data) {
            try {
                return await this.makeRequest(url, requestOptions);
            } catch (error) {
                if (error.message === '토큰 갱신 실패') {
                    return null;
                }
                throw error;
            }
        }

        if (data instanceof FormData) {
            requestOptions.body = data;
        } else {
            requestOptions.headers = {
                'Content-Type': 'application/json',
                ...requestOptions.headers
            };
            requestOptions.body = JSON.stringify(data);
        }

        try {
            return await this.makeRequest(url, requestOptions);
        } catch (error) {
            if (error.message === '토큰 갱신 실패') {
                return null;
            }
            throw error;
        }
    }

    async put(url, data = null, options = {}) {
        const requestOptions = {
            method: 'PUT',
            ...options
        };

        if (!data) {
            try {
                return await this.makeRequest(url, requestOptions);
            } catch (error) {
                if (error.message === '토큰 갱신 실패') {
                    return null;
                }
                throw error;
            }
        }

        if (data instanceof FormData) {
            requestOptions.body = data;
        } else {
            requestOptions.headers = {
                'Content-Type': 'application/json',
                ...requestOptions.headers
            };
            requestOptions.body = JSON.stringify(data);
        }

        try {
            return await this.makeRequest(url, requestOptions);
        } catch (error) {
            if (error.message === '토큰 갱신 실패') {
                return null;
            }
            throw error;
        }
    }

    async delete(url, options = {}) {
        try {
            return await this.makeRequest(url, {
                method: 'DELETE',
                ...options
            });
        } catch (error) {
            if (error.message === '토큰 갱신 실패') {
                return null;
            }
            throw error;
        }
    }
}

const apiClient = new ApiClient();

export default apiClient;
