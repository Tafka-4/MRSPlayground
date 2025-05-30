import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import userError from '../error/userError.js';
import authError from '../error/authError.js';

const callUserService = async (endpoint: string, options: RequestInit = {}) => {
    const userServiceUrl =
        process.env.USER_SERVICE_URL || 'http://user-service:3001';
    const response = await fetch(`${userServiceUrl}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    if (!response.ok) {
        throw new Error(`User Service error: ${response.status}`);
    }

    return response.json();
};

export const loginRequired = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return next(new userError.UserNotLoginError('Unauthorized'));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as jwt.JwtPayload;

        const user = await callUserService(`/api/v1/users/${decoded.userid}`);
        if (!user) {
            return next(new userError.UserNotFoundError('User not found'));
        }
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(
                new userError.UserTokenVerificationFailedError(
                    'Token verification failed'
                )
            );
        }
        next(error);
    }
};

export const refreshRequired = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return next(new userError.UserNotLoginError('Unauthorized'));
        }
        next();
    } catch (error) {
        next(error);
    }
};

export const adminRequired = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (req.user?.authority !== 'admin') {
            return next(new authError.AuthUserNotAdminError('Forbidden'));
        }
        next();
    } catch (error) {
        next(error);
    }
};
