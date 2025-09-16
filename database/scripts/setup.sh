#!/bin/bash

# =============================================================================
# InKnowing Database Setup Script
# Description: Initialize PostgreSQL database and run all migrations
# Usage: ./setup.sh [environment]
# =============================================================================

set -e  # Exit on error

# Configuration
ENV=${1:-development}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-inknowing_db}
DB_PASSWORD=${DB_PASSWORD:-}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"
SEEDS_DIR="$SCRIPT_DIR/../seeds"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_postgres() {
    log_info "Checking PostgreSQL connection..."
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c '\l' > /dev/null 2>&1; then
        log_info "PostgreSQL is running and accessible"
        return 0
    else
        log_error "Cannot connect to PostgreSQL. Please check your connection settings."
        exit 1
    fi
}

create_database() {
    log_info "Creating database: $DB_NAME"

    # Check if database exists
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        log_warn "Database $DB_NAME already exists"
        read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Dropping existing database..."
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
        else
            log_info "Using existing database"
            return 0
        fi
    fi

    # Create database with template0 to avoid collation issues
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER << EOF
CREATE DATABASE $DB_NAME
    WITH
    OWNER = $DB_USER
    ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    TEMPLATE = template0
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;
EOF

    log_info "Database created successfully"
}

run_migrations() {
    log_info "Running database migrations..."

    # Check if migrations directory exists
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi

    # Run migrations in order
    for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
        migration_name=$(basename $migration)
        log_info "Running migration: $migration_name"

        if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migration > /dev/null 2>&1; then
            log_info "✓ $migration_name completed"
        else
            log_error "Failed to run migration: $migration_name"
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migration
            exit 1
        fi
    done

    log_info "All migrations completed successfully"
}

load_seed_data() {
    if [ "$ENV" != "production" ]; then
        log_info "Loading seed data for $ENV environment..."

        # Check if seeds directory exists
        if [ ! -d "$SEEDS_DIR" ]; then
            log_warn "Seeds directory not found: $SEEDS_DIR"
            return 0
        fi

        # Run seed files in order
        for seed in $(ls $SEEDS_DIR/*.sql | sort); do
            seed_name=$(basename $seed)
            log_info "Loading seed: $seed_name"

            if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $seed > /dev/null 2>&1; then
                log_info "✓ $seed_name loaded"
            else
                log_error "Failed to load seed: $seed_name"
                PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $seed
                exit 1
            fi
        done

        log_info "Seed data loaded successfully"
    else
        log_info "Skipping seed data for production environment"
    fi
}

verify_setup() {
    log_info "Verifying database setup..."

    # Check schemas
    SCHEMAS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*)
        FROM information_schema.schemata
        WHERE schema_name IN ('auth', 'content', 'dialogue', 'upload', 'payment', 'admin', 'audit');
    ")

    if [ "$SCHEMAS" -eq 7 ]; then
        log_info "✓ All schemas created"
    else
        log_error "Schema verification failed. Expected 7 schemas, found $SCHEMAS"
        exit 1
    fi

    # Check tables count
    TABLES=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*)
        FROM information_schema.tables
        WHERE table_schema IN ('auth', 'content', 'dialogue', 'upload', 'payment', 'admin', 'audit')
        AND table_type = 'BASE TABLE';
    ")

    log_info "✓ Total tables created: $TABLES"

    # Check extensions
    EXTENSIONS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*)
        FROM pg_extension
        WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'btree_gin');
    ")

    if [ "$EXTENSIONS" -ge 4 ]; then
        log_info "✓ All required extensions installed"
    else
        log_warn "Some extensions might be missing"
    fi
}

print_summary() {
    echo
    echo "========================================="
    echo "   InKnowing Database Setup Complete!"
    echo "========================================="
    echo
    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "User: $DB_USER"
    echo "Environment: $ENV"
    echo
    echo "Connection string:"
    echo "postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    echo
    echo "Next steps:"
    echo "1. Update your .env file with the database connection"
    echo "2. Configure Redis and ChromaDB connections"
    echo "3. Start the application server"
    echo
}

# Main execution
main() {
    echo "========================================="
    echo "   InKnowing Database Setup"
    echo "   Environment: $ENV"
    echo "========================================="
    echo

    check_postgres
    create_database
    run_migrations
    load_seed_data
    verify_setup
    print_summary
}

# Run main function
main