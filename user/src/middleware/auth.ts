import { Request, Response, NextFunction } from 'express';

const AUTH_SERVER_URL =
    process.env.AUTH_SERVER_URL ||
    'http://user-service:3001/api/v1/auth/check-token';

interface UserPayload {
    userid: string;
    id: string;
    nickname: string;
    email: string;
    authority: string;
    description: string;
    profileImage: string;
}

declare module 'express' {
    interface Request {
        user?: UserPayload;
    }
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.redirect('/login');
        }

        const response = await fetch(AUTH_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `refreshToken=${refreshToken}`
            }
        });

        if (!response.ok) {
            console.warn(
                '토큰 검증 실패:',
                response.status,
                response.statusText
            );
            return res.redirect('/login');
        }

        const data = await response.json();

        if (!data.success) {
            console.warn('토큰 검증 실패:', data.error);
            return res.redirect('/login');
        }

        req.user = data.user;

        return next();
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : '알 수 없는 오류';
        console.warn('authMiddleware error:', errorMessage);
        return res.redirect('/login');
    }
};
