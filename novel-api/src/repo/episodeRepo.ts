import Episode from '../model/episodeModel.js';
import Novel from '../model/novelModel.js';
import { redisClient } from '../utils/dbconnect/dbconnect.js';
import { EpisodeSqlRepo } from './sql/episodeSqlRepo.js';
import { pool } from '../config/database.js';

const episodeSql = new EpisodeSqlRepo();

export interface EpisodeRecord {
    episodeId: string;
    episodeNumber: number;
    novelId: string;
    title: string;
    content: string;
    author: string;
    authorComment: string | null;
    viewCount: number;
    likeCount: number;
    dislikeCount: number;
    imageUploaded: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface EpisodeRepo {
	createEpisode(novelId: string, userId: string, title: string, content: string, authorComment?: string | null): Promise<EpisodeRecord>;
	findById(episodeId: string): Promise<EpisodeRecord | null>;
	increaseView(episodeId: string): Promise<void>;
	updateIfAuthor(episodeId: string, userId: string, data: Partial<Pick<EpisodeRecord, 'title' | 'content' | 'authorComment'>>): Promise<EpisodeRecord | null>;
	deleteIfAuthorAndLast(episodeId: string, userId: string): Promise<boolean>;
	like(episodeId: string, novelId: string, userId: string): Promise<{ likeCount: number; dislikeCount: number }>;
	dislike(episodeId: string, novelId: string, userId: string): Promise<{ likeCount: number; dislikeCount: number }>;
}

class MongooseEpisodeRepo implements EpisodeRepo {
	async createEpisode(novelId: string, userId: string, title: string, content: string, authorComment?: string | null): Promise<EpisodeRecord> {
		const novel = await Novel.findOneAndUpdate({ novelId, author: userId }, { $inc: { episodeCount: 1 } }, { new: true, projection: 'episodeCount author' });
		if (!novel) throw new Error('Novel not found or not author');
		const episode = await Episode.create({ novelId, episodeNumber: novel.episodeCount, title, content, author: userId, authorComment: authorComment ?? null });
		return episode.toObject() as any;
	}
	async findById(episodeId: string): Promise<EpisodeRecord | null> {
		const ep = await Episode.findOne({ episodeId });
		return ep ? (ep.toObject() as any) : null;
	}
	async increaseView(episodeId: string): Promise<void> {
		await Episode.findOneAndUpdate({ episodeId }, { $inc: { viewCount: 1 } });
	}
	async updateIfAuthor(episodeId: string, userId: string, data: any): Promise<EpisodeRecord | null> {
		const found = await Episode.findOne({ episodeId }).select('novelId');
		if (!found) return null;
		const novel = await Novel.findOne({ novelId: found.novelId }).select('author');
		if (!novel || novel.author !== userId) return null;
		const updated = await Episode.findOneAndUpdate({ episodeId }, { ...data, updatedAt: new Date() }, { new: true });
		return updated ? (updated.toObject() as any) : null;
	}
	async deleteIfAuthorAndLast(episodeId: string, userId: string): Promise<boolean> {
		const ep = await Episode.findOne({ episodeId }).select('novelId episodeNumber');
		if (!ep) return false;
		const novel = await Novel.findOne({ novelId: ep.novelId }).select('author episodeCount');
		if (!novel || novel.author !== userId) return false;
		if (novel.episodeCount !== ep.episodeNumber) return false;
		const [del, dec] = await Promise.all([
		Episode.deleteOne({ episodeId }),
		Novel.findOneAndUpdate({ novelId: ep.novelId, author: userId }, { $inc: { episodeCount: -1 } })
		]);
		return del.deletedCount === 1;
	}
	async like(episodeId: string, novelId: string, userId: string) {
		const resultLike = await redisClient.sAdd(`${novelId}:${episodeId}:likes`, userId);
		const resultDislike = await redisClient.sRem(`${novelId}:${episodeId}:dislikes`, userId);
		const ep = await Episode.findOne({ episodeId });
		if (!ep) throw new Error('Episode not found');
		if (resultDislike) ep.dislikeCount--;
		if (!resultLike) throw new Error('Already liked');
		ep.likeCount++;
		await ep.save();
		return { likeCount: ep.likeCount, dislikeCount: ep.dislikeCount };
	}
	async dislike(episodeId: string, novelId: string, userId: string) {
		const resultDislike = await redisClient.sAdd(`${novelId}:${episodeId}:dislikes`, userId);
		const resultLike = await redisClient.sRem(`${novelId}:${episodeId}:likes`, userId);
		const ep = await Episode.findOne({ episodeId });
		if (!ep) throw new Error('Episode not found');
		if (resultLike) ep.likeCount--;
		if (!resultDislike) throw new Error('Already disliked');
		ep.dislikeCount++;
		await ep.save();
		return { likeCount: ep.likeCount, dislikeCount: ep.dislikeCount };
	}
}

class PrismaEpisodeRepo implements EpisodeRepo {
    async createEpisode(novelId: string, userId: string, title: string, content: string, authorComment?: string | null): Promise<EpisodeRecord> {
        return (await episodeSql.createEpisode(novelId, userId, title, content, authorComment)) as any;
    }
    async findById(episodeId: string): Promise<EpisodeRecord | null> {
        return (await episodeSql.findById(episodeId)) as any;
    }
    async increaseView(episodeId: string): Promise<void> {
        await episodeSql.increaseView(episodeId);
    }
    async updateIfAuthor(episodeId: string, userId: string, data: any): Promise<EpisodeRecord | null> {
        return (await episodeSql.updateIfAuthor(episodeId, userId, data)) as any;
    }
    async deleteIfAuthorAndLast(episodeId: string, userId: string): Promise<boolean> {
        return await episodeSql.deleteIfAuthorAndLast(episodeId, userId);
    }
    async like(episodeId: string, novelId: string, userId: string) {
        const resultLike = await redisClient.sAdd(`${novelId}:${episodeId}:likes`, userId);
        const resultDislike = await redisClient.sRem(`${novelId}:${episodeId}:dislikes`, userId);
        const ep = await episodeSql.findById(episodeId);
        if (!ep) throw new Error('Episode not found');
        const likeCount = ep.likeCount + (resultLike ? 1 : 0);
        const dislikeCount = ep.dislikeCount - (resultDislike ? 1 : 0);
        if (!resultLike) throw new Error('Already liked');
        await pool.execute(`UPDATE episodes SET likeCount = ?, dislikeCount = ? WHERE episodeId = ?`, [likeCount, dislikeCount, episodeId]);
        return { likeCount, dislikeCount };
    }
    async dislike(episodeId: string, novelId: string, userId: string) {
        const resultDislike = await redisClient.sAdd(`${novelId}:${episodeId}:dislikes`, userId);
        const resultLike = await redisClient.sRem(`${novelId}:${episodeId}:likes`, userId);
        const ep = await episodeSql.findById(episodeId);
        if (!ep) throw new Error('Episode not found');
        const dislikeCount = ep.dislikeCount + (resultDislike ? 1 : 0);
        const likeCount = ep.likeCount - (resultLike ? 1 : 0);
        if (!resultDislike) throw new Error('Already disliked');
        await pool.execute(`UPDATE episodes SET likeCount = ?, dislikeCount = ? WHERE episodeId = ?`, [likeCount, dislikeCount, episodeId]);
        return { likeCount, dislikeCount };
    }
}

export const useEpisodeRepo = (): EpisodeRepo => {
  	return process.env.NOVEL_USE_MYSQL === 'true' ? new PrismaEpisodeRepo() : new MongooseEpisodeRepo();
};


