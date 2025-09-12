import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
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

export const identify = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (req.user) {
            return next();
        }

        const token = extractToken(req);
        if (!token) {
            return next();
        }

        const decoded = await verifyToken(token);
        const user = await getUserFromToken(decoded);
        if (user) {
            req.user = user;
        }
        return next();
    } catch (error) {
        if (isJwtError(error)) {
            return next();
        }

        return next(error);
    }
};
