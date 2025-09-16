# DB-001: Database Initialization and Core Schema Design

## Task Information
- **Task ID**: DB-001
- **Title**: Initialize PostgreSQL Database and Core Schema
- **Priority**: P0 (Critical - Foundation)
- **Estimated Hours**: 8
- **Dependencies**: None
- **Related API Specs**: All endpoints require database foundation

## Database Schema Design

### 1. Database Configuration

```sql
-- Create database
CREATE DATABASE inknowing_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Enable required extensions
\c inknowing_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- For composite indexes
```

### 2. Schema Creation

```sql
-- Create schemas for logical separation
CREATE SCHEMA IF NOT EXISTS auth;        -- Authentication and users
CREATE SCHEMA IF NOT EXISTS content;     -- Books and characters
CREATE SCHEMA IF NOT EXISTS dialogue;    -- Chat and messages
CREATE SCHEMA IF NOT EXISTS upload;      -- Upload processing
CREATE SCHEMA IF NOT EXISTS payment;     -- Billing and subscriptions
CREATE SCHEMA IF NOT EXISTS admin;       -- Admin specific tables
CREATE SCHEMA IF NOT EXISTS audit;       -- Audit and logging

-- Set search path
ALTER DATABASE inknowing_db SET search_path TO public, auth, content, dialogue, upload, payment, admin, audit;
```

### 3. Common Enums and Types

```sql
-- Membership types
CREATE TYPE membership_type AS ENUM ('free', 'basic', 'premium', 'super');

-- User status
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');

-- Book status
CREATE TYPE book_status AS ENUM ('published', 'draft', 'review', 'offline');

-- Book type
CREATE TYPE book_type AS ENUM ('ai_known', 'vectorized');

-- Upload status
CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Processing step status
CREATE TYPE processing_step_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Dialogue type
CREATE TYPE dialogue_type AS ENUM ('book', 'character');

-- Dialogue status
CREATE TYPE dialogue_status AS ENUM ('active', 'ended');

-- Message role
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Payment method
CREATE TYPE payment_method AS ENUM ('wechat', 'alipay');

-- Admin role
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator');

-- Review action
CREATE TYPE review_action AS ENUM ('approve', 'reject', 'request_changes');

-- AI provider
CREATE TYPE ai_provider AS ENUM ('openai', 'anthropic', 'qwen', 'baidu', 'zhipu');
```

### 4. Common Functions

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate short IDs (for public facing IDs)
CREATE OR REPLACE FUNCTION generate_short_id(prefix text DEFAULT '')
RETURNS text AS $$
DECLARE
    chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result text := prefix;
    i integer;
BEGIN
    IF prefix != '' THEN
        result := prefix || '_';
    END IF;

    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate quota reset time
CREATE OR REPLACE FUNCTION calculate_quota_reset(
    membership membership_type,
    current_time timestamp DEFAULT CURRENT_TIMESTAMP
)
RETURNS timestamp AS $$
BEGIN
    CASE membership
        WHEN 'free' THEN
            -- Daily reset at midnight
            RETURN date_trunc('day', current_time) + interval '1 day';
        ELSE
            -- Monthly reset on the same day
            RETURN date_trunc('month', current_time) + interval '1 month';
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

## Index Strategy

### Primary Indexes
- All tables will have UUID primary keys with B-tree indexes (automatic)
- Foreign keys will have indexes for join performance

### Secondary Indexes
- Created based on query patterns identified in API specification
- Will be defined in individual table creation tasks

### Full-text Search Indexes
- GIN indexes on title and content fields for search functionality
- Will be detailed in specific table tasks

## Data Requirements

### Based on API Specification
1. **User Management**: Support for phone/WeChat authentication
2. **Book Management**: AI-known vs vectorized books distinction
3. **Dialogue System**: Real-time message handling with references
4. **Upload Pipeline**: Multi-step processing with status tracking
5. **Membership System**: Tiered access with quota management
6. **Admin Functions**: Complete CRUD with audit trails

### Business Logic Constraints
- Users can only have one active membership at a time
- Upload processing must track each step independently
- Dialogues must maintain context and references
- All monetary values stored in cents (integer)

### Data Retention Policies
- User data: Indefinite (with soft delete)
- Dialogue history: 1 year for free users, indefinite for paid
- Upload logs: 90 days
- Audit logs: 2 years
- Payment records: 7 years (legal requirement)

## Performance Optimization

### Connection Pooling Configuration
```sql
-- Recommended PostgreSQL configuration (postgresql.conf)
-- max_connections = 200
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
```

### Partitioning Strategy
- `dialogue_messages` table: Monthly partitioning by created_at
- `audit_logs` table: Monthly partitioning by timestamp
- Details in specific table creation tasks

## Security and Compliance

### Data Encryption
- Passwords: bcrypt with salt (handled by application)
- Sensitive fields: pgcrypto for at-rest encryption
- Connection: SSL/TLS required

### Access Controls
```sql
-- Create roles
CREATE ROLE inknowing_app WITH LOGIN PASSWORD 'secure_password';
CREATE ROLE inknowing_readonly WITH LOGIN PASSWORD 'secure_password';
CREATE ROLE inknowing_admin WITH LOGIN PASSWORD 'secure_password';

-- Grant permissions (to be applied after table creation)
GRANT CONNECT ON DATABASE inknowing_db TO inknowing_app, inknowing_readonly;
GRANT USAGE ON SCHEMA public, auth, content, dialogue, upload, payment TO inknowing_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public, auth, content, dialogue, upload, payment TO inknowing_readonly;
GRANT ALL PRIVILEGES ON DATABASE inknowing_db TO inknowing_admin;
```

### GDPR Compliance
- User deletion must cascade to all related data
- Export functionality for user data
- Audit trail for data access and modifications

## Migration Scripts

### Initial Setup Script
```bash
#!/bin/bash
# init_database.sh

DB_NAME="inknowing_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "Creating database and schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f 001_create_database.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f 002_create_extensions.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f 003_create_schemas.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f 004_create_types.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f 005_create_functions.sql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f 006_create_roles.sql

echo "Database initialization complete!"
```

### Rollback Strategy
```sql
-- rollback.sql
DROP DATABASE IF EXISTS inknowing_db;
DROP ROLE IF EXISTS inknowing_app;
DROP ROLE IF EXISTS inknowing_readonly;
DROP ROLE IF EXISTS inknowing_admin;
```

## Test Cases

### 1. Schema Creation Test
```sql
-- Test all schemas exist
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN ('auth', 'content', 'dialogue', 'upload', 'payment', 'admin', 'audit');
-- Expected: 7 rows
```

### 2. Extension Test
```sql
-- Test required extensions
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'btree_gin');
-- Expected: 4 rows
```

### 3. Type Creation Test
```sql
-- Test custom types
SELECT typname
FROM pg_type
WHERE typname IN ('membership_type', 'user_status', 'book_status', 'upload_status');
-- Expected: 4+ rows
```

### 4. Function Test
```sql
-- Test UUID generation
SELECT uuid_generate_v4();
-- Expected: Valid UUID

-- Test short ID generation
SELECT generate_short_id('user');
-- Expected: String like 'user_xxxxxxxxxxxx'

-- Test quota reset calculation
SELECT calculate_quota_reset('free'::membership_type);
-- Expected: Tomorrow at 00:00:00
```

### 5. Performance Benchmark
```sql
-- Connection pool test (run with pgbench)
-- pgbench -c 20 -j 4 -t 1000 inknowing_db
-- Expected: < 10ms average latency
```

## Success Criteria
- [ ] Database created successfully
- [ ] All extensions installed
- [ ] All schemas created
- [ ] All custom types defined
- [ ] All utility functions working
- [ ] Roles and permissions configured
- [ ] Connection pooling optimized
- [ ] All tests passing

## Notes
- This task must be completed before any other database tasks
- Ensure PostgreSQL version >= 13 for optimal performance
- Redis and ChromaDB configuration handled separately
- Application connection strings to be configured in environment variables