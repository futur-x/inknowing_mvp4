# Task: AUTH-002 - Implement Phone/SMS Authentication

## Task Information
- **Task ID**: AUTH-002
- **Title**: Implement Phone/SMS Authentication System
- **Priority**: P0-Critical
- **Module/Component**: Authentication & Authorization
- **Estimated Hours**: 6-8 hours

## Description
Implement phone number authentication with SMS verification code for user registration and login. This is a primary authentication method for the platform and must support both registration and login flows with proper rate limiting and security measures.

## Technical Requirements

### 1. SMS Provider Integration
- Support for multiple SMS providers (Aliyun, Twilio, etc.)
- Provider abstraction layer for easy switching
- Retry mechanism with fallback providers

### 2. Verification Code Management
```typescript
interface VerificationCode {
  phone: string;
  code: string;
  type: 'registration' | 'login' | 'reset';
  attempts: number;
  expires_at: Date;
  verified: boolean;
  created_at: Date;
}

interface SMSRateLimit {
  phone: string;
  daily_count: number;
  last_sent_at: Date;
  blocked_until?: Date;
}
```

### 3. Security Requirements
- 6-digit random code generation
- Code expiry: 5 minutes
- Maximum attempts: 3 per code
- Daily limit: 5 codes per phone number
- Cooldown: 60 seconds between requests
- Phone number validation (Chinese format)

## API Endpoints
Based on api-specification.yaml:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/verify-code` | POST | Send SMS verification code |
| `/auth/register` | POST | Register with phone + code |
| `/auth/login` | POST | Login with phone + code/password |

## Request/Response Schemas

### Send Verification Code
```json
// Request
{
  "phone": "13800138000",
  "type": "registration" // or "login"
}

// Response
{
  "success": true,
  "message": "Verification code sent",
  "expires_in": 300 // seconds
}
```

### Phone Registration
```json
// Request
{
  "type": "phone",
  "phone": "13800138000",
  "code": "123456",
  "password": "optional_password"
}

// Response
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": { /* user object */ }
}
```

## Dependencies
- **External Services**:
  - SMS provider SDK (Aliyun SMS, Twilio, etc.)
  - Redis for code storage and rate limiting

- **Internal Dependencies**:
  - JWT token system (AUTH-001)
  - User creation service (USER-001)
  - Rate limiting middleware (INFRA-003)

## Database Tables Required

### verification_codes
```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL,
  attempts INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone_code (phone, code),
  INDEX idx_expires_at (expires_at)
);
```

### sms_rate_limits
```sql
CREATE TABLE sms_rate_limits (
  phone VARCHAR(20) PRIMARY KEY,
  daily_count INT DEFAULT 0,
  monthly_count INT DEFAULT 0,
  last_sent_at TIMESTAMP,
  blocked_until TIMESTAMP,
  reset_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Acceptance Criteria
- [ ] SMS codes are sent successfully through provider
- [ ] Codes expire after 5 minutes
- [ ] Invalid codes are rejected after 3 attempts
- [ ] Rate limiting prevents SMS bombing
- [ ] Phone number format validation (Chinese mobile)
- [ ] Registration creates new user with phone
- [ ] Login works with both code and password
- [ ] Duplicate registration is prevented
- [ ] SMS sending is logged for audit

## Test Cases

### Unit Tests
1. **Code Generation**
   - Generates 6-digit numeric code
   - Code is unique per request
   - Code is stored with correct expiry

2. **Code Validation**
   - Valid code within time limit passes
   - Expired code is rejected
   - Wrong code increments attempts
   - Exceeded attempts blocks validation

3. **Rate Limiting**
   - Enforces cooldown between requests
   - Enforces daily limit per phone
   - Blocks phone after limit exceeded

### Integration Tests
1. Complete registration flow: request code → verify → create account
2. Complete login flow: request code → verify → get tokens
3. SMS provider failover when primary fails
4. Concurrent code requests for same phone
5. Code cleanup job for expired codes

## Error Handling
| Error Case | Status Code | Response |
|------------|-------------|----------|
| Invalid phone format | 400 | `{error: "INVALID_PHONE", message: "Invalid phone number format"}` |
| Too many requests | 429 | `{error: "RATE_LIMIT", message: "Please wait 60 seconds"}` |
| Daily limit exceeded | 429 | `{error: "DAILY_LIMIT", message: "Daily SMS limit exceeded"}` |
| Invalid code | 400 | `{error: "INVALID_CODE", message: "Invalid verification code"}` |
| Code expired | 400 | `{error: "CODE_EXPIRED", message: "Verification code has expired"}` |
| SMS send failed | 500 | `{error: "SMS_FAILED", message: "Failed to send SMS"}` |

## SMS Provider Configuration
```yaml
sms:
  primary_provider: aliyun
  providers:
    aliyun:
      access_key: ${ALIYUN_ACCESS_KEY}
      access_secret: ${ALIYUN_ACCESS_SECRET}
      sign_name: "InKnowing"
      template_code: "SMS_123456"
    twilio:
      account_sid: ${TWILIO_ACCOUNT_SID}
      auth_token: ${TWILIO_AUTH_TOKEN}
      from_number: "+1234567890"
```

## Implementation Notes
1. Store codes in Redis with TTL for automatic expiry
2. Use transaction for code verification and user creation
3. Implement SMS cost tracking for billing
4. Add phone number blacklist for abuse prevention
5. Consider implementing CAPTCHA for additional security
6. Log all SMS sends with cost and delivery status

## Monitoring & Alerts
- SMS delivery success rate < 95%
- Unusual spike in SMS volume (potential abuse)
- Provider API errors
- High code validation failure rate

## Related Tasks
- AUTH-001: JWT Token Management (dependency)
- AUTH-003: WeChat OAuth Integration
- USER-001: User Model Creation
- INFRA-003: Rate Limiting Middleware