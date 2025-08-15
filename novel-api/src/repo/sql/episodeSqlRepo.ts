import { pool } from '../../config/database.js';
import crypto from 'crypto';
import type { EpisodeRecord } from '../episodeRepo.js';

export class EpisodeSqlRepo {
	async createEpisode(novelId: string, author: string, title: string, content: string, authorComment?: string | null): Promise<EpisodeRecord> {
		const conn = await pool.getConnection();
		try {
			await conn.beginTransaction();
			const [[novel]]: any = await conn.query(`SELECT author, episodeCount FROM novels WHERE novelId = ? FOR UPDATE`, [novelId]);
			if (!novel || novel.author !== author) throw new Error('Novel not found or not author');
			const nextNo = Number(novel.episodeCount) + 1;
			await conn.execute(`UPDATE novels SET episodeCount = episodeCount + 1 WHERE novelId = ?`, [novelId]);
			const episodeId = crypto.randomUUID();
			await conn.execute(`INSERT INTO episodes (episodeId, episodeNumber, novelId, title, content, author, authorComment) VALUES (?, ?, ?, ?, ?, ?, ?)`
				, [episodeId, nextNo, novelId, title, content, author, authorComment ?? null]);
			await conn.commit();
			const [rows]: any = await pool.query(`SELECT * FROM episodes WHERE episodeId = ?`, [episodeId]);
			return rows[0] as EpisodeRecord;
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			conn.release();
		}
	}

	async findById(episodeId: string): Promise<EpisodeRecord | null> {
		const [rows]: any = await pool.execute(`SELECT * FROM episodes WHERE episodeId = ?`, [episodeId]);
		return Array.isArray(rows) && rows.length ? (rows[0] as EpisodeRecord) : null;
	}

	async increaseView(episodeId: string) {
		await pool.execute(`UPDATE episodes SET viewCount = viewCount + 1 WHERE episodeId = ?`, [episodeId]);
	}

	async updateIfAuthor(episodeId: string, author: string, data: any): Promise<EpisodeRecord | null> {
		const [[ep]]: any = await pool.query(`SELECT novelId FROM episodes WHERE episodeId = ?`, [episodeId]);
		if (!ep) return null;
		const [[novel]]: any = await pool.query(`SELECT author FROM novels WHERE novelId = ?`, [ep.novelId]);
		if (!novel || novel.author !== author) return null;
		const fields: string[] = [];
		const values: any[] = [];
		if (data.title) { fields.push('title = ?'); values.push(data.title); }
		if (data.content) { fields.push('content = ?'); values.push(data.content); }
		if (data.authorComment !== undefined) { fields.push('authorComment = ?'); values.push(data.authorComment); }
		values.push(episodeId);
		const sql = `UPDATE episodes SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE episodeId = ?`;
		const [res]: any = await pool.execute(sql, values);
		if (res.affectedRows === 0) return null;
		return await this.findById(episodeId);
	}

	async deleteIfAuthorAndLast(episodeId: string, author: string) {
		const conn = await pool.getConnection();
		try {
			await conn.beginTransaction();
			const [[ep]]: any = await conn.query(`SELECT novelId, episodeNumber FROM episodes WHERE episodeId = ? FOR UPDATE`, [episodeId]);
			if (!ep) return false;
			const [[novel]]: any = await conn.query(`SELECT author, episodeCount FROM novels WHERE novelId = ? FOR UPDATE`, [ep.novelId]);
			if (!novel || novel.author !== author) return false;
			if (Number(novel.episodeCount) !== Number(ep.episodeNumber)) return false;
			await conn.execute(`DELETE FROM episodes WHERE episodeId = ?`, [episodeId]);
			await conn.execute(`UPDATE novels SET episodeCount = episodeCount - 1 WHERE novelId = ?`, [ep.novelId]);
			await conn.commit();
			return true;
		} catch (e) {
			await conn.rollback();
			throw e;
		} finally {
			conn.release();
		}
	}
}


