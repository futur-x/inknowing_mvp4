# Integration Testing Tasks - InKnowing Platform

## Test Suite: System Integration Tests
**Framework**: Jest + Supertest + Docker Compose
**Scope**: Service-to-service, Database, External APIs

---

## TASK-060: Authentication Flow Integration

### Implementation
```javascript
// auth-integration.test.js
describe('Authentication Integration', () => {
  let db, redis, smsService;

  beforeAll(async () => {
    db = await setupTestDatabase();
    redis = await setupRedisClient();
    smsService = await setupMockSMSService();
  });

  test('Complete registration flow with SMS', async () => {
    // Step 1: Request verification code
    const phoneResponse = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '13800138001' });

    expect(phoneResponse.status).toBe(200);

    // Step 2: Verify code is in Redis
    const code = await redis.get('sms:13800138001');
    expect(code).toBeDefined();

    // Step 3: Register with code
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        type: 'phone',
        phone: '13800138001',
        code: code,
        password: 'Test123456'
      });

    expect(registerResponse.status).toBe(201);

    // Step 4: Verify user in database
    const user = await db.users.findOne({ phone: '13800138001' });
    expect(user).toBeDefined();
    expect(user.password).not.toBe('Test123456'); // Should be hashed

    // Step 5: Verify tokens are valid
    const { access_token } = registerResponse.body;
    const profileResponse = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${access_token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.phone).toBe('13800138001');
  });

  test('WeChat OAuth integration flow', async () => {
    // Mock WeChat OAuth response
    const wechatMock = nock('https://api.weixin.qq.com')
      .post('/sns/oauth2/access_token')
      .reply(200, {
        access_token: 'wx_token',
        openid: 'wx_openid_123'
      });

    // Register with WeChat
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        type: 'wechat',
        code: 'wx_auth_code'
      });

    expect(response.status).toBe(201);
    expect(response.body.user.wechat_openid).toBe('wx_openid_123');

    // Verify WeChat API was called
    expect(wechatMock.isDone()).toBe(true);
  });

  test('Token refresh with Redis session', async () => {
    // Login first
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        type: 'phone',
        phone: '13800138001',
        password: 'Test123456'
      });

    const refreshToken = loginResponse.body.refresh_token;

    // Verify refresh token in Redis
    const sessionKey = `session:${refreshToken}`;
    const session = await redis.get(sessionKey);
    expect(session).toBeDefined();

    // Refresh token
    const refreshResponse = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.access_token).toBeDefined();

    // Old token should be invalidated
    const oldSession = await redis.get(sessionKey);
    expect(oldSession).toBeNull();
  });
});
```

---

## TASK-061: Book Search Integration with Vector DB

### Implementation
```javascript
// search-integration.test.js
describe('Search Integration with Vector Database', () => {
  let vectorDB, elasticSearch;

  beforeAll(async () => {
    vectorDB = await setupVectorDatabase();
    elasticSearch = await setupElasticsearch();

    // Seed test data
    await seedBooksData();
    await indexBooksInVectorDB();
  });

  test('Question-based search with semantic matching', async () => {
    const question = '如何提高团队管理能力？';

    // Search request
    const response = await request(app)
      .get('/api/search')
      .query({ q: question, type: 'question' });

    expect(response.status).toBe(200);
    expect(response.body.results.length).toBeGreaterThan(0);

    // Verify vector search was used
    const topResult = response.body.results[0];
    expect(topResult.relevance_score).toBeGreaterThan(70);

    // Verify Elasticsearch fallback
    const esQuery = await elasticSearch.getLastQuery();
    expect(esQuery).toContain(question);
  });

  test('Hybrid search combining vector and keyword', async () => {
    const response = await request(app)
      .get('/api/search')
      .query({
        q: '原则 达利欧',
        type: 'hybrid'
      });

    // Should combine vector similarity and keyword matching
    const results = response.body.results;

    // Check both vector score and keyword match
    const principlesBook = results.find(r => r.book.title === '原则');
    expect(principlesBook).toBeDefined();
    expect(principlesBook.relevance_score).toBeGreaterThan(90);
  });

  test('Category filtering with vector search', async () => {
    const response = await request(app)
      .get('/api/books')
      .query({
        category: 'psychology',
        q: '情绪管理'
      });

    // All results should be psychology category
    response.body.books.forEach(book => {
      expect(book.category).toBe('psychology');
    });

    // Should still use vector search for relevance
    expect(response.body.books[0].title).toContain('情绪');
  });
});
```

---

## TASK-062: Dialogue System Integration with AI

### Implementation
```javascript
// dialogue-integration.test.js
describe('Dialogue System Integration', () => {
  let aiService, vectorDB, messageQueue;

  beforeAll(async () => {
    aiService = await setupMockAIService();
    vectorDB = await setupVectorDatabase();
    messageQueue = await setupRedisQueue();
  });

  test('Complete dialogue flow with AI and context', async () => {
    const token = await getAuthToken();

    // Start dialogue
    const startResponse = await request(app)
      .post('/api/dialogues/book/start')
      .set('Authorization', `Bearer ${token}`)
      .send({
        book_id: 'test-book-id',
        initial_question: '这本书讲了什么？'
      });

    const sessionId = startResponse.body.id;
    expect(sessionId).toBeDefined();

    // Send message
    const messageResponse = await request(app)
      .post(`/api/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: '请详细解释第一章'
      });

    expect(messageResponse.status).toBe(200);

    // Verify AI service was called with context
    const aiCalls = aiService.getCalls();
    expect(aiCalls.length).toBe(1);
    expect(aiCalls[0].context).toContain('第一章');

    // Verify vector search for context
    const vectorSearches = vectorDB.getSearchHistory();
    expect(vectorSearches.length).toBeGreaterThan(0);
    expect(vectorSearches[0].query).toContain('第一章');

    // Verify message saved to database
    const messages = await db.dialogueMessages.find({ session_id: sessionId });
    expect(messages.length).toBe(2); // User + AI
  });

  test('WebSocket integration for real-time dialogue', (done) => {
    const client = io('http://localhost:3000');
    const sessionId = 'test-session-123';

    client.on('connect', () => {
      client.emit('join', { sessionId, token: 'valid-token' });
    });

    client.on('joined', () => {
      // Send message via WebSocket
      client.emit('message', {
        type: 'message',
        content: 'WebSocket test message'
      });
    });

    client.on('typing', (data) => {
      expect(data.isTyping).toBe(true);
    });

    client.on('response', (data) => {
      expect(data.content).toBeDefined();
      expect(data.type).toBe('response');

      // Verify message in database
      db.dialogueMessages.findOne({ content: data.content })
        .then(msg => {
          expect(msg).toBeDefined();
          client.disconnect();
          done();
        });
    });
  });

  test('Quota management across services', async () => {
    const token = await getTokenForUserWithQuota(5);

    // Use up quota
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/dialogues/book/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ book_id: 'test-book' });

      expect(response.status).toBe(201);
    }

    // Should be blocked on 6th attempt
    const blockedResponse = await request(app)
      .post('/api/dialogues/book/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ book_id: 'test-book' });

    expect(blockedResponse.status).toBe(403);
    expect(blockedResponse.body.error).toContain('Quota exceeded');

    // Verify quota in Redis cache
    const cachedQuota = await redis.get('quota:user123');
    expect(JSON.parse(cachedQuota).remaining).toBe(0);
  });
});
```

---

## TASK-063: Book Upload Processing Pipeline

### Implementation
```javascript
// upload-integration.test.js
describe('Upload Processing Pipeline Integration', () => {
  let storageService, ocrService, vectorDB, jobQueue;

  beforeAll(async () => {
    storageService = await setupMinioStorage();
    ocrService = await setupMockOCRService();
    vectorDB = await setupVectorDatabase();
    jobQueue = await setupBullQueue();
  });

  test('Complete book upload and processing flow', async () => {
    const token = await getAuthToken();

    // Upload file
    const uploadResponse = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', 'test-files/sample-book.pdf')
      .field('title', 'Integration Test Book')
      .field('author', 'Test Author');

    expect(uploadResponse.status).toBe(202);
    const uploadId = uploadResponse.body.id;

    // Verify file stored in MinIO
    const stored = await storageService.fileExists(`uploads/${uploadId}`);
    expect(stored).toBe(true);

    // Verify job queued
    const job = await jobQueue.getJob(uploadId);
    expect(job).toBeDefined();
    expect(job.data.uploadId).toBe(uploadId);

    // Process the job
    await processUploadJob(job);

    // Check processing steps
    const status = await request(app)
      .get(`/api/uploads/${uploadId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(status.body.status).toBe('completed');
    expect(status.body.processing_steps).toContainEqual(
      expect.objectContaining({
        step: 'text_preprocessing',
        status: 'completed'
      })
    );

    // Verify vectors created
    const vectors = await vectorDB.search({
      collection: 'books',
      filter: { upload_id: uploadId }
    });
    expect(vectors.length).toBeGreaterThan(0);

    // Verify book is searchable
    const searchResponse = await request(app)
      .get('/api/search')
      .query({ q: 'Integration Test Book' });

    const found = searchResponse.body.results.find(
      r => r.book.title === 'Integration Test Book'
    );
    expect(found).toBeDefined();
  });

  test('AI book detection integration', async () => {
    const checkResponse = await request(app)
      .post('/api/uploads/check')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '红楼梦',
        author: '曹雪芹'
      });

    expect(checkResponse.body.ai_known).toBe(true);

    // Should not need vectorization
    const uploadResponse = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .field('title', '红楼梦')
      .field('author', '曹雪芹')
      .attach('file', 'test-files/placeholder.txt');

    // Should skip vectorization step
    const job = await jobQueue.getJob(uploadResponse.body.id);
    expect(job.data.skip_vectorization).toBe(true);
  });
});
```

---

## TASK-064: Payment Integration

### Implementation
```javascript
// payment-integration.test.js
describe('Payment System Integration', () => {
  let paymentGateway, webhookServer;

  beforeAll(async () => {
    paymentGateway = await setupMockPaymentGateway();
    webhookServer = await setupWebhookServer();
  });

  test('Complete membership upgrade flow', async () => {
    const token = await getAuthToken();

    // Initiate upgrade
    const upgradeResponse = await request(app)
      .post('/api/users/membership/upgrade')
      .set('Authorization', `Bearer ${token}`)
      .send({
        plan: 'premium',
        duration: 3,
        payment_method: 'wechat'
      });

    expect(upgradeResponse.status).toBe(200);
    const orderId = upgradeResponse.body.order_id;

    // Verify payment gateway called
    const paymentRequest = paymentGateway.getLastRequest();
    expect(paymentRequest.amount).toBe(15900); // 159.00 in cents
    expect(paymentRequest.order_id).toBe(orderId);

    // Simulate payment callback
    const callbackResponse = await request(app)
      .post('/api/payment/callback/wechat')
      .set('Content-Type', 'application/xml')
      .send(`
        <xml>
          <return_code>SUCCESS</return_code>
          <out_trade_no>${orderId}</out_trade_no>
          <total_fee>15900</total_fee>
        </xml>
      `);

    expect(callbackResponse.status).toBe(200);

    // Verify membership updated
    const membershipResponse = await request(app)
      .get('/api/users/membership')
      .set('Authorization', `Bearer ${token}`);

    expect(membershipResponse.body.type).toBe('premium');
    expect(membershipResponse.body.quota_total).toBe(500);

    // Verify order status
    const orderResponse = await request(app)
      .get(`/api/payment/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(orderResponse.body.status).toBe('completed');
  });

  test('Handle payment failure and retry', async () => {
    // Simulate failed payment
    const orderId = 'failed-order-123';

    await request(app)
      .post('/api/payment/callback/wechat')
      .send(`
        <xml>
          <return_code>FAIL</return_code>
          <out_trade_no>${orderId}</out_trade_no>
          <err_code>INSUFFICIENT_BALANCE</err_code>
        </xml>
      `);

    // Order should be marked as failed
    const order = await db.orders.findOne({ id: orderId });
    expect(order.status).toBe('failed');

    // User membership should not change
    const user = await db.users.findOne({ id: order.user_id });
    expect(user.membership).toBe('free');

    // Should allow retry
    const retryResponse = await request(app)
      .post(`/api/payment/orders/${orderId}/retry`)
      .set('Authorization', `Bearer ${token}`);

    expect(retryResponse.status).toBe(200);
    expect(retryResponse.body.payment_url).toBeDefined();
  });
});
```

---

## TASK-065: Admin System Integration

### Implementation
```javascript
// admin-integration.test.js
describe('Admin System Integration', () => {
  let adminToken, elasticSearch, monitoring;

  beforeAll(async () => {
    adminToken = await getAdminToken();
    elasticSearch = await setupElasticsearch();
    monitoring = await setupMonitoringService();
  });

  test('Dashboard aggregation from multiple sources', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    // Verify data from different sources
    const dashboard = response.body;

    // From Redis (real-time)
    expect(dashboard.real_time.online_users).toBeDefined();

    // From Database (aggregated)
    expect(dashboard.today.new_users).toBeDefined();
    expect(dashboard.today.total_dialogues).toBeDefined();

    // From Elasticsearch (analytics)
    expect(dashboard.trending.top_books).toBeDefined();
    expect(dashboard.trending.top_questions).toBeDefined();

    // From monitoring service
    expect(dashboard.real_time.api_health).toBeDefined();
  });

  test('Book review workflow with notifications', async () => {
    // Upload a book as user
    const userToken = await getUserToken();
    const uploadResponse = await request(app)
      .post('/api/uploads')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', 'test-files/review-book.pdf')
      .field('title', 'Book for Review');

    const bookId = uploadResponse.body.book_id;

    // Admin reviews book
    const reviewResponse = await request(app)
      .post(`/api/admin/books/${bookId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'approve',
        vectorize: true
      });

    expect(reviewResponse.status).toBe(200);

    // Verify notification sent to user
    const notifications = await db.notifications.find({
      user_id: uploadResponse.body.user_id
    });
    expect(notifications).toContainEqual(
      expect.objectContaining({
        type: 'book_approved',
        book_id: bookId
      })
    );

    // Verify vectorization job queued
    const job = await jobQueue.getJob(`vectorize-${bookId}`);
    expect(job).toBeDefined();
  });

  test('Cost tracking across AI services', async () => {
    // Make several AI calls
    await makeDialogueWithAI();
    await makeDialogueWithAI();

    // Get cost statistics
    const costResponse = await request(app)
      .get('/api/admin/statistics/costs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ period: 'today' });

    expect(costResponse.body.total_cost).toBeGreaterThan(0);

    // Verify breakdown by model
    const breakdown = costResponse.body.breakdown;
    const gptCost = breakdown.find(b => b.category === 'gpt-4');
    expect(gptCost).toBeDefined();
    expect(gptCost.count).toBeGreaterThan(0);
  });
});
```

---

## Database Transaction Tests

```javascript
// transaction-integration.test.js
describe('Database Transaction Integration', () => {
  test('Dialogue creation with rollback on failure', async () => {
    const mockError = new Error('AI Service Unavailable');
    aiService.mockError(mockError);

    const response = await request(app)
      .post('/api/dialogues/book/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ book_id: 'test-book' });

    expect(response.status).toBe(503);

    // Verify no orphaned records
    const sessions = await db.dialogueSessions.find({
      book_id: 'test-book'
    });
    expect(sessions.length).toBe(0);

    // Quota should not be deducted
    const user = await db.users.findOne({ id: 'user123' });
    expect(user.quota_used).toBe(0);
  });

  test('Concurrent updates with optimistic locking', async () => {
    const userId = 'concurrent-user';

    // Simulate concurrent profile updates
    const updates = Array(5).fill(null).map((_, i) =>
      request(app)
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${tokens[i]}`)
        .send({ nickname: `User${i}` })
    );

    const results = await Promise.allSettled(updates);

    // Only one should succeed
    const successful = results.filter(r => r.value?.status === 200);
    expect(successful.length).toBe(1);

    // Others should get conflict error
    const conflicts = results.filter(r => r.value?.status === 409);
    expect(conflicts.length).toBe(4);
  });
});
```

---

## External Service Integration

```javascript
// external-integration.test.js
describe('External Service Integration', () => {
  test('SMS service failover', async () => {
    // Primary SMS service fails
    primarySMS.mockError();

    const response = await request(app)
      .post('/api/auth/verify-code')
      .send({ phone: '13800138000' });

    // Should succeed with backup service
    expect(response.status).toBe(200);

    // Verify backup service was used
    expect(backupSMS.wasCalled()).toBe(true);
  });

  test('AI model fallback on failure', async () => {
    // Primary AI model fails
    primaryAI.mockError();

    const response = await request(app)
      .post('/api/dialogues/123/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'test' });

    // Should use backup model
    expect(response.status).toBe(200);
    expect(response.body.model_used).toBe('backup-model');
  });
});
```

---

## CI/CD Integration

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  app:
    build: .
    environment:
      - NODE_ENV=test
      - DB_HOST=postgres
      - REDIS_HOST=redis
      - VECTOR_DB_HOST=weaviate
    depends_on:
      - postgres
      - redis
      - elasticsearch
      - weaviate

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=inknowing_test
      - POSTGRES_PASSWORD=test

  redis:
    image: redis:7-alpine

  elasticsearch:
    image: elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  weaviate:
    image: semitechnologies/weaviate:latest
    environment:
      - PERSISTENCE_DATA_PATH=/var/lib/weaviate

  test-runner:
    build:
      context: .
      dockerfile: Dockerfile.test
    command: npm run test:integration
    depends_on:
      - app
```

---

## Success Criteria

✅ Authentication flow with Redis/DB integration tested
✅ Search with vector DB and Elasticsearch tested
✅ Dialogue system with AI integration validated
✅ Upload pipeline with storage and processing tested
✅ Payment gateway integration verified
✅ Admin system with analytics tested
✅ Database transactions and rollback tested
✅ External service failover validated
✅ All services communicate correctly
✅ Error handling across services verified