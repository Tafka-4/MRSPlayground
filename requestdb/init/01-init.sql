CREATE DATABASE IF NOT EXISTS requestapi;
USE requestapi;

CREATE TABLE IF NOT EXISTS user_requests (
    request_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(64),
    route VARCHAR(255),
    status ENUM('pending','success','failed'),
    created_at DATETIME,
    updated_at DATETIME,
    client_ip VARCHAR(45),
    user_agent TEXT,
    error_code VARCHAR(255),
    error_message TEXT,
    retry_count INT DEFAULT 0
);
