# DB-007: Database Performance Optimization and Indexing Strategy

## Task Information
- **Task ID**: DB-007
- **Title**: Implement Performance Optimization, Indexing, and Query Tuning
- **Priority**: P1 (High - Critical for scalability)
- **Estimated Hours**: 12
- **Dependencies**: DB-001 through DB-006 (All tables must exist)
- **Related API Specs**: All endpoints requiring < 100ms response time

## Performance Optimization Strategy

### 1. Query Performance Analysis

```sql
-- Enable query performance tracking
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET pg_stat_statements.max = 10000;

-- Create extension for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Function to analyze slow queries
CREATE OR REPLACE FUNCTION analyze_slow_queries(
    threshold_ms NUMERIC DEFAULT 100
)
RETURNS TABLE(
    query_text TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    max_time NUMERIC,
    rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        LEFT(query, 100) as query_text,
        calls,
        ROUND(total_exec_time::NUMERIC, 2) as total_time,
        ROUND(mean_exec_time::NUMERIC, 2) as mean_time,
        ROUND(max_exec_time::NUMERIC, 2) as max_time,
        rows
    FROM pg_stat_statements
    WHERE mean_exec_time > threshold_ms
    ORDER BY mean_exec_time DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;
```

### 2. Critical Query Indexes

```sql
-- ============== Authentication & User Queries ==============

-- Login query optimization
CREATE INDEX CONCURRENTLY idx_users_login_phone
ON auth.users(phone, status)
WHERE status = 'active' AND phone IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_users_login_wechat
ON auth.users(wechat_openid, status)
WHERE status = 'active' AND wechat_openid IS NOT NULL;

-- Token validation optimization
CREATE INDEX CONCURRENTLY idx_tokens_validation
ON auth.tokens(token_hash, expires_at, revoked_at)
WHERE revoked_at IS NULL;

-- ============== Book Search Queries ==============

-- Full-text search optimization
CREATE INDEX CONCURRENTLY idx_books_search_title_author
ON content.books USING GIN(
    to_tsvector('simple',
        COALESCE(title, '') || ' ' ||
        COALESCE(author, '') || ' ' ||
        COALESCE(description, '')
    )
) WHERE status = 'published';

-- Category and status filtering
CREATE INDEX CONCURRENTLY idx_books_category_status_dialogue
ON content.books(category, status, dialogue_count DESC)
WHERE status = 'published';

-- Popular books query
CREATE INDEX CONCURRENTLY idx_books_popularity
ON content.books(
    dialogue_count DESC,
    rating DESC,
    created_at DESC
) WHERE status = 'published';

-- ============== Dialogue Queries ==============

-- User dialogue history
CREATE INDEX CONCURRENTLY idx_dialogue_sessions_user_history
ON dialogue.dialogue_sessions(user_id, created_at DESC, status);

-- Active dialogues lookup
CREATE INDEX CONCURRENTLY idx_dialogue_sessions_active
ON dialogue.dialogue_sessions(user_id, status, last_message_at DESC)
WHERE status = 'active';

-- Message pagination
CREATE INDEX CONCURRENTLY idx_dialogue_messages_pagination
ON dialogue.dialogue_messages(session_id, created_at DESC);

-- ============== Upload Processing ==============

-- Upload queue processing
CREATE INDEX CONCURRENTLY idx_upload_queue_processing
ON upload.vectorization_queue(status, priority ASC, queued_at ASC)
WHERE status IN ('pending', 'processing');

-- User upload history
CREATE INDEX CONCURRENTLY idx_upload_jobs_user_history
ON upload.upload_jobs(user_id, created_at DESC);

-- ============== Payment Queries ==============

-- Active subscriptions lookup
CREATE INDEX CONCURRENTLY idx_subscriptions_active_users
ON payment.user_subscriptions(user_id, status, current_period_end)
WHERE status = 'active';

-- Renewal processing
CREATE INDEX CONCURRENTLY idx_subscriptions_renewal_due
ON payment.user_subscriptions(next_billing_date, status, auto_renew)
WHERE status = 'active' AND auto_renew = true;
```

### 3. Composite and Covering Indexes

```sql
-- Covering index for session with book details
CREATE INDEX CONCURRENTLY idx_dialogue_sessions_with_book
ON dialogue.dialogue_sessions(user_id, book_id, status)
INCLUDE (session_id, title, message_count, last_message_at);

-- Covering index for user quota checks
CREATE INDEX CONCURRENTLY idx_user_quotas_check
ON auth.user_quotas(user_id)
INCLUDE (quota_total, quota_used, quota_reset_at);

-- Composite index for book recommendations
CREATE INDEX CONCURRENTLY idx_books_recommendations
ON content.books(category, type, status, rating DESC)
WHERE status = 'published' AND rating_count > 10;
```

### 4. Partitioning Implementation

```sql
-- ============== Dialogue Messages Partitioning ==============

-- Auto-partition management function
CREATE OR REPLACE FUNCTION manage_dialogue_partitions()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
    i integer;
BEGIN
    -- Create next 3 months of partitions
    FOR i IN 0..2 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::INTERVAL);
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'dialogue_messages_' || TO_CHAR(start_date, 'YYYY_MM');

        -- Check if partition exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'dialogue'
            AND tablename = partition_name
        ) THEN
            EXECUTE format('
                CREATE TABLE dialogue.%I PARTITION OF dialogue.dialogue_messages
                FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );

            -- Create indexes on new partition
            EXECUTE format('
                CREATE INDEX %I ON dialogue.%I(session_id);
                CREATE INDEX %I ON dialogue.%I(created_at DESC);
                CREATE INDEX %I ON dialogue.%I(role);',
                'idx_' || partition_name || '_session',
                partition_name,
                'idx_' || partition_name || '_created',
                partition_name,
                'idx_' || partition_name || '_role',
                partition_name
            );

            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;

    -- Drop old partitions (older than 12 months)
    FOR partition_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'dialogue'
        AND tablename LIKE 'dialogue_messages_%'
        AND tablename < 'dialogue_messages_' ||
            TO_CHAR(CURRENT_DATE - INTERVAL '12 months', 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS dialogue.%I', partition_name);
        RAISE NOTICE 'Dropped old partition: %', partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule partition management
SELECT cron.schedule('manage-partitions', '0 1 1 * *', 'SELECT manage_dialogue_partitions();');

-- ============== Login History Partitioning ==============

-- Similar partitioning for login_history
CREATE OR REPLACE FUNCTION manage_login_partitions()
RETURNS void AS $$
DECLARE
    partition_date date;
    partition_name text;
BEGIN
    partition_date := DATE_TRUNC('month', CURRENT_DATE);
    partition_name := 'login_history_' || TO_CHAR(partition_date, 'YYYY_MM');

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'auth'
        AND tablename = partition_name
    ) THEN
        EXECUTE format('
            CREATE TABLE auth.%I PARTITION OF auth.login_history
            FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            partition_date,
            partition_date + INTERVAL '1 month'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 5. Connection Pooling Configuration

```sql
-- PostgreSQL configuration (postgresql.conf)
-- Note: These are recommendations, adjust based on server resources

-- Connection settings
-- max_connections = 200
-- superuser_reserved_connections = 3

-- Memory settings
-- shared_buffers = 2GB              # 25% of RAM
-- effective_cache_size = 6GB        # 75% of RAM
-- maintenance_work_mem = 512MB
-- work_mem = 10MB                   # per operation

-- Checkpoint settings
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- random_page_cost = 1.1            # for SSD

-- Create connection pooler configuration
CREATE OR REPLACE FUNCTION get_pooler_config()
RETURNS TABLE(
    parameter TEXT,
    value TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'pool_size', '20', 'Number of connections per pool';
    UNION ALL
    SELECT 'max_overflow', '10', 'Maximum overflow connections';
    UNION ALL
    SELECT 'pool_timeout', '30', 'Timeout in seconds';
    UNION ALL
    SELECT 'pool_recycle', '3600', 'Recycle connections after 1 hour';
    UNION ALL
    SELECT 'pool_pre_ping', 'true', 'Test connections before use';
END;
$$ LANGUAGE plpgsql;
```

### 6. Query Optimization Functions

```sql
-- ============== Batch Operations ==============

-- Batch update dialogue statistics
CREATE OR REPLACE FUNCTION batch_update_dialogue_stats()
RETURNS void AS $$
BEGIN
    -- Update message counts
    UPDATE dialogue.dialogue_sessions ds
    SET
        message_count = sub.msg_count,
        last_message_at = sub.last_msg,
        total_tokens_used = sub.total_tokens
    FROM (
        SELECT
            session_id,
            COUNT(*) as msg_count,
            MAX(created_at) as last_msg,
            SUM(tokens_used) as total_tokens
        FROM dialogue.dialogue_messages
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'
        GROUP BY session_id
    ) sub
    WHERE ds.id = sub.session_id;

    -- Update book dialogue counts
    UPDATE content.books b
    SET dialogue_count = sub.dialogue_count
    FROM (
        SELECT
            book_id,
            COUNT(DISTINCT user_id) as dialogue_count
        FROM dialogue.dialogue_sessions
        WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
        GROUP BY book_id
    ) sub
    WHERE b.id = sub.book_id;
END;
$$ LANGUAGE plpgsql;

-- ============== Materialized View Refresh ==============

-- Optimized materialized view refresh
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh in dependency order
    REFRESH MATERIALIZED VIEW CONCURRENTLY content.popular_books;
    REFRESH MATERIALIZED VIEW CONCURRENTLY dialogue.dialogue_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY upload.upload_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY payment.revenue_analytics;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh
SELECT cron.schedule('refresh-views', '0 */2 * * *', 'SELECT refresh_all_materialized_views();');
```

### 7. Cache Management

```sql
-- ============== Result Caching ==============

-- Cache table for expensive queries
CREATE TABLE IF NOT EXISTS public.query_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    query_result JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_query_cache_expires ON public.query_cache(expires_at);

-- Cache management function
CREATE OR REPLACE FUNCTION cache_query_result(
    p_cache_key VARCHAR(255),
    p_query_result JSONB,
    p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.query_cache (cache_key, query_result, expires_at)
    VALUES (p_cache_key, p_query_result, CURRENT_TIMESTAMP + (p_ttl_seconds || ' seconds')::INTERVAL)
    ON CONFLICT (cache_key) DO UPDATE
    SET
        query_result = EXCLUDED.query_result,
        expires_at = EXCLUDED.expires_at,
        created_at = CURRENT_TIMESTAMP,
        hit_count = query_cache.hit_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Cache cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.query_cache
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cache cleanup
SELECT cron.schedule('cleanup-cache', '*/10 * * * *', 'SELECT cleanup_expired_cache();');
```

### 8. Database Statistics and Monitoring

```sql
-- ============== Performance Monitoring ==============

-- Table to track query performance
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_unit VARCHAR(20),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_performance_metrics_name_time
ON public.performance_metrics(metric_name, collected_at DESC);

-- Function to collect performance metrics
CREATE OR REPLACE FUNCTION collect_performance_metrics()
RETURNS void AS $$
DECLARE
    v_cache_hit_ratio NUMERIC;
    v_active_connections INTEGER;
    v_database_size BIGINT;
    v_deadlocks INTEGER;
BEGIN
    -- Cache hit ratio
    SELECT
        ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2)
    INTO v_cache_hit_ratio
    FROM pg_stat_database
    WHERE datname = current_database();

    -- Active connections
    SELECT count(*)
    INTO v_active_connections
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'active';

    -- Database size
    SELECT pg_database_size(current_database())
    INTO v_database_size;

    -- Deadlocks
    SELECT deadlocks
    INTO v_deadlocks
    FROM pg_stat_database
    WHERE datname = current_database();

    -- Insert metrics
    INSERT INTO public.performance_metrics (metric_name, metric_value, metric_unit) VALUES
    ('cache_hit_ratio', v_cache_hit_ratio, 'percentage'),
    ('active_connections', v_active_connections, 'count'),
    ('database_size', v_database_size, 'bytes'),
    ('deadlocks', v_deadlocks, 'count');
END;
$$ LANGUAGE plpgsql;

-- Schedule metrics collection
SELECT cron.schedule('collect-metrics', '*/5 * * * *', 'SELECT collect_performance_metrics();');
```

### 9. Query Optimization Rules

```sql
-- ============== Query Rewrite Rules ==============

-- Create helper function for common query patterns
CREATE OR REPLACE FUNCTION get_user_active_sessions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    session_id VARCHAR(50),
    book_title VARCHAR(500),
    last_message_at TIMESTAMP,
    message_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ds.session_id,
        ds.title,
        ds.last_message_at,
        ds.message_count
    FROM dialogue.dialogue_sessions ds
    WHERE ds.user_id = p_user_id
      AND ds.status = 'active'
    ORDER BY ds.last_message_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized book search function
CREATE OR REPLACE FUNCTION search_books_optimized(
    p_query TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    book_id VARCHAR(50),
    title VARCHAR(500),
    author VARCHAR(255),
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_books AS (
        SELECT
            b.book_id,
            b.title,
            b.author,
            ts_rank(
                to_tsvector('simple', b.title || ' ' || b.author || ' ' || COALESCE(b.description, '')),
                plainto_tsquery('simple', p_query)
            ) as rank
        FROM content.books b
        WHERE b.status = 'published'
          AND to_tsvector('simple', b.title || ' ' || b.author || ' ' || COALESCE(b.description, ''))
              @@ plainto_tsquery('simple', p_query)
    )
    SELECT
        rb.book_id,
        rb.title,
        rb.author,
        rb.rank
    FROM ranked_books rb
    ORDER BY rb.rank DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 10. Index Maintenance

```sql
-- ============== Index Maintenance ==============

-- Function to identify unused indexes
CREATE OR REPLACE FUNCTION find_unused_indexes()
RETURNS TABLE(
    schemaname TEXT,
    tablename TEXT,
    indexname TEXT,
    index_size TEXT,
    index_scans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.schemaname::TEXT,
        s.tablename::TEXT,
        s.indexname::TEXT,
        pg_size_pretty(pg_relation_size(s.indexrelid))::TEXT,
        s.idx_scan
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE s.idx_scan < 50
      AND s.schemaname NOT IN ('pg_catalog', 'information_schema')
      AND NOT i.indisprimary
      AND NOT i.indisunique
    ORDER BY pg_relation_size(s.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
    tablename TEXT,
    attname TEXT,
    n_distinct REAL,
    correlation REAL,
    suggestion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::TEXT,
        a.attname::TEXT,
        s.n_distinct,
        s.correlation,
        CASE
            WHEN s.n_distinct > 100 AND abs(s.correlation) < 0.1
            THEN 'Consider adding index'
            WHEN s.n_distinct BETWEEN 10 AND 100
            THEN 'Possible candidate for index'
            ELSE 'Index may not be beneficial'
        END::TEXT
    FROM pg_stats s
    JOIN pg_class c ON s.tablename = c.relname
    JOIN pg_attribute a ON c.oid = a.attrelid AND s.attname = a.attname
    WHERE s.schemaname NOT IN ('pg_catalog', 'information_schema')
      AND s.n_distinct > 10
      AND NOT EXISTS (
          SELECT 1
          FROM pg_index i
          WHERE i.indrelid = c.oid
            AND a.attnum = ANY(i.indkey)
      )
    ORDER BY s.n_distinct DESC;
END;
$$ LANGUAGE plpgsql;

-- Reindex function
CREATE OR REPLACE FUNCTION reindex_all_tables()
RETURNS void AS $$
DECLARE
    v_table RECORD;
BEGIN
    FOR v_table IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    LOOP
        EXECUTE format('REINDEX TABLE %I.%I', v_table.schemaname, v_table.tablename);
        RAISE NOTICE 'Reindexed table: %.%', v_table.schemaname, v_table.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Performance Testing

### Load Testing Scenarios

```sql
-- Generate test data for load testing
CREATE OR REPLACE FUNCTION generate_load_test_data(
    user_count INTEGER DEFAULT 10000,
    book_count INTEGER DEFAULT 1000,
    session_count INTEGER DEFAULT 50000
)
RETURNS void AS $$
DECLARE
    v_user_ids UUID[];
    v_book_ids UUID[];
BEGIN
    -- Generate users
    INSERT INTO auth.users (username, phone, nickname, membership)
    SELECT
        'loadtest_user_' || i,
        '199' || lpad(i::TEXT, 8, '0'),
        'Load Test User ' || i,
        (ARRAY['free', 'basic', 'premium', 'super'])[1 + (i % 4)]
    FROM generate_series(1, user_count) i
    RETURNING ARRAY_AGG(id) INTO v_user_ids;

    -- Generate books
    INSERT INTO content.books (title, author, type, status)
    SELECT
        'Test Book ' || i,
        'Test Author ' || (i % 100),
        CASE WHEN i % 2 = 0 THEN 'ai_known' ELSE 'vectorized' END,
        'published'
    FROM generate_series(1, book_count) i
    RETURNING ARRAY_AGG(id) INTO v_book_ids;

    -- Generate dialogue sessions
    INSERT INTO dialogue.dialogue_sessions (user_id, book_id, type)
    SELECT
        v_user_ids[1 + ((i - 1) % user_count)],
        v_book_ids[1 + ((i - 1) % book_count)],
        CASE WHEN i % 2 = 0 THEN 'book' ELSE 'character' END
    FROM generate_series(1, session_count) i;

    RAISE NOTICE 'Generated % users, % books, % sessions',
        user_count, book_count, session_count;
END;
$$ LANGUAGE plpgsql;
```

## Performance Benchmarks

### Target Performance Metrics

| Query Type | Target Response Time | Actual | Status |
|------------|---------------------|--------|--------|
| User Login | < 10ms | - | Pending |
| Book Search | < 50ms | - | Pending |
| Dialogue Creation | < 20ms | - | Pending |
| Message Send | < 30ms | - | Pending |
| History Pagination | < 20ms | - | Pending |
| Popular Books | < 10ms | - | Pending |
| Subscription Check | < 5ms | - | Pending |

### Testing Script

```bash
#!/bin/bash
# performance_test.sh

echo "Running performance benchmarks..."

# Test login query
psql -d inknowing_db -c "
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.*, uq.quota_used, uq.quota_total
FROM auth.users u
LEFT JOIN auth.user_quotas uq ON u.id = uq.user_id
WHERE u.phone = '13800138000' AND u.status = 'active';
"

# Test book search
psql -d inknowing_db -c "
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM search_books_optimized('人工智能', 20, 0);
"

# Test dialogue history
psql -d inknowing_db -c "
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM get_user_active_sessions(
    (SELECT id FROM auth.users LIMIT 1)::UUID, 10
);
"

echo "Performance benchmarks complete!"
```

## Success Criteria
- [ ] All critical indexes created
- [ ] Query response times meet targets
- [ ] Partitioning implemented and automated
- [ ] Materialized views refreshing on schedule
- [ ] Cache hit ratio > 95%
- [ ] No queries exceeding 100ms threshold
- [ ] Connection pooling configured
- [ ] Monitoring and metrics collection active
- [ ] Load testing passed with 10K concurrent users

## Notes
- Monitor pg_stat_statements regularly for new slow queries
- Consider using pgBouncer for connection pooling in production
- Implement read replicas for heavy read workloads
- Use EXPLAIN ANALYZE before deploying new queries
- Regular VACUUM and ANALYZE scheduled via pg_cron