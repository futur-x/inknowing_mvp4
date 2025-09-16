-- =============================================================================
-- Migration: 004_dialogue_tables.sql
-- Description: Create dialogue sessions, messages, and context management tables
-- Task: DB-004
-- Created: 2024-01-09
-- Dependencies: 001_init_database.sql, 002_user_tables.sql, 003_book_tables.sql
-- =============================================================================

\c inknowing_db;

-- =============================================================================
-- 1. Dialogue Sessions Table (dialogue.dialogue_sessions)
-- Main dialogue sessions with books and characters
-- =============================================================================

CREATE TABLE dialogue.dialogue_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_short_id('dlg'),

    -- Session participants
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES content.books(id) ON DELETE CASCADE,
    type dialogue_type NOT NULL, -- 'book' or 'character'
    character_id UUID REFERENCES content.characters(id) ON DELETE SET NULL,

    -- Session metadata
    title VARCHAR(500), -- Auto-generated or user-defined
    initial_question TEXT, -- First question/message
    summary TEXT, -- AI-generated session summary
    status dialogue_status DEFAULT 'active',
    message_count INTEGER DEFAULT 0,

    -- Context management for AI
    context_window INTEGER DEFAULT 4000, -- Token limit for context
    system_prompt TEXT, -- Customized system prompt
    temperature DECIMAL(2,1) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
    max_tokens INTEGER DEFAULT 500,
    model_name VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    model_version VARCHAR(50),

    -- Statistics
    total_tokens_used INTEGER DEFAULT 0,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0.000000, -- in USD
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,

    -- WebSocket support
    ws_connection_id VARCHAR(100), -- Active WebSocket connection
    ws_connected_at TIMESTAMP,

    -- Timestamps
    last_message_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_dialogue_sessions_user_id ON dialogue.dialogue_sessions(user_id, created_at DESC);
CREATE INDEX idx_dialogue_sessions_book_id ON dialogue.dialogue_sessions(book_id);
CREATE INDEX idx_dialogue_sessions_character_id ON dialogue.dialogue_sessions(character_id) WHERE character_id IS NOT NULL;
CREATE INDEX idx_dialogue_sessions_status ON dialogue.dialogue_sessions(status) WHERE status = 'active';
CREATE INDEX idx_dialogue_sessions_type ON dialogue.dialogue_sessions(type);
CREATE INDEX idx_dialogue_sessions_created_at ON dialogue.dialogue_sessions(created_at DESC);
CREATE INDEX idx_dialogue_sessions_last_message ON dialogue.dialogue_sessions(last_message_at DESC) WHERE status = 'active';
CREATE INDEX idx_dialogue_sessions_ws ON dialogue.dialogue_sessions(ws_connection_id) WHERE ws_connection_id IS NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_dialogue_sessions_updated_at BEFORE UPDATE ON dialogue.dialogue_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. Dialogue Messages Table (dialogue.dialogue_messages)
-- Messages within dialogue sessions (partitioned by month for scalability)
-- =============================================================================

CREATE TABLE dialogue.dialogue_messages (
    id UUID DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    message_id VARCHAR(50) NOT NULL DEFAULT generate_short_id('msg'),

    -- Message content
    role message_role NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image_url', 'function_call'

    -- References for context
    reference_type VARCHAR(20), -- 'book_content', 'character_info', 'previous_message'
    reference_id VARCHAR(100), -- Vector ID or message ID
    reference_text TEXT, -- Actual referenced content
    reference_metadata JSONB DEFAULT '{}',

    -- Token tracking
    tokens_used INTEGER,
    model_used VARCHAR(100),

    -- Response metadata
    response_time_ms INTEGER, -- Time to generate response
    confidence_score DECIMAL(3,2), -- AI confidence in response
    moderation_score DECIMAL(3,2), -- Content moderation score

    -- Streaming support
    is_streaming BOOLEAN DEFAULT false,
    stream_completed BOOLEAN DEFAULT true,

    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- User actions
    is_liked BOOLEAN,
    is_reported BOOLEAN DEFAULT false,
    report_reason VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create foreign key separately (partitioned tables limitation)
ALTER TABLE dialogue.dialogue_messages
    ADD CONSTRAINT fk_dialogue_messages_session
    FOREIGN KEY (session_id) REFERENCES dialogue.dialogue_sessions(id) ON DELETE CASCADE;

-- Create initial partitions for the next 12 months
DO $$
DECLARE
    start_date date := DATE_TRUNC('month', CURRENT_DATE);
    end_date date;
    partition_name text;
BEGIN
    FOR i IN 0..11 LOOP
        end_date := start_date + interval '1 month';
        partition_name := 'dialogue_messages_' || to_char(start_date, 'YYYY_MM');

        EXECUTE format('CREATE TABLE IF NOT EXISTS dialogue.%I PARTITION OF dialogue.dialogue_messages
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date);

        -- Create indexes on partition
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_session_id ON dialogue.%I(session_id)',
            partition_name, partition_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON dialogue.%I(created_at DESC)',
            partition_name, partition_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_role ON dialogue.%I(role)',
            partition_name, partition_name);

        start_date := end_date;
    END LOOP;
END;
$$;

-- =============================================================================
-- 3. Dialogue Context Table (dialogue.dialogue_contexts)
-- Store conversation context for resuming sessions
-- =============================================================================

CREATE TABLE dialogue.dialogue_contexts (
    session_id UUID PRIMARY KEY REFERENCES dialogue.dialogue_sessions(id) ON DELETE CASCADE,

    -- Context storage
    context_messages JSONB NOT NULL DEFAULT '[]', -- Last N messages for context
    context_tokens INTEGER DEFAULT 0,
    max_context_tokens INTEGER DEFAULT 4000,

    -- Summary for long conversations
    conversation_summary TEXT,
    summary_updated_at TIMESTAMP,

    -- Key information extracted
    key_topics TEXT[],
    key_entities JSONB DEFAULT '[]', -- [{type, name, mentions}]
    user_preferences JSONB DEFAULT '{}',

    -- Vector storage reference
    vector_collection_id VARCHAR(100), -- ChromaDB collection ID
    vector_ids TEXT[], -- Message vector IDs

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_dialogue_contexts_session_id ON dialogue.dialogue_contexts(session_id);
CREATE INDEX idx_dialogue_contexts_topics ON dialogue.dialogue_contexts USING GIN(key_topics);

-- Add trigger for updated_at
CREATE TRIGGER update_dialogue_contexts_updated_at BEFORE UPDATE ON dialogue.dialogue_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. Message References Table (dialogue.message_references)
-- Store references between messages and book content
-- =============================================================================

CREATE TABLE dialogue.message_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL,
    session_id UUID NOT NULL REFERENCES dialogue.dialogue_sessions(id) ON DELETE CASCADE,

    -- Reference information
    reference_type VARCHAR(50) NOT NULL, -- 'book_quote', 'character_trait', 'chapter', 'concept'
    reference_source VARCHAR(50), -- 'vector_search', 'direct_quote', 'summary'

    -- Content reference
    book_id UUID REFERENCES content.books(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES content.book_chapters(id) ON DELETE CASCADE,
    character_id UUID REFERENCES content.characters(id) ON DELETE CASCADE,

    -- Vector reference
    vector_id VARCHAR(100), -- ChromaDB vector ID
    similarity_score DECIMAL(4,3), -- 0.000 to 1.000

    -- Referenced content
    content TEXT,
    page_number INTEGER,
    paragraph_number INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_message_references_message ON dialogue.message_references(message_id);
CREATE INDEX idx_message_references_session ON dialogue.message_references(session_id);
CREATE INDEX idx_message_references_book ON dialogue.message_references(book_id);
CREATE INDEX idx_message_references_vector ON dialogue.message_references(vector_id);

-- =============================================================================
-- 5. Dialogue Templates Table (dialogue.dialogue_templates)
-- Predefined dialogue templates and prompts
-- =============================================================================

CREATE TABLE dialogue.dialogue_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_code VARCHAR(50) UNIQUE NOT NULL,

    -- Template information
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'book_discussion', 'character_roleplay', 'study_guide'

    -- Prompt templates
    system_prompt TEXT NOT NULL,
    initial_message TEXT,
    example_questions TEXT[],

    -- Configuration
    recommended_model VARCHAR(50),
    recommended_temperature DECIMAL(2,1),
    recommended_max_tokens INTEGER,

    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(2,1),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_dialogue_templates_code ON dialogue.dialogue_templates(template_code);
CREATE INDEX idx_dialogue_templates_category ON dialogue.dialogue_templates(category) WHERE is_active = true;

-- Add trigger for updated_at
CREATE TRIGGER update_dialogue_templates_updated_at BEFORE UPDATE ON dialogue.dialogue_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. Dialogue Analytics Table (dialogue.dialogue_analytics)
-- Analytics and metrics for dialogues
-- =============================================================================

CREATE TABLE dialogue.dialogue_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES dialogue.dialogue_sessions(id) ON DELETE CASCADE,

    -- Engagement metrics
    avg_response_time_ms INTEGER,
    total_interaction_time_seconds INTEGER,
    message_frequency DECIMAL(5,2), -- messages per minute

    -- Quality metrics
    avg_message_length INTEGER,
    vocabulary_diversity DECIMAL(3,2), -- 0.00 to 1.00
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
    coherence_score DECIMAL(3,2), -- 0.00 to 1.00

    -- Topic analysis
    main_topics TEXT[],
    topic_distribution JSONB DEFAULT '{}', -- {topic: percentage}

    -- User behavior
    user_engagement_score DECIMAL(3,2), -- 0.00 to 1.00
    question_complexity_avg DECIMAL(3,2), -- 0.00 to 1.00

    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_dialogue_analytics_session ON dialogue.dialogue_analytics(session_id);
CREATE INDEX idx_dialogue_analytics_calculated ON dialogue.dialogue_analytics(calculated_at DESC);

-- =============================================================================
-- Functions
-- =============================================================================

-- Function to close inactive dialogue sessions
CREATE OR REPLACE FUNCTION dialogue.close_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
    closed_count INTEGER;
BEGIN
    UPDATE dialogue.dialogue_sessions
    SET status = 'ended', ended_at = CURRENT_TIMESTAMP
    WHERE status = 'active'
    AND last_message_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';

    GET DIAGNOSTICS closed_count = ROW_COUNT;
    RETURN closed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate dialogue costs
CREATE OR REPLACE FUNCTION dialogue.calculate_session_cost(
    p_model VARCHAR,
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    cost DECIMAL(10,6);
BEGIN
    -- Pricing per 1K tokens (example rates, adjust as needed)
    CASE p_model
        WHEN 'gpt-4' THEN
            cost := (p_prompt_tokens * 0.03 + p_completion_tokens * 0.06) / 1000;
        WHEN 'gpt-3.5-turbo' THEN
            cost := (p_prompt_tokens * 0.0015 + p_completion_tokens * 0.002) / 1000;
        WHEN 'claude-2' THEN
            cost := (p_prompt_tokens * 0.008 + p_completion_tokens * 0.024) / 1000;
        ELSE
            cost := (p_prompt_tokens * 0.001 + p_completion_tokens * 0.001) / 1000;
    END CASE;

    RETURN cost;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get dialogue context
CREATE OR REPLACE FUNCTION dialogue.get_dialogue_context(
    p_session_id UUID,
    p_max_messages INTEGER DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
    context JSONB;
BEGIN
    SELECT json_agg(msg ORDER BY created_at DESC)
    INTO context
    FROM (
        SELECT
            role,
            content,
            created_at
        FROM dialogue.dialogue_messages
        WHERE session_id = p_session_id
        ORDER BY created_at DESC
        LIMIT p_max_messages
    ) msg;

    RETURN COALESCE(context, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Trigger to update session statistics after message insert
CREATE OR REPLACE FUNCTION dialogue.update_session_after_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dialogue.dialogue_sessions
    SET
        message_count = message_count + 1,
        last_message_at = NEW.created_at,
        total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_used, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.session_id;

    -- Update book/character dialogue count
    IF NEW.role = 'user' THEN
        UPDATE content.books
        SET dialogue_count = dialogue_count + 1
        WHERE id = (SELECT book_id FROM dialogue.dialogue_sessions WHERE id = NEW.session_id);

        UPDATE content.characters
        SET dialogue_count = dialogue_count + 1
        WHERE id = (SELECT character_id FROM dialogue.dialogue_sessions WHERE id = NEW.session_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_after_message_trigger
    AFTER INSERT ON dialogue.dialogue_messages
    FOR EACH ROW EXECUTE FUNCTION dialogue.update_session_after_message();

-- =============================================================================
-- Record Migration
-- =============================================================================

INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('004', 'dialogue_tables')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE dialogue.dialogue_sessions IS '
ROLLBACK SCRIPT:
-- Drop triggers
DROP TRIGGER IF EXISTS update_session_after_message_trigger ON dialogue.dialogue_messages;

-- Drop functions
DROP FUNCTION IF EXISTS dialogue.update_session_after_message();
DROP FUNCTION IF EXISTS dialogue.get_dialogue_context(UUID, INTEGER);
DROP FUNCTION IF EXISTS dialogue.calculate_session_cost(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS dialogue.close_inactive_sessions();

-- Drop tables
DROP TABLE IF EXISTS dialogue.dialogue_analytics CASCADE;
DROP TABLE IF EXISTS dialogue.dialogue_templates CASCADE;
DROP TABLE IF EXISTS dialogue.message_references CASCADE;
DROP TABLE IF EXISTS dialogue.dialogue_contexts CASCADE;
DROP TABLE IF EXISTS dialogue.dialogue_messages CASCADE;
DROP TABLE IF EXISTS dialogue.dialogue_sessions CASCADE;

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = ''004'';
';