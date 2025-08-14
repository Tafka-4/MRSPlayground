import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { UserNotLoginError, UserNotAdminError } from '../utils/errors.js';
import asyncWrapper from './asyncWrapper.js';

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const adminRequired = asyncWrapper(
    async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            return next(new UserNotLoginError('Unauthorized'));
        }
        if (user.authority !== 'admin' && user.authority !== 'bot') {
            throw new UserNotAdminError('관리자 권한이 필요합니다');
        }
        next();
    }
);
