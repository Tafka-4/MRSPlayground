import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { UserNotFoundError, UserNotLoginError, UserTokenVerificationFailedError } from '../utils/errors.js';

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const loginRequired = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        res.clearCookie('refreshToken');
        throw new UserNotLoginError("Unauthorized");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        const user = await User.findOne({ userid: decoded.userid });
        if (!user) {
            res.clearCookie('refreshToken');
            throw new UserNotFoundError("User not found");
        }
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.clearCookie('refreshToken');
            throw new UserTokenVerificationFailedError("Token verification failed");
        }
        next(error);
    }
}