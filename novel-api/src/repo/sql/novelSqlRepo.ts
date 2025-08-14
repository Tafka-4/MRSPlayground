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
}


