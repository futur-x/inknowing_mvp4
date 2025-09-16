-- =============================================================================
-- Migration: 005_upload_tables.sql
-- Description: Create upload processing pipeline and vectorization tables
-- Task: DB-005
-- Created: 2024-01-09
-- Dependencies: 001_init_database.sql, 002_user_tables.sql, 003_book_tables.sql
-- =============================================================================

\c inknowing_db;

-- =============================================================================
-- 1. Upload Jobs Table (upload.upload_jobs)
-- Main upload tracking table
-- =============================================================================

CREATE TABLE upload.upload_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_short_id('upl'),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File information
    original_filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000), -- S3 or local path
    file_size BIGINT NOT NULL, -- in bytes
    file_format VARCHAR(20) NOT NULL, -- 'pdf', 'epub', 'txt', 'docx'
    file_hash VARCHAR(64) NOT NULL, -- SHA256 for deduplication
    
    -- Processing status
    status upload_status DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Book information (after processing)
    book_id UUID REFERENCES content.books(id) ON DELETE SET NULL,
    title VARCHAR(500),
    author VARCHAR(255),
    
    -- Processing metadata
    total_pages INTEGER,
    total_words INTEGER,
    language VARCHAR(10),
    
    -- Cost tracking
    processing_cost DECIMAL(10,4) DEFAULT 0.00,
    storage_cost DECIMAL(10,4) DEFAULT 0.00,
    
    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT upload_unique_file CHECK (
        file_hash IS NOT NULL
    )
);

-- Create indexes
CREATE INDEX idx_upload_jobs_user_id ON upload.upload_jobs(user_id);
CREATE INDEX idx_upload_jobs_status ON upload.upload_jobs(status);
CREATE INDEX idx_upload_jobs_file_hash ON upload.upload_jobs(file_hash);
CREATE INDEX idx_upload_jobs_book_id ON upload.upload_jobs(book_id);
CREATE INDEX idx_upload_jobs_created_at ON upload.upload_jobs(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_upload_jobs_updated_at BEFORE UPDATE ON upload.upload_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. Processing Steps Table (upload.processing_steps)
-- Track individual processing steps
-- =============================================================================

CREATE TABLE upload.processing_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID NOT NULL REFERENCES upload.upload_jobs(id) ON DELETE CASCADE,
    
    -- Step information
    step_name VARCHAR(50) NOT NULL, -- 'text_extraction', 'ai_detection', 'vectorization', 'indexing'
    step_order INTEGER NOT NULL,
    status processing_step_status DEFAULT 'pending',
    
    -- Processing details
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Results
    result_data JSONB DEFAULT '{}',
    
    -- Performance metrics
    processing_time_ms INTEGER,
    memory_used_mb INTEGER,
    
    -- Timestamps
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT processing_steps_unique UNIQUE(upload_id, step_name)
);

-- Create indexes
CREATE INDEX idx_processing_steps_upload_id ON upload.processing_steps(upload_id, step_order);
CREATE INDEX idx_processing_steps_status ON upload.processing_steps(status);

-- =============================================================================
-- 3. Vector Chunks Table (upload.vector_chunks)
-- Store document chunks for vectorization
-- =============================================================================

CREATE TABLE upload.vector_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID NOT NULL REFERENCES upload.upload_jobs(id) ON DELETE CASCADE,
    book_id UUID REFERENCES content.books(id) ON DELETE CASCADE,
    
    -- Chunk information
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_size INTEGER NOT NULL, -- in characters
    chunk_tokens INTEGER, -- token count
    
    -- Location in document
    page_number INTEGER,
    paragraph_number INTEGER,
    chapter_id UUID REFERENCES content.book_chapters(id),
    
    -- Vector information
    vector_id VARCHAR(100), -- ChromaDB vector ID
    embedding_model VARCHAR(100),
    embedding_dimension INTEGER,
    processing_status processing_step_status DEFAULT 'pending',
    
    -- Metadata for search
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT vector_chunks_unique UNIQUE(upload_id, chunk_index)
);

-- Create indexes
CREATE INDEX idx_vector_chunks_upload_id ON upload.vector_chunks(upload_id);
CREATE INDEX idx_vector_chunks_book_id ON upload.vector_chunks(book_id);
CREATE INDEX idx_vector_chunks_vector_id ON upload.vector_chunks(vector_id);
CREATE INDEX idx_vector_chunks_status ON upload.vector_chunks(processing_status);

-- =============================================================================
-- 4. Upload Queue Table (upload.upload_queue)
-- Queue for processing uploads
-- =============================================================================

CREATE TABLE upload.upload_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID NOT NULL REFERENCES upload.upload_jobs(id) ON DELETE CASCADE,
    
    -- Queue management
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    queue_position INTEGER,
    processor_id VARCHAR(100), -- Worker processing this job
    
    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
    
    -- Timestamps
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    
    CONSTRAINT upload_queue_unique UNIQUE(upload_id)
);

-- Create indexes
CREATE INDEX idx_upload_queue_status ON upload.upload_queue(status, priority DESC, queued_at);
CREATE INDEX idx_upload_queue_processor ON upload.upload_queue(processor_id) WHERE processor_id IS NOT NULL;

-- =============================================================================
-- 5. Text Extraction Results Table (upload.text_extraction_results)
-- Store extracted text from documents
-- =============================================================================

CREATE TABLE upload.text_extraction_results (
    upload_id UUID PRIMARY KEY REFERENCES upload.upload_jobs(id) ON DELETE CASCADE,
    
    -- Extracted content
    full_text TEXT,
    title VARCHAR(500),
    author VARCHAR(255),
    
    -- Metadata extraction
    metadata JSONB DEFAULT '{}', -- {publisher, year, isbn, etc.}
    table_of_contents JSONB DEFAULT '[]', -- [{chapter, page, title}]
    
    -- Statistics
    page_count INTEGER,
    word_count INTEGER,
    character_count INTEGER,
    language_detected VARCHAR(10),
    
    -- Quality metrics
    extraction_confidence DECIMAL(3,2), -- 0.00 to 1.00
    has_images BOOLEAN DEFAULT false,
    image_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at
CREATE TRIGGER update_text_extraction_results_updated_at BEFORE UPDATE ON upload.text_extraction_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. AI Detection Results Table (upload.ai_detection_results)
-- Store AI model detection results
-- =============================================================================

CREATE TABLE upload.ai_detection_results (
    upload_id UUID PRIMARY KEY REFERENCES upload.upload_jobs(id) ON DELETE CASCADE,
    
    -- Detection results
    is_ai_known BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
    
    -- Model information
    detection_model VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    
    -- Detailed results
    matched_titles JSONB DEFAULT '[]', -- [{title, author, confidence}]
    partial_match BOOLEAN DEFAULT false,
    
    -- Processing details
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    api_cost DECIMAL(10,4),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- Functions
-- =============================================================================

-- Function to check for duplicate uploads
CREATE OR REPLACE FUNCTION upload.check_duplicate_upload(p_file_hash VARCHAR)
RETURNS TABLE(upload_id UUID, book_id UUID, status upload_status) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.book_id, u.status
    FROM upload.upload_jobs u
    WHERE u.file_hash = p_file_hash
    AND u.status = 'completed'
    ORDER BY u.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update upload progress
CREATE OR REPLACE FUNCTION upload.update_upload_progress(p_upload_id UUID)
RETURNS void AS $$
DECLARE
    v_total_steps INTEGER;
    v_completed_steps INTEGER;
    v_progress INTEGER;
BEGIN
    SELECT COUNT(*), SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)
    INTO v_total_steps, v_completed_steps
    FROM upload.processing_steps
    WHERE upload_id = p_upload_id;
    
    IF v_total_steps > 0 THEN
        v_progress := (v_completed_steps * 100) / v_total_steps;
        
        UPDATE upload.upload_jobs
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = p_upload_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old upload logs
CREATE OR REPLACE FUNCTION upload.clean_old_uploads()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM upload.upload_jobs
    WHERE status IN ('failed', 'cancelled')
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Trigger to update upload status based on processing steps
CREATE OR REPLACE FUNCTION upload.update_upload_status_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_all_completed BOOLEAN;
    v_any_failed BOOLEAN;
BEGIN
    SELECT
        bool_and(status = 'completed'),
        bool_or(status = 'failed')
    INTO v_all_completed, v_any_failed
    FROM upload.processing_steps
    WHERE upload_id = NEW.upload_id;
    
    IF v_any_failed THEN
        UPDATE upload.upload_jobs
        SET status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.upload_id;
    ELSIF v_all_completed THEN
        UPDATE upload.upload_jobs
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.upload_id;
    ELSE
        UPDATE upload.upload_jobs
        SET status = 'processing', updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.upload_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_status_after_step_change
    AFTER UPDATE OF status ON upload.processing_steps
    FOR EACH ROW EXECUTE FUNCTION upload.update_upload_status_trigger();

-- =============================================================================
-- Record Migration
-- =============================================================================

INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('005', 'upload_tables')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE upload.upload_jobs IS '
ROLLBACK SCRIPT:
-- Drop triggers
DROP TRIGGER IF EXISTS update_upload_status_after_step_change ON upload.processing_steps;

-- Drop functions
DROP FUNCTION IF EXISTS upload.update_upload_status_trigger();
DROP FUNCTION IF EXISTS upload.clean_old_uploads();
DROP FUNCTION IF EXISTS upload.update_upload_progress(UUID);
DROP FUNCTION IF EXISTS upload.check_duplicate_upload(VARCHAR);

-- Drop tables
DROP TABLE IF EXISTS upload.ai_detection_results CASCADE;
DROP TABLE IF EXISTS upload.text_extraction_results CASCADE;
DROP TABLE IF EXISTS upload.upload_queue CASCADE;
DROP TABLE IF EXISTS upload.vector_chunks CASCADE;
DROP TABLE IF EXISTS upload.processing_steps CASCADE;
DROP TABLE IF EXISTS upload.upload_jobs CASCADE;

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = ''005'';
';