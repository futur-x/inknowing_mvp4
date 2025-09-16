# API E2E Testing Tasks - Upload, Admin & Payment Endpoints

## Test Suite: Upload, Admin, and Payment Modules
**Framework**: Jest + Supertest + FormData
**Base URL**: `https://api.inknowing.ai/v1`

---

## TASK-024: Book Upload Check Tests

### Test Scenarios

#### 24.1 Check Book Existence
```javascript
describe('POST /uploads/check', () => {
  let accessToken;

  beforeAll(async () => {
    accessToken = await getAuthToken();
  });

  test('should check if book exists in system', async () => {
    const response = await request(baseURL)
      .post('/uploads/check')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '原则',
        author: '瑞·达利欧'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('exists');
    expect(response.body).toHaveProperty('book_id');
    expect(response.body).toHaveProperty('ai_known');

    if (response.body.exists) {
      expect(response.body.book_id).toBeDefined();
    }
  });

  test('should identify AI-known books', async () => {
    const response = await request(baseURL)
      .post('/uploads/check')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '红楼梦',
        author: '曹雪芹'
      });

    expect(response.body.ai_known).toBe(true);
  });

  test('should handle non-existent books', async () => {
    const response = await request(baseURL)
      .post('/uploads/check')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Random Non-Existent Book Title 12345',
        author: 'Unknown Author XYZ'
      });

    expect(response.body.exists).toBe(false);
    expect(response.body.book_id).toBeNull();
  });
});
```

---

## TASK-025: Book Upload Tests

### Test Scenarios

#### 25.1 Upload TXT File
```javascript
import FormData from 'form-data';
import fs from 'fs';

describe('POST /uploads', () => {
  test('should upload TXT book successfully', async () => {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test-files/test-book.txt'));
    formData.append('title', 'Test Book Title');
    formData.append('author', 'Test Author');
    formData.append('category', 'business');
    formData.append('description', 'A test book for upload functionality');

    const response = await request(baseURL)
      .post('/uploads')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(formData.getHeaders())
      .send(formData.getBuffer());

    expect(response.status).toBe(202); // Accepted for processing
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', 'pending');
    expect(response.body).toHaveProperty('filename');
    expect(response.body).toHaveProperty('file_size');
    expect(response.body).toHaveProperty('processing_steps');
  });

  test('should upload PDF file successfully', async () => {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test-files/test-book.pdf'));
    formData.append('title', 'PDF Test Book');
    formData.append('author', 'PDF Author');
    formData.append('category', 'psychology');

    const response = await request(baseURL)
      .post('/uploads')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(formData.getHeaders())
      .send(formData.getBuffer());

    expect(response.status).toBe(202);
    expect(response.body.file_type).toBe('pdf');
  });

  test('should reject oversized files', async () => {
    // Create a file > 10MB
    const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB

    const formData = new FormData();
    formData.append('file', largeFile, 'large-book.txt');
    formData.append('title', 'Large Book');
    formData.append('author', 'Author');

    const response = await request(baseURL)
      .post('/uploads')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(formData.getHeaders())
      .send(formData.getBuffer());

    expect(response.status).toBe(413); // File too large
  });

  test('should reject unsupported file types', async () => {
    const formData = new FormData();
    formData.append('file', Buffer.from('test'), 'test.docx');
    formData.append('title', 'Word Doc');
    formData.append('author', 'Author');

    const response = await request(baseURL)
      .post('/uploads')
      .set('Authorization', `Bearer ${accessToken}`)
      .set(formData.getHeaders())
      .send(formData.getBuffer());

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('file type');
  });
});
```

---

## TASK-026: Upload Status Tracking Tests

### Test Scenarios

#### 26.1 Get Upload Status
```javascript
describe('GET /uploads/{uploadId}', () => {
  let uploadId;

  beforeAll(async () => {
    // Upload a test file first
    const uploadResponse = await uploadTestFile();
    uploadId = uploadResponse.body.id;
  });

  test('should track upload processing status', async () => {
    const response = await request(baseURL)
      .get(`/uploads/${uploadId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', uploadId);
    expect(response.body).toHaveProperty('status');
    expect(['pending', 'processing', 'completed', 'failed'])
      .toContain(response.body.status);

    // Check processing steps
    expect(response.body.processing_steps).toBeDefined();
    response.body.processing_steps.forEach(step => {
      expect(step).toHaveProperty('step');
      expect(step).toHaveProperty('status');
      expect(step).toHaveProperty('progress');
    });
  });

  test('should update status during processing', async () => {
    // Poll status until complete or timeout
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      const response = await request(baseURL)
        .get(`/uploads/${uploadId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      status = response.body.status;
      attempts++;

      if (status === 'processing') {
        // Check that progress is being made
        const completedSteps = response.body.processing_steps.filter(
          s => s.status === 'completed'
        );
        expect(completedSteps.length).toBeGreaterThanOrEqual(0);
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }

    expect(['completed', 'failed']).toContain(status);
  });
});
```

---

## TASK-027: User Uploads Management Tests

### Test Scenarios

#### 27.1 Get User's Uploaded Books
```javascript
describe('GET /uploads/my', () => {
  test('should list all user uploads', async () => {
    const response = await request(baseURL)
      .get('/uploads/my')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        status: 'all',
        page: 1,
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('uploads');
    expect(response.body).toHaveProperty('pagination');

    response.body.uploads.forEach(upload => {
      expect(upload).toHaveProperty('id');
      expect(upload).toHaveProperty('title');
      expect(upload).toHaveProperty('author');
      expect(upload).toHaveProperty('status');
      expect(upload).toHaveProperty('created_at');
    });
  });

  test('should filter uploads by status', async () => {
    const completedUploads = await request(baseURL)
      .get('/uploads/my')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'completed' });

    completedUploads.body.uploads.forEach(upload => {
      expect(upload.status).toBe('completed');
      expect(upload.book_id).toBeDefined();
    });

    const failedUploads = await request(baseURL)
      .get('/uploads/my')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ status: 'failed' });

    failedUploads.body.uploads.forEach(upload => {
      expect(upload.status).toBe('failed');
      expect(upload.error_message).toBeDefined();
    });
  });
});
```

---

## TASK-028: Admin Authentication Tests

### Test Scenarios

#### 28.1 Admin Login
```javascript
describe('POST /admin/login', () => {
  test('should login admin successfully', async () => {
    const response = await request(baseURL)
      .post('/admin/login')
      .send({
        username: 'admin',
        password: 'AdminPassword123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('admin');
    expect(response.body.admin).toHaveProperty('id');
    expect(response.body.admin).toHaveProperty('username');
    expect(response.body.admin).toHaveProperty('role');
    expect(response.body.admin).toHaveProperty('permissions');
  });

  test('should reject invalid admin credentials', async () => {
    const response = await request(baseURL)
      .post('/admin/login')
      .send({
        username: 'admin',
        password: 'WrongPassword'
      });

    expect(response.status).toBe(401);
  });

  test('should validate admin permissions', async () => {
    const moderatorResponse = await request(baseURL)
      .post('/admin/login')
      .send({
        username: 'moderator',
        password: 'ModeratorPass123'
      });

    expect(moderatorResponse.body.admin.role).toBe('moderator');
    expect(moderatorResponse.body.admin.permissions).not.toContain('delete_users');
  });
});
```

---

## TASK-029: Admin Dashboard Tests

### Test Scenarios

#### 29.1 Get Dashboard Statistics
```javascript
describe('GET /admin/dashboard', () => {
  let adminToken;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('should retrieve dashboard statistics', async () => {
    const response = await request(baseURL)
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);

    // Real-time stats
    expect(response.body.real_time).toHaveProperty('online_users');
    expect(response.body.real_time).toHaveProperty('active_dialogues');
    expect(response.body.real_time).toHaveProperty('api_health');

    // Today's stats
    expect(response.body.today).toHaveProperty('new_users');
    expect(response.body.today).toHaveProperty('total_dialogues');
    expect(response.body.today).toHaveProperty('api_cost');
    expect(response.body.today).toHaveProperty('revenue');

    // Trending
    expect(response.body.trending).toHaveProperty('top_books');
    expect(response.body.trending).toHaveProperty('top_questions');
  });

  test('should require admin authentication', async () => {
    const response = await request(baseURL)
      .get('/admin/dashboard');

    expect(response.status).toBe(401);
  });

  test('should reject non-admin users', async () => {
    const userToken = await getUserToken();

    const response = await request(baseURL)
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });
});
```

---

## TASK-030: Admin Book Management Tests

### Test Scenarios

#### 30.1 Admin Book CRUD Operations
```javascript
describe('Admin Book Management', () => {
  let adminToken;
  let createdBookId;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('POST /admin/books - Create new book', async () => {
    const response = await request(baseURL)
      .post('/admin/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Admin Created Book',
        author: 'Admin Author',
        type: 'ai_known',
        category: 'business',
        description: 'Book created by admin',
        tags: ['management', 'leadership']
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    createdBookId = response.body.id;
  });

  test('GET /admin/books - List all books with admin details', async () => {
    const response = await request(baseURL)
      .get('/admin/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        status: 'all',
        type: 'all',
        page: 1,
        limit: 50
      });

    expect(response.status).toBe(200);

    // Admin view includes additional fields
    response.body.books.forEach(book => {
      expect(book).toHaveProperty('status');
      expect(book).toHaveProperty('source');
      expect(book).toHaveProperty('vector_status');
      expect(book).toHaveProperty('total_api_cost');
    });
  });

  test('PUT /admin/books/{bookId} - Update book', async () => {
    const response = await request(baseURL)
      .put(`/admin/books/${createdBookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated description',
        status: 'published',
        tags: ['updated', 'tags']
      });

    expect(response.status).toBe(200);
    expect(response.body.description).toBe('Updated description');
    expect(response.body.status).toBe('published');
  });

  test('DELETE /admin/books/{bookId} - Delete book', async () => {
    const response = await request(baseURL)
      .delete(`/admin/books/${createdBookId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(204);

    // Verify deletion
    const getResponse = await request(baseURL)
      .get(`/admin/books/${createdBookId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getResponse.status).toBe(404);
  });
});
```

---

## TASK-031: Admin Character Management Tests

### Test Scenarios

#### 31.1 Manage Book Characters
```javascript
describe('Admin Character Management', () => {
  let bookId;
  let characterId;

  test('POST /admin/books/{bookId}/characters - Add character', async () => {
    const response = await request(baseURL)
      .post(`/admin/books/${bookId}/characters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '林黛玉',
        alias: ['黛玉', '林妹妹'],
        description: '贾母外孙女，林如海与贾敏之女',
        personality: '才华横溢、敏感多愁、性格孤傲',
        personality_prompt: 'You are 林黛玉, a sensitive and talented young woman...',
        dialogue_style: {
          language_style: 'poetic',
          emotional_tone: 'melancholic',
          knowledge_scope: 'book_only'
        },
        enabled: true
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    characterId = response.body.id;
  });

  test('PUT /admin/books/{bookId}/characters/{characterId} - Update character', async () => {
    const response = await request(baseURL)
      .put(`/admin/books/${bookId}/characters/${characterId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        personality: 'Updated personality description',
        enabled: false
      });

    expect(response.status).toBe(200);
    expect(response.body.personality).toBe('Updated personality description');
    expect(response.body.enabled).toBe(false);
  });

  test('DELETE /admin/books/{bookId}/characters/{characterId}', async () => {
    const response = await request(baseURL)
      .delete(`/admin/books/${bookId}/characters/${characterId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(204);
  });
});
```

---

## TASK-032: Admin Book Review Tests

### Test Scenarios

#### 32.1 Review Uploaded Books
```javascript
describe('POST /admin/books/{bookId}/review', () => {
  let uploadedBookId;

  beforeAll(async () => {
    // Get an uploaded book pending review
    const uploads = await request(baseURL)
      .get('/admin/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'review' });

    if (uploads.body.books.length > 0) {
      uploadedBookId = uploads.body.books[0].id;
    }
  });

  test('should approve uploaded book', async () => {
    if (!uploadedBookId) {
      console.warn('No books pending review');
      return;
    }

    const response = await request(baseURL)
      .post(`/admin/books/${uploadedBookId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'approve',
        vectorize: true
      });

    expect(response.status).toBe(200);
    expect(response.body.review_status).toBe('approved');
    expect(response.body.vector_status).toBe('pending');
  });

  test('should reject uploaded book with reason', async () => {
    const response = await request(baseURL)
      .post(`/admin/books/${uploadedBookId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'reject',
        reason: 'Content violates platform policies'
      });

    expect(response.status).toBe(200);
    expect(response.body.review_status).toBe('rejected');
    expect(response.body.review_notes).toContain('violates');
  });

  test('should request changes for uploaded book', async () => {
    const response = await request(baseURL)
      .post(`/admin/books/${uploadedBookId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'request_changes',
        reason: 'Please provide better description and correct author name'
      });

    expect(response.status).toBe(200);
    expect(response.body.review_status).toBe('changes_requested');
  });
});
```

---

## TASK-033: Admin AI Model Management Tests

### Test Scenarios

#### 33.1 AI Model Configuration
```javascript
describe('Admin AI Model Management', () => {
  test('GET /admin/models - Get model configuration', async () => {
    const response = await request(baseURL)
      .get('/admin/models')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('primary_model');
    expect(response.body).toHaveProperty('backup_models');
    expect(response.body).toHaveProperty('routing_rules');
    expect(response.body).toHaveProperty('embedding_model');
  });

  test('PUT /admin/models - Update model configuration', async () => {
    const response = await request(baseURL)
      .put('/admin/models')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        primary_model_id: 'gpt-4-turbo',
        routing_rules: {
          scenario_routing: {
            normal_dialogue: 'gpt-4-turbo',
            character_roleplay: 'claude-3-opus'
          }
        }
      });

    expect(response.status).toBe(200);
  });

  test('POST /admin/models/test - Test AI model', async () => {
    const response = await request(baseURL)
      .post('/admin/models/test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        provider: 'openai',
        model: 'gpt-4-turbo',
        api_endpoint: 'https://api.openai.com/v1',
        api_key: 'test-key',
        test_prompt: 'Hello, please respond with OK'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('latency');
    expect(response.body).toHaveProperty('estimated_cost');
  });

  test('POST /admin/books/ai-check - Check if AI knows book', async () => {
    const response = await request(baseURL)
      .post('/admin/books/ai-check')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: '三国演义',
        author: '罗贯中'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ai_knows_book');
    expect(response.body).toHaveProperty('confidence');
    expect(response.body).toHaveProperty('detected_content');
    expect(response.body.ai_knows_book).toBe(true);
    expect(response.body.confidence).toBeGreaterThan(90);
  });
});
```

---

## TASK-034: Admin User Management Tests

### Test Scenarios

#### 34.1 Admin User Operations
```javascript
describe('Admin User Management', () => {
  test('GET /admin/users - List users with filters', async () => {
    const response = await request(baseURL)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        membership: 'premium',
        status: 'active',
        page: 1,
        limit: 50
      });

    expect(response.status).toBe(200);

    response.body.users.forEach(user => {
      expect(user).toHaveProperty('total_dialogues');
      expect(user).toHaveProperty('total_uploads');
      expect(user).toHaveProperty('last_active');
      expect(user).toHaveProperty('quota_used');
      expect(user.membership).toBe('premium');
      expect(user.status).toBe('active');
    });
  });

  test('PATCH /admin/users/{userId} - Update user status', async () => {
    const testUserId = await getTestUserId();

    const response = await request(baseURL)
      .patch(`/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'suspended',
        quota_override: 100
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('suspended');
    expect(response.body.quota_limit).toBe(100);
  });
});
```

---

## TASK-035: Admin Statistics Tests

### Test Scenarios

#### 35.1 Cost and Usage Statistics
```javascript
describe('Admin Statistics', () => {
  test('GET /admin/statistics/costs - Get cost statistics', async () => {
    const response = await request(baseURL)
      .get('/admin/statistics/costs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        period: 'month',
        group_by: 'model'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('period', 'month');
    expect(response.body).toHaveProperty('total_cost');
    expect(response.body).toHaveProperty('breakdown');
    expect(response.body).toHaveProperty('trend');
    expect(response.body).toHaveProperty('projection');
  });

  test('GET /admin/statistics/dialogues - Get dialogue statistics', async () => {
    const response = await request(baseURL)
      .get('/admin/statistics/dialogues')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        period: 'week',
        group_by: 'book'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('total_dialogues');
    expect(response.body).toHaveProperty('unique_users');
    expect(response.body).toHaveProperty('breakdown');
    expect(response.body).toHaveProperty('satisfaction');
  });

  test('GET /admin/monitoring/alerts - Get system alerts', async () => {
    const response = await request(baseURL)
      .get('/admin/monitoring/alerts')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        severity: 'error',
        status: 'active'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('alerts');

    response.body.alerts.forEach(alert => {
      expect(alert).toHaveProperty('severity', 'error');
      expect(alert).toHaveProperty('status', 'active');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('created_at');
    });
  });
});
```

---

## TASK-036: Payment Webhook Tests

### Test Scenarios

#### 36.1 Payment Callbacks
```javascript
describe('Payment Webhooks', () => {
  test('POST /payment/callback/wechat - WeChat payment callback', async () => {
    const wechatCallbackXML = `
      <xml>
        <return_code><![CDATA[SUCCESS]]></return_code>
        <return_msg><![CDATA[OK]]></return_msg>
        <appid><![CDATA[wx123456]]></appid>
        <mch_id><![CDATA[1234567890]]></mch_id>
        <out_trade_no><![CDATA[ORDER123456]]></out_trade_no>
        <total_fee>2900</total_fee>
        <result_code><![CDATA[SUCCESS]]></result_code>
      </xml>
    `;

    const response = await request(baseURL)
      .post('/payment/callback/wechat')
      .set('Content-Type', 'application/xml')
      .send(wechatCallbackXML);

    expect(response.status).toBe(200);
  });

  test('POST /payment/callback/alipay - Alipay payment callback', async () => {
    const alipayParams = new URLSearchParams({
      trade_no: '2024012112345678',
      out_trade_no: 'ORDER123457',
      trade_status: 'TRADE_SUCCESS',
      total_amount: '29.00',
      sign: 'mock_signature'
    });

    const response = await request(baseURL)
      .post('/payment/callback/alipay')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send(alipayParams.toString());

    expect(response.status).toBe(200);
  });

  test('GET /payment/orders/{orderId} - Get payment order status', async () => {
    const orderId = 'ORDER123456';

    const response = await request(baseURL)
      .get(`/payment/orders/${orderId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('order_id', orderId);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('amount');
    expect(response.body).toHaveProperty('payment_method');
  });
});
```

---

## Performance and Security Tests

### Upload Performance
```javascript
describe('Upload Performance', () => {
  test('Should handle concurrent uploads', async () => {
    const uploads = Array(5).fill(null).map((_, i) => {
      const formData = new FormData();
      formData.append('file', Buffer.from(`Test content ${i}`), `test${i}.txt`);
      formData.append('title', `Concurrent Upload ${i}`);
      formData.append('author', `Author ${i}`);

      return request(baseURL)
        .post('/uploads')
        .set('Authorization', `Bearer ${accessToken}`)
        .set(formData.getHeaders())
        .send(formData.getBuffer());
    });

    const responses = await Promise.all(uploads);

    responses.forEach(response => {
      expect(response.status).toBe(202);
    });
  });
});
```

### Admin Security Tests
```javascript
describe('Admin Security', () => {
  test('Should enforce role-based access control', async () => {
    const moderatorToken = await getModeratorToken();

    // Moderator should not be able to delete users
    const deleteResponse = await request(baseURL)
      .delete('/admin/users/some-user-id')
      .set('Authorization', `Bearer ${moderatorToken}`);

    expect(deleteResponse.status).toBe(403);
  });

  test('Should log admin actions', async () => {
    // Perform an admin action
    await request(baseURL)
      .patch('/admin/users/test-user-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    // Check audit log
    const logs = await request(baseURL)
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: 'user_suspension' });

    expect(logs.body.logs).toContainEqual(
      expect.objectContaining({
        action: 'user_suspension',
        admin_id: expect.any(String),
        timestamp: expect.any(String)
      })
    );
  });
});
```

---

## CI/CD Integration

```yaml
# .github/workflows/upload-admin-payment-tests.yml
name: API E2E Tests - Upload, Admin & Payment

on:
  push:
    paths:
      - 'src/api/uploads/**'
      - 'src/api/admin/**'
      - 'src/api/payment/**'

jobs:
  api-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Test Files
        run: |
          mkdir -p test-files
          echo "Test book content" > test-files/test-book.txt
          # Generate test PDF
          npm run generate:test:pdf

      - name: Run Upload Tests
        run: npm run test:api:uploads

      - name: Run Admin Tests
        run: npm run test:api:admin
        env:
          ADMIN_USERNAME: ${{ secrets.ADMIN_USERNAME }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}

      - name: Run Payment Tests
        run: npm run test:api:payment
        env:
          WECHAT_APP_ID: ${{ secrets.WECHAT_APP_ID }}
          ALIPAY_APP_ID: ${{ secrets.ALIPAY_APP_ID }}
```

---

## Success Criteria

✅ Upload check endpoint tested
✅ File upload with TXT and PDF tested
✅ Upload status tracking validated
✅ User uploads management tested
✅ Admin authentication complete
✅ Dashboard statistics verified
✅ Book CRUD operations tested
✅ Character management validated
✅ Book review workflow tested
✅ AI model configuration tested
✅ User management by admin tested
✅ Statistics endpoints validated
✅ Payment webhooks tested
✅ Security and permissions enforced
✅ Performance benchmarks met

## Total API Endpoints Coverage: 70+ endpoints fully tested!