import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'userdb',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'userapi',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);

export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error) {
        return false;
    }
};

export const waitForDatabase = async (
    maxRetries: number = 30,
    retryInterval: number = 2000
): Promise<void> => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            console.log(`DB 연결 시도 중... (${retries + 1}/${maxRetries})`);

            const isConnected = await checkDatabaseConnection();
            if (isConnected) {
                console.log('DB 연결 성공!');
                return;
            }
            throw new Error('DB 연결 실패');
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                console.error('DB 연결 최대 재시도 횟수 초과:', error);
                throw new Error(
                    `DB 연결에 실패했습니다. ${maxRetries}번 재시도 후에도 연결할 수 없습니다.`
                );
            }
            console.log(
                `DB 연결 실패. ${
                    retryInterval / 1000
                }초 후 재시도... (${retries}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }
};

export const initDatabase = async () => {
    try {
        await waitForDatabase();

        const connection = await pool.getConnection();

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        userid VARCHAR(36) UNIQUE NOT NULL,
        id VARCHAR(255) UNIQUE NOT NULL,
        nickname VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        isVerified BOOLEAN DEFAULT FALSE,
        authority ENUM('user', 'admin') DEFAULT 'user',
        description TEXT,
        profileImage VARCHAR(500) DEFAULT '',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        connection.release();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};
