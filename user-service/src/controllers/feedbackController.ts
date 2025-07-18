import { Request, Response } from 'express';
import { Feedback, IFeedback } from '../models/Feedback.js';
import { validatePaginationParams } from '../utils/sqlSecurity.js';
import { User } from '../models/User.js';

export const createFeedback = async (req: Request, res: Response) => {
    try {
        const { title, type, priority, description, steps_to_reproduce, expected_behavior, actual_behavior, browser_info } = req.body;
        const userid = req.user?.userid;

        if (!title || !type || !description) {
            return res.status(400).json({ success: false, message: 'Title, type, and description are required' });
        }

        const newFeedbackData: Omit<IFeedback, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
            title,
            type,
            priority: priority || 'medium',
            description,
            steps_to_reproduce,
            expected_behavior,
            actual_behavior,
            browser_info,
            userid
        };
        
        const newFeedback = await Feedback.create(newFeedbackData);

        if (newFeedback) {
            res.status(201).json({ success: true, message: 'Feedback submitted successfully.', data: newFeedback });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create feedback entry.' });
        }
    } catch (error) {
        console.error('Error creating feedback:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getAllFeedback = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, status, type, priority, sort = 'createdAt', order = 'DESC' } = req.query;
        const { page: safePage, limit: safeLimit } = validatePaginationParams(page, limit);

        const filters: any = {};
        if (status) filters.status = status;
        if (type) filters.type = type;
        if (priority) filters.priority = priority;

        const feedbackList = await Feedback.find(filters, safeLimit, safePage, { by: sort as string, order: order as 'ASC' | 'DESC' });
        const total = await Feedback.count(filters);

        res.status(200).json({
            success: true,
            data: feedbackList,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getFeedbackById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findOne({ id: parseInt(id, 10) });

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }
        res.status(200).json({ success: true, data: feedback });
    } catch (error) {
        console.error('Error fetching feedback by ID:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const updateFeedback = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const admin_userid = req.user?.userid;
        
        const updateData: Partial<IFeedback> = { ...req.body, admin_userid };

        const affectedRows = await Feedback.update({ id: parseInt(id, 10) }, updateData);

        if (affectedRows > 0) {
            const updatedFeedback = await Feedback.findOne({ id: parseInt(id, 10) });
            res.status(200).json({ success: true, message: 'Feedback updated successfully', data: updatedFeedback });
        } else {
            res.status(404).json({ success: false, message: 'Feedback not found or not updated' });
        }
    } catch (error) {
        console.error('Error updating feedback:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const deleteFeedback = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const affectedRows = await Feedback.delete({ id: parseInt(id, 10) });

        if (affectedRows > 0) {
            res.status(200).json({ success: true, message: 'Feedback deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Feedback not found' });
        }
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}; 