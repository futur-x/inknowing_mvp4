-- =============================================================================
-- Seed Data: 01_users.sql
-- Description: Test users with different membership levels
-- =============================================================================

\c inknowing_db;

-- Insert test users (passwords are all 'Test123!' hashed)
INSERT INTO auth.users (id, username, phone, nickname, email, password_hash, membership, status, wechat_openid, wechat_unionid) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin', '13800000001', 'Admin User', 'admin@inknowing.ai',
     crypt('Test123!', gen_salt('bf', 12)), 'super', 'active', NULL, NULL),
    ('22222222-2222-2222-2222-222222222222', 'testuser1', '13800000002', 'Test User 1', 'test1@example.com',
     crypt('Test123!', gen_salt('bf', 12)), 'free', 'active', NULL, NULL),
    ('33333333-3333-3333-3333-333333333333', 'testuser2', '13800000003', 'Test User 2', 'test2@example.com',
     crypt('Test123!', gen_salt('bf', 12)), 'basic', 'active', NULL, NULL),
    ('44444444-4444-4444-4444-444444444444', 'testuser3', '13800000004', 'Test User 3', 'test3@example.com',
     crypt('Test123!', gen_salt('bf', 12)), 'premium', 'active', NULL, NULL),
    ('55555555-5555-5555-5555-555555555555', 'wechatuser', NULL, 'WeChat User', NULL, NULL, 'free', 'active',
     'wx_openid_test_123', 'wx_unionid_test_123')
ON CONFLICT (id) DO NOTHING;

-- Initialize user quotas
INSERT INTO auth.user_quotas (user_id, quota_total, quota_used, quota_reset_at, period_start, period_end)
SELECT
    id,
    CASE membership
        WHEN 'free' THEN 20
        WHEN 'basic' THEN 200
        WHEN 'premium' THEN 500
        WHEN 'super' THEN 1000
    END,
    0,
    CASE membership
        WHEN 'free' THEN CURRENT_TIMESTAMP + INTERVAL '1 day'
        ELSE CURRENT_TIMESTAMP + INTERVAL '1 month'
    END,
    CURRENT_TIMESTAMP,
    CASE membership
        WHEN 'free' THEN CURRENT_TIMESTAMP + INTERVAL '1 day'
        ELSE CURRENT_TIMESTAMP + INTERVAL '1 month'
    END
FROM auth.users;

-- Create user profiles
INSERT INTO auth.user_profiles (user_id, bio, interests, preferred_categories, language, timezone)
SELECT
    id,
    'Test user bio for ' || nickname,
    ARRAY['AI', 'Technology', 'Science'],
    ARRAY['science', 'technology', 'philosophy'],
    'zh-CN',
    'Asia/Shanghai'
FROM auth.users;

-- Create active subscriptions for paid users
INSERT INTO payment.user_subscriptions (
    user_id, plan_id, subscription_type, status,
    current_period_start, current_period_end, next_billing_date, auto_renew
)
SELECT
    u.id,
    p.id,
    'monthly',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 month',
    CURRENT_TIMESTAMP + INTERVAL '1 month',
    true
FROM auth.users u
JOIN payment.membership_plans p ON u.membership::text = p.plan_code
WHERE u.membership != 'free';

-- Create some login history
INSERT INTO auth.login_history (
    user_id, login_method, ip_address, success, created_at
)
SELECT
    id,
    CASE WHEN phone IS NOT NULL THEN 'phone' ELSE 'wechat' END,
    '192.168.1.1'::inet,
    true,
    CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
FROM auth.users;

-- Add some test tokens (for API testing)
INSERT INTO auth.tokens (
    user_id, token_hash, token_type, expires_at, device_info
)
SELECT
    id,
    encode(sha256(('test_token_' || id)::bytea), 'hex'),
    'refresh',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    '{"device_type": "web", "os": "macOS", "browser": "Chrome"}'::jsonb
FROM auth.users
WHERE username = 'testuser1';

COMMIT;