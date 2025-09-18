-- Add missing vector-related columns to books table
ALTER TABLE content.books
ADD COLUMN IF NOT EXISTS vector_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS vector_dimension INTEGER;

-- Update existing records with default values if needed
UPDATE content.books
SET vector_model = 'text-embedding-ada-002',
    vector_dimension = 1536
WHERE vector_model IS NULL;