import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
	host: process.env.NOVEL_DB_HOST || process.env.DB_HOST || 'userdb',
	user: process.env.NOVEL_DB_USER || process.env.DB_USER || 'root',
	password: process.env.NOVEL_DB_PASSWORD || process.env.DB_PASSWORD || 'root',
	database: process.env.NOVEL_DB_NAME || 'novelapi',
	port: parseInt(process.env.NOVEL_DB_PORT || process.env.DB_PORT || '3306'),
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
	acquireTimeout: 60000,
	timeout: 60000,
	enableKeepAlive: true,
	keepAliveInitialDelay: 0,
};

export const pool = mysql.createPool(dbConfig);

export const checkDatabaseConnection = async (): Promise<boolean> => {
	try {
		const connection = await pool.getConnection();
		await connection.ping();
		connection.release();
		console.log(`✅ Novel DB (${dbConfig.host}:${dbConfig.port}/${dbConfig.database}) connected`);
		return true;
	} catch (error) {
		console.error('❌ Novel DB connection failed:', error instanceof Error ? error.message : error);
		return false;
	}
};

export const waitForDatabase = async (maxRetries: number = 60, retryInterval: number = 3000): Promise<void> => {
	let retries = 0;
	while (retries < maxRetries) {
		try {
			const ok = await checkDatabaseConnection();
			if (ok) return;
			throw new Error('ping failed');
		} catch (e) {
			retries++;
			if (retries >= maxRetries) throw e instanceof Error ? e : new Error(String(e));
			await new Promise((r) => setTimeout(r, retryInterval));
		}
	}
};

export const initDatabase = async () => {
	await waitForDatabase();
	const conn = await pool.getConnection();
	try {
		await conn.execute(`
			CREATE TABLE IF NOT EXISTS novels (
				id INT AUTO_INCREMENT PRIMARY KEY,
				novelId VARCHAR(64) NOT NULL UNIQUE,
				title VARCHAR(500) NOT NULL,
				description TEXT NOT NULL,
				thumbnailImage VARCHAR(1000) NOT NULL,
				episodeCount INT NOT NULL DEFAULT 0,
				viewCount INT NOT NULL DEFAULT 0,
				likeCount INT NOT NULL DEFAULT 0,
				dislikeCount INT NOT NULL DEFAULT 0,
				favoriteCount INT NOT NULL DEFAULT 0,
				author VARCHAR(255) NOT NULL,
				status VARCHAR(50) NOT NULL,
				createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				UNIQUE KEY novel_author (novelId, author),
				INDEX idx_author (author),
				INDEX idx_createdAt (createdAt)
			);
		`);

		await conn.execute(`
			CREATE TABLE IF NOT EXISTS episodes (
				id INT AUTO_INCREMENT PRIMARY KEY,
				episodeId VARCHAR(64) NOT NULL UNIQUE,
				episodeNumber INT NOT NULL,
				novelId VARCHAR(64) NOT NULL,
				title VARCHAR(500) NOT NULL,
				content LONGTEXT NOT NULL,
				author VARCHAR(255) NOT NULL,
				authorComment TEXT NULL,
				viewCount INT NOT NULL DEFAULT 0,
				likeCount INT NOT NULL DEFAULT 0,
				dislikeCount INT NOT NULL DEFAULT 0,
				imageUploaded BOOLEAN NOT NULL DEFAULT FALSE,
				createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX idx_novelId (novelId),
				INDEX idx_createdAt (createdAt)
			);
		`);
	} finally {
		conn.release();
	}
};


