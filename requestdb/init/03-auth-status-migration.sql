USE requestapi;

-- Add is_authenticated column to track user authentication status
ALTER TABLE user_requests 
ADD COLUMN is_authenticated BOOLEAN DEFAULT FALSE 
AFTER user_id;

-- Add index for better query performance
CREATE INDEX idx_is_authenticated ON user_requests(is_authenticated);

-- Update existing records: set is_authenticated = TRUE where user_id is not null
UPDATE user_requests 
SET is_authenticated = TRUE 
WHERE user_id IS NOT NULL; 