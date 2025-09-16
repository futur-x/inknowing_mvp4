# API E2E Testing Tasks - User Management Endpoints

## Test Suite: User Module
**Framework**: Jest + Supertest
**Base URL**: `https://api.inknowing.ai/v1`

---

## TASK-006: User Profile Tests

### Test Scenarios

#### 6.1 Get User Profile - Success
```javascript
describe('GET /users/profile', () => {
  let accessToken;

  beforeAll(async () => {
    const loginResponse = await request(baseURL)
      .post('/auth/login')
      .send({
        type: 'phone',
        phone: testPhone,
        password: testPassword
      });
    accessToken = loginResponse.body.access_token;
  });

  test('should retrieve user profile with valid token', async () => {
    const response = await request(baseURL)
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('username');
    expect(response.body).toHaveProperty('membership');
    expect(response.body).toHaveProperty('points');
    expect(response.body).toHaveProperty('created_at');
  });
});
```

#### 6.2 Get Profile Without Auth
```javascript
test('should return 401 without authentication', async () => {
  const response = await request(baseURL)
    .get('/users/profile');

  expect(response.status).toBe(401);
  expect(response.body.error).toBe('Unauthorized');
});
```

#### 6.3 Update User Profile
```javascript
describe('PATCH /users/profile', () => {
  test('should update user nickname and avatar', async () => {
    const updateData = {
      nickname: 'TestUser2024',
      avatar: 'https://example.com/avatar.jpg'
    };

    const response = await request(baseURL)
      .patch('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.nickname).toBe(updateData.nickname);
    expect(response.body.avatar).toBe(updateData.avatar);
  });

  test('should validate nickname length', async () => {
    const response = await request(baseURL)
      .patch('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nickname: 'a'.repeat(51) // Too long
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('nickname');
  });
});
```

---

## TASK-007: Membership Management Tests

### Test Scenarios

#### 7.1 Get Membership Status
```javascript
describe('GET /users/membership', () => {
  test('should retrieve membership information', async () => {
    const response = await request(baseURL)
      .get('/users/membership')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('type');
    expect(response.body).toHaveProperty('quota_total');
    expect(response.body).toHaveProperty('quota_used');
    expect(response.body).toHaveProperty('quota_reset_at');
    expect(response.body).toHaveProperty('benefits');
    expect(Array.isArray(response.body.benefits)).toBe(true);
  });

  test('should show correct membership type', async () => {
    const response = await request(baseURL)
      .get('/users/membership')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(['free', 'basic', 'premium', 'super']).toContain(response.body.type);
  });
});
```

#### 7.2 Membership Upgrade Tests
```javascript
describe('POST /users/membership/upgrade', () => {
  test('should initiate basic membership upgrade', async () => {
    const response = await request(baseURL)
      .post('/users/membership/upgrade')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        plan: 'basic',
        duration: 1,
        payment_method: 'wechat'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('order_id');
    expect(response.body).toHaveProperty('amount');
    expect(response.body).toHaveProperty('payment_url');
    expect(response.body.type).toBe('membership');
    expect(response.body.status).toBe('pending');
  });

  test('should calculate correct price for different durations', async () => {
    const plans = [
      { plan: 'basic', duration: 1, expectedAmount: 29 },
      { plan: 'basic', duration: 3, expectedAmount: 79 },
      { plan: 'premium', duration: 1, expectedAmount: 59 },
      { plan: 'premium', duration: 6, expectedAmount: 299 },
      { plan: 'super', duration: 1, expectedAmount: 99 },
      { plan: 'super', duration: 12, expectedAmount: 999 }
    ];

    for (const testCase of plans) {
      const response = await request(baseURL)
        .post('/users/membership/upgrade')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          plan: testCase.plan,
          duration: testCase.duration,
          payment_method: 'alipay'
        });

      expect(response.body.amount).toBe(testCase.expectedAmount);
    }
  });

  test('should reject invalid plan type', async () => {
    const response = await request(baseURL)
      .post('/users/membership/upgrade')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        plan: 'invalid_plan',
        duration: 1,
        payment_method: 'wechat'
      });

    expect(response.status).toBe(400);
  });

  test('should reject invalid duration', async () => {
    const response = await request(baseURL)
      .post('/users/membership/upgrade')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        plan: 'basic',
        duration: 2, // Invalid duration
        payment_method: 'wechat'
      });

    expect(response.status).toBe(400);
  });
});
```

---

## TASK-008: User Quota Tests

### Test Scenarios

#### 8.1 Get Dialogue Quota
```javascript
describe('GET /users/quota', () => {
  test('should retrieve user quota information', async () => {
    const response = await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('used');
    expect(response.body).toHaveProperty('remaining');
    expect(response.body).toHaveProperty('reset_at');
    expect(response.body.remaining).toBe(response.body.total - response.body.used);
  });

  test('should show correct quota for free users', async () => {
    // Login as free user
    const freeUserToken = await loginAsFreUser();

    const response = await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${freeUserToken}`);

    expect(response.body.total).toBe(20); // Free tier: 20/day
  });

  test('should show correct quota for paid members', async () => {
    // Login as premium user
    const premiumUserToken = await loginAsPremiumUser();

    const response = await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${premiumUserToken}`);

    expect(response.body.total).toBe(500); // Premium: 500/month
  });

  test('should track quota usage after dialogue', async () => {
    const beforeQuota = await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${accessToken}`);

    // Start a dialogue and send messages
    const dialogueResponse = await request(baseURL)
      .post('/dialogues/book/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        book_id: testBookId,
        initial_question: 'Test question'
      });

    const sessionId = dialogueResponse.body.id;

    await request(baseURL)
      .post(`/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: 'Test message'
      });

    const afterQuota = await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(afterQuota.body.used).toBeGreaterThan(beforeQuota.body.used);
    expect(afterQuota.body.remaining).toBeLessThan(beforeQuota.body.remaining);
  });
});
```

---

## TASK-009: Quota Reset Tests

### Test Scenarios

#### 9.1 Daily Quota Reset for Free Users
```javascript
describe('Quota Reset Mechanism', () => {
  test('should reset daily quota for free users', async () => {
    const freeUserToken = await loginAsFreUser();

    // Get current quota
    const currentQuota = await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${freeUserToken}`);

    // Check reset_at is within 24 hours
    const resetTime = new Date(currentQuota.body.reset_at);
    const now = new Date();
    const hoursDiff = (resetTime - now) / (1000 * 60 * 60);

    expect(hoursDiff).toBeLessThanOrEqual(24);
    expect(hoursDiff).toBeGreaterThan(0);
  });
});
```

#### 9.2 Monthly Quota Reset for Paid Users
```javascript
test('should reset monthly quota for paid users', async () => {
  const paidUserToken = await loginAsPaidUser();

  const quota = await request(baseURL)
    .get('/users/quota')
    .set('Authorization', `Bearer ${paidUserToken}`);

  const resetDate = new Date(quota.body.reset_at);
  const now = new Date();

  // Should reset on the same date next month
  expect(resetDate.getDate()).toBe(now.getDate());
  expect(resetDate.getMonth()).toBe((now.getMonth() + 1) % 12);
});
```

---

## TASK-010: Membership Expiration Tests

### Test Scenarios

#### 10.1 Handle Expired Membership
```javascript
describe('Membership Expiration', () => {
  test('should downgrade to free tier when membership expires', async () => {
    // Use a test user with expired membership
    const expiredMemberToken = await loginAsExpiredMember();

    const membership = await request(baseURL)
      .get('/users/membership')
      .set('Authorization', `Bearer ${expiredMemberToken}`);

    expect(membership.body.type).toBe('free');
    expect(membership.body.expires_at).toBeNull();
  });

  test('should adjust quota when membership expires', async () => {
    const expiredMemberToken = await loginAsExpiredMember();

    const quota = await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${expiredMemberToken}`);

    expect(quota.body.total).toBe(20); // Reverted to free tier quota
  });
});
```

---

## Test Data Setup

### User Test Data Factory
```javascript
// user-test-data.js
export const createTestUsers = async () => {
  const users = {
    freeUser: {
      phone: '13800000001',
      password: 'Test123456',
      membership: 'free'
    },
    basicUser: {
      phone: '13800000002',
      password: 'Test123456',
      membership: 'basic',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    premiumUser: {
      phone: '13800000003',
      password: 'Test123456',
      membership: 'premium',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    superUser: {
      phone: '13800000004',
      password: 'Test123456',
      membership: 'super',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    expiredMember: {
      phone: '13800000005',
      password: 'Test123456',
      membership: 'free',
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
    }
  };

  // Create users in test database
  for (const [key, userData] of Object.entries(users)) {
    await createTestUser(userData);
  }

  return users;
};
```

---

## Performance Benchmarks

### Expected Response Times
```javascript
describe('User Endpoints Performance', () => {
  test('GET /users/profile should respond within 200ms', async () => {
    const startTime = Date.now();

    await request(baseURL)
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(200);
  });

  test('GET /users/quota should respond within 150ms', async () => {
    const startTime = Date.now();

    await request(baseURL)
      .get('/users/quota')
      .set('Authorization', `Bearer ${accessToken}`);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(150);
  });
});
```

---

## Edge Cases and Error Scenarios

### Concurrent Updates
```javascript
test('should handle concurrent profile updates', async () => {
  const updates = Array(5).fill(null).map((_, i) =>
    request(baseURL)
      .patch('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nickname: `User${i}` })
  );

  const responses = await Promise.all(updates);
  const successfulUpdates = responses.filter(r => r.status === 200);

  expect(successfulUpdates.length).toBeGreaterThan(0);
});
```

### Invalid Token Formats
```javascript
test('should reject malformed JWT tokens', async () => {
  const invalidTokens = [
    'not.a.token',
    'Bearer invalid',
    'eyJ...incomplete',
    null,
    undefined,
    ''
  ];

  for (const token of invalidTokens) {
    const response = await request(baseURL)
      .get('/users/profile')
      .set('Authorization', token || '');

    expect(response.status).toBe(401);
  }
});
```

---

## CI/CD Integration

```yaml
# .github/workflows/user-api-tests.yml
name: API E2E Tests - User Management

on:
  push:
    paths:
      - 'src/api/users/**'
      - 'tests/api-e2e/user-endpoints-tests.md'
  pull_request:
    paths:
      - 'src/api/users/**'

jobs:
  user-api-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Run User Management Tests
        run: npm run test:api:users
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          TEST_JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}

      - name: Performance Report
        if: always()
        run: npm run test:api:users:performance

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: user-api-test-results
          path: test-results/users/
```

---

## Success Criteria

✅ All user management endpoints tested (5 endpoints)
✅ Membership upgrade flow fully validated
✅ Quota tracking accurately tested
✅ Token validation comprehensive
✅ Performance benchmarks met
✅ Error scenarios handled properly
✅ Concurrent operations tested
✅ CI/CD pipeline integrated