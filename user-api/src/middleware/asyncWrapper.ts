import { NextFunction, Request, Response } from "express";

const asyncWrapper = (fn: (req: Request, res: Response, next: NextFunction) => any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default asyncWrapper; 