import { Request, Response } from 'express';
import { Guestbook, IGuestbook } from '../models/Guestbook.js';
import { User } from '../models/User.js';
import { validatePaginationParams } from '../utils/sqlSecurity.js';
import { UserNotFoundError } from '../utils/errors.js';

export const createGuestbookEntry = async (req: Request, res: Response) => {
    try {
        const { target_userid, message } = req.body;
        const sender_userid = req.user?.userid;

        if (!target_userid || !message || !sender_userid) {
            return res.status(400).json({ success: false, message: 'Target user, message, and sender are required.' });
        }
        
        if (sender_userid === target_userid) {
            return res.status(400).json({ success: false, message: 'You cannot write a guestbook entry for yourself.' });
        }

        const newEntryData: Omit<IGuestbook, 'id' | 'createdAt' | 'updatedAt'> = {
            target_userid,
            sender_userid,
            message
        };

        const newEntry = await Guestbook.create(newEntryData);

        if (newEntry) {
            res.status(201).json({ success: true, message: 'Guestbook entry created successfully.', data: newEntry });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create guestbook entry.' });
        }
    } catch (error) {
        console.error('Error creating guestbook entry:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getGuestbookEntries = async (req: Request, res: Response) => {
    try {
        const { userid } = req.params;
        const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;
        const { page: safePage, limit: safeLimit } = validatePaginationParams(page, limit);

        const filters = { target_userid: userid };
        const entries = await Guestbook.find(filters, safeLimit, safePage, { by: sort as string, order: order as 'ASC' | 'DESC' });
        const total = await Guestbook.count(filters);

        const enrichedEntries = await Promise.all(entries.map(async (entry) => {
            const sender = await User.findOne({ userid: entry.sender_userid });
            return {
                ...entry,
                sender: sender ? {
                    userid: sender.userid,
                    nickname: sender.nickname,
                    profileImage: sender.profileImage
                } : null
            };
        }));

        res.status(200).json({
            success: true,
            data: enrichedEntries,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching guestbook entries:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getMyGuestbookEntries = async (req: Request, res: Response) => {
    req.params.userid = req.user?.userid as string;
    return getGuestbookEntries(req, res);
};

export const updateGuestbookEntry = async (req: Request, res: Response) => {
    try {
        const { entryId } = req.params;
        const { message } = req.body;
        const userid = req.user?.userid;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required.' });
        }

        const entry = await Guestbook.findOne({ id: parseInt(entryId, 10) });

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Guestbook entry not found.' });
        }

        if (entry.sender_userid !== userid) {
            return res.status(403).json({ success: false, message: 'You are not authorized to edit this entry.' });
        }

        const affectedRows = await Guestbook.update({ id: parseInt(entryId, 10) }, { message });

        if (affectedRows > 0) {
            const updatedEntry = await Guestbook.findOne({ id: parseInt(entryId, 10) });
            res.status(200).json({ success: true, message: 'Guestbook entry updated successfully.', data: updatedEntry });
        } else {
            res.status(404).json({ success: false, message: 'Guestbook entry not found or not updated.' });
        }

    } catch (error) {
        console.error('Error updating guestbook entry:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const deleteGuestbookEntry = async (req: Request, res: Response) => {
    try {
        const { entryId } = req.params;
        const userid = req.user?.userid;
        const isAdmin = req.user?.authority === 'admin';

        const entry = await Guestbook.findOne({ id: parseInt(entryId, 10) });

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Guestbook entry not found.' });
        }

        if (entry.sender_userid !== userid && entry.target_userid !== userid && !isAdmin) {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this entry.' });
        }
        
        const affectedRows = await Guestbook.delete({ id: parseInt(entryId, 10) });

        if (affectedRows > 0) {
            res.status(200).json({ success: true, message: 'Guestbook entry deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Guestbook entry not found' });
        }
    } catch (error) {
        console.error('Error deleting guestbook entry:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getMyGuestbookStats = async (req: Request, res: Response) => {
    const userid = req.user?.userid;
    if (!userid) {
        throw new UserNotFoundError('사용자를 찾을 수 없습니다.');
    }

    const totalMessages = await Guestbook.count({ target_userid: userid });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMessages = await Guestbook.count({ target_userid: userid, createdAt: { $gte: sevenDaysAgo } as any });

    const entries = await Guestbook.find({ target_userid: userid });
    const uniqueSenders = new Set(entries.map(entry => entry.sender_userid));

    res.status(200).json({
        success: true,
        stats: {
            totalMessages,
            uniqueSenders: uniqueSenders.size,
            recentMessages
        }
    });
};
