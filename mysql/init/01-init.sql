-- Create database if not exists
CREATE DATABASE IF NOT EXISTS userapi;
USE userapi;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(36) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    isVerified BOOLEAN DEFAULT FALSE,
    authority ENUM('user', 'admin') DEFAULT 'user',
    description TEXT DEFAULT '',
    profileImage VARCHAR(500) DEFAULT '',
    wroteNovels JSON DEFAULT '[]',
    favoriteNovels JSON DEFAULT '[]',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_userid (userid),
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- Insert sample admin user (password: admin123!)
INSERT IGNORE INTO users (
    userid, 
    username, 
    password, 
    email, 
    isVerified, 
    authority, 
    description
) VALUES (
    'admin-user-id-12345',
    'admin',
    '$2b$10$rQZ8kHWKQVXqKQvQQvQQQeQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
    'admin@example.com',
    TRUE,
    'admin',
    'System Administrator'
); 