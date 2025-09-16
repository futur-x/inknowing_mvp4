# API E2E Testing Tasks - Authentication Endpoints

## Test Suite: Authentication Module
**Framework**: Jest + Supertest
**Base URL**: `https://api.inknowing.ai/v1`

---

## TASK-001: User Registration Tests

### Test Scenarios

#### 1.1 Phone Registration - Success Path
```javascript
describe('POST /auth/register - Phone Registration', () => {
  test('should register new user with valid phone and code', async () => {
    const response = await request(baseURL)
      .post('/auth/register')
      .send({
        type: 'phone',
        phone: '13800138000',
        code: '123456',
        password: 'Test123456'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user.phone).toBe('13800138000');
  });
});
```

#### 1.2 WeChat Registration - Success Path
```javascript
test('should register new user with WeChat auth', async () => {
  const response = await request(baseURL)
    .post('/auth/register')
    .send({
      type: 'wechat',
      code: 'wx_auth_code_test_123'
    });

  expect(response.status).toBe(201);
  expect(response.body.user).toHaveProperty('wechat_openid');
});
```

#### 1.3 Duplicate Registration - Error Path
```javascript
test('should return 409 for duplicate phone registration', async () => {
  const response = await request(baseURL)
    .post('/auth/register')
    .send({
      type: 'phone',
      phone: '13800138000', // Already registered
      code: '123456'
    });

  expect(response.status).toBe(409);
  expect(response.body.error).toContain('already exists');
});
```

#### 1.4 Invalid Phone Format
```javascript
test('should reject invalid phone format', async () => {
  const response = await request(baseURL)
    .post('/auth/register')
    .send({
      type: 'phone',
      phone: 'invalid_phone',
      code: '123456'
    });

  expect(response.status).toBe(400);
});
```

#### 1.5 Invalid Verification Code
```javascript
test('should reject invalid verification code', async () => {
  const response = await request(baseURL)
    .post('/auth/register')
    .send({
      type: 'phone',
      phone: '13800138001',
      code: '000000' // Invalid code
    });

  expect(response.status).toBe(400);
  expect(response.body.error).toContain('Invalid verification code');
});
```

### Test Data Requirements
- Valid Chinese phone numbers for testing
- Mock SMS verification codes
- WeChat OAuth test tokens
- Database cleanup between tests

---

## TASK-002: User Login Tests

### Test Scenarios

#### 2.1 Phone + Password Login - Success
```javascript
describe('POST /auth/login - Phone Login', () => {
  test('should login with phone and password', async () => {
    const response = await request(baseURL)
      .post('/auth/login')
      .send({
        type: 'phone',
        phone: '13800138000',
        password: 'Test123456'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body.token_type).toBe('Bearer');
    expect(response.body.expires_in).toBeGreaterThan(0);
  });
});
```

#### 2.2 Phone + SMS Code Login
```javascript
test('should login with phone and SMS code', async () => {
  const response = await request(baseURL)
    .post('/auth/login')
    .send({
      type: 'phone',
      phone: '13800138000',
      code: '123456'
    });

  expect(response.status).toBe(200);
});
```

#### 2.3 WeChat Login
```javascript
test('should login with WeChat authorization', async () => {
  const response = await request(baseURL)
    .post('/auth/login')
    .send({
      type: 'wechat',
      code: 'wx_auth_code_valid'
    });

  expect(response.status).toBe(200);
  expect(response.body.user).toHaveProperty('wechat_openid');
});
```

#### 2.4 Invalid Credentials
```javascript
test('should return 401 for wrong password', async () => {
  const response = await request(baseURL)
    .post('/auth/login')
    .send({
      type: 'phone',
      phone: '13800138000',
      password: 'WrongPassword'
    });

  expect(response.status).toBe(401);
  expect(response.body.error).toBe('Unauthorized');
});
```

#### 2.5 Non-existent User
```javascript
test('should return 401 for non-existent user', async () => {
  const response = await request(baseURL)
    .post('/auth/login')
    .send({
      type: 'phone',
      phone: '19999999999',
      password: 'Test123456'
    });

  expect(response.status).toBe(401);
});
```

---

## TASK-003: Token Refresh Tests

### Test Scenarios

#### 3.1 Valid Refresh Token
```javascript
describe('POST /auth/refresh', () => {
  let refreshToken;

  beforeEach(async () => {
    const loginResponse = await request(baseURL)
      .post('/auth/login')
      .send({
        type: 'phone',
        phone: '13800138000',
        password: 'Test123456'
      });
    refreshToken = loginResponse.body.refresh_token;
  });

  test('should refresh access token with valid refresh token', async () => {
    const response = await request(baseURL)
      .post('/auth/refresh')
      .send({
        refresh_token: refreshToken
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
  });
});
```

#### 3.2 Expired Refresh Token
```javascript
test('should reject expired refresh token', async () => {
  const expiredToken = 'eyJ...expired_token';

  const response = await request(baseURL)
    .post('/auth/refresh')
    .send({
      refresh_token: expiredToken
    });

  expect(response.status).toBe(401);
  expect(response.body.error).toContain('Token expired');
});
```

#### 3.3 Invalid Refresh Token
```javascript
test('should reject malformed refresh token', async () => {
  const response = await request(baseURL)
    .post('/auth/refresh')
    .send({
      refresh_token: 'invalid_token_format'
    });

  expect(response.status).toBe(401);
});
```

---

## TASK-004: User Logout Tests

### Test Scenarios

#### 4.1 Successful Logout
```javascript
describe('POST /auth/logout', () => {
  let accessToken;

  beforeEach(async () => {
    const loginResponse = await request(baseURL)
      .post('/auth/login')
      .send({
        type: 'phone',
        phone: '13800138000',
        password: 'Test123456'
      });
    accessToken = loginResponse.body.access_token;
  });

  test('should logout user successfully', async () => {
    const response = await request(baseURL)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  test('should invalidate token after logout', async () => {
    await request(baseURL)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    // Try to use the same token
    const profileResponse = await request(baseURL)
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(profileResponse.status).toBe(401);
  });
});
```

#### 4.2 Logout Without Token
```javascript
test('should return 401 when logout without token', async () => {
  const response = await request(baseURL)
    .post('/auth/logout');

  expect(response.status).toBe(401);
});
```

---

## TASK-005: Verification Code Tests

### Test Scenarios

#### 5.1 Send Verification Code
```javascript
describe('POST /auth/verify-code', () => {
  test('should send verification code to valid phone', async () => {
    const response = await request(baseURL)
      .post('/auth/verify-code')
      .send({
        phone: '13800138002'
      });

    expect(response.status).toBe(200);
  });
});
```

#### 5.2 Rate Limiting Test
```javascript
test('should enforce rate limiting for verification codes', async () => {
  const phone = '13800138003';

  // Send multiple requests
  for (let i = 0; i < 5; i++) {
    await request(baseURL)
      .post('/auth/verify-code')
      .send({ phone });
  }

  // Should be rate limited now
  const response = await request(baseURL)
    .post('/auth/verify-code')
    .send({ phone });

  expect(response.status).toBe(429);
  expect(response.body.error).toContain('Too many requests');
});
```

#### 5.3 Invalid Phone Number
```javascript
test('should reject invalid phone format', async () => {
  const response = await request(baseURL)
    .post('/auth/verify-code')
    .send({
      phone: '12345' // Invalid format
    });

  expect(response.status).toBe(400);
});
```

---

## Test Environment Setup

### Prerequisites
```bash
npm install --save-dev jest supertest @types/jest @types/supertest
npm install --save-dev dotenv jest-extended
```

### Configuration File
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/api-e2e/**/*.test.js'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Test Helper Functions
```javascript
// test-helpers.js
const jwt = require('jsonwebtoken');

export const generateTestPhone = () => {
  const prefix = '138';
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
};

export const generateMockWeChatCode = () => {
  return 'wx_test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};

export const waitForAsync = (ms) => new Promise(resolve => setTimeout(resolve, ms));
```

---

## Execution Plan

### Phase 1: Setup
1. Configure test environment variables
2. Setup test database
3. Configure mock SMS service
4. Setup WeChat OAuth mock

### Phase 2: Execution
1. Run auth tests in isolation
2. Validate all response schemas
3. Check error handling
4. Verify rate limiting
5. Test token expiration

### Phase 3: Reporting
1. Generate test coverage report
2. Document failed test cases
3. Performance metrics for auth endpoints
4. Security vulnerability scan results

---

## CI/CD Integration

```yaml
# .github/workflows/api-tests.yml
name: API E2E Tests - Authentication

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  auth-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run Auth API Tests
        run: npm run test:api:auth
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          TEST_PHONE: ${{ secrets.TEST_PHONE }}
          TEST_WECHAT_CODE: ${{ secrets.TEST_WECHAT_CODE }}

      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
          flags: api-auth-tests
```

---

## Success Criteria

✅ All 5 authentication endpoints fully tested
✅ 100% test coverage for happy paths
✅ 100% test coverage for error scenarios
✅ Rate limiting properly tested
✅ Token lifecycle validated
✅ Security vulnerabilities checked
✅ Response time < 500ms for all auth endpoints
✅ All tests passing in CI/CD pipeline