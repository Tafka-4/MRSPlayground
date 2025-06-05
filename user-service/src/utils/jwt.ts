import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { User } from '../models/User.js';
import { redisClient } from '../config/redis.js';

export interface JwtPayload {
    userid: string;
    iat?: number;
    exp?: number;
}

export const extractToken = (req: Request): string | null => {
    return req.headers.authorization?.split(' ')[1] || null;
};

export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, process.env.JWT_SECRET as string, {
        algorithms: ['HS256']
    }) as JwtPayload;
};

export const getUserFromToken = async (
    decoded: JwtPayload
): Promise<User | null> => {
    const cachedUser = await redisClient.get(`user:${decoded.userid}`);
    if (cachedUser) {
        return JSON.parse(cachedUser);
    }

    const user = await User.findOne({ userid: decoded.userid });
    if (user) {
        await redisClient.set(`user:${decoded.userid}`, JSON.stringify(user), {
            EX: 60 * 30
        });
    }

    return user;
};

export const isJwtError = (error: any): error is jwt.JsonWebTokenError => {
    return error instanceof jwt.JsonWebTokenError;
};
