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
            const decoded = verifyToken(token);
            const user = await getUserFromToken(decoded);
            if (!user) {
                res.clearCookie('refreshToken');
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
