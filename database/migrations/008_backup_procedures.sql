-- =============================================================================
-- Migration: 008_backup_procedures.sql
-- Description: Implement database backup, recovery, and migration procedures
-- Task: DB-008
-- Created: 2024-01-09
-- Dependencies: All previous migrations (001-007)
-- =============================================================================

\c inknowing_db;

-- =============================================================================
-- Audit and Logging Tables
-- =============================================================================

-- 1. Audit Log Table
CREATE TABLE audit.audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    user_id UUID,
    row_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions
CREATE TABLE audit.audit_logs_2024_01 PARTITION OF audit.audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE audit.audit_logs_2024_02 PARTITION OF audit.audit_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create indexes
CREATE INDEX idx_audit_logs_table ON audit.audit_logs(table_name, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_operation ON audit.audit_logs(operation, created_at DESC);

-- 2. Backup History Table
CREATE TABLE admin.backup_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'differential'
    backup_location VARCHAR(500) NOT NULL,
    backup_size BIGINT,
    tables_included TEXT[],

    -- Status tracking
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    error_message TEXT,

    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- Metadata
    database_version VARCHAR(50),
    schema_version VARCHAR(20),
    compressed BOOLEAN DEFAULT true,
    encrypted BOOLEAN DEFAULT false,

    created_by VARCHAR(100) DEFAULT CURRENT_USER
);

-- Create indexes
CREATE INDEX idx_backup_history_type ON admin.backup_history(backup_type, created_at DESC);
CREATE INDEX idx_backup_history_status ON admin.backup_history(status);

-- =============================================================================
-- Backup and Recovery Functions
-- =============================================================================

-- Function to create backup metadata
CREATE OR REPLACE FUNCTION admin.create_backup_metadata()
RETURNS JSONB AS $$
DECLARE
    metadata JSONB;
BEGIN
    SELECT jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'database', current_database(),
        'version', version(),
        'schemas', (SELECT array_agg(schema_name) FROM information_schema.schemata
                   WHERE schema_name NOT IN ('information_schema', 'pg_catalog')),
        'tables_count', (SELECT COUNT(*) FROM information_schema.tables
                        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')),
        'total_size', pg_database_size(current_database()),
        'last_migration', (SELECT MAX(version) FROM public.schema_migrations)
    ) INTO metadata;

    RETURN metadata;
END;
$$ LANGUAGE plpgsql;

-- Function to perform logical backup
CREATE OR REPLACE FUNCTION admin.perform_logical_backup(
    p_backup_type VARCHAR DEFAULT 'full',
    p_schemas TEXT[] DEFAULT ARRAY['auth', 'content', 'dialogue', 'upload', 'payment']
)
RETURNS UUID AS $$
DECLARE
    v_backup_id UUID;
    v_backup_path TEXT;
BEGIN
    -- Create backup record
    INSERT INTO admin.backup_history (backup_type, backup_location, tables_included, status)
    VALUES (p_backup_type, 'pending', p_schemas, 'in_progress')
    RETURNING id INTO v_backup_id;

    -- Generate backup path
    v_backup_path := '/backups/inknowing_' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS') || '.sql';

    -- Update backup location
    UPDATE admin.backup_history
    SET backup_location = v_backup_path
    WHERE id = v_backup_id;

    RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate backup integrity
CREATE OR REPLACE FUNCTION admin.validate_backup(p_backup_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_valid BOOLEAN := true;
BEGIN
    -- Check if backup exists and completed
    SELECT status = 'completed' INTO v_is_valid
    FROM admin.backup_history
    WHERE id = p_backup_id;

    RETURN COALESCE(v_is_valid, false);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Generic Audit Trigger Function
-- =============================================================================

CREATE OR REPLACE FUNCTION audit.create_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        INSERT INTO audit.audit_logs (
            table_name, operation, row_id, old_data, user_id
        ) VALUES (
            TG_TABLE_NAME, TG_OP, OLD.id, v_old_data,
            current_setting('app.current_user_id', true)::UUID
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        -- Get changed fields
        SELECT array_agg(key) INTO v_changed_fields
        FROM jsonb_each(v_old_data)
        WHERE value IS DISTINCT FROM v_new_data->key;

        INSERT INTO audit.audit_logs (
            table_name, operation, row_id, old_data, new_data, changed_fields, user_id
        ) VALUES (
            TG_TABLE_NAME, TG_OP, NEW.id, v_old_data, v_new_data, v_changed_fields,
            current_setting('app.current_user_id', true)::UUID
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        INSERT INTO audit.audit_logs (
            table_name, operation, row_id, new_data, user_id
        ) VALUES (
            TG_TABLE_NAME, TG_OP, NEW.id, v_new_data,
            current_setting('app.current_user_id', true)::UUID
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

CREATE TRIGGER audit_books_trigger
    AFTER INSERT OR UPDATE OR DELETE ON content.books
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

CREATE TRIGGER audit_transactions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payment.transactions
    FOR EACH ROW EXECUTE FUNCTION audit.create_audit_trigger();

-- =============================================================================
-- Point-in-Time Recovery Setup
-- =============================================================================

-- Function to create recovery point
CREATE OR REPLACE FUNCTION admin.create_recovery_point(p_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Create a named recovery point (requires appropriate permissions)
    PERFORM pg_create_restore_point(p_name);

    -- Log the recovery point
    INSERT INTO admin.backup_history (
        backup_type, backup_location, status, completed_at
    ) VALUES (
        'recovery_point', p_name, 'completed', CURRENT_TIMESTAMP
    );

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Data Archival Functions
-- =============================================================================

-- Function to archive old dialogue messages
CREATE OR REPLACE FUNCTION admin.archive_old_dialogues(p_days_old INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL;

    -- Create archive table if not exists
    CREATE TABLE IF NOT EXISTS dialogue.dialogue_messages_archive (LIKE dialogue.dialogue_messages INCLUDING ALL);

    -- Move old messages to archive
    WITH archived AS (
        DELETE FROM dialogue.dialogue_messages
        WHERE created_at < v_cutoff_date
        RETURNING *
    )
    INSERT INTO dialogue.dialogue_messages_archive
    SELECT * FROM archived;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    -- Log archival
    INSERT INTO admin.backup_history (
        backup_type, backup_location, status, completed_at, tables_included
    ) VALUES (
        'archive', 'dialogue_messages_archive', 'completed', CURRENT_TIMESTAMP,
        ARRAY['dialogue.dialogue_messages']
    );

    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION admin.archive_old_audit_logs(p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_archived_count INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL;

    -- Create archive table if not exists
    CREATE TABLE IF NOT EXISTS audit.audit_logs_archive (LIKE audit.audit_logs INCLUDING ALL);

    -- Move old logs to archive
    WITH archived AS (
        DELETE FROM audit.audit_logs
        WHERE created_at < v_cutoff_date
        RETURNING *
    )
    INSERT INTO audit.audit_logs_archive
    SELECT * FROM archived;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Database Health Check Functions
-- =============================================================================

CREATE OR REPLACE FUNCTION admin.database_health_check()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check database size
    RETURN QUERY
    SELECT 'database_size'::TEXT,
           CASE WHEN pg_database_size(current_database()) > 10737418240
                THEN 'warning' ELSE 'ok' END,
           jsonb_build_object('size', pg_size_pretty(pg_database_size(current_database())));

    -- Check connection count
    RETURN QUERY
    SELECT 'connection_count'::TEXT,
           CASE WHEN count(*) > 150 THEN 'warning'
                WHEN count(*) > 180 THEN 'critical'
                ELSE 'ok' END,
           jsonb_build_object('active_connections', count(*))
    FROM pg_stat_activity;

    -- Check long running queries
    RETURN QUERY
    SELECT 'long_running_queries'::TEXT,
           CASE WHEN count(*) > 0 THEN 'warning' ELSE 'ok' END,
           jsonb_build_object('count', count(*))
    FROM pg_stat_activity
    WHERE state = 'active'
    AND query_start < CURRENT_TIMESTAMP - INTERVAL '5 minutes';

    -- Check table bloat
    RETURN QUERY
    SELECT 'table_bloat'::TEXT,
           CASE WHEN max(n_dead_tup::float / NULLIF(n_live_tup, 0)) > 0.2
                THEN 'warning' ELSE 'ok' END,
           jsonb_build_object('max_bloat_ratio', max(n_dead_tup::float / NULLIF(n_live_tup, 0)))
    FROM pg_stat_user_tables;

    -- Check replication lag (if applicable)
    RETURN QUERY
    SELECT 'replication_lag'::TEXT,
           CASE WHEN max(replay_lag) > INTERVAL '1 minute' THEN 'warning'
                WHEN max(replay_lag) > INTERVAL '5 minutes' THEN 'critical'
                ELSE 'ok' END,
           jsonb_build_object('max_lag', max(replay_lag))
    FROM pg_stat_replication;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Scheduled Maintenance Procedures
-- =============================================================================

-- Function to perform routine maintenance
CREATE OR REPLACE FUNCTION admin.perform_routine_maintenance()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Update statistics
    ANALYZE;

    -- Clean up expired tokens
    PERFORM auth.clean_expired_tokens();

    -- Close inactive dialogue sessions
    PERFORM dialogue.close_inactive_sessions();

    -- Check expired subscriptions
    PERFORM payment.check_expired_subscriptions();

    -- Clean old upload logs
    PERFORM upload.clean_old_uploads();

    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY content.mv_popular_books;
    REFRESH MATERIALIZED VIEW CONCURRENTLY auth.mv_user_statistics;

    v_result := jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'status', 'completed',
        'tasks', ARRAY[
            'analyze_tables',
            'clean_expired_tokens',
            'close_inactive_sessions',
            'check_expired_subscriptions',
            'clean_upload_logs',
            'refresh_materialized_views'
        ]
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Backup Scripts Generator
-- =============================================================================

CREATE OR REPLACE FUNCTION admin.generate_backup_script()
RETURNS TEXT AS $$
DECLARE
    v_script TEXT;
BEGIN
    v_script := '#!/bin/bash
# InKnowing Database Backup Script
# Generated: ' || CURRENT_TIMESTAMP || '

DB_NAME="inknowing_db"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/inknowing_${TIMESTAMP}.sql.gz"

# Create backup directory if not exists
mkdir -p ${BACKUP_DIR}

# Perform backup
pg_dump -h localhost -U postgres -d ${DB_NAME} \
    --schema=auth \
    --schema=content \
    --schema=dialogue \
    --schema=upload \
    --schema=payment \
    --schema=admin \
    --no-owner \
    --no-privileges \
    --verbose | gzip > ${BACKUP_FILE}

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: ${BACKUP_FILE}"
    # Upload to S3 (optional)
    # aws s3 cp ${BACKUP_FILE} s3://inknowing-backups/
else
    echo "Backup failed"
    exit 1
fi

# Clean old backups (keep last 30 days)
find ${BACKUP_DIR} -name "inknowing_*.sql.gz" -mtime +30 -delete
';

    RETURN v_script;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Recovery Scripts Generator
-- =============================================================================

CREATE OR REPLACE FUNCTION admin.generate_recovery_script(p_backup_file TEXT)
RETURNS TEXT AS $$
DECLARE
    v_script TEXT;
BEGIN
    v_script := '#!/bin/bash
# InKnowing Database Recovery Script
# Generated: ' || CURRENT_TIMESTAMP || '

BACKUP_FILE="' || p_backup_file || '"
DB_NAME="inknowing_db_restore"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Create new database for restoration
createdb -h localhost -U postgres ${DB_NAME}

# Restore backup
gunzip -c ${BACKUP_FILE} | psql -h localhost -U postgres -d ${DB_NAME}

# Verify restoration
if [ $? -eq 0 ]; then
    echo "Recovery completed successfully"
    echo "Database restored to: ${DB_NAME}"
    echo "To switch to restored database:"
    echo "  1. Stop application"
    echo "  2. Rename databases"
    echo "  3. Update connection strings"
    echo "  4. Restart application"
else
    echo "Recovery failed"
    dropdb -h localhost -U postgres ${DB_NAME}
    exit 1
fi
';

    RETURN v_script;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Record Migration
-- =============================================================================

INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('008', 'backup_procedures')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE audit.audit_logs IS '
ROLLBACK SCRIPT:
-- Drop triggers
DROP TRIGGER IF EXISTS audit_transactions_trigger ON payment.transactions;
DROP TRIGGER IF EXISTS audit_books_trigger ON content.books;
DROP TRIGGER IF EXISTS audit_users_trigger ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS admin.generate_recovery_script(TEXT);
DROP FUNCTION IF EXISTS admin.generate_backup_script();
DROP FUNCTION IF EXISTS admin.perform_routine_maintenance();
DROP FUNCTION IF EXISTS admin.database_health_check();
DROP FUNCTION IF EXISTS admin.archive_old_audit_logs(INTEGER);
DROP FUNCTION IF EXISTS admin.archive_old_dialogues(INTEGER);
DROP FUNCTION IF EXISTS admin.create_recovery_point(TEXT);
DROP FUNCTION IF EXISTS audit.create_audit_trigger();
DROP FUNCTION IF EXISTS admin.validate_backup(UUID);
DROP FUNCTION IF EXISTS admin.perform_logical_backup(VARCHAR, TEXT[]);
DROP FUNCTION IF EXISTS admin.create_backup_metadata();

-- Drop tables
DROP TABLE IF EXISTS admin.backup_history CASCADE;
DROP TABLE IF EXISTS audit.audit_logs CASCADE;
DROP TABLE IF EXISTS audit.audit_logs_archive CASCADE;
DROP TABLE IF EXISTS dialogue.dialogue_messages_archive CASCADE;

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = ''008'';
';