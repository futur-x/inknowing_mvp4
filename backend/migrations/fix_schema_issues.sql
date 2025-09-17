-- Fix missing columns in InKnowing database schema
-- Date: 2025-01-17
-- Purpose: Add missing columns identified during integration testing

-- Add vector_model column to books table if it doesn't exist
ALTER TABLE books ADD COLUMN IF NOT EXISTS vector_model TEXT;

-- Add quota_type column to user_quotas table if it doesn't exist
ALTER TABLE user_quotas ADD COLUMN IF NOT EXISTS quota_type VARCHAR(50) DEFAULT 'dialogue';

-- Update existing records to have default values
UPDATE books SET vector_model = 'text-embedding-ada-002' WHERE vector_model IS NULL;
UPDATE user_quotas SET quota_type = 'dialogue' WHERE quota_type IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_books_vector_model ON books(vector_model);
CREATE INDEX IF NOT EXISTS idx_user_quotas_quota_type ON user_quotas(quota_type);

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'Schema migration completed successfully';
    RAISE NOTICE 'Added books.vector_model column';
    RAISE NOTICE 'Added user_quotas.quota_type column';
END $$;