import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createHmac } from 'crypto';
import emojiError from '../utils/error/emojiError.js';

interface IEmojiPackage extends mongoose.Document {
	packageId: string;
	packageName: string;
	packageDescription: string;
	useCount: number;
	packageEmojis: Record<string, string>;
	author: string;
	createdAt: Date;
	updatedAt: Date;
    uploadEmojis(emojis: any[]): Promise<void>;
    addEmojis(emojis: any[]): Promise<void>;
	deleteEmojis(emojis: string[]): Promise<void>;
	getEmojis(): string[];
	getEmoji(emojiId: string): string;
	increaseUseCount(): Promise<void>;
}

const emojiPackageSchema = new mongoose.Schema({
	packageId: { type: String, required: true, unique: true, default: uuidv4() },
	packageName: { type: String, required: true },
	packageDescription: { type: String, required: true },
	useCount: { type: Number, default: 0 },
	author: { type: String, required: true },
	packageEmojis: { type: Object, required: true, default: {} },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now }
});

emojiPackageSchema.pre('save', async function (next) {
	(this as any).updatedAt = new Date();
	next();
});

emojiPackageSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
	try { fs.rmSync(`./uploads/emojis/${(this as any).packageId}`, { recursive: true, force: true }); } catch {}
	next();
});

emojiPackageSchema.methods.uploadEmojis = async function (emojis: any[]) {
	const emojiPaths: Record<string, string> = {};
	for (const emoji of emojis) {
		const extension = emoji.originalname.split('.').pop();
		if (!extension) throw new emojiError.EmojiInvalidExtensionError('Invalid file extension');
		if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) throw new emojiError.EmojiInvalidExtensionError('Invalid file extension');
		if (emoji.size > 1024 * 1024 * 10) throw new emojiError.EmojiUploadFailedError('Emoji is too large');
		const resizedEmojiBuffer = await sharp(emoji.buffer).resize({ width: 200, height: 200 }).withMetadata().toBuffer();
		const filename = `${createHmac('sha256', process.env.JWT_SECRET as string).update(uuidv4()).digest('hex')}.${extension}`;
        const dir = path.resolve(process.cwd(), 'uploads', 'emojis', String((this as any).packageId));
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        const diskPath = path.join(dir, filename);
        fs.writeFileSync(diskPath, resizedEmojiBuffer);
        const publicPath = `/uploads/emojis/${(this as any).packageId}/${filename}`;
        emojiPaths[uuidv4()] = publicPath;
	}
	(this as any).packageEmojis = emojiPaths;
	await (this as any).save();
};

emojiPackageSchema.methods.addEmojis = async function (emojis: any[]) {
	const emojiPaths: Record<string, string> = {};
	for (const emoji of emojis) {
		const extension = emoji.originalname.split('.').pop();
		if (!extension) throw new emojiError.EmojiInvalidExtensionError('Invalid file extension');
		if (!['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) throw new emojiError.EmojiInvalidExtensionError('Invalid file extension');
		if (emoji.size > 1024 * 1024 * 10) throw new emojiError.EmojiUploadFailedError('Emoji is too large');
		const resizedEmojiBuffer = await sharp(emoji.buffer).resize({ width: 200, height: 200 }).withMetadata().toBuffer();
		const filename = `${createHmac('sha256', process.env.JWT_SECRET as string).update(uuidv4()).digest('hex')}.${extension}`;
        const dir = path.resolve(process.cwd(), 'uploads', 'emojis', String((this as any).packageId));
        try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        const diskPath = path.join(dir, filename);
        fs.writeFileSync(diskPath, resizedEmojiBuffer);
        const publicPath = `/uploads/emojis/${(this as any).packageId}/${filename}`;
        emojiPaths[uuidv4()] = publicPath;
	}
	(this as any).packageEmojis = { ...(this as any).packageEmojis, ...emojiPaths };
	await (this as any).save();
};

emojiPackageSchema.methods.deleteEmojis = async function (emojis: string[]) {
	const objectKeys = Object.keys((this as any).packageEmojis);
	for (const emoji of emojis) {
		if (!objectKeys.includes(emoji)) throw new emojiError.EmojiNotFoundError('Emoji not found');
        try {
            const p = (this as any).packageEmojis[objectKeys.findIndex((key: string) => key === emoji)];
            const disk = p.startsWith('/uploads/') ? path.resolve(process.cwd(), p.slice(1)) : p;
            fs.unlinkSync(disk);
        } catch {}
		delete (this as any).packageEmojis[objectKeys.findIndex((key: string) => key === emoji)];
	}
	await (this as any).save();
};

emojiPackageSchema.methods.getEmojis = function () { return Object.keys((this as any).packageEmojis); };

emojiPackageSchema.methods.getEmoji = function (emojiId: string) {
	const objectKeys = Object.keys((this as any).packageEmojis);
	if (!objectKeys.includes(emojiId)) throw new emojiError.EmojiNotFoundError('Emoji not found');
	return (this as any).packageEmojis[objectKeys.findIndex((key: string) => key === emojiId)];
};

emojiPackageSchema.methods.increaseUseCount = async function () { (this as any).useCount++; await (this as any).save(); };

const EmojiPackage = mongoose.model<IEmojiPackage>('EmojiPackage', emojiPackageSchema);

export default EmojiPackage;


