USE requestapi;

-- Check if updated_at column exists and add it if it doesn't
SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'requestapi' 
                      AND TABLE_NAME = 'user_requests' 
                      AND COLUMN_NAME = 'updated_at');

SET @sql = IF(@column_exists = 0, 
              'ALTER TABLE user_requests ADD COLUMN updated_at DATETIME AFTER created_at', 
              'SELECT "Column updated_at already exists" as info');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if retry_count column exists and add it if it doesn't
SET @retry_column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                           WHERE TABLE_SCHEMA = 'requestapi' 
                           AND TABLE_NAME = 'user_requests' 
                           AND COLUMN_NAME = 'retry_count');

SET @retry_sql = IF(@retry_column_exists = 0, 
                   'ALTER TABLE user_requests ADD COLUMN retry_count INT DEFAULT 0 AFTER error_message', 
                   'SELECT "Column retry_count already exists" as info');

PREPARE retry_stmt FROM @retry_sql;
EXECUTE retry_stmt;
DEALLOCATE PREPARE retry_stmt;

-- Update existing records to have updated_at equal to created_at where updated_at is NULL
UPDATE user_requests 
SET updated_at = created_at 
WHERE updated_at IS NULL; 

-- Update existing records to have retry_count = 0 where retry_count is NULL
UPDATE user_requests 
SET retry_count = 0 
WHERE retry_count IS NULL; 