import { Request, Response, RequestHandler } from 'express';
import { escape } from 'html-escaper';
import { User } from '../models/User.js';
import { pool } from '../config/database.js';
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
    res.status(200).json(user.toJSON());
};

export const getUserList: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { query, limit } = req.query;

    console.log('getUserList called with query:', query, 'limit:', limit);

    let limitNumber = 10;
    if (limit) {
        const parsedLimit = parseInt(limit as string, 10);
        if (!isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100) {
            limitNumber = parsedLimit;
        } else {
            throw new UserError('Limit number must be between 1 and 100');
        }
    }

    console.log('Final limitNumber:', limitNumber);

    let searchQuery: any = {};
    if (query && typeof query === 'string' && query.trim() !== '') {
        searchQuery = { nickname: { $regex: query.trim() } };
    }

    console.log('Final searchQuery:', searchQuery);

    const users = await User.find(searchQuery, limitNumber);
    res.status(200).json(users.map((user) => user.toJSON()));
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
    res.status(200).json(user.toJSON());
};

// login required
export const uploadUserProfileImage: RequestHandler = async (
    req: RequestWithFile,
    res: Response
) => {
    const user = (req as any).user;
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    if (!req.file) {
        throw new UserError('No file uploaded');
    }

    await user.uploadProfileImage(req.file);
    res.status(200).json({
        message: 'Profile image updated successfully',
        profileImage: user.profileImage
    });
};

// login required
export const deleteUserProfileImage: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const user = (req as any).user;
    if (!user) {
        throw new UserNotFoundError('User not found');
    }
    if (!user.profileImage) {
        throw new UserImageDeleteFailedError('No profile image to delete');
    }
    await user.deleteProfileImage();
    res.status(200).json({ message: 'Profile image deleted successfully' });
};

// login required
export const deleteUser: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const user = (req as any).user;
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

    res.status(200).json({ message: 'User deleted successfully' });
};

// login required
export const getUserSecurityInfo: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const user = (req as any).user;
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
    const user = (req as any).user;
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
        const [totalUsersResult] = (await pool.execute(
            'SELECT COUNT(*) as count FROM users'
        )) as any[];
        const totalUsers = totalUsersResult[0]?.count || 0;

        const [newUsersResult] = (await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
        )) as any[];
        const newUsers = newUsersResult[0]?.count || 0;

        const [activeUsersResult] = (await pool.execute(`
            SELECT COUNT(DISTINCT rt.userid) as count 
            FROM refresh_tokens rt 
            WHERE rt.expires_at > NOW()
        `)) as any[];
        const activeUsers = activeUsersResult[0]?.count || 0;

        res.status(200).json({
            success: true,
            statistics: {
                totalUsers,
                newUsers,
                activeUsers
            }
        });
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch user statistics',
            details:
                process.env.NODE_ENV === 'development'
                    ? error
                    : 'Internal server error'
        });
    }
};
