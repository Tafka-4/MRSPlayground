-- Create database if not exists
CREATE DATABASE IF NOT EXISTS userapi;
USE userapi;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    userid VARCHAR(36) PRIMARY KEY,
    id VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    isVerified BOOLEAN DEFAULT FALSE,
    authority ENUM('user', 'admin') DEFAULT 'user',
    description TEXT DEFAULT '',
    profileImage VARCHAR(500) DEFAULT '',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_userid (userid),
    INDEX idx_email (email),
    INDEX idx_id (id),
    INDEX idx_nickname (nickname)
);

-- Create refresh_tokens table
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

-- Insert sample admin user (password: admin123!)
INSERT IGNORE INTO users (
    userid, 
    id,
    nickname, 
    password, 
    email, 
    isVerified, 
    authority, 
    description
) VALUES (
    'admin-user-id-12345',
    'admin',
    'admin',
    '$2b$10$rQZ8kHWKQVXqKQvQQQQQQQeQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
    'admin@example.com',
    TRUE,
    'admin',
    'System Administrator'
); 