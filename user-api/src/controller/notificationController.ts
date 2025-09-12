import { Request, Response } from 'express';

export const listSelfNotifications = async (req: Request, res: Response) => {
    const userid = req.user?.userid;
    if (!userid) return res.status(401).json({ message: 'Unauthorized' });
    res.status(200).json({ success: true, notifications: [] });
};

export const listUserNotifications = async (req: Request, res: Response) => {
    const { userid } = req.params as any;
    res.status(200).json({ success: true, notifications: [] });
};

export const queryNotifications = async (req: Request, res: Response) => {
    const { userId } = req.query as any;
    res.status(200).json({ success: true, notifications: [] });
};


