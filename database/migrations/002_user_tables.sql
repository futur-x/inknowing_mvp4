-- =============================================================================
-- Migration: 002_user_tables.sql
-- Description: Create user authentication and profile tables
-- Task: DB-002
-- Created: 2024-01-09
-- Dependencies: 001_init_database.sql
-- =============================================================================

\c inknowing_db;

-- =============================================================================
-- 1. Main Users Table (auth.users)
-- Core user authentication and membership tracking
-- =============================================================================

CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    phone_verified BOOLEAN DEFAULT false,
    wechat_openid VARCHAR(100) UNIQUE,
    wechat_unionid VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255), -- bcrypt hash
    avatar VARCHAR(500),
    nickname VARCHAR(100) NOT NULL,

    -- Membership management (business logic: free → basic → premium → super)
    membership membership_type DEFAULT 'free',
    membership_expires_at TIMESTAMP,
    membership_auto_renew BOOLEAN DEFAULT false,

    -- User statistics
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    total_dialogues INTEGER DEFAULT 0,
    total_uploads INTEGER DEFAULT 0,

    -- Account status
    status user_status DEFAULT 'active',
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP, -- Soft delete for GDPR compliance

    -- Constraints
    CONSTRAINT users_phone_or_wechat CHECK (
        phone IS NOT NULL OR wechat_openid IS NOT NULL
    ),
    CONSTRAINT users_valid_phone CHECK (
        phone IS NULL OR is_valid_chinese_phone(phone)
    ),
    CONSTRAINT users_valid_email CHECK (
        email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    )
);

-- Create indexes for performance
CREATE INDEX idx_users_phone ON auth.users(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_wechat_openid ON auth.users(wechat_openid) WHERE wechat_openid IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_email ON auth.users(email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_membership ON auth.users(membership) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON auth.users(status) WHERE status != 'deleted';
CREATE INDEX idx_users_created_at ON auth.users(created_at DESC);
CREATE INDEX idx_users_membership_expires ON auth.users(membership_expires_at) WHERE membership != 'free' AND deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE auth.users IS 'Main user authentication table supporting phone and WeChat login';
COMMENT ON COLUMN auth.users.membership IS 'User membership tier: free (20/day), basic (200/month), premium (500/month), super (1000/month)';

-- =============================================================================
-- 2. User Profiles Table (auth.user_profiles)
-- Extended user profile information
-- =============================================================================

CREATE TABLE auth.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    interests TEXT[],
    preferred_categories TEXT[],
    reading_goal INTEGER, -- Books per month

    -- User preferences
    notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profile_public": false, "show_reading_list": false}'::jsonb,
    ui_preferences JSONB DEFAULT '{"theme": "light", "font_size": "medium"}'::jsonb,

    -- Localization
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',

    -- Statistics
    total_reading_time INTEGER DEFAULT 0, -- in minutes
    books_completed INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for array searches
CREATE INDEX idx_user_profiles_interests ON auth.user_profiles USING GIN(interests);
CREATE INDEX idx_user_profiles_categories ON auth.user_profiles USING GIN(preferred_categories);
CREATE INDEX idx_user_profiles_settings ON auth.user_profiles USING GIN(notification_settings);

-- Add trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON auth.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. Authentication Tokens Table (auth.tokens)
-- JWT refresh tokens and session management
-- =============================================================================

CREATE TABLE auth.tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL, -- SHA256 hash of token
    token_type VARCHAR(20) NOT NULL DEFAULT 'refresh', -- 'refresh', 'access', 'api_key'

    -- Device tracking
    device_info JSONB DEFAULT '{}', -- {device_type, os, browser, ip}
    device_fingerprint VARCHAR(255),

    -- Token lifecycle
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(100),
    last_used_at TIMESTAMP,
    use_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for token lookups
CREATE UNIQUE INDEX idx_tokens_unique_active ON auth.tokens(user_id, token_hash, token_type)
    WHERE revoked_at IS NULL;
CREATE INDEX idx_tokens_user_id ON auth.tokens(user_id);
CREATE INDEX idx_tokens_token_hash ON auth.tokens(token_hash);
CREATE INDEX idx_tokens_expires_at ON auth.tokens(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_tokens_type ON auth.tokens(token_type);

-- =============================================================================
-- 4. Verification Codes Table (auth.verification_codes)
-- SMS and email verification codes
-- =============================================================================

CREATE TABLE auth.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contact VARCHAR(255) NOT NULL, -- Phone or email
    code VARCHAR(10) NOT NULL,
    code_type VARCHAR(20) NOT NULL, -- 'sms', 'email'
    purpose VARCHAR(50) NOT NULL, -- 'registration', 'login', 'reset_password', 'change_phone'

    -- Security tracking
    attempts INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,

    -- Lifecycle
    verified_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT verification_codes_max_attempts CHECK (attempts <= 5)
);

-- Create indexes for code verification
CREATE INDEX idx_verification_codes_contact ON auth.verification_codes(contact, code_type);
CREATE INDEX idx_verification_codes_lookup ON auth.verification_codes(contact, code, purpose)
    WHERE verified_at IS NULL AND expires_at > CURRENT_TIMESTAMP;
CREATE INDEX idx_verification_codes_expires ON auth.verification_codes(expires_at) WHERE verified_at IS NULL;

-- =============================================================================
-- 5. User Quota Table (auth.user_quotas)
-- Track user dialogue quotas based on membership
-- =============================================================================

CREATE TABLE auth.user_quotas (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Quota management (aligned with membership tiers)
    quota_total INTEGER NOT NULL, -- Total quota for period
    quota_used INTEGER DEFAULT 0, -- Used quota in current period
    quota_reset_at TIMESTAMP NOT NULL, -- When quota resets (daily for free, monthly for paid)
    extra_quota INTEGER DEFAULT 0, -- Admin granted or purchased extra quota

    -- Period tracking
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,

    -- Usage statistics
    last_usage_at TIMESTAMP,
    total_usage_all_time INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT quota_usage_valid CHECK (quota_used >= 0 AND quota_used <= quota_total + extra_quota)
);

-- Create indexes for quota checks
CREATE INDEX idx_user_quotas_user_id ON auth.user_quotas(user_id);
CREATE INDEX idx_user_quotas_reset_at ON auth.user_quotas(quota_reset_at);
CREATE INDEX idx_user_quotas_usage ON auth.user_quotas(quota_used, quota_total);

-- Add trigger for updated_at
CREATE TRIGGER update_user_quotas_updated_at BEFORE UPDATE ON auth.user_quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. Login History Table (auth.login_history)
-- Track login attempts and history for security
-- =============================================================================

-- Create partitioned table for scalability
CREATE TABLE auth.login_history (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Login details
    login_method VARCHAR(20) NOT NULL, -- 'phone', 'wechat', 'password', 'token'
    login_identifier VARCHAR(255), -- Phone number, email, or WeChat ID used

    -- Location and device
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    location JSONB DEFAULT '{}', -- {country, city, region, lat, lng}

    -- Result
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100), -- 'invalid_password', 'account_locked', 'invalid_code', etc.

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions (monthly)
CREATE TABLE auth.login_history_2024_01 PARTITION OF auth.login_history
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE auth.login_history_2024_02 PARTITION OF auth.login_history
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE auth.login_history_2024_03 PARTITION OF auth.login_history
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Create indexes on partitioned table
CREATE INDEX idx_login_history_user_id ON auth.login_history(user_id);
CREATE INDEX idx_login_history_created_at ON auth.login_history(created_at DESC);
CREATE INDEX idx_login_history_ip ON auth.login_history(ip_address);
CREATE INDEX idx_login_history_success ON auth.login_history(success);

-- =============================================================================
-- 7. OAuth Connections Table (auth.oauth_connections)
-- Store OAuth connections (WeChat, etc.)
-- =============================================================================

CREATE TABLE auth.oauth_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Provider information
    provider VARCHAR(50) NOT NULL, -- 'wechat', 'weibo', 'qq', etc.
    provider_user_id VARCHAR(255) NOT NULL,
    provider_username VARCHAR(255),

    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    scope VARCHAR(500),

    -- Provider data
    provider_data JSONB DEFAULT '{}', -- Full provider response

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT oauth_unique_provider UNIQUE(provider, provider_user_id)
);

-- Create indexes for OAuth lookups
CREATE INDEX idx_oauth_connections_user_id ON auth.oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON auth.oauth_connections(provider, provider_user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON auth.oauth_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. User Preferences Table (auth.user_preferences)
-- Store user preferences and settings
-- =============================================================================

CREATE TABLE auth.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- AI preferences
    preferred_ai_model VARCHAR(50) DEFAULT 'openai',
    preferred_response_style VARCHAR(50) DEFAULT 'balanced', -- 'concise', 'detailed', 'balanced'
    preferred_language_style VARCHAR(50) DEFAULT 'formal', -- 'formal', 'casual', 'academic'

    -- Content preferences
    blocked_categories TEXT[],
    blocked_authors TEXT[],
    content_warnings BOOLEAN DEFAULT true,

    -- Feature flags
    feature_flags JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON auth.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Security Functions
-- =============================================================================

-- Function to hash passwords (using pgcrypto)
CREATE OR REPLACE FUNCTION auth.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Using bcrypt with cost factor 12
    RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify password
CREATE OR REPLACE FUNCTION auth.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION auth.clean_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM auth.tokens WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM auth.verification_codes WHERE expires_at < CURRENT_TIMESTAMP AND verified_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize user quota
CREATE OR REPLACE FUNCTION auth.initialize_user_quota(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_membership membership_type;
    v_quota_limit INTEGER;
    v_reset_at TIMESTAMP;
BEGIN
    SELECT membership INTO v_membership FROM auth.users WHERE id = p_user_id;

    v_quota_limit := get_quota_limit(v_membership);
    v_reset_at := calculate_quota_reset(v_membership);

    INSERT INTO auth.user_quotas (
        user_id, quota_total, quota_reset_at,
        period_start, period_end
    ) VALUES (
        p_user_id, v_quota_limit, v_reset_at,
        CURRENT_TIMESTAMP, v_reset_at
    ) ON CONFLICT (user_id) DO UPDATE SET
        quota_total = v_quota_limit,
        quota_reset_at = v_reset_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_quotas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY users_self_policy ON auth.users
    FOR ALL
    USING (id = current_setting('app.current_user_id', true)::UUID OR current_setting('app.is_admin', true)::BOOLEAN);

CREATE POLICY profiles_self_policy ON auth.user_profiles
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::UUID OR current_setting('app.is_admin', true)::BOOLEAN);

CREATE POLICY tokens_self_policy ON auth.tokens
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::UUID OR current_setting('app.is_admin', true)::BOOLEAN);

CREATE POLICY quotas_self_policy ON auth.user_quotas
    FOR ALL
    USING (user_id = current_setting('app.current_user_id', true)::UUID OR current_setting('app.is_admin', true)::BOOLEAN);

-- =============================================================================
-- Triggers
-- =============================================================================

-- Trigger to automatically create user profile and quota when user is created
CREATE OR REPLACE FUNCTION auth.create_user_related_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO auth.user_profiles (user_id) VALUES (NEW.id);

    -- Initialize user quota
    PERFORM auth.initialize_user_quota(NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_related_records_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.create_user_related_records();

-- =============================================================================
-- Record Migration
-- =============================================================================

INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('002', 'user_tables')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE auth.users IS '
ROLLBACK SCRIPT:
-- Drop triggers
DROP TRIGGER IF EXISTS create_user_related_records_trigger ON auth.users;

-- Drop policies
DROP POLICY IF EXISTS users_self_policy ON auth.users;
DROP POLICY IF EXISTS profiles_self_policy ON auth.user_profiles;
DROP POLICY IF EXISTS tokens_self_policy ON auth.tokens;
DROP POLICY IF EXISTS quotas_self_policy ON auth.user_quotas;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS auth.user_preferences CASCADE;
DROP TABLE IF EXISTS auth.oauth_connections CASCADE;
DROP TABLE IF EXISTS auth.login_history CASCADE;
DROP TABLE IF EXISTS auth.user_quotas CASCADE;
DROP TABLE IF EXISTS auth.verification_codes CASCADE;
DROP TABLE IF EXISTS auth.tokens CASCADE;
DROP TABLE IF EXISTS auth.user_profiles CASCADE;
DROP TABLE IF EXISTS auth.users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS auth.create_user_related_records();
DROP FUNCTION IF EXISTS auth.initialize_user_quota(UUID);
DROP FUNCTION IF EXISTS auth.clean_expired_tokens();
DROP FUNCTION IF EXISTS auth.verify_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS auth.hash_password(TEXT);

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = ''002'';
';