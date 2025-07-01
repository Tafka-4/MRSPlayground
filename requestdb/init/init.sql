-- MRS Playground Request Database Initialization
-- This script creates the requestapi database and all necessary tables with their final schema

CREATE DATABASE IF NOT EXISTS requestapi;
USE requestapi;

-- Main user requests table with all columns included from the start
CREATE TABLE IF NOT EXISTS user_requests (
    request_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(64),
    is_authenticated BOOLEAN DEFAULT FALSE,
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

-- Create indexes for better query performance
CREATE INDEX idx_user_id ON user_requests(user_id);
CREATE INDEX idx_status ON user_requests(status);
CREATE INDEX idx_is_authenticated ON user_requests(is_authenticated);
CREATE INDEX idx_created_at ON user_requests(created_at);
CREATE INDEX idx_route ON user_requests(route);

-- Set default values for existing records (if any)
-- This handles the case where the table already exists with partial data
UPDATE user_requests 
SET 
    updated_at = COALESCE(updated_at, created_at),
    retry_count = COALESCE(retry_count, 0),
    is_authenticated = COALESCE(is_authenticated, CASE WHEN user_id IS NOT NULL THEN TRUE ELSE FALSE END)
WHERE updated_at IS NULL OR retry_count IS NULL OR is_authenticated IS NULL; 