import { Request, Response } from 'express';
import { Contact, IContact } from '../models/Contact.js';
import { User } from '../models/User.js';
import { sendContactReceipt, sendContactNotificationToAdmin } from '../utils/sendMail.js';
import { validatePaginationParams } from '../utils/sqlSecurity.js';

export const createContact = async (req: Request, res: Response) => {
    try {
        const { subject, category, email, message } = req.body;
        const userid = req.user?.userid;

        if (!subject || !category || !email || !message) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const newContactData: Omit<IContact, 'id' | 'status' | 'createdAt' | 'updatedAt'> = {
            subject,
            category,
            email,
            message,
            userid
        };
        
        const newContact = await Contact.create(newContactData);

        if (newContact) {
            sendContactReceipt(email, subject).catch(console.error);
            sendContactNotificationToAdmin('New Contact Form Submission', newContact).catch(console.error);
            res.status(201).json({ success: true, message: 'Contact form submitted successfully.', data: newContact });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create contact entry.' });
        }
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getAllContacts = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, status, category, sort = 'createdAt', order = 'DESC' } = req.query;
        const { page: safePage, limit: safeLimit } = validatePaginationParams(page, limit);

        const filters: any = {};
        if (status) filters.status = status;
        if (category) filters.category = category;

        const contacts = await Contact.find(filters, safeLimit, safePage, { by: sort as string, order: order as 'ASC' | 'DESC' });
        const total = await Contact.count(filters);

        res.status(200).json({
            success: true,
            data: contacts,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getContactById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findOne({ id: parseInt(id, 10) });

        if (!contact) {
            return res.status(404).json({ success: false, message: 'Contact not found' });
        }
        res.status(200).json({ success: true, data: contact });
    } catch (error) {
        console.error('Error fetching contact by ID:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const updateContactStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;
        const admin_userid = req.user?.userid;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const updateData: Partial<IContact> = { status, admin_userid };
        if (admin_notes) {
            updateData.admin_notes = admin_notes;
        }

        const affectedRows = await Contact.update({ id: parseInt(id, 10) }, updateData);

        if (affectedRows > 0) {
            const updatedContact = await Contact.findOne({ id: parseInt(id, 10) });
            res.status(200).json({ success: true, message: 'Contact status updated successfully', data: updatedContact });
        } else {
            res.status(404).json({ success: false, message: 'Contact not found or not updated' });
        }
    } catch (error) {
        console.error('Error updating contact status:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const deleteContact = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const affectedRows = await Contact.delete({ id: parseInt(id, 10) });

        if (affectedRows > 0) {
            res.status(200).json({ success: true, message: 'Contact deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Contact not found' });
        }
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}; 