import { Request, Response } from 'express';
import crypto from 'crypto';
import Notice from '../model/noticeModel.js';
import userError from '../utils/error/userError.js';

export const createNotice = async (req: Request, res: Response) => {
    const { novelId, title, content } = req.body as any;
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');
    if (!novelId || !title || !content) return res.status(400).json({ message: 'Missing fields' });
    const notice = await Notice.create({
        noticeId: crypto.randomUUID(),
        novelId,
        author: userId,
        title,
        content
    } as any);
    res.status(201).json({ success: true, notice });
};

export const getNotice = async (req: Request, res: Response) => {
    const { noticeId } = req.params as any;
    const notice = await Notice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.status(200).json({ success: true, notice });
};

export const updateNotice = async (req: Request, res: Response) => {
    const { noticeId } = req.params as any;
    const { title, content } = req.body as any;
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');
    const updated = await Notice.findOneAndUpdate(
        { noticeId, author: userId },
        { $set: { ...(title ? { title } : {}), ...(content ? { content } : {}), updatedAt: new Date() } },
        { new: true }
    );
    if (!updated) return res.status(403).json({ message: 'Forbidden' });
    res.status(200).json({ success: true, notice: updated });
};

export const listNoticesByNovel = async (req: Request, res: Response) => {
    const { novelId } = req.params as any;
    const items = await Notice.find({ novelId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notices: items });
};

export const deleteNotice = async (req: Request, res: Response) => {
    const { noticeId } = req.params as any;
    const userId = req.user?.userid;
    if (!userId) throw new userError.UserNotLoginError('Login required');
    const result = await Notice.deleteOne({ noticeId, author: userId });
    if (result.deletedCount !== 1) return res.status(403).json({ message: 'Forbidden' });
    res.status(200).json({ success: true, message: 'Notice deleted successfully' });
};


