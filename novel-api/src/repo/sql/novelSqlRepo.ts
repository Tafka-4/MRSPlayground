import { pool } from '../../config/database.js';

export class NovelSqlRepo {
	async create(novel: any) {
		const sql = `INSERT INTO novels (novelId, title, description, thumbnailImage, author, status)
			VALUES (?, ?, ?, ?, ?, ?)`;
		await pool.execute(sql, [novel.novelId, novel.title, novel.description, novel.thumbnailImage, novel.author, novel.status]);
		return await this.findById(novel.novelId);
	}

	async findById(novelId: string) {
		const [rows] = await pool.execute(`SELECT * FROM novels WHERE novelId = ?`, [novelId]);
		return Array.isArray(rows) && rows.length ? rows[0] : null;
	}

	async incrementCounters(novelId: string, deltas: { viewDelta?: number; likeDelta?: number; dislikeDelta?: number; favoriteDelta?: number; episodeDelta?: number }) {
		const sets: string[] = [];
		const vals: any[] = [];
		if (deltas.viewDelta) { sets.push('viewCount = viewCount + ?'); vals.push(deltas.viewDelta); }
		if (deltas.likeDelta) { sets.push('likeCount = likeCount + ?'); vals.push(deltas.likeDelta); }
		if (deltas.dislikeDelta) { sets.push('dislikeCount = dislikeCount + ?'); vals.push(deltas.dislikeDelta); }
		if (deltas.favoriteDelta) { sets.push('favoriteCount = favoriteCount + ?'); vals.push(deltas.favoriteDelta); }
		if (deltas.episodeDelta) { sets.push('episodeCount = episodeCount + ?'); vals.push(deltas.episodeDelta); }
		if (!sets.length) return;
		vals.push(novelId);
		await pool.execute(`UPDATE novels SET ${sets.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE novelId = ?`, vals);
	}

	async increaseView(novelId: string) {
		await pool.execute(`UPDATE novels SET viewCount = viewCount + 1 WHERE novelId = ?`, [novelId]);
	}

	async updateIfAuthor(novelId: string, author: string, data: any) {
		const fields: string[] = [];
		const values: any[] = [];
		if (data.title) { fields.push('title = ?'); values.push(data.title); }
		if (data.description) { fields.push('description = ?'); values.push(data.description); }
		if (!fields.length) return await this.findById(novelId);
		values.push(novelId, author);
		const sql = `UPDATE novels SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE novelId = ? AND author = ?`;
		const [res]: any = await pool.execute(sql, values);
		if (res.affectedRows === 0) return null;
		return await this.findById(novelId);
	}

	async deleteIfAuthor(novelId: string, author: string) {
		const [res]: any = await pool.execute(`DELETE FROM novels WHERE novelId = ? AND author = ?`, [novelId, author]);
		return res.affectedRows > 0;
	}

	async list(options: { query?: string; genre?: string; status?: string; sort?: string; limit: number; offset: number }) {
		const where: string[] = [];
		const vals: any[] = [];
		if (options.query) { where.push('title LIKE ?'); vals.push(`%${options.query}%`); }
		if (options.status) { where.push('status = ?'); vals.push(options.status); }
		const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
		let orderBy = 'createdAt DESC';
		switch (options.sort) {
			case 'views': orderBy = 'viewCount DESC'; break;
			case 'likes': orderBy = 'likeCount DESC'; break;
			case 'favorites': orderBy = 'favoriteCount DESC'; break;
			case 'episodes': orderBy = 'episodeCount DESC'; break;
			case 'recent': orderBy = 'updatedAt DESC'; break;
		}
		const [rows]: any = await pool.execute(`SELECT * FROM novels ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...vals, options.limit, options.offset]);
		const [[{ total }]]: any = await pool.query(`SELECT COUNT(*) AS total FROM novels ${whereSql}`, vals);
		return { rows, total };
	}

	async listByAuthor(author: string) {
		const [rows]: any = await pool.execute(`SELECT * FROM novels WHERE author = ?`, [author]);
		return rows;
	}

	async setThumbnail(novelId: string, author: string, location: string) {
		const [res]: any = await pool.execute(`UPDATE novels SET thumbnailImage = ?, updatedAt = CURRENT_TIMESTAMP WHERE novelId = ? AND author = ?`, [location, novelId, author]);
		return res.affectedRows > 0;
	}
}


