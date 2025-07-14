import { Request, Response, RequestHandler } from 'express';
import { escape } from 'html-escaper';
import { User } from '../models/User.js';
import { pool } from '../config/database.js';
import {
    GuestbookError,
    GuestbookNotFoundError,
    GuestbookForbiddenError,
    UserNotFoundError
} from '../utils/errors.js';

export interface IGuestbookEntry {
    id: number;
    target_userid: string;
    sender_userid: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IGuestbookEntryWithUser extends IGuestbookEntry {
    sender_nickname: string;
    sender_profileImage: string;
}

export const getGuestbookEntries: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { userid } = req.params;
    const { page = '1', limit = '10' } = req.query;

    const targetUser = await User.findOne({ userid });
    if (!targetUser) {
        throw new UserNotFoundError('Target user not found');
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1) {
        throw new GuestbookError('Invalid page number');
    }
    
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
        throw new GuestbookError('Limit must be between 1 and 50');
    }

    const offset = (pageNumber - 1) * limitNumber;
    
    const limitValue = Number(limitNumber);
    const offsetValue = Number(offset);

    const [entries] = await pool.execute(
        `SELECT g.*, u.nickname as sender_nickname, u.profileImage as sender_profileImage
         FROM guestbook g
         JOIN users u ON g.sender_userid = u.userid
         WHERE g.target_userid = ?
         ORDER BY g.createdAt DESC
         LIMIT ? OFFSET ?`,
        [userid, limitValue, offsetValue]
    );

    const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM guestbook WHERE target_userid = ?',
        [userid]
    );
    const totalCount = (countResult as any[])[0]?.total || 0;

    res.status(200).json({
        success: true,
        data: entries,
        pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(totalCount / limitNumber),
            totalItems: totalCount,
            itemsPerPage: limitNumber
        }
    });
};

export const createGuestbookEntry: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { target_userid } = req.params;
    const { message } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new GuestbookError('Message is required');
    }

    if (message.trim().length > 1000) {
        throw new GuestbookError('Message cannot exceed 1000 characters');
    }

    const targetUser = await User.findOne({ userid: target_userid });
    if (!targetUser) {
        throw new UserNotFoundError('Target user not found');
    }

    if (currentUser.userid === target_userid) {
        throw new GuestbookError('Cannot write message to your own guestbook');
    }

    const escapedMessage = escape(message.trim());

    const [result] = await pool.execute(
        'INSERT INTO guestbook (target_userid, sender_userid, message) VALUES (?, ?, ?)',
        [target_userid, currentUser.userid, escapedMessage]
    );

    const insertResult = result as any;
    const entryId = insertResult.insertId;

    const [entries] = await pool.execute(
        `SELECT g.*, u.nickname as sender_nickname, u.profileImage as sender_profileImage
         FROM guestbook g
         JOIN users u ON g.sender_userid = u.userid
         WHERE g.id = ?`,
        [entryId]
    );

    const createdEntry = (entries as IGuestbookEntryWithUser[])[0];

    res.status(201).json({
        success: true,
        message: 'Guestbook entry created successfully',
        data: createdEntry
    });
};

export const updateGuestbookEntry: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { entryId } = req.params;
    const { message } = req.body;
    const currentUser = (req as any).user;
    
    const entryIdNum = parseInt(entryId, 10);
    if (isNaN(entryIdNum) || entryIdNum < 1) {
        throw new GuestbookError('Invalid entry ID');
    }

    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new GuestbookError('Message is required');
    }

    if (message.trim().length > 1000) {
        throw new GuestbookError('Message cannot exceed 1000 characters');
    }

    const [entries] = await pool.execute(
        'SELECT * FROM guestbook WHERE id = ?',
        [entryIdNum]
    );

    const entry = (entries as IGuestbookEntry[])[0];
    if (!entry) {
        throw new GuestbookNotFoundError('Guestbook entry not found');
    }

    if (entry.sender_userid !== currentUser.userid) {
        throw new GuestbookForbiddenError('You can only edit your own messages');
    }

    const escapedMessage = escape(message.trim());

    await pool.execute(
        'UPDATE guestbook SET message = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [escapedMessage, entryIdNum]
    );

    const [updatedEntries] = await pool.execute(
        `SELECT g.*, u.nickname as sender_nickname, u.profileImage as sender_profileImage
         FROM guestbook g
         JOIN users u ON g.sender_userid = u.userid
         WHERE g.id = ?`,
        [entryIdNum]
    );

    const updatedEntry = (updatedEntries as IGuestbookEntryWithUser[])[0];

    res.status(200).json({
        success: true,
        message: 'Guestbook entry updated successfully',
        data: updatedEntry
    });
};

export const deleteGuestbookEntry: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { entryId } = req.params;
    const currentUser = (req as any).user;

    const entryIdNum = parseInt(entryId, 10);
    if (isNaN(entryIdNum) || entryIdNum < 1) {
        throw new GuestbookError('Invalid entry ID');
    }

    if (!currentUser) {
        throw new UserNotFoundError('User not found');
    }

    const [entries] = await pool.execute(
        'SELECT * FROM guestbook WHERE id = ?',
        [entryIdNum]
    );

    const entry = (entries as IGuestbookEntry[])[0];
    if (!entry) {
        throw new GuestbookNotFoundError('Guestbook entry not found');
    }

    if (entry.sender_userid !== currentUser.userid && entry.target_userid !== currentUser.userid) {
        throw new GuestbookForbiddenError('You can only delete your own messages or messages on your guestbook');
    }

    await pool.execute('DELETE FROM guestbook WHERE id = ?', [entryIdNum]);

    res.status(200).json({
        success: true,
        message: 'Guestbook entry deleted successfully'
    });
};

export const getGuestbookEntry: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { entryId } = req.params;

    const entryIdNum = parseInt(entryId, 10);
    if (isNaN(entryIdNum) || entryIdNum < 1) {
        throw new GuestbookError('Invalid entry ID');
    }

    const [entries] = await pool.execute(
        `SELECT g.*, u.nickname as sender_nickname, u.profileImage as sender_profileImage
         FROM guestbook g
         JOIN users u ON g.sender_userid = u.userid
         WHERE g.id = ?`,
        [entryIdNum]
    );

    const entry = (entries as IGuestbookEntryWithUser[])[0];
    if (!entry) {
        throw new GuestbookNotFoundError('Guestbook entry not found');
    }

    res.status(200).json({
        success: true,
        data: entry
    });
};

export const getGuestbookStatistics: RequestHandler = async (
    req: Request,
    res: Response
) => {
    const { userid } = req.params;

    const targetUser = await User.findOne({ userid });
    if (!targetUser) {
        throw new UserNotFoundError('Target user not found');
    }

    const [totalResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM guestbook WHERE target_userid = ?',
        [userid]
    );
    const totalEntries = (totalResult as any[])[0]?.total || 0;

    const [sendersResult] = await pool.execute(
        'SELECT COUNT(DISTINCT sender_userid) as unique_senders FROM guestbook WHERE target_userid = ?',
        [userid]
    );
    const uniqueSenders = (sendersResult as any[])[0]?.unique_senders || 0;

    const [recentResult] = await pool.execute(
        'SELECT COUNT(*) as recent FROM guestbook WHERE target_userid = ? AND createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        [userid]
    );
    const recentEntries = (recentResult as any[])[0]?.recent || 0;

    const userCreatedAt = targetUser.createdAt || new Date();
    const daysSinceCreation = Math.max(1, Math.ceil((Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)));
    const averagePerDay = totalEntries > 0 ? (totalEntries / daysSinceCreation).toFixed(2) : '0';

    res.status(200).json({
        success: true,
        data: {
            totalEntries,
            uniqueSenders,
            recentEntries,
            averagePerDay
        }
    });
};
