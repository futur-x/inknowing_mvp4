# Task: USER-001 - Create User Model and Repository

## Task Information
- **Task ID**: USER-001
- **Title**: Create User Model and Repository Layer
- **Priority**: P0-Critical
- **Module/Component**: User Management
- **Estimated Hours**: 6-8 hours

## Description
Create the core user model, database schema, and repository layer for user data management. This includes all user attributes, relationships, and basic CRUD operations that will be used throughout the application.

## Technical Requirements

### 1. User Model
```typescript
interface User {
  id: string; // UUID
  username: string;
  phone?: string;
  wechat_openid?: string;
  email?: string;
  password_hash?: string;
  avatar?: string;
  nickname: string;
  membership_type: MembershipType;
  membership_expires_at?: Date;
  points: number;
  status: UserStatus;
  last_active_at?: Date;
  created_at: Date;
  updated_at: Date;
}

enum MembershipType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  SUPER = 'super'
}

enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}
```

### 2. Repository Interface
```typescript
interface UserRepository {
  // Create
  create(data: CreateUserDto): Promise<User>;

  // Read
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByWeChatOpenId(openid: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;

  // Update
  update(id: string, data: UpdateUserDto): Promise<User>;
  updateMembership(id: string, type: MembershipType, expiresAt?: Date): Promise<User>;
  updatePoints(id: string, points: number): Promise<User>;
  updateLastActive(id: string): Promise<void>;

  // Delete
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;

  // Query
  list(filters: UserFilters, pagination: Pagination): Promise<PaginatedResult<User>>;
  count(filters: UserFilters): Promise<number>;

  // Membership
  getMembershipStats(): Promise<MembershipStats>;
  getExpiringMemberships(days: number): Promise<User[]>;
}
```

## Database Tables Required

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  wechat_openid VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  avatar TEXT,
  nickname VARCHAR(100) NOT NULL,
  membership_type VARCHAR(20) NOT NULL DEFAULT 'free',
  membership_expires_at TIMESTAMP,
  points INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_membership_type CHECK (membership_type IN ('free', 'basic', 'premium', 'super')),
  CONSTRAINT chk_status CHECK (status IN ('active', 'suspended', 'deleted')),
  CONSTRAINT chk_points CHECK (points >= 0),

  INDEX idx_phone (phone),
  INDEX idx_wechat_openid (wechat_openid),
  INDEX idx_membership_type (membership_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_membership_expires_at (membership_expires_at)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### user_profiles (optional extended info)
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  preferences JSONB,
  reading_history JSONB,
  favorite_books UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints
Based on api-specification.yaml:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/profile` | GET | Get current user profile |
| `/users/profile` | PATCH | Update user profile |
| `/users/membership` | GET | Get membership status |
| `/users/quota` | GET | Get dialogue quota |

## Dependencies
- **Database**:
  - PostgreSQL or MySQL
  - Database connection pool
  - Migration tool (Prisma, TypeORM, etc.)

- **Libraries**:
  - bcrypt for password hashing
  - uuid for ID generation
  - Validation library (joi, zod, etc.)

## Acceptance Criteria
- [ ] User can be created with required fields
- [ ] Unique constraints are enforced (username, phone, wechat_openid)
- [ ] Password is properly hashed before storage
- [ ] User can be retrieved by various identifiers
- [ ] User profile can be updated partially
- [ ] Membership type and expiry are correctly managed
- [ ] Points can be incremented/decremented atomically
- [ ] Soft delete preserves data but marks as deleted
- [ ] Pagination works correctly for user lists
- [ ] Database indexes optimize query performance

## Test Cases

### Unit Tests
1. **User Creation**
   - Creates user with valid data
   - Rejects duplicate username
   - Rejects duplicate phone
   - Rejects duplicate WeChat OpenID
   - Auto-generates username if not provided

2. **User Retrieval**
   - Finds user by ID
   - Finds user by phone
   - Finds user by WeChat OpenID
   - Returns null for non-existent user

3. **User Update**
   - Updates allowed fields
   - Prevents updating immutable fields (ID, created_at)
   - Updates membership correctly
   - Handles points increment/decrement

4. **User Deletion**
   - Soft delete changes status
   - Hard delete removes record
   - Cascades to related tables

### Integration Tests
1. Create user → Update profile → Retrieve
2. Membership upgrade → Check expiry
3. Points transaction → Verify balance
4. List users with filters and pagination
5. Concurrent updates to same user

## Data Validation Rules
| Field | Validation |
|-------|------------|
| username | 3-50 chars, alphanumeric + underscore |
| phone | Chinese mobile format (1[3-9]\d{9}) |
| email | Valid email format |
| nickname | 1-100 chars, no special chars |
| password | Min 6 chars, requires hash |
| points | Non-negative integer |
| avatar | Valid URL or base64 |

## Implementation Notes
1. Use database transactions for atomic operations
2. Implement optimistic locking for concurrent updates
3. Cache frequently accessed users in Redis
4. Generate unique username from phone/WeChat if needed
5. Store avatar URLs in CDN, not base64 in DB
6. Implement audit log for sensitive operations

## Performance Considerations
- Index on all lookup fields (phone, wechat_openid, username)
- Partial index on status WHERE status != 'deleted'
- Consider partitioning for large user tables
- Implement connection pooling
- Use prepared statements for queries

## Related Tasks
- AUTH-001: JWT Token Management (uses User model)
- AUTH-002: Phone Authentication (creates users)
- AUTH-003: WeChat OAuth (creates users)
- USER-002: Membership Management
- USER-003: Quota Management