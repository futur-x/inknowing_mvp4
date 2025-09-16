#!/bin/bash

# =============================================================================
# InKnowing Database Backup Script
# Description: Backup PostgreSQL database with compression and optional S3 upload
# Usage: ./backup.sh [full|incremental|schema-only]
# =============================================================================

set -e

# Configuration
BACKUP_TYPE=${1:-full}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-inknowing_db}
DB_PASSWORD=${DB_PASSWORD:-}

BACKUP_DIR=${BACKUP_DIR:-/var/backups/inknowing}
S3_BUCKET=${S3_BUCKET:-}
RETENTION_DAYS=${RETENTION_DAYS:-30}

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="inknowing_${BACKUP_TYPE}_${TIMESTAMP}.sql"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup based on type
perform_backup() {
    log_info "Starting $BACKUP_TYPE backup of $DB_NAME"

    case $BACKUP_TYPE in
        full)
            log_info "Performing full database backup..."
            PGPASSWORD=$DB_PASSWORD pg_dump \
                -h $DB_HOST \
                -p $DB_PORT \
                -U $DB_USER \
                -d $DB_NAME \
                --verbose \
                --no-owner \
                --no-privileges \
                --format=plain \
                --encoding=UTF8 \
                > "$BACKUP_DIR/$BACKUP_FILE"
            ;;

        schema-only)
            log_info "Performing schema-only backup..."
            PGPASSWORD=$DB_PASSWORD pg_dump \
                -h $DB_HOST \
                -p $DB_PORT \
                -U $DB_USER \
                -d $DB_NAME \
                --schema-only \
                --verbose \
                --no-owner \
                --no-privileges \
                > "$BACKUP_DIR/$BACKUP_FILE"
            ;;

        incremental)
            log_info "Performing incremental backup (data changes only)..."
            # Note: True incremental backup requires WAL archiving
            # This is a simplified version backing up specific tables
            PGPASSWORD=$DB_PASSWORD pg_dump \
                -h $DB_HOST \
                -p $DB_PORT \
                -U $DB_USER \
                -d $DB_NAME \
                --data-only \
                --table=dialogue.dialogue_messages \
                --table=dialogue.dialogue_sessions \
                --table=payment.transactions \
                --table=upload.upload_jobs \
                --verbose \
                > "$BACKUP_DIR/$BACKUP_FILE"
            ;;

        *)
            log_error "Invalid backup type: $BACKUP_TYPE"
            echo "Usage: $0 [full|incremental|schema-only]"
            exit 1
            ;;
    esac
}

# Compress backup
compress_backup() {
    log_info "Compressing backup file..."
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    log_info "Backup compressed to: $FILE_SIZE"
}

# Upload to S3 (optional)
upload_to_s3() {
    if [ -n "$S3_BUCKET" ]; then
        log_info "Uploading backup to S3 bucket: $S3_BUCKET"

        if command -v aws &> /dev/null; then
            aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/database-backups/$BACKUP_FILE" \
                --storage-class STANDARD_IA

            if [ $? -eq 0 ]; then
                log_info "Backup uploaded to S3 successfully"
            else
                log_error "Failed to upload backup to S3"
            fi
        else
            log_warn "AWS CLI not found. Skipping S3 upload."
        fi
    fi
}

# Clean old backups
clean_old_backups() {
    log_info "Cleaning backups older than $RETENTION_DAYS days..."

    find $BACKUP_DIR -name "inknowing_*.sql.gz" -mtime +$RETENTION_DAYS -delete

    REMAINING=$(ls -1 $BACKUP_DIR/inknowing_*.sql.gz 2>/dev/null | wc -l)
    log_info "Remaining backup files: $REMAINING"
}

# Record backup in database
record_backup() {
    log_info "Recording backup in database..."

    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
INSERT INTO admin.backup_history (
    backup_type, backup_location, backup_size, status, completed_at
) VALUES (
    '$BACKUP_TYPE',
    '$BACKUP_DIR/$BACKUP_FILE',
    (SELECT pg_database_size('$DB_NAME')),
    'completed',
    CURRENT_TIMESTAMP
);
EOF
}

# Verify backup
verify_backup() {
    log_info "Verifying backup integrity..."

    if gunzip -t "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null; then
        log_info "✓ Backup file is valid"
        return 0
    else
        log_error "✗ Backup file is corrupted"
        return 1
    fi
}

# Main execution
main() {
    START_TIME=$(date +%s)

    echo "========================================="
    echo "   InKnowing Database Backup"
    echo "   Type: $BACKUP_TYPE"
    echo "   Time: $(date)"
    echo "========================================="
    echo

    perform_backup
    compress_backup
    verify_backup

    if [ $? -eq 0 ]; then
        upload_to_s3
        record_backup
        clean_old_backups

        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))

        echo
        echo "========================================="
        echo "   Backup Completed Successfully!"
        echo "========================================="
        echo "Backup file: $BACKUP_DIR/$BACKUP_FILE"
        echo "Duration: ${DURATION} seconds"
        echo
    else
        log_error "Backup verification failed!"
        exit 1
    fi
}

# Run main function
main