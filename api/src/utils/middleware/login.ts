import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import userError from "../error/userError.js";
import authError from "../error/authError.js";

// User Service API 호출을 위한 헬퍼 함수
const callUserService = async (endpoint: string, options: RequestInit = {}) => {
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001';
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

export const loginRequired = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        throw new userError.UserNotLoginError("Unauthorized");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        
        // User Service에서 사용자 정보 조회
        const user = await callUserService(`/api/users/${decoded.userid}`);
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
    // 추가 구현 필요시 여기에 작성
    next();
}

export const adminRequired = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.authority !== "admin") {
        throw new authError.AuthUserNotAdminError("Forbidden");
    }
    next();
}