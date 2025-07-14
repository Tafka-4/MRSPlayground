CREATE DATABASE IF NOT EXISTS userapi;
USE userapi;

CREATE TABLE IF NOT EXISTS users (
    userid VARCHAR(36) PRIMARY KEY,
    id VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    isVerified BOOLEAN DEFAULT FALSE,
    authority ENUM('user', 'admin', 'bot') DEFAULT 'user',
    description TEXT DEFAULT '',
    profileImage VARCHAR(500) DEFAULT '',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_userid (userid),
    INDEX idx_email (email),
    INDEX idx_id (id),
    INDEX idx_nickname (nickname)
);

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

-- Create guestbook table
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

CREATE INDEX IF NOT EXISTS idx_users_search ON users(userid, nickname, id);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(expires_at, issued_at, userid);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_weekly_active ON refresh_tokens(issued_at, expires_at, userid);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_cleanup ON refresh_tokens(expires_at, is_revoked);

CREATE INDEX IF NOT EXISTS idx_guestbook_target_userid ON guestbook(target_userid);
CREATE INDEX IF NOT EXISTS idx_guestbook_sender_userid ON guestbook(sender_userid);

-- Insert sample admin user (password: admin123!, gift for h4ckers)
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
    '$2a$10$j3LVOWtUHzUqGwCdw5TVJ.bOjo4myvENtdLH70f2xQjiWhftDxmVm',
    'admin@example.com',
    0,
    'user',
    'System Administrator'
); 