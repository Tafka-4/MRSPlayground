import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../dbconnect/dbconnect.js';

const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!redisClient.isOpen) {
            return next();
        }
        const ip = req.ip;
        const key = `rate_limit:${ip}`;
        const limit = 100;
        const windowSeconds = 60;

        const requests = await redisClient.get(key);
        if (requests) {
            if (parseInt(requests) >= limit) {
                res.status(429).json({ message: 'Too many requests' });
                return;
            }
            await redisClient.incr(key);
        } else {
            await redisClient.set(key, 1, { EX: windowSeconds });
        }
        next();
    } catch {
        next();
    }
};

export default rateLimit;


