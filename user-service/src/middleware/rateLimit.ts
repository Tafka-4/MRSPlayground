import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.js';
import { AppError } from '../utils/errors.js';

interface RateLimitOptions {
    apiName: string;
    limit: number;
    windowSeconds: number;
}

export const rateLimitMiddleware = (options: RateLimitOptions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const userid = req.user?.userid;
        if (!userid) {
            return next(new AppError('Authentication required', 401));
        }

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const key = `ratelimit:${options.apiName}:${userid}:${today}`;
        
        try {
            const current = await redisClient.get(key);
            const count = current ? parseInt(current, 10) : 0;

            if (count >= options.limit) {
                return next(new AppError(`Rate limit exceeded. Try again tomorrow.`, 429));
            }

            const multi = redisClient.multi();
            multi.incr(key);
            if (count === 0) {
                multi.expire(key, options.windowSeconds);
            }
            await multi.exec();
            
            next();
        } catch (error) {
            console.error('Error in rate limit middleware:', error);
            next(new AppError('Internal server error during rate limiting', 500));
        }
    };
}; 