import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { UserNotFoundError, UserNotLoginError, UserTokenVerificationFailedError,UserNotAdminError } from '../utils/errors.js';
import asyncWrapper from './asyncWrapper.js';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const adminRequired = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return next(new UserNotLoginError("Unauthorized"));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        const user = await User.findOne({ userid: decoded.userid });
        if (!user) {
            return next(new UserNotFoundError("User not found"));
        }
        if (user.authority !== "admin") {
            return next(new UserNotAdminError("Unauthorized"));
        }
        req.user = user;
        next();
    } catch (error) {
        next(new UserTokenVerificationFailedError("Invalid token"));
    }
});
