import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
interface BotTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

interface BotUser {
    userid: string;
    id: string;
    nickname: string;
    email: string;
    authority: string;
    isVerified: boolean;
}

class AuthTokenManager {
    private userServiceUrl: string;
    private tokensFilePath: string;
    private tokens: BotTokens | null = null;
    private user: BotUser | null = null;
    private refreshTimer: NodeJS.Timeout | null = null;
    private isRefreshing = false;

    constructor() {
        this.userServiceUrl =
            process.env.USER_SERVICE_URL || 'http://user-service:3001';
        this.tokensFilePath = path.join(
            process.cwd(),
            'data',
            'bot-tokens.json'
        );
        this.ensureDataDirectory();
        this.loadTokens();
    }

    private ensureDataDirectory(): void {
        const dataDir = path.dirname(this.tokensFilePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    private loadTokens(): void {
        try {
            if (fs.existsSync(this.tokensFilePath)) {
                const data = fs.readFileSync(this.tokensFilePath, 'utf8');
                this.tokens = JSON.parse(data);
            }
        } catch (error) {
            this.tokens = null;
        }
    }

    private saveTokens(): void {
        try {
            if (this.tokens) {
                fs.writeFileSync(
                    this.tokensFilePath,
                    JSON.stringify(this.tokens, null, 2)
                );
            }
        } catch (error) {}
    }

    private isTokenExpired(): boolean {
        if (!this.tokens) return true;
        return Date.now() >= this.tokens.expiresAt - 60000;
    }

    private setRefreshTimer(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        if (this.tokens) {
            const timeToRefresh = this.tokens.expiresAt - Date.now() - 120000;
            if (timeToRefresh > 0) {
                this.refreshTimer = setTimeout(() => {
                    this.refreshToken();
                }, timeToRefresh);
            }
        }
    }

    async createBotAccount(): Promise<boolean> {
        try {
            const botData = {
                id: process.env.BOT_ID,
                password: process.env.BOT_PW,
                email: process.env.BOT_EMAIL,
                nickname: process.env.BOT_NICKNAME || '오토마타-proto'
            };

            if (!botData.id || !botData.password || !botData.email) {
                console.error('봇 계정 정보가 환경변수에 설정되지 않았습니다.');
                return false;
            }

            console.log('봇 계정 생성 시도...');
            const response = await fetch(
                `${this.userServiceUrl}/api/v1/auth/register`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-ID': uuidv4()
                    },
                    body: JSON.stringify(botData)
                }
            );

            if (response.ok) {
                const data = await response.json();
                return true;
            } else {
                const error = await response.json();
                if (error.error && error.error.includes('이미 존재')) {
                    return true;
                }
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async login(): Promise<boolean> {
        try {
            const loginData = {
                id: process.env.BOT_ID,
                password: process.env.BOT_PW
            };

            const response = await fetch(
                `${this.userServiceUrl}/api/v1/auth/login`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Request-ID': uuidv4()
                    },
                    body: JSON.stringify(loginData)
                }
            );

            if (response.ok) {
                const data = await response.json();
                const cookies = response.headers.get('set-cookie');

                let refreshToken = '';
                if (cookies) {
                    const refreshTokenMatch =
                        cookies.match(/refreshToken=([^;]+)/);
                    if (refreshTokenMatch) {
                        refreshToken = refreshTokenMatch[1];
                    }
                }

                this.tokens = {
                    accessToken: data.accessToken,
                    refreshToken: refreshToken,
                    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
                };

                this.user = data.user;
                this.saveTokens();
                this.setRefreshTimer();

                return true;
            } else {
                const error = await response.json();
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async refreshToken(): Promise<boolean> {
        if (this.isRefreshing) {
            return false;
        }

        this.isRefreshing = true;

        try {
            if (!this.tokens?.refreshToken) {
                this.isRefreshing = false;
                return await this.login();
            }

            const response = await fetch(
                `${this.userServiceUrl}/api/v1/auth/refresh-token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `refreshToken=${this.tokens.refreshToken}`,
                        'X-Request-ID': uuidv4()
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();

                this.tokens.accessToken = data.accessToken;
                this.tokens.expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

                this.saveTokens();
                this.setRefreshTimer();

                this.isRefreshing = false;
                return true;
            } else {
                this.tokens = null;
                this.isRefreshing = false;
                return await this.login();
            }
        } catch (error) {
            this.isRefreshing = false;
            return false;
        }
    }

    async checkToken(): Promise<boolean> {
        try {
            if (!this.tokens?.refreshToken) {
                return false;
            }

            const response = await fetch(
                `${this.userServiceUrl}/api/v1/auth/check-token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `refreshToken=${this.tokens.refreshToken}`,
                        'X-Request-ID': uuidv4()
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.user = data.user;
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async ensureValidToken(): Promise<string | null> {
        if (!this.tokens) {
            const success = await this.login();
            return success && this.tokens
                ? (this.tokens as BotTokens).accessToken
                : null;
        }

        if (this.isTokenExpired()) {
            const success = await this.refreshToken();
            return success && this.tokens
                ? (this.tokens as BotTokens).accessToken
                : null;
        }

        return this.tokens.accessToken;
    }

    async initialize(): Promise<boolean> {
        try {
            await this.createBotAccount();

            if (this.tokens && !this.isTokenExpired()) {
                const isValid = await this.checkToken();
                if (isValid) {
                    this.setRefreshTimer();
                    return true;
                }
            }

            const success = await this.login();
            if (success) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    getAccessToken(): string | null {
        return this.tokens?.accessToken || null;
    }

    getUser(): BotUser | null {
        return this.user;
    }

    isAuthenticated(): boolean {
        return this.tokens !== null && !this.isTokenExpired();
    }

    async logout(): Promise<void> {
        try {
            if (this.tokens?.refreshToken) {
                await fetch(`${this.userServiceUrl}/api/v1/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `refreshToken=${this.tokens.refreshToken}`,
                        'X-Request-ID': uuidv4()
                    }
                });
            }
        } catch (error) {
            this.tokens = null;
            this.user = null;

            if (this.refreshTimer) {
                clearTimeout(this.refreshTimer);
                this.refreshTimer = null;
            }

            try {
                if (fs.existsSync(this.tokensFilePath)) {
                    fs.unlinkSync(this.tokensFilePath);
                }
            } catch (error) {
                console.error('토큰 파일 삭제 실패:', error);
            }
        }
    }

    destroy(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}

export default AuthTokenManager;
