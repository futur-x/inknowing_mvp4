-- =============================================================================
-- Migration: 001_init_database.sql
-- Description: Initialize PostgreSQL database with core schemas and extensions
-- Task: DB-001
-- Created: 2024-01-09
-- =============================================================================

-- Create database (run this separately as superuser)
-- CREATE DATABASE inknowing_db
--     WITH
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'en_US.UTF-8'
--     LC_CTYPE = 'en_US.UTF-8'
--     TABLESPACE = pg_default
--     CONNECTION LIMIT = -1;

-- Connect to the database
\c inknowing_db;

-- =============================================================================
-- Enable Required Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- For encryption
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- For composite indexes
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query performance analysis

-- =============================================================================
-- Create Schemas for Logical Separation
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth;        -- Authentication and users
CREATE SCHEMA IF NOT EXISTS content;     -- Books and characters
CREATE SCHEMA IF NOT EXISTS dialogue;    -- Chat and messages
CREATE SCHEMA IF NOT EXISTS upload;      -- Upload processing
CREATE SCHEMA IF NOT EXISTS payment;     -- Billing and subscriptions
CREATE SCHEMA IF NOT EXISTS admin;       -- Admin specific tables
CREATE SCHEMA IF NOT EXISTS audit;       -- Audit and logging

-- Set search path for the database
ALTER DATABASE inknowing_db SET search_path TO public, auth, content, dialogue, upload, payment, admin, audit;

-- =============================================================================
-- Create Common Enums and Types
-- =============================================================================

-- Membership types (aligned with business logic: free → basic → premium → super)
CREATE TYPE membership_type AS ENUM ('free', 'basic', 'premium', 'super');

-- User status
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted', 'pending');

-- Book status (aligned with book lifecycle)
CREATE TYPE book_status AS ENUM ('draft', 'processing', 'published', 'offline', 'review');

-- Book type (AI-known vs user-uploaded vectorized)
CREATE TYPE book_type AS ENUM ('ai_known', 'vectorized');

-- Upload status
CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Processing step status
CREATE TYPE processing_step_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'not_needed');

-- Dialogue type
CREATE TYPE dialogue_type AS ENUM ('book', 'character');

-- Dialogue status
CREATE TYPE dialogue_status AS ENUM ('active', 'ended', 'expired');

-- Message role
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');

-- Payment method
CREATE TYPE payment_method AS ENUM ('wechat', 'alipay', 'credit_card', 'paypal');

-- Admin role
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin', 'moderator', 'support');

-- Review action
CREATE TYPE review_action AS ENUM ('approve', 'reject', 'request_changes', 'pending');

-- AI provider
CREATE TYPE ai_provider AS ENUM ('openai', 'anthropic', 'qwen', 'baidu', 'zhipu', 'custom');

-- Notification type
CREATE TYPE notification_type AS ENUM ('system', 'payment', 'upload', 'dialogue', 'membership');

-- =============================================================================
-- Create Common Functions
-- =============================================================================

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

-- Function to calculate quota reset time (business logic: free=daily, paid=monthly)
CREATE OR REPLACE FUNCTION calculate_quota_reset(
    membership membership_type,
    current_time timestamp DEFAULT CURRENT_TIMESTAMP
)
RETURNS timestamp AS $$
BEGIN
    CASE membership
        WHEN 'free' THEN
            -- Daily reset at midnight for free users
            RETURN date_trunc('day', current_time) + interval '1 day';
        ELSE
            -- Monthly reset on the same day for paid users
            RETURN date_trunc('month', current_time) + interval '1 month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get quota limit based on membership (business logic from API spec)
CREATE OR REPLACE FUNCTION get_quota_limit(membership membership_type)
RETURNS integer AS $$
BEGIN
    CASE membership
        WHEN 'free' THEN RETURN 20;      -- 20 requests per day
        WHEN 'basic' THEN RETURN 200;    -- 200 requests per month
        WHEN 'premium' THEN RETURN 500;  -- 500 requests per month
        WHEN 'super' THEN RETURN 1000;   -- 1000 requests per month
        ELSE RETURN 20;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate Chinese phone number
CREATE OR REPLACE FUNCTION is_valid_chinese_phone(phone text)
RETURNS boolean AS $$
BEGIN
    RETURN phone ~ '^1[3-9]\d{9}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate reading time (words per minute)
CREATE OR REPLACE FUNCTION calculate_reading_time(word_count integer, wpm integer DEFAULT 250)
RETURNS integer AS $$
BEGIN
    IF word_count IS NULL OR word_count <= 0 THEN
        RETURN NULL;
    END IF;
    RETURN CEIL(word_count::decimal / wpm);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- Create Migration Tracking Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100) DEFAULT CURRENT_USER,
    rollback_sql TEXT,
    checksum VARCHAR(64)
);

-- Record this migration
INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('001', 'init_database')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Create Database Roles and Permissions
-- =============================================================================

-- Create application roles (passwords should be changed in production)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'inknowing_app') THEN
        CREATE ROLE inknowing_app WITH LOGIN PASSWORD 'app_secure_password_2024';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'inknowing_readonly') THEN
        CREATE ROLE inknowing_readonly WITH LOGIN PASSWORD 'readonly_secure_password_2024';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'inknowing_admin') THEN
        CREATE ROLE inknowing_admin WITH LOGIN PASSWORD 'admin_secure_password_2024';
    END IF;
END
$$;

-- Grant permissions to roles
GRANT CONNECT ON DATABASE inknowing_db TO inknowing_app, inknowing_readonly, inknowing_admin;

-- Grant schema usage permissions
GRANT USAGE ON SCHEMA public, auth, content, dialogue, upload, payment, admin, audit
    TO inknowing_app, inknowing_readonly;

GRANT ALL PRIVILEGES ON SCHEMA public, auth, content, dialogue, upload, payment, admin, audit
    TO inknowing_admin;

-- Grant table permissions (will be applied after tables are created)
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, content, dialogue, upload, payment
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inknowing_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth, content, dialogue, upload, payment, admin, audit
    GRANT SELECT ON TABLES TO inknowing_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, content, dialogue, upload, payment, admin, audit
    GRANT ALL PRIVILEGES ON TABLES TO inknowing_admin;

-- Grant sequence permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, content, dialogue, upload, payment, admin, audit
    GRANT USAGE ON SEQUENCES TO inknowing_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public, auth, content, dialogue, upload, payment, admin, audit
    GRANT ALL PRIVILEGES ON SEQUENCES TO inknowing_admin;

-- =============================================================================
-- Performance Settings (recommendations for postgresql.conf)
-- =============================================================================

COMMENT ON DATABASE inknowing_db IS '
InKnowing Database - AI-powered book dialogue platform

Recommended PostgreSQL Configuration:
- max_connections = 200
- shared_buffers = 256MB
- effective_cache_size = 1GB
- work_mem = 4MB
- maintenance_work_mem = 64MB
- random_page_cost = 1.1
- checkpoint_completion_target = 0.9
- wal_buffers = 16MB
- default_statistics_target = 100
- effective_io_concurrency = 200

Connection Pooling (PgBouncer recommended):
- pool_mode = transaction
- max_client_conn = 1000
- default_pool_size = 25
';

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE public.schema_migrations IS '
ROLLBACK SCRIPT:
-- Drop all custom types
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS ai_provider CASCADE;
DROP TYPE IF EXISTS review_action CASCADE;
DROP TYPE IF EXISTS admin_role CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS message_role CASCADE;
DROP TYPE IF EXISTS dialogue_status CASCADE;
DROP TYPE IF EXISTS dialogue_type CASCADE;
DROP TYPE IF EXISTS processing_step_status CASCADE;
DROP TYPE IF EXISTS upload_status CASCADE;
DROP TYPE IF EXISTS book_type CASCADE;
DROP TYPE IF EXISTS book_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS membership_type CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS calculate_reading_time(integer, integer);
DROP FUNCTION IF EXISTS is_valid_chinese_phone(text);
DROP FUNCTION IF EXISTS get_quota_limit(membership_type);
DROP FUNCTION IF EXISTS calculate_quota_reset(membership_type, timestamp);
DROP FUNCTION IF EXISTS generate_short_id(text);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop all schemas
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS admin CASCADE;
DROP SCHEMA IF EXISTS payment CASCADE;
DROP SCHEMA IF EXISTS upload CASCADE;
DROP SCHEMA IF EXISTS dialogue CASCADE;
DROP SCHEMA IF EXISTS content CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;

-- Drop migration table
DROP TABLE IF EXISTS public.schema_migrations;

-- Drop roles
DROP ROLE IF EXISTS inknowing_app;
DROP ROLE IF EXISTS inknowing_readonly;
DROP ROLE IF EXISTS inknowing_admin;
';