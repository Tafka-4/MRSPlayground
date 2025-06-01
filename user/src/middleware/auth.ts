import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
        userAuthority?: string;
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
            console.warn('리프레시 토큰이 없습니다');
            return res.redirect('/login');
        }

        console.log('토큰 검증 시도:', AUTH_SERVER_URL);

        const response = await fetch(AUTH_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `refreshToken=${refreshToken}`,
                'X-Request-ID': uuidv4()
            }
        });

        console.log('토큰 검증 응답 상태:', response.status);

        if (!response.ok) {
            console.warn(
                '토큰 검증 실패:',
                response.status,
                response.statusText
            );

            try {
                const errorText = await response.text();
                console.warn('에러 응답 내용:', errorText);
            } catch (e) {
                console.warn('에러 응답 내용을 읽을 수 없음');
            }

            res.clearCookie('refreshToken');
            return res.redirect('/login');
        }

        const data = await response.json();
        console.log('토큰 검증 응답 데이터:', data);

        if (!data.success) {
            console.warn('토큰 검증 실패:', data.error);
            res.clearCookie('refreshToken');
            return res.redirect('/login');
        }

        req.user = data.user;
        req.userAuthority = data.user.authority;

        console.log('토큰 검증 성공, 사용자:', data.user.nickname);
        return next();
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : '알 수 없는 오류';
        console.error('authMiddleware error:', errorMessage);

        if (error instanceof Error) {
            console.error('에러 스택:', error.stack);
        }

        return res.redirect('/login');
    }
};
