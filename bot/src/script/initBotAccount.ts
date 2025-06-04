import AuthTokenManager from '../utils/authTokenManager.js';

export const initializeBotAuth = async (): Promise<AuthTokenManager> => {
    const authManager = new AuthTokenManager();

    const success = await authManager.initialize();
    if (!success) {
        throw new Error('봇 인증 시스템 초기화에 실패했습니다.');
    }

    return authManager;
};
