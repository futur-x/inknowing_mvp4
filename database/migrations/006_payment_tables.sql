-- =============================================================================
-- Migration: 006_payment_tables.sql
-- Description: Create payment, subscription, and membership tables
-- Task: DB-006
-- Created: 2024-01-09
-- Dependencies: 001_init_database.sql, 002_user_tables.sql
-- =============================================================================

\c inknowing_db;

-- =============================================================================
-- 1. Membership Plans Table (payment.membership_plans)
-- Define available membership plans
-- =============================================================================

CREATE TABLE payment.membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code VARCHAR(20) UNIQUE NOT NULL, -- 'free', 'basic', 'premium', 'super'
    plan_name VARCHAR(100) NOT NULL,
    plan_name_en VARCHAR(100),
    
    -- Pricing (in cents to avoid floating point issues)
    price_monthly INTEGER NOT NULL, -- Price in cents
    price_yearly INTEGER, -- Discounted yearly price
    currency VARCHAR(3) DEFAULT 'CNY',
    
    -- Quotas and limits (business logic from API spec)
    dialogue_quota_daily INTEGER, -- For free tier
    dialogue_quota_monthly INTEGER, -- For paid tiers
    upload_size_limit_mb INTEGER,
    upload_count_limit INTEGER,
    concurrent_dialogues INTEGER,
    
    -- Features
    features JSONB DEFAULT '{}', -- {feature_name: boolean}
    ai_models TEXT[], -- Available AI models
    priority_support BOOLEAN DEFAULT false,
    
    -- Display
    display_order INTEGER,
    color_theme VARCHAR(7), -- Hex color
    icon_url VARCHAR(500),
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_promotional BOOLEAN DEFAULT false,
    promotional_end_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_membership_plans_code ON payment.membership_plans(plan_code);
CREATE INDEX idx_membership_plans_active ON payment.membership_plans(is_active, display_order);

-- Add trigger for updated_at
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON payment.membership_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default membership plans (aligned with business logic)
INSERT INTO payment.membership_plans (
    plan_code, plan_name, price_monthly, price_yearly,
    dialogue_quota_daily, dialogue_quota_monthly,
    upload_size_limit_mb, upload_count_limit,
    display_order
) VALUES
    ('free', '免费版', 0, 0, 20, NULL, 10, 1, 1),
    ('basic', '基础版', 1900, 19900, NULL, 200, 50, 5, 2),
    ('premium', '高级版', 3900, 39900, NULL, 500, 100, 10, 3),
    ('super', '超级版', 9900, 99900, NULL, 1000, 500, 50, 4);

-- =============================================================================
-- 2. User Subscriptions Table (payment.user_subscriptions)
-- Track user subscription status
-- =============================================================================

CREATE TABLE payment.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES payment.membership_plans(id),
    
    -- Subscription details
    subscription_type VARCHAR(20) NOT NULL, -- 'monthly', 'yearly', 'lifetime'
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'suspended'
    
    -- Billing cycle
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    next_billing_date TIMESTAMP,
    
    -- Payment information
    auto_renew BOOLEAN DEFAULT true,
    payment_method VARCHAR(20), -- 'wechat', 'alipay', 'credit_card'
    last_payment_id UUID,
    
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancellation_reason VARCHAR(255),
    refund_amount INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_subscription_unique UNIQUE(user_id, status) -- Only one active subscription
);

-- Create indexes
CREATE INDEX idx_user_subscriptions_user_id ON payment.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON payment.user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_end_date ON payment.user_subscriptions(current_period_end);
CREATE INDEX idx_user_subscriptions_next_billing ON payment.user_subscriptions(next_billing_date)
    WHERE status = 'active' AND auto_renew = true;

-- Add trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON payment.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. Payment Transactions Table (payment.transactions)
-- Record all payment transactions
-- =============================================================================

CREATE TABLE payment.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_short_id('txn'),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Transaction details
    type VARCHAR(30) NOT NULL, -- 'subscription', 'upgrade', 'renewal', 'refund', 'extra_quota'
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'CNY',
    description TEXT,
    
    -- Related entities
    subscription_id UUID REFERENCES payment.user_subscriptions(id),
    plan_id UUID REFERENCES payment.membership_plans(id),
    
    -- Payment gateway information
    payment_method payment_method NOT NULL,
    gateway_transaction_id VARCHAR(255), -- External transaction ID
    gateway_response JSONB DEFAULT '{}',
    
    -- Status
    status payment_status DEFAULT 'pending',
    status_message TEXT,
    
    -- Refund information
    is_refunded BOOLEAN DEFAULT false,
    refunded_amount INTEGER DEFAULT 0,
    refund_transaction_id UUID REFERENCES payment.transactions(id),
    refund_reason VARCHAR(255),
    
    -- Timestamps
    paid_at TIMESTAMP,
    failed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_transactions_user_id ON payment.transactions(user_id);
CREATE INDEX idx_transactions_status ON payment.transactions(status);
CREATE INDEX idx_transactions_gateway_id ON payment.transactions(gateway_transaction_id);
CREATE INDEX idx_transactions_created_at ON payment.transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON payment.transactions(type);

-- Add trigger for updated_at
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON payment.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. Payment Methods Table (payment.payment_methods)
-- Store user payment methods
-- =============================================================================

CREATE TABLE payment.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Payment method details
    type payment_method NOT NULL,
    is_default BOOLEAN DEFAULT false,
    
    -- Method-specific information (encrypted)
    wechat_openid VARCHAR(255),
    alipay_account VARCHAR(255),
    card_last_four VARCHAR(4),
    card_brand VARCHAR(50),
    
    -- Metadata
    nickname VARCHAR(100), -- User-defined name
    billing_address JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT payment_method_unique UNIQUE(user_id, type, wechat_openid, alipay_account)
);

-- Create indexes
CREATE INDEX idx_payment_methods_user_id ON payment.payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment.payment_methods(user_id, is_default)
    WHERE is_default = true;

-- Add trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment.payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. Invoices Table (payment.invoices)
-- Store invoice records
-- =============================================================================

CREATE TABLE payment.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL REFERENCES payment.transactions(id),
    
    -- Invoice details
    amount INTEGER NOT NULL,
    tax_amount INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'CNY',
    
    -- Billing information
    billing_name VARCHAR(255),
    billing_address JSONB,
    tax_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'sent', 'paid', 'void'
    
    -- File reference
    pdf_url VARCHAR(1000),
    
    -- Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_invoices_user_id ON payment.invoices(user_id);
CREATE INDEX idx_invoices_transaction_id ON payment.invoices(transaction_id);
CREATE INDEX idx_invoices_number ON payment.invoices(invoice_number);
CREATE INDEX idx_invoices_issue_date ON payment.invoices(issue_date DESC);

-- =============================================================================
-- 6. Coupon Codes Table (payment.coupon_codes)
-- Promotional coupon codes
-- =============================================================================

CREATE TABLE payment.coupon_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Discount details
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
    discount_value INTEGER NOT NULL, -- Percentage (0-100) or amount in cents
    
    -- Applicability
    applicable_plans TEXT[], -- Plan codes this coupon applies to
    min_purchase_amount INTEGER DEFAULT 0,
    
    -- Usage limits
    max_uses INTEGER,
    uses_count INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,
    
    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_coupon_codes_code ON payment.coupon_codes(code);
CREATE INDEX idx_coupon_codes_valid ON payment.coupon_codes(valid_from, valid_until)
    WHERE is_active = true;

-- Add trigger for updated_at
CREATE TRIGGER update_coupon_codes_updated_at BEFORE UPDATE ON payment.coupon_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. Coupon Usage Table (payment.coupon_usage)
-- Track coupon usage by users
-- =============================================================================

CREATE TABLE payment.coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES payment.coupon_codes(id),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES payment.transactions(id),
    
    -- Usage details
    discount_amount INTEGER NOT NULL,
    
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT coupon_usage_unique UNIQUE(coupon_id, user_id, transaction_id)
);

-- Create indexes
CREATE INDEX idx_coupon_usage_coupon ON payment.coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user ON payment.coupon_usage(user_id);

-- =============================================================================
-- Functions
-- =============================================================================

-- Function to calculate subscription end date
CREATE OR REPLACE FUNCTION payment.calculate_subscription_end_date(
    p_start_date TIMESTAMP,
    p_subscription_type VARCHAR
)
RETURNS TIMESTAMP AS $$
BEGIN
    CASE p_subscription_type
        WHEN 'monthly' THEN
            RETURN p_start_date + INTERVAL '1 month';
        WHEN 'yearly' THEN
            RETURN p_start_date + INTERVAL '1 year';
        WHEN 'lifetime' THEN
            RETURN p_start_date + INTERVAL '100 years';
        ELSE
            RETURN p_start_date + INTERVAL '1 month';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to upgrade user membership
CREATE OR REPLACE FUNCTION payment.upgrade_user_membership(
    p_user_id UUID,
    p_plan_code VARCHAR,
    p_transaction_id UUID
)
RETURNS void AS $$
DECLARE
    v_plan_id UUID;
    v_membership membership_type;
BEGIN
    -- Get plan ID
    SELECT id INTO v_plan_id
    FROM payment.membership_plans
    WHERE plan_code = p_plan_code AND is_active = true;
    
    -- Map plan code to membership type
    v_membership := p_plan_code::membership_type;
    
    -- Update user membership
    UPDATE auth.users
    SET
        membership = v_membership,
        membership_expires_at = payment.calculate_subscription_end_date(
            CURRENT_TIMESTAMP,
            CASE WHEN p_plan_code = 'free' THEN NULL ELSE 'monthly' END
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- Update user quota
    PERFORM auth.initialize_user_quota(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check subscription expiry
CREATE OR REPLACE FUNCTION payment.check_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark expired subscriptions
    UPDATE payment.user_subscriptions
    SET status = 'expired', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active'
    AND current_period_end < CURRENT_TIMESTAMP
    AND auto_renew = false;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Downgrade expired users to free tier
    UPDATE auth.users u
    SET membership = 'free', membership_expires_at = NULL
    FROM payment.user_subscriptions s
    WHERE u.id = s.user_id
    AND s.status = 'expired';
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Trigger to update user membership after successful payment
CREATE OR REPLACE FUNCTION payment.update_membership_after_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get plan code from subscription
        PERFORM payment.upgrade_user_membership(
            NEW.user_id,
            (SELECT plan_code FROM payment.membership_plans WHERE id = NEW.plan_id),
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_membership_after_payment_trigger
    AFTER UPDATE OF status ON payment.transactions
    FOR EACH ROW
    WHEN (NEW.type IN ('subscription', 'upgrade', 'renewal'))
    EXECUTE FUNCTION payment.update_membership_after_payment();

-- =============================================================================
-- Record Migration
-- =============================================================================

INSERT INTO public.schema_migrations (version, migration_name)
VALUES ('006', 'payment_tables')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Rollback Script
-- =============================================================================

COMMENT ON TABLE payment.membership_plans IS '
ROLLBACK SCRIPT:
-- Drop triggers
DROP TRIGGER IF EXISTS update_membership_after_payment_trigger ON payment.transactions;

-- Drop functions
DROP FUNCTION IF EXISTS payment.update_membership_after_payment();
DROP FUNCTION IF EXISTS payment.check_expired_subscriptions();
DROP FUNCTION IF EXISTS payment.upgrade_user_membership(UUID, VARCHAR, UUID);
DROP FUNCTION IF EXISTS payment.calculate_subscription_end_date(TIMESTAMP, VARCHAR);

-- Drop tables
DROP TABLE IF EXISTS payment.coupon_usage CASCADE;
DROP TABLE IF EXISTS payment.coupon_codes CASCADE;
DROP TABLE IF EXISTS payment.invoices CASCADE;
DROP TABLE IF EXISTS payment.payment_methods CASCADE;
DROP TABLE IF EXISTS payment.transactions CASCADE;
DROP TABLE IF EXISTS payment.user_subscriptions CASCADE;
DROP TABLE IF EXISTS payment.membership_plans CASCADE;

-- Remove migration record
DELETE FROM public.schema_migrations WHERE version = ''006'';
';