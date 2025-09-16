# Task: AUTH-001 - Implement JWT Token Management System

## Task Information
- **Task ID**: AUTH-001
- **Title**: Implement JWT Token Management System
- **Priority**: P0-Critical
- **Module/Component**: Authentication & Authorization
- **Estimated Hours**: 8-12 hours

## Description
Implement a complete JWT token management system including token generation, validation, refresh mechanism, and storage strategy. This is the foundation for all authenticated API endpoints and must be completed before any protected endpoints can be implemented.

## Technical Requirements

### 1. Token Structure
- **Access Token**:
  - Expiry: 24 hours
  - Contains: user_id, username, membership_type, role
  - Algorithm: RS256 or HS256

- **Refresh Token**:
  - Expiry: 30 days
  - Stored in database with device fingerprint
  - One-time use with rotation on refresh

### 2. Implementation Details
```typescript
interface JWTPayload {
  user_id: string;
  username: string;
  membership_type: 'free' | 'basic' | 'premium' | 'super';
  role: 'user' | 'admin';
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
}

interface RefreshTokenRecord {
  token_hash: string;
  user_id: string;
  device_fingerprint: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}
```

### 3. Security Requirements
- Secure token storage (httpOnly cookies for web, secure storage for mobile)
- Token rotation on refresh
- Blacklist mechanism for revoked tokens
- Rate limiting on token generation endpoints

## API Endpoints
Based on api-specification.yaml:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Generate access and refresh tokens |
| `/auth/refresh` | POST | Exchange refresh token for new access token |
| `/auth/logout` | POST | Revoke tokens and clear session |
| `/auth/verify` | GET | Verify token validity (internal use) |

## Dependencies
- **External Libraries**:
  - jsonwebtoken or jose for JWT handling
  - bcrypt for token hashing
  - redis for token blacklist (optional)

- **Internal Dependencies**:
  - Database connection (task DB-001)
  - User model (task USER-001)
  - Environment configuration (task CONFIG-001)

## Database Tables Required

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  device_fingerprint VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
);
```

### token_blacklist
```sql
CREATE TABLE token_blacklist (
  jti VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expires_at (expires_at)
);
```

## Acceptance Criteria
- [ ] Access tokens are generated with correct payload and expiry
- [ ] Refresh tokens are stored securely with one-time use enforcement
- [ ] Token refresh rotates both access and refresh tokens
- [ ] Expired tokens are rejected with appropriate error
- [ ] Logout invalidates all tokens for the session
- [ ] Token validation middleware correctly extracts and verifies JWT
- [ ] Rate limiting prevents token generation abuse
- [ ] All token operations are logged for security audit

## Test Cases

### Unit Tests
1. **Token Generation**
   - Valid user generates valid JWT
   - Token contains all required claims
   - Token expiry is correctly set

2. **Token Validation**
   - Valid token passes verification
   - Expired token is rejected
   - Malformed token is rejected
   - Token with invalid signature is rejected

3. **Token Refresh**
   - Valid refresh token generates new access token
   - Used refresh token is rejected
   - Expired refresh token is rejected
   - Refresh rotates both tokens

4. **Token Revocation**
   - Logout adds token to blacklist
   - Blacklisted token is rejected
   - Blacklist is cleaned periodically

### Integration Tests
1. Complete auth flow: login → use token → refresh → logout
2. Concurrent refresh attempts (only one should succeed)
3. Token persistence across server restart
4. Rate limiting on token endpoints

## Error Handling
| Error Case | Status Code | Response |
|------------|-------------|----------|
| Invalid credentials | 401 | `{error: "INVALID_CREDENTIALS", message: "Invalid username or password"}` |
| Token expired | 401 | `{error: "TOKEN_EXPIRED", message: "Access token has expired"}` |
| Invalid token | 401 | `{error: "INVALID_TOKEN", message: "Token validation failed"}` |
| Refresh token used | 401 | `{error: "TOKEN_ALREADY_USED", message: "Refresh token has already been used"}` |
| Rate limit exceeded | 429 | `{error: "RATE_LIMIT_EXCEEDED", message: "Too many requests"}` |

## Implementation Notes
1. Consider using Redis for token blacklist for better performance
2. Implement token family tracking for enhanced security
3. Add device management for multi-device support
4. Consider implementing sliding window expiry for active users
5. Ensure all timestamps are in UTC

## Related Tasks
- AUTH-002: Implement Phone/SMS Authentication
- AUTH-003: Implement WeChat OAuth Integration
- AUTH-004: Implement Admin Authentication
- USER-001: Create User Model and Repository