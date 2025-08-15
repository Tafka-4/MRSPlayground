import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { UserNotFoundError, UserNotLoginError } from '../utils/errors.js';
import asyncWrapper from './asyncWrapper.js';
import {
    extractToken,
    verifyToken,
    getUserFromToken,
    isJwtError
} from '../utils/jwt.js';

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const loginRequired = asyncWrapper(
    async (req: Request, res: Response, next: NextFunction) => {
        if (req.user) {
            return next();
        }
        const token = extractToken(req);
        if (!token) {
            return next(new UserNotLoginError('Unauthorized'));
        }
        try {
            const decoded = await verifyToken(token);
            const user = await getUserFromToken(decoded);
            if (!user) {
                {
                    const isProd = process.env.NODE_ENV === 'production';
                    const clearOptions: any = {
                        httpOnly: true,
                        secure: isProd,
                        sameSite: isProd ? 'none' : 'lax',
                        path: '/'
                    };
                    if (isProd && (process as any).env.COOKIE_DOMAIN) {
                        clearOptions.domain = (process as any).env.COOKIE_DOMAIN;
                    }
                    res.clearCookie('refreshToken', clearOptions);
                }
                return next(new UserNotFoundError('User not found'));
            }
            req.user = user;
            next();
        } catch (error) {
            if (isJwtError(error)) {
                return res.status(401).json({
                    error: 'TOKEN_EXPIRED',
                    message: 'Access token has expired',
                    needRefresh: true
                });
            }
            next(error);
        }
    }
);
