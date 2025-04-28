import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../../model/userModel.js";
import userError from "../error/userError.js";
import authError from "../error/authError.js";

export const loginRequired = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new userError.UserNotLoginError("Unauthorized");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        const user = await User.findOne({ userid: decoded.userid });
        if (!user) {
            throw new userError.UserNotFoundError("User not found");
        }
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new userError.UserTokenVerificationFailedError("Token verification failed");
        }
        throw error;
    }
}

export const refreshRequired = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new userError.UserNotLoginError("Unauthorized");
    }
    
}

export const adminRequired = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.authority !== "admin") {
        throw new authError.AuthUserNotAdminError("Forbidden");
    }
    next();
}