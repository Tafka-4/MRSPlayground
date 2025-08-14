import Novel, { INovel } from '../model/novelModel.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NovelRecord {
	novelId: string;
	title: string;
	description: string;
	thumbnailImage: string;
	episodeCount: number;
	viewCount: number;
	likeCount: number;
	dislikeCount: number;
	favoriteCount: number;
	author: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface NovelRepo {
	create(data: Omit<NovelRecord, 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'dislikeCount' | 'favoriteCount' | 'episodeCount'>): Promise<NovelRecord>;
	findById(novelId: string): Promise<NovelRecord | null>;
	increaseView(novelId: string): Promise<void>;
	updateIfAuthor(novelId: string, author: string, data: Partial<Pick<NovelRecord, 'title' | 'description'>>): Promise<NovelRecord | null>;
	deleteIfAuthor(novelId: string, author: string): Promise<boolean>;
}

class MongooseNovelRepo implements NovelRepo {
	async create(data: any): Promise<NovelRecord> {
		const created = await Novel.create({ ...data, status: 'ongoing' });
		return created.toObject() as unknown as NovelRecord;
	}
	async findById(novelId: string): Promise<NovelRecord | null> {
		const doc = await Novel.findOne({ novelId });
		return doc ? (doc.toObject() as unknown as NovelRecord) : null;
	}
	async increaseView(novelId: string): Promise<void> {
		await Novel.findOneAndUpdate({ novelId }, { $inc: { viewCount: 1 } }, { new: false });
	}
	async updateIfAuthor(novelId: string, author: string, data: any): Promise<NovelRecord | null> {
		const updated = await Novel.findOneAndUpdate({ novelId, author }, { $set: { ...data, updatedAt: new Date() } }, { new: true });
		return updated ? (updated.toObject() as unknown as NovelRecord) : null;
	}
	async deleteIfAuthor(novelId: string, author: string): Promise<boolean> {
		const novel = await Novel.findOne({ novelId }).select('author');
		if (!novel || novel.author !== author) return false;
		const res = await Novel.deleteOne({ novelId });
		return res.deletedCount === 1;
	}
}

class PrismaNovelRepo implements NovelRepo {
	async create(data: any): Promise<NovelRecord> {
		const created = await prisma.novel.create({ data });
		return created as unknown as NovelRecord;
	}
	async findById(novelId: string): Promise<NovelRecord | null> {
		return (await prisma.novel.findUnique({ where: { novelId } })) as any;
	}
	async increaseView(novelId: string): Promise<void> {
		await prisma.novel.update({ where: { novelId }, data: { viewCount: { increment: 1 } } });
	}
	async updateIfAuthor(novelId: string, author: string, data: any): Promise<NovelRecord | null> {
		try {
			const updated = await prisma.novel.update({ where: { novelId_author: { novelId, author } }, data: { ...data, updatedAt: new Date() } });
			return updated as any;
		} catch {
			return null;
		}
	}
	async deleteIfAuthor(novelId: string, author: string): Promise<boolean> {
		try {
			await prisma.novel.delete({ where: { novelId_author: { novelId, author } } });
			return true;
		} catch {
			return false;
		}
	}
}

export const useNovelRepo = (): NovelRepo => {
	return process.env.NOVEL_USE_MYSQL === 'true' ? new PrismaNovelRepo() : new MongooseNovelRepo();
};


