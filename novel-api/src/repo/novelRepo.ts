import Novel, { INovel } from '../model/novelModel.js';
import { NovelSqlRepo } from './sql/novelSqlRepo.js';

const novelSql = new NovelSqlRepo();

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
		return (await novelSql.create(data)) as any;
	}
	async findById(novelId: string): Promise<NovelRecord | null> {
		return (await novelSql.findById(novelId)) as any;
	}
	async increaseView(novelId: string): Promise<void> {
		await novelSql.increaseView(novelId);
	}
	async updateIfAuthor(novelId: string, author: string, data: any): Promise<NovelRecord | null> {
		return (await novelSql.updateIfAuthor(novelId, author, data)) as any;
	}
	async deleteIfAuthor(novelId: string, author: string): Promise<boolean> {
		return await novelSql.deleteIfAuthor(novelId, author);
	}
}

export const useNovelRepo = (): NovelRepo => {
    return process.env.NOVEL_USE_MYSQL === 'true' ? new PrismaNovelRepo() : new MongooseNovelRepo();
};


