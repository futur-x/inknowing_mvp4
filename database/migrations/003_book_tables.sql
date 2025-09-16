-- =============================================================================
-- Migration: 003_book_tables.sql
-- Description: Create book, character, and related content tables
-- Task: DB-003
-- Created: 2024-01-09
-- Dependencies: 001_init_database.sql, 002_user_tables.sql
-- =============================================================================

\c inknowing_db;

-- =============================================================================
-- 1. Books Table (content.books)
-- Main books table for AI-known and vectorized books
-- =============================================================================

CREATE TABLE content.books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_short_id('book'),

    -- Basic information
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20),
    cover_url VARCHAR(1000),
    category VARCHAR(50),
    subcategory VARCHAR(50),
    description TEXT,
    synopsis TEXT, -- Longer book summary

    -- Book type and status (business logic: draft → processing → published → offline)
    type book_type NOT NULL, -- 'ai_known' or 'vectorized'
    status book_status DEFAULT 'draft',
    source VARCHAR(20) DEFAULT 'admin', -- 'admin', 'user_upload', 'api_import'

    -- Statistics and ratings
    dialogue_count INTEGER DEFAULT 0,
    character_dialogue_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,

    -- Metadata
    language VARCHAR(10) DEFAULT 'zh-CN',
    original_language VARCHAR(10),
    publish_year INTEGER,
    publisher VARCHAR(255),
    page_count INTEGER,
    word_count INTEGER,
    chapters INTEGER,
    estimated_reading_time INTEGER, -- in minutes

    -- Upload related (for user uploaded books)
    uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    original_filename VARCHAR(500),
    file_size BIGINT, -- in bytes
    file_format VARCHAR(20), -- 'pdf', 'epub', 'txt', 'docx'
    file_hash VARCHAR(64), -- SHA256 hash for duplicate detection

    -- AI Processing
    ai_model_tested VARCHAR(100), -- Model used for AI detection
    ai_known BOOLEAN DEFAULT false,
    ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    vector_status processing_step_status DEFAULT 'not_needed',
    vector_count INTEGER DEFAULT 0,
    vector_dimensions INTEGER, -- 768, 1536, etc.
    embedding_model VARCHAR(100), -- Model used for vectorization
    last_vectorized_at TIMESTAMP,

    -- Admin fields
    review_status review_action DEFAULT 'pending',
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    review_notes TEXT,
    review_at TIMESTAMP,
    featured BOOLEAN DEFAULT false,
    featured_order INTEGER,
    hidden BOOLEAN DEFAULT false,

    -- Cost tracking
    total_api_cost DECIMAL(10,4) DEFAULT 0.00, -- in USD
    vectorization_cost DECIMAL(10,4) DEFAULT 0.00,
    dialogue_cost DECIMAL(10,4) DEFAULT 0.00,

    -- SEO and discovery
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT[],

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete
);

-- Create indexes for performance
CREATE INDEX idx_books_title_trgm ON content.books USING GIN(title gin_trgm_ops);
CREATE INDEX idx_books_title_tsv ON content.books USING GIN(to_tsvector('simple', title));
CREATE INDEX idx_books_author_trgm ON content.books USING GIN(author gin_trgm_ops);
CREATE INDEX idx_books_author_tsv ON content.books USING GIN(to_tsvector('simple', author));
CREATE INDEX idx_books_category ON content.books(category, subcategory) WHERE status = 'published';
CREATE INDEX idx_books_status ON content.books(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_books_type ON content.books(type);
CREATE INDEX idx_books_dialogue_count ON content.books(dialogue_count DESC) WHERE status = 'published';
CREATE INDEX idx_books_rating ON content.books(rating DESC, rating_count DESC) WHERE status = 'published';
CREATE INDEX idx_books_view_count ON content.books(view_count DESC) WHERE status = 'published';
CREATE INDEX idx_books_created_at ON content.books(created_at DESC);
CREATE INDEX idx_books_uploader ON content.books(uploader_id) WHERE uploader_id IS NOT NULL;
CREATE INDEX idx_books_featured ON content.books(featured, featured_order) WHERE featured = true;
CREATE INDEX idx_books_file_hash ON content.books(file_hash) WHERE file_hash IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON content.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE content.books IS 'Main books table containing both AI-known and user-uploaded vectorized books';

-- =============================================================================
-- 2. Book Tags Table (content.book_tags)
-- Tags for categorization and search
-- =============================================================================

CREATE TABLE content.book_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES content.books(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    tag_type VARCHAR(20) DEFAULT 'general', -- 'general', 'theme', 'genre', 'period', 'location'
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1), -- Tag relevance weight
    source VARCHAR(20) DEFAULT 'manual', -- 'manual', 'ai_extracted', 'user_generated'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT book_tags_unique UNIQUE(book_id, tag)
);

-- Create indexes
CREATE INDEX idx_book_tags_book_id ON content.book_tags(book_id);
CREATE INDEX idx_book_tags_tag ON content.book_tags(lower(tag));
CREATE INDEX idx_book_tags_weighted ON content.book_tags(tag, weight DESC);
CREATE INDEX idx_book_tags_type ON content.book_tags(tag_type, tag);

-- =============================================================================
-- 3. Characters Table (content.characters)
-- Book characters for dialogue
-- =============================================================================

CREATE TABLE content.characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_short_id('char'),
    book_id UUID NOT NULL REFERENCES content.books(id) ON DELETE CASCADE,

    -- Character information
    name VARCHAR(200) NOT NULL,
    full_name VARCHAR(500),
    alias TEXT[], -- Alternative names
    description TEXT,
    biography TEXT,
    personality TEXT,
    role VARCHAR(50), -- 'protagonist', 'antagonist', 'supporting', 'minor'

    -- AI Configuration for dialogue
    personality_prompt TEXT, -- System prompt for character
    dialogue_style JSONB DEFAULT '{}', -- {language_style, emotional_tone, knowledge_scope}
    key_memories TEXT[], -- Important character memories
    relationships JSONB DEFAULT '[]', -- [{character_id, relationship_type, description}]
    traits TEXT[], -- Character traits
    quirks TEXT[], -- Speech patterns, habits
    example_dialogues JSONB DEFAULT '[]', -- [{user_input, character_response}]

    -- Statistics
    dialogue_count INTEGER DEFAULT 0,
    popularity_score DECIMAL(5,2) DEFAULT 0.0,
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,

    -- Metadata
    enabled BOOLEAN DEFAULT true,
    created_by VARCHAR(20) DEFAULT 'ai_extracted', -- 'ai_extracted', 'admin_created', 'user_created'
    avatar_url VARCHAR(1000),
    age_range VARCHAR(50), -- 'child', 'teenager', 'young_adult', 'adult', 'elderly'
    gender VARCHAR(20),
    occupation VARCHAR(255),

    -- AI processing
    extraction_confidence DECIMAL(3,2), -- Confidence score from AI extraction
    last_updated_by_ai TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_characters_book_id ON content.characters(book_id);
CREATE INDEX idx_characters_name_trgm ON content.characters USING GIN(name gin_trgm_ops);
CREATE INDEX idx_characters_enabled ON content.characters(enabled, book_id) WHERE enabled = true;
CREATE INDEX idx_characters_dialogue_count ON content.characters(dialogue_count DESC);
CREATE INDEX idx_characters_popularity ON content.characters(popularity_score DESC) WHERE enabled = true;
CREATE INDEX idx_characters_alias ON content.characters USING GIN(alias);

-- Add trigger for updated_at
CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON content.characters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. Book Chapters Table (content.book_chapters)
-- Chapter information for structured books
-- =============================================================================

CREATE TABLE content.book_chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES content.books(id) ON DELETE CASCADE,

    -- Chapter information
    chapter_number INTEGER NOT NULL,
    title VARCHAR(500),
    subtitle VARCHAR(500),
    summary TEXT,

    -- Content reference
    start_page INTEGER,
    end_page INTEGER,
    word_count INTEGER,

    -- Vector reference for chunked books
    vector_ids TEXT[], -- ChromaDB vector IDs for this chapter

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT book_chapters_unique UNIQUE(book_id, chapter_number)
);

-- Create indexes
CREATE INDEX idx_book_chapters_book_id ON content.book_chapters(book_id, chapter_number);

-- Add trigger for updated_at
CREATE TRIGGER update_book_chapters_updated_at BEFORE UPDATE ON content.book_chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. Book Categories Table (content.categories)
-- Predefined book categories
-- =============================================================================

CREATE TABLE content.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) UNIQUE NOT NULL,
    parent_code VARCHAR(50) REFERENCES content.categories(category_code),

    -- Multilingual support
    name_zh VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    description_zh TEXT,
    description_en TEXT,

    -- Display settings
    icon VARCHAR(100),
    color VARCHAR(7), -- Hex color code
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,

    -- Statistics
    book_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_categories_parent ON content.categories(parent_code);
CREATE INDEX idx_categories_active ON content.categories(is_active, display_order);

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON content.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO content.categories (category_code, name_zh, name_en, display_order) VALUES
    ('fiction', '小说', 'Fiction', 1),
    ('non_fiction', '非小说', 'Non-Fiction', 2),
    ('science', '科学', 'Science', 3),
    ('history', '历史', 'History', 4),
    ('philosophy', '哲学', 'Philosophy', 5),
    ('psychology', '心理学', 'Psychology', 6),
    ('business', '商业', 'Business', 7),
    ('technology', '科技', 'Technology', 8),
    ('art', '艺术', 'Art', 9),
    ('education', '教育', 'Education', 10);

-- =============================================================================
-- 6. Book Ratings Table (content.book_ratings)
-- User ratings for books
-- =============================================================================

CREATE TABLE content.book_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES content.books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_verified_purchase BOOLEAN DEFAULT false, -- User has dialogues with this book

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT book_ratings_unique UNIQUE(book_id, user_id)
);

-- Create indexes
CREATE INDEX idx_book_ratings_book_id ON content.book_ratings(book_id);
CREATE INDEX idx_book_ratings_user_id ON content.book_ratings(user_id);
CREATE INDEX idx_book_ratings_rating ON content.book_ratings(rating, created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_book_ratings_updated_at BEFORE UPDATE ON content.book_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. User Book Collections Table (content.user_book_collections)
-- User's favorite and reading lists
-- =============================================================================

CREATE TABLE content.user_book_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES content.books(id) ON DELETE CASCADE,

    collection_type VARCHAR(20) NOT NULL, -- 'favorite', 'reading', 'read', 'want_to_read'
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_collections_unique UNIQUE(user_id, book_id, collection_type)
);

-- Create indexes
CREATE INDEX idx_user_collections_user_id ON content.user_book_collections(user_id, collection_type);
CREATE INDEX idx_user_collections_book_id ON content.user_book_collections(book_id);

-- =============================================================================
-- 8. Popular Books Table (content.popular_books)
-- Cache table for popular books (updated by scheduled job)
-- =============================================================================

CREATE TABLE content.popular_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES content.books(id) ON DELETE CASCADE,

    popularity_type VARCHAR(20) NOT NULL, -- 'trending', 'most_discussed', 'highest_rated', 'new_arrival'
    time_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
    rank INTEGER NOT NULL,
    score DECIMAL(10,2), -- Calculated popularity score

    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT popular_books_unique UNIQUE(popularity_type, time_period, rank)
);

-- Create indexes
CREATE INDEX idx_popular_books_type ON content.popular_books(popularity_type, time_period, rank);
CREATE INDEX idx_popular_books_book_id ON content.popular_books(book_id);

-- =============================================================================
-- Functions
-- =============================================================================

-- Function to update book statistics
CREATE OR REPLACE FUNCTION content.update_book_statistics(p_book_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE content.books
    SET
        rating = COALESCE((
            SELECT AVG(rating)::DECIMAL(2,1)
            FROM content.book_ratings
            WHERE book_id = p_book_id
        ), 0.0),
        rating_count = (
            SELECT COUNT(*)
            FROM content.book_ratings
            WHERE book_id = p_book_id
        ),
        character_dialogue_count = (
            SELECT SUM(dialogue_count)
            FROM content.characters
            WHERE book_id = p_book_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_book_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if book exists by ISBN
CREATE OR REPLACE FUNCTION content.book_exists_by_isbn(p_isbn VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM content.books WHERE isbn = p_isbn AND deleted_at IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Function to get book recommendations
CREATE OR REPLACE FUNCTION content.get_book_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(book_id UUID, title VARCHAR, author VARCHAR, score DECIMAL) AS $$
BEGIN
    -- Simple recommendation based on user's favorite categories
    RETURN QUERY
    SELECT DISTINCT
        b.id,
        b.title,
        b.author,
        (b.rating * b.rating_count + b.dialogue_count * 0.1)::DECIMAL as score
    FROM content.books b
    JOIN content.book_tags bt ON b.id = bt.book_id
    WHERE bt.tag IN (
        SELECT UNNEST(preferred_categories)
        FROM auth.user_profiles
        WHERE user_id = p_user_id
    )
    AND b.status = 'published'
    AND b.deleted_at IS NULL
    ORDER BY score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Trigger to update book rating after rating change
CREATE OR REPLACE FUNCTION content.update_book_rating_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM content.update_book_statistics(NEW.book_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM content.update_book_statistics(OLD.book_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_rating_after_change
    AFTER INSERT OR UPDATE OR DELETE ON content.book_ratings
    FOR EACH ROW EXECUTE FUNCTION content.update_book_rating_trigger();

-- =============================================================================
-- Record Migration
-- =============================================================================

INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('003', 'book_tables')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE content.books IS '
ROLLBACK SCRIPT:
-- Drop triggers
DROP TRIGGER IF EXISTS update_book_rating_after_change ON content.book_ratings;

-- Drop functions
DROP FUNCTION IF EXISTS content.update_book_rating_trigger();
DROP FUNCTION IF EXISTS content.get_book_recommendations(UUID, INTEGER);
DROP FUNCTION IF EXISTS content.book_exists_by_isbn(VARCHAR);
DROP FUNCTION IF EXISTS content.update_book_statistics(UUID);

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS content.popular_books CASCADE;
DROP TABLE IF EXISTS content.user_book_collections CASCADE;
DROP TABLE IF EXISTS content.book_ratings CASCADE;
DROP TABLE IF EXISTS content.categories CASCADE;
DROP TABLE IF EXISTS content.book_chapters CASCADE;
DROP TABLE IF EXISTS content.characters CASCADE;
DROP TABLE IF EXISTS content.book_tags CASCADE;
DROP TABLE IF EXISTS content.books CASCADE;

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = ''003'';
';