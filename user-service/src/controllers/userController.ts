import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { sanitizeString, validatePaginationParams } from '../utils/sqlSecurity.js';
import { UserNotFoundError, UserForbiddenError } from '../utils/errors.js';
import { redisClient } from '../config/redis.js';

export const getUser = async (req: Request, res: Response) => {
    const { userid } = req.params;
    const user = await User.findOne({ userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    res.status(200).json({ success: true, user: user.toJSON() });
};

export const searchUsers = async (req: Request, res: Response) => {
    const { q, limit } = req.query;
    const { limit: limitNumber } = validatePaginationParams(undefined, limit as string | undefined);

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.status(400).json({ success: false, message: '검색어는 2자 이상이어야 합니다.' });
    }

    const sanitizedQuery = sanitizeString(q, 100);
    const searchQuery = {
        $or: [
            { userid: { $regex: sanitizedQuery, $options: 'i' } },
            { nickname: { $regex: sanitizedQuery, $options: 'i' } },
            { email: { $regex: sanitizedQuery, $options: 'i' } }
        ]
    };

    const users = await User.find(searchQuery as any, limitNumber);
    const total = await User.count(searchQuery as any);

    res.status(200).json({
        success: true,
        users: users.map(user => user.toJSON()),
        pagination: {
            page: 1,
            limit: limitNumber,
            total,
            totalPages: Math.ceil(total / limitNumber)
        }
    });
};

export const getUserList = async (req: Request, res: Response) => {
    const { page, limit } = req.query;
    const { page: pageNumber, limit: limitNumber } = validatePaginationParams(page as string | undefined, limit as string | undefined);

    const users = await User.find({}, limitNumber, pageNumber);
    const total = await User.count({});

    res.status(200).json({
        success: true,
        users: users.map((user) => user.toJSON()),
        pagination: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages: Math.ceil(total / limitNumber)
        }
    });
};

export const updateUser = async (req: Request, res: Response) => {
    const { nickname, description } = req.body;
    
    const user = await User.findOneAndUpdate(
        { userid: req.user?.userid },
        { nickname, description },
        { new: true }
    );
    
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    
    res.status(200).json({ success: true, user: user.toJSON() });
};

export const uploadUserProfileImage = async (req: Request, res: Response) => {
    if (!req.file) {
        throw new UserNotFoundError('No file uploaded');
    }
    const user = await User.findOne({ userid: req.user?.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    const path = await user.uploadProfileImage(req.file);
    res.status(200).json({ success: true, message: 'Profile image updated successfully', path });
};

export const deleteUserProfileImage = async (req: Request, res: Response) => {
    const user = await User.findOne({ userid: req.user?.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    await user.deleteProfileImage();
    res.status(200).json({ success: true, message: 'Profile image deleted successfully' });
};

export const deleteUser = async (req: Request, res: Response) => {
    const user = await User.findOne({ userid: req.user?.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    await User.deleteOne({ userid: user.userid });
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
};

export const getUserSecurityInfo = async (req: Request, res: Response) => {
    const user = await User.findOne({ userid: req.user?.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    const activeTokens = await user.getActiveRefreshTokens();

    res.status(200).json({
        success: true,
        securityInfo: {
            activeSessionsCount: activeTokens.length,
            lastActiveTokens: activeTokens.map((token: any) => ({
                id: token.id,
                issuedAt: token.issued_at,
                expiresAt: token.expires_at
            }))
        }
    });
};

export const cleanupMyTokens = async (req: Request, res: Response) => {
    const user = await User.findOne({ userid: req.user?.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    await user.cleanupExpiredTokens();
    res.status(200).json({ success: true, message: 'Expired tokens cleaned up successfully' });
};

export const getUserStatistics = async (req: Request, res: Response) => {
    const totalUsers = await User.count({});
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const newUsers = await User.count({ createdAt: { $gte: oneDayAgo } as any });
    
    const activeUsers = (await redisClient.keys('user:*')).length;

    res.status(200).json({
        success: true,
        statistics: {
            totalUsers,
            newUsers,
            activeUsers
        }
    });
};
