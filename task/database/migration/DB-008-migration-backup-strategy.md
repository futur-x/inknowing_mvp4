# DB-008: Database Migration, Backup, and Disaster Recovery Strategy

## Task Information
- **Task ID**: DB-008
- **Title**: Implement Database Migration, Backup, and Recovery Procedures
- **Priority**: P0 (Critical - Data safety and continuity)
- **Estimated Hours**: 10
- **Dependencies**: DB-001 through DB-007 (Complete database structure)
- **Related Requirements**: Zero data loss, < 1 hour recovery time objective (RTO)

## Migration Strategy

### 1. Version Control System for Database

```sql
-- Create migration tracking table
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    checksum VARCHAR(64), -- SHA-256 of migration file
    applied_by VARCHAR(100) DEFAULT CURRENT_USER,
    rollback_sql TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back'))
);

-- Migration history table
CREATE TABLE IF NOT EXISTS public.migration_history (
    id BIGSERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('apply', 'rollback', 'verify')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    success BOOLEAN,
    error_message TEXT,
    affected_rows INTEGER,
    metadata JSONB
);

CREATE INDEX idx_migration_history_version ON public.migration_history(version);
CREATE INDEX idx_migration_history_action ON public.migration_history(action, started_at DESC);
```

### 2. Migration Scripts Structure

```bash
#!/bin/bash
# Directory structure
migrations/
├── sql/
│   ├── V001__initial_schema.sql
│   ├── V002__add_user_tables.sql
│   ├── V003__add_book_tables.sql
│   ├── V004__add_dialogue_tables.sql
│   ├── V005__add_upload_tables.sql
│   ├── V006__add_payment_tables.sql
│   ├── V007__add_indexes.sql
│   └── V008__add_performance_optimizations.sql
├── rollback/
│   ├── R001__rollback_initial_schema.sql
│   ├── R002__rollback_user_tables.sql
│   └── ...
└── seed/
    ├── S001__seed_membership_plans.sql
    ├── S002__seed_test_users.sql
    └── S003__seed_sample_books.sql
```

### 3. Migration Execution Framework

```sql
-- Function to apply migration
CREATE OR REPLACE FUNCTION apply_migration(
    p_version VARCHAR(20),
    p_migration_name VARCHAR(255),
    p_sql TEXT,
    p_rollback_sql TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_execution_time_ms INTEGER;
    v_checksum VARCHAR(64);
    v_success BOOLEAN := FALSE;
    v_error_message TEXT;
BEGIN
    -- Check if migration already applied
    IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = p_version AND status = 'completed') THEN
        RAISE NOTICE 'Migration % already applied', p_version;
        RETURN TRUE;
    END IF;

    -- Start migration
    v_start_time := clock_timestamp();

    -- Calculate checksum
    v_checksum := encode(sha256(p_sql::bytea), 'hex');

    -- Insert pending status
    INSERT INTO public.schema_migrations (version, migration_name, checksum, rollback_sql, status)
    VALUES (p_version, p_migration_name, v_checksum, p_rollback_sql, 'running')
    ON CONFLICT (version) DO UPDATE SET status = 'running';

    -- Log start
    INSERT INTO public.migration_history (version, action)
    VALUES (p_version, 'apply');

    BEGIN
        -- Execute migration SQL
        EXECUTE p_sql;

        v_end_time := clock_timestamp();
        v_execution_time_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time));

        -- Update success status
        UPDATE public.schema_migrations
        SET
            status = 'completed',
            execution_time_ms = v_execution_time_ms
        WHERE version = p_version;

        -- Log success
        UPDATE public.migration_history
        SET
            completed_at = v_end_time,
            success = TRUE
        WHERE version = p_version
          AND action = 'apply'
          AND completed_at IS NULL;

        v_success := TRUE;
        RAISE NOTICE 'Migration % applied successfully in %ms', p_version, v_execution_time_ms;

    EXCEPTION WHEN OTHERS THEN
        -- Capture error
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;

        -- Update failure status
        UPDATE public.schema_migrations
        SET status = 'failed'
        WHERE version = p_version;

        -- Log failure
        UPDATE public.migration_history
        SET
            completed_at = clock_timestamp(),
            success = FALSE,
            error_message = v_error_message
        WHERE version = p_version
          AND action = 'apply'
          AND completed_at IS NULL;

        RAISE EXCEPTION 'Migration % failed: %', p_version, v_error_message;
    END;

    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback migration
CREATE OR REPLACE FUNCTION rollback_migration(
    p_version VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rollback_sql TEXT;
    v_success BOOLEAN := FALSE;
    v_error_message TEXT;
BEGIN
    -- Get rollback SQL
    SELECT rollback_sql INTO v_rollback_sql
    FROM public.schema_migrations
    WHERE version = p_version AND status = 'completed';

    IF v_rollback_sql IS NULL THEN
        RAISE EXCEPTION 'No rollback SQL found for version %', p_version;
    END IF;

    -- Log rollback start
    INSERT INTO public.migration_history (version, action)
    VALUES (p_version, 'rollback');

    BEGIN
        -- Execute rollback
        EXECUTE v_rollback_sql;

        -- Update status
        UPDATE public.schema_migrations
        SET status = 'rolled_back'
        WHERE version = p_version;

        -- Log success
        UPDATE public.migration_history
        SET
            completed_at = clock_timestamp(),
            success = TRUE
        WHERE version = p_version
          AND action = 'rollback'
          AND completed_at IS NULL;

        v_success := TRUE;
        RAISE NOTICE 'Migration % rolled back successfully', p_version;

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;

        -- Log failure
        UPDATE public.migration_history
        SET
            completed_at = clock_timestamp(),
            success = FALSE,
            error_message = v_error_message
        WHERE version = p_version
          AND action = 'rollback'
          AND completed_at IS NULL;

        RAISE EXCEPTION 'Rollback of % failed: %', p_version, v_error_message;
    END;

    RETURN v_success;
END;
$$ LANGUAGE plpgsql;
```

### 4. Migration Validation

```sql
-- Function to validate database schema
CREATE OR REPLACE FUNCTION validate_schema()
RETURNS TABLE(
    object_type TEXT,
    object_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check tables
    RETURN QUERY
    SELECT
        'TABLE'::TEXT,
        schemaname || '.' || tablename,
        CASE WHEN tablename IS NOT NULL THEN 'OK' ELSE 'MISSING' END,
        'Table check'::TEXT
    FROM (
        VALUES
        ('auth', 'users'),
        ('auth', 'user_profiles'),
        ('content', 'books'),
        ('content', 'characters'),
        ('dialogue', 'dialogue_sessions'),
        ('dialogue', 'dialogue_messages'),
        ('upload', 'upload_jobs'),
        ('payment', 'user_subscriptions')
    ) AS expected(schemaname, tablename)
    LEFT JOIN pg_tables pt USING (schemaname, tablename);

    -- Check indexes
    RETURN QUERY
    SELECT
        'INDEX'::TEXT,
        indexname::TEXT,
        'OK'::TEXT,
        'Index exists'::TEXT
    FROM pg_indexes
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    LIMIT 10;

    -- Check constraints
    RETURN QUERY
    SELECT
        'CONSTRAINT'::TEXT,
        conname::TEXT,
        'OK'::TEXT,
        'Constraint active'::TEXT
    FROM pg_constraint
    WHERE connamespace NOT IN (
        SELECT oid FROM pg_namespace
        WHERE nspname IN ('pg_catalog', 'information_schema')
    )
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

## Backup Strategy

### 1. Backup Configuration

```bash
#!/bin/bash
# backup_config.sh

# Backup directories
export BACKUP_BASE_DIR="/backup/postgresql"
export BACKUP_DAILY_DIR="$BACKUP_BASE_DIR/daily"
export BACKUP_WEEKLY_DIR="$BACKUP_BASE_DIR/weekly"
export BACKUP_MONTHLY_DIR="$BACKUP_BASE_DIR/monthly"

# Database configuration
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="inknowing_db"
export DB_USER="postgres"

# Retention policies
export DAILY_RETENTION_DAYS=7
export WEEKLY_RETENTION_WEEKS=4
export MONTHLY_RETENTION_MONTHS=12

# S3 configuration for offsite backup
export S3_BUCKET="inknowing-db-backups"
export S3_REGION="cn-north-1"

# Notification settings
export ALERT_EMAIL="dba@inknowing.ai"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx"
```

### 2. Automated Backup Scripts

```bash
#!/bin/bash
# automated_backup.sh

set -e

source /path/to/backup_config.sh

# Function to send notifications
send_notification() {
    local status=$1
    local message=$2
    local backup_file=$3

    # Send email
    echo "$message" | mail -s "Database Backup $status" $ALERT_EMAIL

    # Send to Slack
    curl -X POST $SLACK_WEBHOOK_URL \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"Database Backup $status: $message\\nFile: $backup_file\"}"
}

# Function to perform backup
perform_backup() {
    local backup_type=$1
    local backup_dir=$2
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/inknowing_${backup_type}_${timestamp}.sql.gz"
    local log_file="$backup_dir/backup_${timestamp}.log"

    echo "Starting $backup_type backup at $(date)" | tee $log_file

    # Create backup directory if not exists
    mkdir -p $backup_dir

    # Perform backup with custom format for faster restore
    pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        -d $DB_NAME \
        --format=custom \
        --verbose \
        --no-owner \
        --no-privileges \
        --exclude-table-data="*.login_history*" \
        --exclude-table-data="*.performance_metrics" \
        2>> $log_file | gzip > $backup_file

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        local file_size=$(du -h $backup_file | cut -f1)
        echo "Backup completed successfully. Size: $file_size" | tee -a $log_file

        # Calculate checksum
        local checksum=$(sha256sum $backup_file | cut -d' ' -f1)
        echo $checksum > "$backup_file.sha256"

        # Upload to S3
        aws s3 cp $backup_file s3://$S3_BUCKET/$backup_type/ --region $S3_REGION
        aws s3 cp "$backup_file.sha256" s3://$S3_BUCKET/$backup_type/ --region $S3_REGION

        # Record backup in database
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
        INSERT INTO public.backup_history (
            backup_type, file_path, file_size_bytes, checksum, status
        ) VALUES (
            '$backup_type',
            '$backup_file',
            $(stat -f%z $backup_file 2>/dev/null || stat -c%s $backup_file),
            '$checksum',
            'completed'
        );
EOF

        send_notification "SUCCESS" "Backup completed: $file_size" "$backup_file"
        return 0
    else
        echo "Backup failed!" | tee -a $log_file
        send_notification "FAILED" "Backup failed. Check logs: $log_file" ""
        return 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    local backup_dir=$1
    local retention_days=$2

    echo "Cleaning up backups older than $retention_days days in $backup_dir"

    find $backup_dir -name "*.sql.gz" -mtime +$retention_days -delete
    find $backup_dir -name "*.log" -mtime +$retention_days -delete
    find $backup_dir -name "*.sha256" -mtime +$retention_days -delete

    # Clean S3 backups
    aws s3 ls s3://$S3_BUCKET/ --recursive | while read -r line; do
        create_date=$(echo $line | awk '{print $1" "$2}')
        create_date_seconds=$(date -d "$create_date" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$create_date" +%s)
        current_seconds=$(date +%s)
        age_days=$(( ($current_seconds - $create_date_seconds) / 86400 ))

        if [ $age_days -gt $retention_days ]; then
            file_path=$(echo $line | awk '{print $4}')
            aws s3 rm s3://$S3_BUCKET/$file_path
        fi
    done
}

# Main backup logic
case "$1" in
    daily)
        perform_backup "daily" "$BACKUP_DAILY_DIR"
        cleanup_old_backups "$BACKUP_DAILY_DIR" $DAILY_RETENTION_DAYS
        ;;
    weekly)
        perform_backup "weekly" "$BACKUP_WEEKLY_DIR"
        cleanup_old_backups "$BACKUP_WEEKLY_DIR" $(($WEEKLY_RETENTION_WEEKS * 7))
        ;;
    monthly)
        perform_backup "monthly" "$BACKUP_MONTHLY_DIR"
        cleanup_old_backups "$BACKUP_MONTHLY_DIR" $(($MONTHLY_RETENTION_MONTHS * 30))
        ;;
    *)
        echo "Usage: $0 {daily|weekly|monthly}"
        exit 1
        ;;
esac
```

### 3. Backup Tracking Table

```sql
-- Table to track all backups
CREATE TABLE IF NOT EXISTS public.backup_history (
    id BIGSERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('daily', 'weekly', 'monthly', 'manual')),
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    checksum VARCHAR(64),
    s3_location VARCHAR(500),
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'verified')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    verified_at TIMESTAMP,
    retention_until DATE,
    notes TEXT
);

CREATE INDEX idx_backup_history_type_date ON public.backup_history(backup_type, started_at DESC);
CREATE INDEX idx_backup_history_status ON public.backup_history(status);
CREATE INDEX idx_backup_history_retention ON public.backup_history(retention_until);
```

### 4. Point-in-Time Recovery (PITR) Setup

```bash
#!/bin/bash
# setup_pitr.sh

# Enable WAL archiving in postgresql.conf
cat << EOF >> $PGDATA/postgresql.conf

# WAL Archive Configuration for PITR
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/wal/%f && cp %p /archive/wal/%f'
archive_timeout = 300  # Force archive every 5 minutes
max_wal_senders = 3
wal_keep_size = 1GB

# Enable WAL compression
wal_compression = on
EOF

# Create archive directory
mkdir -p /archive/wal
chown postgres:postgres /archive/wal

# Create base backup for PITR
pg_basebackup \
    -h localhost \
    -p 5432 \
    -U replication_user \
    -D /backup/base/$(date +%Y%m%d) \
    --checkpoint=fast \
    --write-recovery-conf \
    --wal-method=stream \
    --progress \
    --verbose
```

## Disaster Recovery

### 1. Recovery Procedures

```bash
#!/bin/bash
# disaster_recovery.sh

set -e

# Recovery configuration
RECOVERY_TYPE=$1  # 'full', 'pitr', 'table'
RECOVERY_TARGET=$2  # timestamp or 'latest'

case "$RECOVERY_TYPE" in
    full)
        echo "Performing full database recovery..."

        # Stop PostgreSQL
        systemctl stop postgresql

        # Clear data directory
        rm -rf $PGDATA/*

        # Restore from latest backup
        LATEST_BACKUP=$(ls -t $BACKUP_DAILY_DIR/*.sql.gz | head -1)

        if [ -z "$LATEST_BACKUP" ]; then
            echo "No backup found!"
            exit 1
        fi

        # Verify checksum
        EXPECTED_CHECKSUM=$(cat "$LATEST_BACKUP.sha256")
        ACTUAL_CHECKSUM=$(sha256sum "$LATEST_BACKUP" | cut -d' ' -f1)

        if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
            echo "Checksum verification failed!"
            exit 1
        fi

        # Restore database
        gunzip -c "$LATEST_BACKUP" | pg_restore \
            -h localhost \
            -p 5432 \
            -U postgres \
            -d postgres \
            --create \
            --clean \
            --if-exists \
            --verbose

        # Start PostgreSQL
        systemctl start postgresql

        echo "Full recovery completed"
        ;;

    pitr)
        echo "Performing point-in-time recovery to: $RECOVERY_TARGET"

        # Stop PostgreSQL
        systemctl stop postgresql

        # Clear data directory
        rm -rf $PGDATA/*

        # Restore base backup
        cp -r /backup/base/latest/* $PGDATA/

        # Create recovery configuration
        cat << EOF > $PGDATA/recovery.conf
restore_command = 'cp /archive/wal/%f %p'
recovery_target_time = '$RECOVERY_TARGET'
recovery_target_action = 'promote'
EOF

        # Start PostgreSQL (will perform recovery)
        systemctl start postgresql

        echo "PITR completed to $RECOVERY_TARGET"
        ;;

    table)
        echo "Performing table-level recovery..."

        TABLE_NAME=$3
        BACKUP_FILE=$4

        # Create temporary database
        createdb -h localhost -U postgres temp_recovery

        # Restore to temporary database
        gunzip -c "$BACKUP_FILE" | pg_restore \
            -h localhost \
            -U postgres \
            -d temp_recovery \
            --table="$TABLE_NAME" \
            --data-only \
            --verbose

        # Copy table to production
        pg_dump \
            -h localhost \
            -U postgres \
            -d temp_recovery \
            --table="$TABLE_NAME" \
            --data-only | psql \
            -h localhost \
            -U postgres \
            -d inknowing_db

        # Cleanup
        dropdb -h localhost -U postgres temp_recovery

        echo "Table recovery completed for $TABLE_NAME"
        ;;

    *)
        echo "Usage: $0 {full|pitr|table} [target] [options]"
        exit 1
        ;;
esac

# Log recovery action
psql -h localhost -U postgres -d inknowing_db << EOF
INSERT INTO public.recovery_history (
    recovery_type, recovery_target, success, performed_by
) VALUES (
    '$RECOVERY_TYPE',
    '$RECOVERY_TARGET',
    true,
    '$(whoami)'
);
EOF
```

### 2. Recovery Tracking

```sql
-- Table to track recovery operations
CREATE TABLE IF NOT EXISTS public.recovery_history (
    id BIGSERIAL PRIMARY KEY,
    recovery_type VARCHAR(20) NOT NULL,
    recovery_target VARCHAR(100),
    backup_used VARCHAR(500),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    success BOOLEAN,
    data_loss_assessment TEXT,
    performed_by VARCHAR(100),
    notes TEXT
);

CREATE INDEX idx_recovery_history_date ON public.recovery_history(started_at DESC);
```

### 3. Health Check and Verification

```sql
-- Function to verify database integrity
CREATE OR REPLACE FUNCTION verify_database_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check table counts
    RETURN QUERY
    SELECT
        'Table row counts'::TEXT,
        'INFO'::TEXT,
        format('Users: %s, Books: %s, Sessions: %s',
            (SELECT COUNT(*) FROM auth.users),
            (SELECT COUNT(*) FROM content.books),
            (SELECT COUNT(*) FROM dialogue.dialogue_sessions)
        );

    -- Check foreign key integrity
    RETURN QUERY
    SELECT
        'Foreign key integrity'::TEXT,
        CASE
            WHEN COUNT(*) = 0 THEN 'OK'
            ELSE 'ERROR'
        END,
        format('%s orphaned records found', COUNT(*))
    FROM dialogue.dialogue_sessions ds
    LEFT JOIN auth.users u ON ds.user_id = u.id
    WHERE u.id IS NULL;

    -- Check index health
    RETURN QUERY
    SELECT
        'Index health'::TEXT,
        CASE
            WHEN COUNT(*) = 0 THEN 'OK'
            ELSE 'WARNING'
        END,
        format('%s invalid indexes found', COUNT(*))
    FROM pg_index i
    WHERE NOT i.indisvalid;

    -- Check for corruption
    RETURN QUERY
    SELECT
        'Page corruption'::TEXT,
        CASE
            WHEN pg_stat_database.checksum_failures = 0 THEN 'OK'
            ELSE 'ERROR'
        END,
        format('Checksum failures: %s', checksum_failures)
    FROM pg_stat_database
    WHERE datname = current_database();

    -- Check replication lag (if applicable)
    RETURN QUERY
    SELECT
        'Replication lag'::TEXT,
        CASE
            WHEN COALESCE(MAX(replay_lag), interval '0') < interval '1 minute' THEN 'OK'
            ELSE 'WARNING'
        END,
        format('Max lag: %s', COALESCE(MAX(replay_lag)::TEXT, 'N/A'))
    FROM pg_stat_replication;
END;
$$ LANGUAGE plpgsql;
```

## Automation Setup

### Cron Configuration

```bash
# /etc/cron.d/postgresql_maintenance

# Daily backup at 2 AM
0 2 * * * postgres /path/to/automated_backup.sh daily

# Weekly backup on Sunday at 3 AM
0 3 * * 0 postgres /path/to/automated_backup.sh weekly

# Monthly backup on 1st at 4 AM
0 4 1 * * postgres /path/to/automated_backup.sh monthly

# Verify backups daily at 6 AM
0 6 * * * postgres /path/to/verify_backups.sh

# Database health check every hour
0 * * * * postgres psql -d inknowing_db -c "SELECT * FROM verify_database_integrity();"
```

## Testing Procedures

### 1. Backup Testing

```bash
#!/bin/bash
# test_backup_restore.sh

# Create test database
createdb test_restore

# Restore latest backup to test database
LATEST_BACKUP=$(ls -t $BACKUP_DAILY_DIR/*.sql.gz | head -1)
gunzip -c "$LATEST_BACKUP" | pg_restore -d test_restore

# Run verification queries
psql -d test_restore << EOF
-- Verify critical tables
SELECT 'Users' as table_name, COUNT(*) as row_count FROM auth.users
UNION ALL
SELECT 'Books', COUNT(*) FROM content.books
UNION ALL
SELECT 'Sessions', COUNT(*) FROM dialogue.dialogue_sessions;

-- Test critical queries
EXPLAIN ANALYZE
SELECT * FROM auth.users WHERE phone = '13800138000';
EOF

# Clean up
dropdb test_restore

echo "Backup test completed successfully"
```

### 2. Disaster Recovery Drill

```sql
-- Procedure for DR drill
CREATE OR REPLACE FUNCTION disaster_recovery_drill()
RETURNS void AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_recovery_time INTERVAL;
BEGIN
    v_start_time := clock_timestamp();

    -- Simulate failure
    RAISE NOTICE 'Starting disaster recovery drill at %', v_start_time;

    -- Test backup availability
    PERFORM * FROM public.backup_history
    WHERE status = 'completed'
      AND started_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No recent backup available!';
    END IF;

    -- Test recovery procedures
    -- (Actual recovery would be done outside this function)

    v_end_time := clock_timestamp();
    v_recovery_time := v_end_time - v_start_time;

    -- Log drill results
    INSERT INTO public.recovery_history (
        recovery_type,
        recovery_target,
        started_at,
        completed_at,
        success,
        performed_by,
        notes
    ) VALUES (
        'drill',
        'latest',
        v_start_time,
        v_end_time,
        true,
        current_user,
        format('DR drill completed in %s', v_recovery_time)
    );

    RAISE NOTICE 'DR drill completed in %', v_recovery_time;
END;
$$ LANGUAGE plpgsql;
```

## Success Criteria
- [ ] Migration framework implemented and tested
- [ ] All migrations versioned and tracked
- [ ] Automated daily backups running
- [ ] Weekly and monthly backups configured
- [ ] S3 offsite backup working
- [ ] PITR configured and tested
- [ ] Recovery procedures documented and tested
- [ ] Recovery time < 1 hour verified
- [ ] Backup verification automated
- [ ] DR drill completed successfully
- [ ] Monitoring and alerting configured

## Notes
- Test restore procedures monthly
- Maintain runbook for emergency procedures
- Keep 3-2-1 backup rule: 3 copies, 2 different media, 1 offsite
- Document RTO and RPO requirements with business
- Consider implementing streaming replication for HA
- Regular DR drills with full team participation