-- Initialize database schema for Novel/Episode service

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


