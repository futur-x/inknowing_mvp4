# Security Testing Tasks - InKnowing Platform

## Test Suite: Security and Vulnerability Testing
**Framework**: OWASP ZAP, Burp Suite, Custom Security Tests
**Standards**: OWASP Top 10, CWE, NIST

---

## TASK-072: Authentication Security Tests

### Implementation
```javascript
// auth-security.test.js
describe('Authentication Security', () => {
  test('SQL Injection prevention', async () => {
    const maliciousInputs = [
      "' OR '1'='1",
      "admin'--",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users--",
      "' OR 1=1--"
    ];

    for (const input of maliciousInputs) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          type: 'phone',
          phone: input,
          password: input
        });

      // Should reject malicious input
      expect(response.status).toBe(400);
      expect(response.body.error).not.toContain('SQL');

      // Verify database is intact
      const users = await db.query('SELECT COUNT(*) FROM users');
      expect(users).toBeDefined();
    }
  });

  test('Password brute force protection', async () => {
    const attempts = [];

    // Try 10 failed login attempts
    for (let i = 0; i < 10; i++) {
      attempts.push(
        request(app)
          .post('/api/auth/login')
          .send({
            type: 'phone',
            phone: '13800138000',
            password: `WrongPass${i}`
          })
      );
    }

    const responses = await Promise.all(attempts);

    // Should block after 5 attempts
    const blockedResponses = responses.filter(r => r.status === 429);
    expect(blockedResponses.length).toBeGreaterThan(0);

    // Check for rate limit headers
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.headers['x-ratelimit-remaining']).toBeDefined();
    expect(lastResponse.headers['retry-after']).toBeDefined();
  });

  test('JWT token security', () => {
    const token = generateToken({ userId: '123' });
    const decoded = jwt.decode(token, { complete: true });

    // Should use secure algorithm
    expect(decoded.header.alg).toBe('RS256'); // Not HS256

    // Should have proper claims
    expect(decoded.payload).toHaveProperty('exp'); // Expiration
    expect(decoded.payload).toHaveProperty('iat'); // Issued at
    expect(decoded.payload).toHaveProperty('jti'); // JWT ID

    // Should not contain sensitive data
    expect(decoded.payload).not.toHaveProperty('password');
    expect(decoded.payload).not.toHaveProperty('creditCard');
  });

  test('Session fixation prevention', async () => {
    // Login with first session
    const loginResponse1 = await request(app)
      .post('/api/auth/login')
      .send({ type: 'phone', phone: '13800138000', password: 'Test123' });

    const sessionId1 = loginResponse1.headers['set-cookie']
      .find(c => c.startsWith('session='))
      .split('=')[1].split(';')[0];

    // Login again
    const loginResponse2 = await request(app)
      .post('/api/auth/login')
      .send({ type: 'phone', phone: '13800138000', password: 'Test123' });

    const sessionId2 = loginResponse2.headers['set-cookie']
      .find(c => c.startsWith('session='))
      .split('=')[1].split(';')[0];

    // Session ID should change after login
    expect(sessionId1).not.toBe(sessionId2);
  });
});
```

---

## TASK-073: Input Validation and XSS Prevention

### Implementation
```javascript
// xss-security.test.js
describe('XSS Prevention', () => {
  test('Stored XSS prevention in user input', async () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')">',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<body onload=alert("XSS")>'
    ];

    const token = await getAuthToken();

    for (const payload of xssPayloads) {
      // Try to inject XSS in profile
      await request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: payload });

      // Retrieve profile
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      // Should be sanitized
      expect(response.body.nickname).not.toContain('<script>');
      expect(response.body.nickname).not.toContain('javascript:');
      expect(response.body.nickname).not.toContain('onerror=');
    }
  });

  test('Reflected XSS prevention in search', async () => {
    const xssQuery = '<script>alert("XSS")</script>';

    const response = await request(app)
      .get('/api/search')
      .query({ q: xssQuery });

    // Response should escape the input
    expect(response.text).not.toContain('<script>');
    expect(response.text).toContain('&lt;script&gt;');
  });

  test('DOM XSS prevention', async () => {
    const page = await browser.newPage();

    await page.goto('https://inknowing.ai/search?q=<img src=x onerror=alert(1)>');

    // Check if XSS executed
    const alertFired = await page.evaluate(() => {
      return window.xssAlertFired || false;
    });

    expect(alertFired).toBe(false);

    // Check DOM for unescaped content
    const imgElements = await page.$$('img[onerror]');
    expect(imgElements.length).toBe(0);
  });

  test('Content Security Policy', async () => {
    const response = await request(app)
      .get('/');

    const csp = response.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
```

---

## TASK-074: Authorization and Access Control

### Implementation
```javascript
// authorization-security.test.js
describe('Authorization Security', () => {
  test('IDOR (Insecure Direct Object Reference) prevention', async () => {
    const user1Token = await getTokenForUser('user1');
    const user2Token = await getTokenForUser('user2');

    // User1 creates a dialogue
    const dialogueResponse = await request(app)
      .post('/api/dialogues/book/start')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ book_id: 'test-book' });

    const sessionId = dialogueResponse.body.id;

    // User2 tries to access User1's dialogue
    const unauthorizedAccess = await request(app)
      .get(`/api/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(unauthorizedAccess.status).toBe(403);
    expect(unauthorizedAccess.body.error).toContain('Forbidden');
  });

  test('Privilege escalation prevention', async () => {
    const userToken = await getUserToken();

    // Try to access admin endpoints
    const adminEndpoints = [
      '/api/admin/dashboard',
      '/api/admin/users',
      '/api/admin/books',
      '/api/admin/statistics/costs'
    ];

    for (const endpoint of adminEndpoints) {
      const response = await request(app)
        .get(endpoint)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    }

    // Try to modify JWT to add admin role
    const decoded = jwt.decode(userToken);
    decoded.role = 'admin';
    const forgedToken = jwt.sign(decoded, 'wrong-secret');

    const forgedResponse = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(forgedResponse.status).toBe(401); // Invalid signature
  });

  test('Path traversal prevention', async () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'books/../../../sensitive-data',
      'uploads/../../../../etc/shadow'
    ];

    const token = await getAuthToken();

    for (const payload of pathTraversalPayloads) {
      const response = await request(app)
        .get(`/api/files/${payload}`)
        .set('Authorization', `Bearer ${token}`);

      expect([400, 404]).toContain(response.status);
      expect(response.body).not.toContain('root:');
      expect(response.body).not.toContain('Administrator:');
    }
  });

  test('API rate limiting by user tier', async () => {
    const freeUserToken = await getFreeUserToken();
    const premiumUserToken = await getPremiumUserToken();

    // Free user - 20 requests per day
    const freeRequests = Array(25).fill(null).map(() =>
      request(app)
        .post('/api/dialogues/book/start')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({ book_id: 'test' })
    );

    const freeResponses = await Promise.all(freeRequests);
    const freeBlocked = freeResponses.filter(r => r.status === 429);
    expect(freeBlocked.length).toBeGreaterThan(0);

    // Premium user - 500 requests per month (higher limit)
    const premiumRequests = Array(25).fill(null).map(() =>
      request(app)
        .post('/api/dialogues/book/start')
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .send({ book_id: 'test' })
    );

    const premiumResponses = await Promise.all(premiumRequests);
    const premiumBlocked = premiumResponses.filter(r => r.status === 429);
    expect(premiumBlocked.length).toBe(0); // Should not be blocked
  });
});
```

---

## TASK-075: Data Security and Privacy

### Implementation
```javascript
// data-security.test.js
describe('Data Security and Privacy', () => {
  test('Sensitive data encryption at rest', async () => {
    // Check database encryption
    const userRecord = await db.raw(
      'SELECT password, phone FROM users WHERE id = ?',
      ['test-user']
    );

    // Password should be hashed
    expect(userRecord[0].password).not.toBe('plaintext');
    expect(userRecord[0].password).toMatch(/^\$2[aby]\$/); // bcrypt format

    // Phone should be encrypted (if PII encryption is enabled)
    if (process.env.ENCRYPT_PII === 'true') {
      expect(userRecord[0].phone).not.toMatch(/^1[3-9]\d{9}$/);
    }
  });

  test('Sensitive data not in logs', async () => {
    // Make requests with sensitive data
    await request(app)
      .post('/api/auth/login')
      .send({
        type: 'phone',
        phone: '13800138000',
        password: 'Test123456'
      });

    // Check application logs
    const logs = await getLogs();

    // Should not contain sensitive data
    expect(logs).not.toContain('Test123456'); // Password
    expect(logs).not.toContain('13800138000'); // Full phone number
    expect(logs).not.toContain('Bearer ey'); // JWT tokens
  });

  test('PII data masking in responses', async () => {
    const token = await getAuthToken();

    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    // Phone should be partially masked
    expect(response.body.phone).toMatch(/^138\*{4}000$/);

    // Email should be partially masked (if exists)
    if (response.body.email) {
      expect(response.body.email).toMatch(/^.{2}\*+@/);
    }
  });

  test('GDPR compliance - data export', async () => {
    const token = await getAuthToken();

    const response = await request(app)
      .get('/api/users/data-export')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('dialogues');
    expect(response.body).toHaveProperty('uploads');

    // Should include all user data
    expect(response.body.user).toHaveProperty('id');
    expect(response.body.user).toHaveProperty('created_at');
  });

  test('GDPR compliance - data deletion', async () => {
    const token = await getAuthToken();
    const userId = 'delete-test-user';

    // Request account deletion
    const deleteResponse = await request(app)
      .delete('/api/users/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'DELETE MY ACCOUNT' });

    expect(deleteResponse.status).toBe(200);

    // Verify data is marked for deletion
    const user = await db.users.findOne({ id: userId });
    expect(user.deleted_at).toBeDefined();

    // Verify cascading deletion
    const dialogues = await db.dialogues.find({ user_id: userId });
    expect(dialogues.length).toBe(0);
  });
});
```

---

## TASK-076: API Security Testing

### Implementation
```javascript
// api-security.test.js
describe('API Security', () => {
  test('CORS configuration', async () => {
    const response = await request(app)
      .options('/api/books')
      .set('Origin', 'https://evil-site.com');

    const allowedOrigin = response.headers['access-control-allow-origin'];

    // Should not allow arbitrary origins
    expect(allowedOrigin).not.toBe('https://evil-site.com');
    expect(allowedOrigin).not.toBe('*');

    // Should only allow specific origins
    expect(['https://inknowing.ai', undefined]).toContain(allowedOrigin);
  });

  test('HTTP security headers', async () => {
    const response = await request(app).get('/');

    // Check security headers
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers['strict-transport-security']).toContain('max-age=');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('API versioning security', async () => {
    // Old API version should be deprecated
    const oldVersionResponse = await request(app)
      .get('/api/v0/books');

    expect(oldVersionResponse.status).toBe(410); // Gone
    expect(oldVersionResponse.body.message).toContain('deprecated');

    // Current version should work
    const currentVersionResponse = await request(app)
      .get('/api/v1/books');

    expect(currentVersionResponse.status).toBe(200);
  });

  test('GraphQL introspection disabled in production', async () => {
    if (process.env.NODE_ENV === 'production') {
      const introspectionQuery = {
        query: `
          {
            __schema {
              types {
                name
              }
            }
          }
        `
      };

      const response = await request(app)
        .post('/graphql')
        .send(introspectionQuery);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].message).toContain('Introspection disabled');
    }
  });
});
```

---

## TASK-077: File Upload Security

### Implementation
```javascript
// file-upload-security.test.js
describe('File Upload Security', () => {
  test('Malicious file type prevention', async () => {
    const maliciousFiles = [
      { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>' },
      { name: 'script.exe', content: Buffer.from([0x4D, 0x5A]) }, // EXE header
      { name: 'virus.js', content: 'eval(atob("..."))' },
      { name: 'book.pdf.exe', content: 'malicious' }
    ];

    const token = await getAuthToken();

    for (const file of maliciousFiles) {
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from(file.content), file.name);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('file type');
    }
  });

  test('File size limit enforcement', async () => {
    const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB

    const response = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', largeFile, 'large.txt');

    expect(response.status).toBe(413);
    expect(response.body.error).toContain('too large');
  });

  test('Filename sanitization', async () => {
    const dangerousFilenames = [
      '../../../etc/passwd.txt',
      '..\\..\\windows\\system32\\config.txt',
      'file\x00.txt', // Null byte
      'file%00.txt',
      'file\r\n.txt'
    ];

    for (const filename of dangerousFilenames) {
      const response = await request(app)
        .post('/api/uploads')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('content'), filename);

      // Should sanitize filename
      if (response.status === 202) {
        expect(response.body.filename).not.toContain('..');
        expect(response.body.filename).not.toContain('\x00');
        expect(response.body.filename).not.toContain('\\');
      }
    }
  });

  test('Virus scanning integration', async () => {
    // Upload EICAR test file (harmless virus test pattern)
    const eicarTestString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

    const response = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(eicarTestString), 'test.txt');

    // Should be rejected if virus scanning is enabled
    if (process.env.ENABLE_VIRUS_SCAN === 'true') {
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('virus');
    }
  });
});
```

---

## TASK-078: Infrastructure Security

### Implementation
```javascript
// infrastructure-security.test.js
describe('Infrastructure Security', () => {
  test('Database connection security', () => {
    const dbConfig = getDatabaseConfig();

    // Should use SSL/TLS
    expect(dbConfig.ssl).toBe(true);

    // Should not use default credentials
    expect(dbConfig.password).not.toBe('password');
    expect(dbConfig.password).not.toBe('admin');
    expect(dbConfig.password).not.toBe('123456');

    // Connection string should not be in plain text
    expect(process.env.DATABASE_URL).toBeUndefined();
  });

  test('Redis security configuration', () => {
    const redisConfig = getRedisConfig();

    // Should require authentication
    expect(redisConfig.password).toBeDefined();
    expect(redisConfig.password).not.toBe('');

    // Should use TLS in production
    if (process.env.NODE_ENV === 'production') {
      expect(redisConfig.tls).toBeDefined();
    }
  });

  test('Secret management', () => {
    // Secrets should not be in code
    const sourceFiles = getAllSourceFiles();

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for hardcoded secrets
      expect(content).not.toMatch(/api[_-]?key\s*=\s*["'][^"']+["']/i);
      expect(content).not.toMatch(/password\s*=\s*["'][^"']+["']/i);
      expect(content).not.toMatch(/secret\s*=\s*["'][^"']+["']/i);
      expect(content).not.toMatch(/sk-[a-zA-Z0-9]{48}/); // OpenAI API key pattern
    }
  });

  test('Container security scan', async () => {
    // Run Trivy security scan on Docker image
    const scanResult = await exec('trivy image inknowing:latest --severity HIGH,CRITICAL');

    const vulnerabilities = JSON.parse(scanResult);
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL');

    expect(criticalVulns.length).toBe(0);
  });
});
```

---

## Penetration Testing with OWASP ZAP

```javascript
// zap-scan-config.js
const ZAPClient = require('zaproxy');

const zapOptions = {
  apiKey: process.env.ZAP_API_KEY,
  proxy: 'http://localhost:8080'
};

const zap = new ZAPClient(zapOptions);

async function runSecurityScan() {
  // Start ZAP spider
  await zap.spider.scan('https://inknowing.ai');

  // Wait for spider to complete
  while (await zap.spider.status() < 100) {
    await sleep(1000);
  }

  // Run active scan
  await zap.ascan.scan('https://inknowing.ai');

  // Wait for scan to complete
  while (await zap.ascan.status() < 100) {
    await sleep(5000);
  }

  // Get alerts
  const alerts = await zap.core.alerts();

  // Check for high-risk vulnerabilities
  const highRiskAlerts = alerts.filter(a => a.risk === 'High');

  return {
    totalAlerts: alerts.length,
    highRisk: highRiskAlerts,
    report: await zap.core.htmlreport()
  };
}
```

---

## Security Monitoring and Alerting

```javascript
// security-monitoring.js
class SecurityMonitor {
  constructor() {
    this.alerts = [];
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitor failed login attempts
    app.on('login:failed', (event) => {
      if (this.detectBruteForce(event.ip)) {
        this.alert('Brute force attack detected', event);
        this.blockIP(event.ip);
      }
    });

    // Monitor suspicious patterns
    app.on('request', (req) => {
      if (this.detectSQLInjection(req)) {
        this.alert('SQL injection attempt', req);
      }

      if (this.detectXSS(req)) {
        this.alert('XSS attempt detected', req);
      }
    });

    // Monitor file uploads
    app.on('upload', (file) => {
      if (this.detectMaliciousFile(file)) {
        this.alert('Malicious file upload attempt', file);
        this.quarantineFile(file);
      }
    });
  }

  detectBruteForce(ip) {
    const attempts = this.getRecentAttempts(ip);
    return attempts.length > 5 &&
           attempts.filter(a => !a.success).length > 4;
  }

  detectSQLInjection(req) {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
      /('|(--|#|\/\*|\*\/|;))/g,
      /(=|'|"|`|;|--|\||\\)/g
    ];

    const params = JSON.stringify(req.query) + JSON.stringify(req.body);
    return patterns.some(pattern => pattern.test(params));
  }

  alert(message, details) {
    const alert = {
      timestamp: new Date(),
      message,
      details,
      severity: this.calculateSeverity(message)
    };

    this.alerts.push(alert);

    // Send to security team
    if (alert.severity >= 8) {
      this.notifySecurityTeam(alert);
    }

    // Log to SIEM
    this.logToSIEM(alert);
  }
}
```

---

## CI/CD Security Pipeline

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * *' # Daily security scan

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Run Security Tests
        run: npm run test:security

      - name: Dependency Security Scan
        run: npm audit --audit-level=moderate

      - name: SAST Scan with Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: auto

      - name: Container Security Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'inknowing:latest'
          severity: 'CRITICAL,HIGH'

      - name: OWASP ZAP Scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'https://staging.inknowing.ai'

      - name: Upload Security Reports
        uses: actions/upload-artifact@v2
        with:
          name: security-reports
          path: |
            security-test-results.xml
            zap-report.html
            trivy-results.json
```

---

## Success Criteria

✅ No SQL injection vulnerabilities
✅ XSS attacks prevented
✅ Authentication bypass prevented
✅ Authorization properly enforced
✅ Sensitive data encrypted
✅ PII properly masked
✅ Security headers implemented
✅ File upload security enforced
✅ Infrastructure hardened
✅ All OWASP Top 10 addressed
✅ Security monitoring active
✅ Automated security scanning in CI/CD