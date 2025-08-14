import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { mongoose, redisClient } from '../utils/dbconnect/dbconnect.js';
import postError from '../utils/error/postError.js';

dotenv.config();

export interface IPost {
	postId: string;
	galleryId: string;
	author: string;
	title: string;
	content: string;
	viewCount: number;
	likeCount: number;
	dislikeCount: number;
	isImageUploaded: boolean;
	isHidden: boolean;
	clientInfo: { ip: string; userAgent: string };
	tempPassword: string;
	createdAt: Date;
	updatedAt: Date;
	like(userId: string): Promise<void>;
	dislike(userId: string): Promise<void>;
	increaseViewCount(): Promise<void>;
}

const postSchema = new mongoose.Schema({
	postId: { type: String, required: true, unique: true, default: uuidv4() },
	galleryId: { type: String, required: true },
	author: { type: String, required: true },
	title: { type: String, required: true },
	content: { type: String, required: true },
	viewCount: { type: Number, default: 0 },
	likeCount: { type: Number, default: 0 },
	dislikeCount: { type: Number, default: 0 },
	isImageUploaded: { type: Boolean, default: false },
	isHidden: { type: Boolean, default: false },
	clientInfo: { ip: { type: String, required: false }, userAgent: { type: String, required: false } },
	tempPassword: { type: String, default: '', required: false },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

postSchema.pre('save', async function (this: any, next: any) {
	if ((this as any).isImageUploaded) {
		try { fs.rmSync(`./uploads/post/${(this as any).galleryId}/${(this as any).postId}`, { recursive: true, force: true }); } catch {}
	}
	const uploadFiles = (this as any).content.match(/<img src="data:image\/(png|jpeg|webp|gif);base64,([^"]+)"/g);
	if (!uploadFiles) { next(); return; }
	for (const file of uploadFiles) {
		const typeMatch = file.match(/data:image\/(png|jpeg|webp|gif);base64,/);
		if (!typeMatch) continue;
		const imageType = typeMatch[1];
		const base64Data = file.replace(/^<img src=\"data:image\/(png|jpeg|webp|gif);base64,/, '').replace(/\"$/, '');
		const diskPath = path.resolve(process.cwd(), 'uploads', 'post', String((this as any).galleryId), String((this as any).postId));
		try { fs.mkdirSync(diskPath, { recursive: true }); } catch {}
		const filename = `${uuidv4()}.${imageType}`;
		const filePath = path.join(diskPath, filename);
		try {
			const fileBuffer = Buffer.from(base64Data, 'base64');
			if (fileBuffer.length > 10 * 1024 * 1024) throw new postError.PostUploadFailedError('Image size is too large');
			fs.writeFile(filePath, fileBuffer, (err: any) => {
				if (err) throw new postError.PostUploadFailedError('Failed to upload image');
				const publicPath = `/uploads/post/${(this as any).galleryId}/${(this as any).postId}/${filename}`;
				(this as any).content = (this as any).content.replace(file, `<img src="${publicPath}">`);
			});
		} catch (error) {
			throw new postError.PostUploadFailedError('Failed to upload image');
		}
	}
	(this as any).isImageUploaded = true;
	(this as any).updatedAt = new Date();
	next();
});

postSchema.pre('deleteOne', { document: true, query: false }, async function (this: any, next: any) {
	try {
		if ((this as any).isImageUploaded) {
			fs.rmSync(`./uploads/post/${(this as any).galleryId}/${(this as any).postId}`, { recursive: true, force: true });
		}
	} catch {
		throw new postError.PostDeleteFailedError('Failed to delete image');
	}
	next();
});

postSchema.methods.like = async function (userId: string): Promise<void> {
	const resultLike = await redisClient.sAdd(`${this.galleryId}:${this.postId}:likes`, userId);
	const resultDislike = await redisClient.sRem(`${this.galleryId}:${this.postId}:dislikes`, userId);
	if (resultDislike) { this.dislikeCount--; }
	if (!resultLike) throw new postError.PostInteractionFailedError('Already liked');
	this.likeCount++;
};

postSchema.methods.dislike = async function (userId: string): Promise<void> {
	const resultDislike = await redisClient.sAdd(`${this.galleryId}:${this.postId}:dislikes`, userId);
	const resultLike = await redisClient.sRem(`${this.galleryId}:${this.postId}:likes`, userId);
	if (resultLike) { this.likeCount--; }
	if (!resultDislike) throw new postError.PostInteractionFailedError('Already disliked');
	this.dislikeCount++;
};

postSchema.methods.increaseViewCount = async function (): Promise<void> {
	this.viewCount++;
	await this.save();
};

export default Post;


