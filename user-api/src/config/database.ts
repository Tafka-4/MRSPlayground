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
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
};

const requestdbConfig = {
    host: process.env.REQDB_HOST || 'requestdb',
    user: process.env.REQDB_USER || 'root',
    password: process.env.REQDB_PASSWORD || process.env.DB_PASSWORD || 'root',
    database: process.env.REQDB_NAME || 'requestapi',
    port: parseInt(process.env.REQDB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
};

export const pool = mysql.createPool(dbConfig);
export const requestPool = mysql.createPool(requestdbConfig);

export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log(`✅ Main DB (${dbConfig.host}:${dbConfig.port}/${dbConfig.database}) connected successfully`);
        return true;
    } catch (error) {
        console.error(`❌ Main DB connection failed:`, {
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database,
            user: dbConfig.user,
            error: error instanceof Error ? error.message : error
        });
        return false;
    }
};

export const checkRequestDatabaseConnection = async (): Promise<boolean> => {
    try {
        const connection = await requestPool.getConnection();
        await connection.ping();
        connection.release();
        console.log(`✅ Request DB (${requestdbConfig.host}:${requestdbConfig.port}/${requestdbConfig.database}) connected successfully`);
        return true;
    } catch (error) {
        console.error(`❌ Request DB connection failed:`, {
            host: requestdbConfig.host,
            port: requestdbConfig.port,
            database: requestdbConfig.database,
            user: requestdbConfig.user,
            error: error instanceof Error ? error.message : error
        });
        return false;
    }
};

export const waitForDatabase = async (
    maxRetries: number = 60,
    retryInterval: number = 3000
): Promise<void> => {
    let retries = 0;

    console.log('🔄 Starting database connection process...');
    console.log('📊 Database configurations:');
    console.log(`   Main DB: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    console.log(`   Request DB: ${requestdbConfig.host}:${requestdbConfig.port}/${requestdbConfig.database}`);

    while (retries < maxRetries) {
        try {
            console.log(
                `🔗 Attempting database connections... (${retries + 1}/${maxRetries})`
            );

            const isConnected = await checkDatabaseConnection();
            const isRequestConnected = await checkRequestDatabaseConnection();
            
            if (isConnected && isRequestConnected) {
                console.log('🎉 All databases connected successfully!');
                return;
            }
            
            if (!isConnected) console.log('⚠️  Main DB connection failed');
            if (!isRequestConnected) console.log('⚠️  Request DB connection failed');
            
            throw new Error('One or more database connections failed');
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                console.error('💥 Database connection completely failed after maximum retries');
                console.error('🔧 Please check:');
                console.error('   1. Database services are running');
                console.error('   2. Network connectivity');
                console.error('   3. Environment variables');
                console.error('   4. Database credentials');
                throw new Error(
                    `DB Connection Failed. ${maxRetries} times retry failed.`
                );
            }
            console.log(
                `⏳ Retrying in ${retryInterval / 1000} seconds... (${retries}/${maxRetries})`
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

        // Create contacts table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subject VARCHAR(500) NOT NULL,
                category ENUM('general', 'technical', 'feature', 'account', 'other') NOT NULL,
                email VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('pending', 'in_progress', 'resolved', 'closed') DEFAULT 'pending',
                userid VARCHAR(36) NULL,
                admin_notes TEXT DEFAULT NULL,
                admin_userid VARCHAR(36) NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_category (category),
                INDEX idx_email (email),
                INDEX idx_userid (userid),
                INDEX idx_admin_userid (admin_userid),
                FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE SET NULL,
                FOREIGN KEY (admin_userid) REFERENCES users(userid) ON DELETE SET NULL
            );
        `);

        // Create feedback table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                type ENUM('bug', 'feature', 'improvement', 'vulnerability', 'other') NOT NULL,
                priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                description TEXT NOT NULL,
                steps_to_reproduce TEXT DEFAULT NULL,
                expected_behavior TEXT DEFAULT NULL,
                actual_behavior TEXT DEFAULT NULL,
                browser_info TEXT DEFAULT NULL,
                screenshot_url VARCHAR(500) DEFAULT NULL,
                status ENUM('pending', 'confirmed', 'in_progress', 'testing', 'resolved', 'closed', 'rejected') DEFAULT 'pending',
                userid VARCHAR(36) NULL,
                admin_notes TEXT DEFAULT NULL,
                admin_userid VARCHAR(36) NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_type (type),
                INDEX idx_priority (priority),
                INDEX idx_status (status),
                INDEX idx_userid (userid),
                INDEX idx_admin_userid (admin_userid),
                FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE SET NULL,
                FOREIGN KEY (admin_userid) REFERENCES users(userid) ON DELETE SET NULL
            );
        `);

        // Create guestbook table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS guestbook (
                id INT AUTO_INCREMENT PRIMARY KEY,
                target_userid VARCHAR(36) NOT NULL,
                sender_userid VARCHAR(36) NOT NULL,
                message TEXT NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_target_userid (target_userid),
                INDEX idx_sender_userid (sender_userid),
                FOREIGN KEY (target_userid) REFERENCES users(userid) ON DELETE CASCADE,
                FOREIGN KEY (sender_userid) REFERENCES users(userid) ON DELETE CASCADE
            );
        `);

        connection.release();

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};
