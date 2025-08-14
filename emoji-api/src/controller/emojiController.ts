import { Request, Response } from 'express';
import EmojiPackage from '../model/emojiModel.js';
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


