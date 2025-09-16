# Task: USER-002 - Implement Membership Management System

## Task Information
- **Task ID**: USER-002
- **Title**: Implement Membership Management System
- **Priority**: P0-Critical
- **Module/Component**: User Management
- **Estimated Hours**: 10-12 hours

## Description
Implement a complete membership management system including tier management, upgrade/downgrade logic, expiry handling, and benefit enforcement. This system controls user access to features and quota limits based on their membership tier.

## Technical Requirements

### 1. Membership Tiers
```typescript
interface MembershipTier {
  type: 'free' | 'basic' | 'premium' | 'super';
  name: string;
  monthly_price: number;
  annual_price: number;
  daily_quota?: number;
  monthly_quota: number;
  features: MembershipFeature[];
  benefits: string[];
}

interface MembershipFeature {
  feature_id: string;
  enabled: boolean;
  limit?: number;
}

const MEMBERSHIP_TIERS = {
  free: {
    type: 'free',
    name: 'Free User',
    monthly_price: 0,
    annual_price: 0,
    daily_quota: 20,
    monthly_quota: 20 * 30,
    features: [
      { feature_id: 'book_dialogue', enabled: true, limit: 20 },
      { feature_id: 'character_dialogue', enabled: false },
      { feature_id: 'book_upload', enabled: false }
    ]
  },
  basic: {
    type: 'basic',
    name: 'Basic Member',
    monthly_price: 29.9,
    annual_price: 299,
    monthly_quota: 200,
    features: [
      { feature_id: 'book_dialogue', enabled: true },
      { feature_id: 'character_dialogue', enabled: true, limit: 50 },
      { feature_id: 'book_upload', enabled: false }
    ]
  },
  premium: {
    type: 'premium',
    name: 'Premium Member',
    monthly_price: 59.9,
    annual_price: 599,
    monthly_quota: 500,
    features: [
      { feature_id: 'book_dialogue', enabled: true },
      { feature_id: 'character_dialogue', enabled: true },
      { feature_id: 'book_upload', enabled: true, limit: 3 }
    ]
  },
  super: {
    type: 'super',
    name: 'Super Member',
    monthly_price: 99.9,
    annual_price: 999,
    monthly_quota: 1000,
    features: [
      { feature_id: 'book_dialogue', enabled: true },
      { feature_id: 'character_dialogue', enabled: true },
      { feature_id: 'book_upload', enabled: true, limit: 10 },
      { feature_id: 'priority_support', enabled: true }
    ]
  }
};
```

### 2. Membership Service Interface
```typescript
interface MembershipService {
  // Membership Info
  getMembershipInfo(userId: string): Promise<MembershipInfo>;
  getMembershipBenefits(type: MembershipType): Promise<MembershipBenefits>;

  // Upgrade/Downgrade
  upgradeMembership(userId: string, newTier: MembershipType, duration: number): Promise<PaymentOrder>;
  activateMembership(orderId: string): Promise<void>;
  cancelMembership(userId: string): Promise<void>;

  // Expiry Management
  checkExpiredMemberships(): Promise<void>;
  sendExpiryReminders(): Promise<void>;

  // Feature Access
  canAccessFeature(userId: string, featureId: string): Promise<boolean>;
  getFeatureLimit(userId: string, featureId: string): Promise<number | null>;
}
```

## Database Tables Required

### membership_plans
```sql
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  monthly_price DECIMAL(10, 2) NOT NULL,
  annual_price DECIMAL(10, 2) NOT NULL,
  monthly_quota INTEGER NOT NULL,
  daily_quota INTEGER,
  features JSONB NOT NULL,
  benefits TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### membership_records
```sql
CREATE TABLE membership_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_type VARCHAR(20) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  payment_order_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_status CHECK (status IN ('active', 'expired', 'cancelled')),
  INDEX idx_user_id (user_id),
  INDEX idx_end_date (end_date),
  INDEX idx_status (status)
);
```

### membership_transitions
```sql
CREATE TABLE membership_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_type VARCHAR(20),
  to_type VARCHAR(20) NOT NULL,
  reason VARCHAR(50) NOT NULL,
  order_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

## API Endpoints
Based on api-specification.yaml:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/membership` | GET | Get current membership status |
| `/users/membership/upgrade` | POST | Initiate membership upgrade |
| `/users/membership/cancel` | POST | Cancel auto-renewal |
| `/users/membership/history` | GET | Get membership history |

## Acceptance Criteria
- [ ] Users can view their current membership status and benefits
- [ ] Users can upgrade to higher tiers
- [ ] Payment orders are created for upgrades
- [ ] Membership activates after successful payment
- [ ] Expired memberships automatically downgrade to free
- [ ] Users receive reminders before expiry (7 days, 3 days, 1 day)
- [ ] Feature access is correctly enforced based on tier
- [ ] Membership history is preserved for audit
- [ ] Pro-rated refunds for downgrades (if applicable)

## Test Cases

### Unit Tests
1. **Tier Management**
   - Get correct benefits for each tier
   - Calculate correct pricing
   - Verify feature access rules

2. **Upgrade Logic**
   - Create payment order for upgrade
   - Activate membership after payment
   - Handle upgrade from any tier to any tier
   - Calculate pro-rated amounts

3. **Expiry Handling**
   - Detect expired memberships
   - Downgrade to free tier
   - Preserve usage history

4. **Feature Access**
   - Check feature availability by tier
   - Enforce feature limits
   - Block access for expired memberships

### Integration Tests
1. Complete upgrade flow: select plan → payment → activation
2. Membership expiry → automatic downgrade
3. Cancel membership → stop auto-renewal
4. Concurrent membership operations
5. Reminder notifications before expiry

## Business Rules
1. **Upgrade Rules**:
   - Can upgrade from any lower tier to higher tier
   - Immediate activation after payment
   - Pro-rated credit for remaining time (optional)

2. **Downgrade Rules**:
   - Downgrade takes effect at end of current period
   - No immediate refunds
   - Preserve higher tier until expiry

3. **Expiry Rules**:
   - Check daily at 00:00 UTC
   - Send reminders at 7, 3, and 1 day before expiry
   - Auto-downgrade to free tier
   - Preserve dialogue history

4. **Quota Rules**:
   - Free tier: Daily reset at 00:00 user timezone
   - Paid tiers: Monthly reset on billing date
   - Unused quota doesn't carry over

## Implementation Notes
1. Use cron job for daily expiry checks
2. Implement grace period (3 days) for payment issues
3. Cache membership status in Redis (5 min TTL)
4. Use database transactions for tier changes
5. Log all membership changes for audit
6. Implement webhook for payment confirmations

## Error Handling
| Error Case | Status Code | Response |
|------------|-------------|----------|
| Already on tier | 400 | `{error: "ALREADY_ON_TIER", message: "Already on selected tier"}` |
| Downgrade not allowed | 400 | `{error: "DOWNGRADE_BLOCKED", message: "Cannot downgrade immediately"}` |
| Payment pending | 409 | `{error: "PAYMENT_PENDING", message: "Previous payment pending"}` |
| Invalid tier | 400 | `{error: "INVALID_TIER", message: "Invalid membership tier"}` |

## Monitoring & Alerts
- Daily active members by tier
- Conversion rate (free → paid)
- Churn rate by tier
- Failed payment attempts
- Expiry reminder delivery rate
- Revenue by tier

## Related Tasks
- USER-001: User Model (provides user base)
- USER-003: Quota Management
- PAYMENT-001: Payment Gateway Integration
- PAYMENT-002: Order Management
- NOTIFICATION-001: Email/SMS Notifications