import { Request, Response, NextFunction } from "express";
import { redisClient } from "../dbconnect/dbconnect.js";

const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const key = `rate_limit:${ip}`;
    const limit = 100;
    const window = 60 * 1000;

    const requests = await redisClient.get(key);
    if (requests) {
        if (parseInt(requests) >= limit) {
            res.status(429).json({ message: "Too many requests" });
            return;
        }
        await redisClient.incr(key);
    }
    await redisClient.set(key, 1, { EX: window });
    next();
};

export default rateLimit;