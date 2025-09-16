-- =============================================================================
-- Migration: 007_indexes_optimization.sql
-- Description: Create performance optimization indexes and query tuning
-- Task: DB-007
-- Created: 2024-01-09
-- Dependencies: All previous migrations (001-006)
-- =============================================================================

\c inknowing_db;

-- =============================================================================
-- Query Performance Analysis Setup
-- =============================================================================

-- Enable query performance tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset statistics for clean baseline
SELECT pg_stat_statements_reset();

-- =============================================================================
-- Critical Query Indexes (Based on API endpoints)
-- =============================================================================

-- 1. User Authentication Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_login_phone
    ON auth.users(phone, status)
    WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_login_wechat
    ON auth.users(wechat_openid, status)
    WHERE deleted_at IS NULL;

-- 2. Book Search and Discovery
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_books_search_composite
    ON content.books(status, type, rating DESC, dialogue_count DESC)
    WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_books_fulltext_search
    ON content.books
    USING GIN((to_tsvector('simple', title || ' ' || COALESCE(author, '') || ' ' || COALESCE(description, ''))));

-- 3. Dialogue Session Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogue_user_active
    ON dialogue.dialogue_sessions(user_id, status, created_at DESC)
    WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogue_book_stats
    ON dialogue.dialogue_sessions(book_id, type)
    WHERE status != 'expired';

-- 4. Upload Processing Queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_queue_processing
    ON upload.upload_queue(status, priority DESC, queued_at)
    WHERE status IN ('queued', 'processing');

-- 5. Payment and Subscription Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_renewal
    ON payment.user_subscriptions(next_billing_date, status)
    WHERE status = 'active' AND auto_renew = true;

-- =============================================================================
-- Composite Indexes for Complex Queries
-- =============================================================================

-- Popular books query optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_books_popular_composite
    ON content.books(status, category, rating DESC, dialogue_count DESC)
    INCLUDE (title, author, cover_url)
    WHERE status = 'published' AND deleted_at IS NULL;

-- User quota check optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_quota_check
    ON auth.user_quotas(user_id, quota_reset_at)
    INCLUDE (quota_used, quota_total, extra_quota);

-- Transaction history optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_history
    ON payment.transactions(user_id, created_at DESC)
    INCLUDE (amount, status, type)
    WHERE status = 'completed';

-- =============================================================================
-- Partial Indexes for Specific Conditions
-- =============================================================================

-- Active dialogues only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_dialogues_partial
    ON dialogue.dialogue_sessions(user_id, last_message_at DESC)
    WHERE status = 'active' AND ended_at IS NULL;

-- Pending uploads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_uploads_partial
    ON upload.upload_jobs(user_id, created_at DESC)
    WHERE status IN ('pending', 'processing');

-- Featured books
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_featured_books_partial
    ON content.books(featured_order)
    WHERE featured = true AND status = 'published' AND deleted_at IS NULL;

-- =============================================================================
-- Foreign Key Index Verification
-- =============================================================================

-- Ensure all foreign keys have indexes (PostgreSQL doesn't create them automatically)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT
            tc.table_schema,
            tc.table_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN ('auth', 'content', 'dialogue', 'upload', 'payment')
    ) LOOP
        -- Check if index exists
        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = r.table_schema
            AND tablename = r.table_name
            AND indexdef LIKE '%' || r.column_name || '%'
        ) THEN
            EXECUTE format('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_%s_%s_fk ON %I.%I(%I)',
                r.table_name, r.column_name, r.table_schema, r.table_name, r.column_name);
        END IF;
    END LOOP;
END;
$$;

-- =============================================================================
-- Materialized Views for Complex Aggregations
-- =============================================================================

-- Popular books materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS content.mv_popular_books AS
SELECT
    b.id,
    b.book_id,
    b.title,
    b.author,
    b.cover_url,
    b.category,
    b.rating,
    b.rating_count,
    b.dialogue_count,
    (b.dialogue_count * 0.3 + b.rating * b.rating_count * 0.5 + b.view_count * 0.2) AS popularity_score
FROM content.books b
WHERE b.status = 'published'
AND b.deleted_at IS NULL
ORDER BY popularity_score DESC
LIMIT 100;

CREATE UNIQUE INDEX ON content.mv_popular_books(id);
CREATE INDEX ON content.mv_popular_books(popularity_score DESC);

-- User statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS auth.mv_user_statistics AS
SELECT
    u.id AS user_id,
    u.membership,
    COUNT(DISTINCT ds.id) AS total_dialogues,
    COUNT(DISTINCT ds.book_id) AS unique_books,
    AVG(ds.message_count) AS avg_messages_per_dialogue,
    SUM(ds.total_tokens_used) AS total_tokens_used,
    MAX(ds.last_message_at) AS last_active
FROM auth.users u
LEFT JOIN dialogue.dialogue_sessions ds ON u.id = ds.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.membership;

CREATE UNIQUE INDEX ON auth.mv_user_statistics(user_id);

-- =============================================================================
-- Query Optimization Rules
-- =============================================================================

-- Set optimal planner parameters
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';

-- Enable parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET parallel_setup_cost = 100;
ALTER SYSTEM SET parallel_tuple_cost = 0.01;

-- Reload configuration
SELECT pg_reload_conf();

-- =============================================================================
-- Table Statistics Update
-- =============================================================================

-- Update statistics for better query planning
ANALYZE auth.users;
ANALYZE auth.user_quotas;
ANALYZE content.books;
ANALYZE content.characters;
ANALYZE dialogue.dialogue_sessions;
ANALYZE dialogue.dialogue_messages;
ANALYZE upload.upload_jobs;
ANALYZE payment.transactions;
ANALYZE payment.user_subscriptions;

-- =============================================================================
-- Vacuum and Maintenance Setup
-- =============================================================================

-- Set autovacuum parameters for high-traffic tables
ALTER TABLE dialogue.dialogue_messages SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE dialogue.dialogue_sessions SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE auth.login_history SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

-- =============================================================================
-- Performance Monitoring Functions
-- =============================================================================

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(threshold_ms INTEGER DEFAULT 100)
RETURNS TABLE(
    query TEXT,
    calls BIGINT,
    mean_time DOUBLE PRECISION,
    total_time DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        query::TEXT,
        calls,
        mean_exec_time AS mean_time,
        total_exec_time AS total_time
    FROM pg_stat_statements
    WHERE mean_exec_time > threshold_ms
    ORDER BY mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats(schema_name TEXT DEFAULT NULL)
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_scans BIGINT,
    index_size TEXT,
    table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::TEXT,
        indexname::TEXT,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid))::TEXT AS index_size,
        pg_size_pretty(pg_relation_size(relid))::TEXT AS table_size
    FROM pg_stat_user_indexes i
    JOIN pg_stat_user_tables t ON i.relid = t.relid
    WHERE (schema_name IS NULL OR i.schemaname = schema_name)
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Create Refresh Functions for Materialized Views
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_popular_books()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY content.mv_popular_books;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_user_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY auth.mv_user_statistics;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Record Migration
-- =============================================================================

INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('007', 'indexes_optimization')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Performance Testing Queries
-- =============================================================================

COMMENT ON FUNCTION get_slow_queries IS '
-- Test critical query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.*, uq.quota_used, uq.quota_total
FROM auth.users u
LEFT JOIN auth.user_quotas uq ON u.id = uq.user_id
WHERE u.phone = ''13800138000'' AND u.status = ''active'';

EXPLAIN (ANALYZE, BUFFERS)
SELECT b.*, array_agg(bt.tag) as tags
FROM content.books b
LEFT JOIN content.book_tags bt ON b.id = bt.book_id
WHERE b.status = ''published''
AND to_tsvector(''simple'', b.title || '' '' || b.author) @@ plainto_tsquery(''simple'', ''search term'')
GROUP BY b.id
ORDER BY b.rating DESC, b.dialogue_count DESC
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS)
SELECT ds.*, dm.content
FROM dialogue.dialogue_sessions ds
JOIN dialogue.dialogue_messages dm ON ds.id = dm.session_id
WHERE ds.user_id = ''user_uuid''::uuid
AND ds.status = ''active''
ORDER BY dm.created_at DESC
LIMIT 50;
';

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE pg_stat_statements IS '
ROLLBACK SCRIPT:
-- Drop materialized views
DROP MATERIALIZED VIEW IF EXISTS auth.mv_user_statistics;
DROP MATERIALIZED VIEW IF EXISTS content.mv_popular_books;

-- Drop functions
DROP FUNCTION IF EXISTS refresh_user_statistics();
DROP FUNCTION IF EXISTS refresh_popular_books();
DROP FUNCTION IF EXISTS get_index_usage_stats(TEXT);
DROP FUNCTION IF EXISTS get_slow_queries(INTEGER);

-- Drop indexes (keeping foreign key indexes)
DROP INDEX IF EXISTS idx_featured_books_partial;
DROP INDEX IF EXISTS idx_pending_uploads_partial;
DROP INDEX IF EXISTS idx_active_dialogues_partial;
DROP INDEX IF EXISTS idx_transactions_history;
DROP INDEX IF EXISTS idx_user_quota_check;
DROP INDEX IF EXISTS idx_books_popular_composite;
DROP INDEX IF EXISTS idx_subscriptions_renewal;
DROP INDEX IF EXISTS idx_upload_queue_processing;
DROP INDEX IF EXISTS idx_dialogue_book_stats;
DROP INDEX IF EXISTS idx_dialogue_user_active;
DROP INDEX IF EXISTS idx_books_fulltext_search;
DROP INDEX IF EXISTS idx_books_search_composite;
DROP INDEX IF EXISTS idx_users_login_wechat;
DROP INDEX IF EXISTS idx_users_login_phone;

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = ''007'';
';