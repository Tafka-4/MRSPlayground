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

const requestdbConfig = {
    host: process.env.REQDB_HOST || 'requestdb',
    user: process.env.REQDB_USER || 'root',
    password: process.env.REQDB_PASSWORD || 'root',
    database: process.env.REQDB_NAME || 'requestapi',
    port: parseInt(process.env.REQDB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);
export const requestPool = mysql.createPool(requestdbConfig);

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

export const checkRequestDatabaseConnection = async (): Promise<boolean> => {
    try {
        const connection = await requestPool.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error) {
        return false;
    }
};

export const waitForDatabase = async (
    maxRetries: number = 50,
    retryInterval: number = 2000
): Promise<void> => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            console.log(
                `Try to connect to database... (${retries + 1}/${maxRetries})`
            );

            const isConnected = await checkDatabaseConnection();
            const isRequestConnected = await checkRequestDatabaseConnection();
            if (isConnected && isRequestConnected) {
                console.log('DB Connected!');
                return;
            }
            throw new Error('DB Connection Failed');
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                console.error('DB Connection Failed:', error);
                throw new Error(
                    `DB Connection Failed. ${maxRetries} times retry failed.`
                );
            }
            console.log(
                `DB Connection Failed. ${
                    retryInterval / 1000
                } seconds later retry... (${retries}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
    }
};

export const initDatabase = async () => {
    try {
        await waitForDatabase();

        const connection = await pool.getConnection();

        // Create users table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                userid VARCHAR(36) UNIQUE NOT NULL,
                id VARCHAR(255) UNIQUE NOT NULL,
                nickname VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                isVerified BOOLEAN DEFAULT FALSE,
                authority ENUM('user', 'admin', 'bot') DEFAULT 'user',
                description TEXT,
                profileImage VARCHAR(500) DEFAULT '',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // Create refresh_tokens table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userid VARCHAR(36) NOT NULL,
                refresh_token TEXT NOT NULL,
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                is_revoked BOOLEAN DEFAULT FALSE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_userid (userid),
                INDEX idx_refresh_token (refresh_token(255)),
                INDEX idx_expires_at (expires_at),
                INDEX idx_is_revoked (is_revoked),
                FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
            );
        `);

        connection.release();

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};
