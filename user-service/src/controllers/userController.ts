import { Request, Response, RequestHandler } from 'express';
import { escape } from 'html-escaper';
import { User } from '../models/User.js';
import { pool } from '../config/database.js';
import { redisClient } from '../config/redis.js';
import { sanitizeString } from '../utils/sqlSecurity.js';
import {
    UserError,
    UserNotFoundError,
    UserForbiddenError,
    UserImageDeleteFailedError
} from '../utils/errors.js';

interface RequestWithFile extends Request {
    file?: Express.Multer.File;
}

export const getUser: RequestHandler = async (req: Request, res: Response) => {
    const { userid } = req.params;
    const user = await User.findOne({ userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    res.status(200).json({
        success: true,
        user: user.toJSON()
    });
};

export const getUserList: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { query, limit, page } = req.query;

    console.log('getUserList called with query:', query, 'limit:', limit, 'page:', page);

    // Validate limit
    let limitNumber = 10;
    if (limit) {
        const parsedLimit = parseInt(limit as string, 10);
        if (!isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 50) {
            limitNumber = parsedLimit;
        } else {
            throw new UserError('Limit number must be between 1 and 50');
        }
    }

    // Validate page
    let pageNumber = 1;
    if (page) {
        const parsedPage = parseInt(page as string, 10);
        if (!isNaN(parsedPage) && parsedPage >= 1) {
            pageNumber = parsedPage;
        }
    }

    // If no search query, require specific permission (prevent loading all users)
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        const currentUser = (req as any).user;
        if (!currentUser || currentUser.authority !== 'admin') {
            res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters long'
            });
            return;
        }
    }

    let searchQuery: any = {};
    if (query && typeof query === 'string' && query.trim() !== '') {
        const sanitizedQuery = sanitizeString(query, 100);
        searchQuery = { nickname: { $regex: sanitizedQuery } };
    }

    console.log('Final searchQuery:', searchQuery);
    console.log('limitNumber:', limitNumber);
    console.log('pageNumber:', pageNumber);

    const users = await User.find(searchQuery, limitNumber, pageNumber);
    res.status(200).json({
        success: true,
        users: users.map((user) => user.toJSON()),
        pagination: {
            page: pageNumber,
            limit: limitNumber,
            hasMore: users.length === limitNumber
        }
    });
};

// login required
export const updateUser: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { nickname, description } = req.body;
    const currentUser = (req as any).user;
    const user = await User.findOneAndUpdate(
        { userid: currentUser?.userid },
        { nickname, description },
        { new: true }
    );
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    if (user.userid !== currentUser?.userid) {
        throw new UserForbiddenError('You are not allowed to update this user');
    }
    res.status(200).json({
        success: true,
        user: user.toJSON()
    });
};

// login required
export const uploadUserProfileImage: RequestHandler = async (
    req: RequestWithFile,
    res: Response
) => {
    const currentUser = (req as any).user;
    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }
    if (!req.file) {
        throw new UserError('No file uploaded');
    }

    const user = await User.findOne({ userid: currentUser.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    await user.uploadProfileImage(req.file);
    res.status(200).json({
        success: true,
        message: 'Profile image updated successfully',
        profileImage: user.profileImage
    });
};

// login required
export const deleteUserProfileImage: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const currentUser = (req as any).user;
    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }
    if (!currentUser.profileImage) {
        throw new UserImageDeleteFailedError('No profile image to delete');
    }

    const user = await User.findOne({ userid: currentUser.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    await user.deleteProfileImage();
    res.status(200).json({
        success: true,
        message: 'Profile image deleted successfully'
    });
};

// login required
export const deleteUser: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const currentUser = (req as any).user;
    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }

    const user = await User.findOne({ userid: currentUser.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    await user.cleanupExpiredTokens();

    await User.deleteOne({ userid: user.userid });

    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
};

// login required
export const getUserSecurityInfo: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const currentUser = (req as any).user;
    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }

    const user = await User.findOne({ userid: currentUser.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    const activeTokens = await user.getActiveRefreshTokens();

    res.status(200).json({
        success: true,
        message: 'User security information',
        securityInfo: {
            userid: user.userid,
            activeSessionsCount: activeTokens.length,
            lastActiveTokens: activeTokens.map((token: any) => ({
                id: token.id,
                issuedAt: token.issued_at,
                expiresAt: token.expires_at
            }))
        }
    });
};

// login required
export const cleanupMyTokens: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const currentUser = (req as any).user;
    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }

    const user = await User.findOne({ userid: currentUser.userid });
    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    await user.cleanupExpiredTokens();

    res.status(200).json({
        success: true,
        message: 'Expired tokens cleaned up successfully'
    });
};

// admin required
export const getUserStatistics: RequestHandler = async (
    req: Request,
    res: Response
) => {
    try {
        const cacheKey = 'user_statistics';
        
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                const statistics = JSON.parse(cachedData);
                res.status(200).json({
                    success: true,
                    statistics,
                    cached: true
                });
                return;
            }
        } catch (cacheError) {
            console.warn('Redis cache error, falling back to database:', cacheError);
        }

        // Execute all queries in parallel for better performance
        const [totalUsersResult, newUsersResult, activeUsersResult] = await Promise.all([
            pool.execute('SELECT COUNT(*) as total FROM users'),
            pool.execute('SELECT COUNT(*) as total FROM users WHERE DATE(createdAt) = CURDATE()'),
            pool.execute('SELECT COUNT(DISTINCT userid) as total FROM refresh_tokens WHERE expires_at > NOW() AND issued_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)')
        ]);

        const totalUsers = (totalUsersResult[0] as any[])[0]?.total || 0;
        const newUsers = (newUsersResult[0] as any[])[0]?.total || 0;
        const activeUsers = (activeUsersResult[0] as any[])[0]?.total || 0;

        const statistics = {
            totalUsers,
            newUsers,
            activeUsers
        };

        try {
            await redisClient.set(cacheKey, JSON.stringify(statistics), {
                EX: 300
            });
        } catch (cacheError) {
            console.warn('Failed to cache user statistics:', cacheError);
        }

        res.status(200).json({
            success: true,
            statistics,
            cached: false
        });
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user statistics',
            details:
                process.env.NODE_ENV === 'development'
                    ? String(error)
                    : 'Internal server error'
        });
    }
};

// Admin required
export const searchUsers: RequestHandler = async (
    req: Request,
    res: Response
) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            res.status(400).json({
                success: false,
                error: 'Query parameter "q" must be at least 2 characters long'
            });
            return;
        }

        const searchQuery = sanitizeString(q, 100);
        const limitNumber = Math.min(parseInt(limit as string) || 10, 50);

        const [users] = (await pool.execute(
            `SELECT userid, id, nickname, email, createdAt 
             FROM users 
             WHERE (userid LIKE ? OR nickname LIKE ? OR id LIKE ?) 
             ORDER BY 
                CASE 
                    WHEN userid = ? THEN 1
                    WHEN nickname = ? THEN 2
                    WHEN id = ? THEN 3
                    ELSE 4
                END,
                createdAt DESC
             LIMIT ?`,
            [
                `%${searchQuery}%`,
                `%${searchQuery}%`,
                `%${searchQuery}%`,
                searchQuery,
                searchQuery,
                searchQuery,
                limitNumber
            ]
        )) as any[];

        res.status(200).json({
            success: true,
            users: users.map((user: any) => ({
                userid: user.userid,
                nickname: user.nickname,
                loginId: user.id,
                email: user.email,
                createdAt: user.createdAt
            }))
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search users',
            details:
                process.env.NODE_ENV === 'development'
                    ? String(error)
                    : 'Internal server error'
        });
    }
};
