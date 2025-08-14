import { Request, Response } from 'express';
import EmojiPackage from '../model/emojiModel.js';
import EmojiFavorite from '../model/emojiFavoriteModel.js';
import emojiError from '../utils/error/emojiError.js';

export const createEmojiPackage = async (req: Request, res: Response) => {
	const { packageName, packageDescription, emojis } = req.body;
	const userId = req.user?.userid;
	if (!packageName || !packageDescription || !emojis) throw new emojiError.EmojiError('Invalid package name or description or emojis');
	const emojiPackage = await EmojiPackage.create({ packageName, packageDescription, packageEmojis: {}, author: userId });
	await emojiPackage.uploadEmojis(emojis);
	res.status(201).json(emojiPackage);
};

export const getEmojiPackage = async (req: Request, res: Response) => {
	const { packageId } = req.params;
	const emojiPackage = await EmojiPackage.findOne({ packageId });
	if (!emojiPackage) throw new emojiError.EmojiPackageNotFoundError('Emoji package not found');
	res.status(200).json(emojiPackage);
};

export const getEmojiPackageList = async (req: Request, res: Response) => {
	const { limit, page, sort, search, searchQuery } = req.query as Record<string, string>;
	const limitNumber = parseInt(limit || '') || 10;
	const pageNumber = parseInt(page || '') || 1;
	const sortType = (sort as 'asc' | 'desc') || 'asc';
	const searchType = (search as 'packageName' | 'author') || '';
	const searchValue = searchQuery || '';
	const query: any = {};
	if (searchType && searchValue) query[searchType] = { $regex: searchValue, $options: 'i' };
	const emojiPackages = await EmojiPackage.find(query).sort({ createdAt: sortType }).skip((pageNumber - 1) * limitNumber).limit(limitNumber);
	res.status(200).json(emojiPackages);
};

export const updateEmojiPackage = async (req: Request, res: Response) => {
	const { packageId } = req.params;
	const { packageName, packageDescription, emojis } = req.body;
	const userId = req.user?.userid;
	const emojiPackage = await EmojiPackage.findOne({ packageId });
	if (!emojiPackage) throw new emojiError.EmojiError('Emoji package not found');
	if (emojiPackage.author !== userId) throw new emojiError.EmojiError('You are not the author of this emoji package');
	if (packageName) (emojiPackage as any).packageName = packageName;
	if (packageDescription) (emojiPackage as any).packageDescription = packageDescription;
	if (emojis) await (emojiPackage as any).addEmojis(emojis);
	await (emojiPackage as any).save();
	res.status(200).json(emojiPackage);
};

export const deleteEmojis = async (req: Request, res: Response) => {
	const { packageId, emojis } = req.body;
	const userId = req.user?.userid;
	const emojiPackage = await EmojiPackage.findOne({ packageId });
	if (!emojiPackage) throw new emojiError.EmojiError('Emoji package not found');
	if ((emojiPackage as any).author !== userId) throw new emojiError.EmojiError('You are not the author of this emoji package');
	await (emojiPackage as any).deleteEmojis(emojis);
	await (emojiPackage as any).save();
	res.status(200).json({ message: 'Emoji package deleted successfully' });
};

export const deleteEmojiPackage = async (req: Request, res: Response) => {
	const { packageId } = req.params;
	const userId = req.user?.userid;
	const emojiPackage = await EmojiPackage.findOne({ packageId });
	if (!emojiPackage) throw new emojiError.EmojiError('Emoji package not found');
	if ((emojiPackage as any).author !== userId) throw new emojiError.EmojiError('You are not the author of this emoji package');
	await (emojiPackage as any).deleteOne();
	res.status(200).json({ message: 'Emoji package deleted successfully' });
};

// login required
export const getFavoriteEmojiPackages = async (req: Request, res: Response) => {
    const userId = req.user?.userid;
    if (!userId) throw new emojiError.EmojiError('Unauthorized');

    const {
        page = '1',
        limit = '10',
        sort = 'createdAt',
        order = 'desc',
        q = '',
        ids = ''
    } = req.query as Record<string, string>;

    const limitNumber = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const allowedSortFields = ['createdAt', 'useCount', 'packageName'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder: 'asc' | 'desc' = order === 'asc' ? 'asc' : 'desc';

    const query: any = {};
    if (ids) {
        const idList = (Array.isArray(ids) ? ids : String(ids))
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        if (idList.length > 0) query.packageId = { $in: idList };
    } else {
        query.author = userId;
    }
    if (q) query.packageName = { $regex: q, $options: 'i' };

    const [items, total] = await Promise.all([
        EmojiPackage.find(query)
            .sort({ [sortField]: sortOrder })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean(),
        EmojiPackage.countDocuments(query)
    ]);

    res.status(200).json({
        items,
        meta: {
            page: pageNumber,
            limit: limitNumber,
            total,
            pages: Math.ceil(total / limitNumber)
        }
    });
};

// login required
export const markFavorite = async (req: Request, res: Response) => {
    const userId = req.user?.userid;
    const { packageId } = req.body as { packageId: string };
    if (!userId) throw new emojiError.EmojiError('Unauthorized');
    if (!packageId) throw new emojiError.EmojiError('packageId is required');

    const exists = await EmojiPackage.findOne({ packageId }).lean();
    if (!exists) throw new emojiError.EmojiPackageNotFoundError('Emoji package not found');

    await EmojiFavorite.updateOne(
        { userId, packageId },
        { $set: { userId, packageId } },
        { upsert: true }
    );

    res.status(200).json({ ok: true });
};

// login required
export const unmarkFavorite = async (req: Request, res: Response) => {
    const userId = req.user?.userid;
    const { packageId } = req.params as { packageId: string };
    if (!userId) throw new emojiError.EmojiError('Unauthorized');
    if (!packageId) throw new emojiError.EmojiError('packageId is required');

    await EmojiFavorite.deleteOne({ userId, packageId });
    res.status(200).json({ ok: true });
};

// login required
export const listFavoriteEmojiPackages = async (req: Request, res: Response) => {
    const userId = req.user?.userid;
    if (!userId) throw new emojiError.EmojiError('Unauthorized');

    const { page = '1', limit = '10' } = req.query as Record<string, string>;
    const limitNumber = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const pageNumber = Math.max(parseInt(page) || 1, 1);

    const [favDocs, total] = await Promise.all([
        EmojiFavorite.find({ userId })
            .sort({ createdAt: 'desc' })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean(),
        EmojiFavorite.countDocuments({ userId })
    ]);

    const packageIds = favDocs.map((d) => d.packageId);
    const packages = packageIds.length
        ? await EmojiPackage.find({ packageId: { $in: packageIds } }).lean()
        : [];

    const byId = new Map(packages.map((p: any) => [p.packageId, p]));
    const items = favDocs.map((f) => byId.get(f.packageId)).filter(Boolean);

    res.status(200).json({
        items,
        meta: {
            page: pageNumber,
            limit: limitNumber,
            total,
            pages: Math.ceil(total / limitNumber)
        }
    });
};
