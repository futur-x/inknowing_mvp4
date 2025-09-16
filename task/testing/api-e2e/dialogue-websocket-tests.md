# API E2E Testing Tasks - Dialogue & WebSocket Endpoints

## Test Suite: Dialogue and Real-time Communication
**Framework**: Jest + Supertest + Socket.io-client
**Base URL**: `https://api.inknowing.ai/v1`

---

## TASK-017: Book Dialogue Initiation Tests

### Test Scenarios

#### 17.1 Start Book Dialogue - Success Path
```javascript
describe('POST /dialogues/book/start', () => {
  let accessToken;
  let testBookId;

  beforeAll(async () => {
    accessToken = await getAuthToken();
    testBookId = await getTestBookId();
  });

  test('should start book dialogue successfully', async () => {
    const response = await request(baseURL)
      .post('/dialogues/book/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        book_id: testBookId,
        initial_question: '这本书的核心观点是什么？'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('book_id', testBookId);
    expect(response.body).toHaveProperty('type', 'book');
    expect(response.body).toHaveProperty('status', 'active');
    expect(response.body).toHaveProperty('message_count');
    expect(response.body).toHaveProperty('created_at');
  });

  test('should start dialogue without initial question', async () => {
    const response = await request(baseURL)
      .post('/dialogues/book/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        book_id: testBookId
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('active');
  });
});
```

#### 17.2 Quota Validation
```javascript
describe('Dialogue Quota Management', () => {
  test('should reject dialogue when quota exhausted', async () => {
    // Use a test user with exhausted quota
    const exhaustedUserToken = await getExhaustedQuotaUserToken();

    const response = await request(baseURL)
      .post('/dialogues/book/start')
      .set('Authorization', `Bearer ${exhaustedUserToken}`)
      .send({
        book_id: testBookId
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Quota exceeded');
  });

  test('should deduct quota when starting dialogue', async () => {
    const beforeQuota = await getUserQuota(accessToken);

    await request(baseURL)
      .post('/dialogues/book/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        book_id: testBookId
      });

    const afterQuota = await getUserQuota(accessToken);

    expect(afterQuota.used).toBeGreaterThan(beforeQuota.used);
    expect(afterQuota.remaining).toBeLessThan(beforeQuota.remaining);
  });
});
```

#### 17.3 Authentication Requirements
```javascript
test('should require authentication', async () => {
  const response = await request(baseURL)
    .post('/dialogues/book/start')
    .send({
      book_id: testBookId
    });

  expect(response.status).toBe(401);
});
```

---

## TASK-018: Character Dialogue Tests

### Test Scenarios

#### 18.1 Start Character Dialogue
```javascript
describe('POST /dialogues/character/start', () => {
  let bookWithCharacters;
  let characterId;

  beforeAll(async () => {
    const bookData = await getBookWithCharacters();
    bookWithCharacters = bookData.bookId;
    characterId = bookData.characters[0].id;
  });

  test('should start character dialogue successfully', async () => {
    const response = await request(baseURL)
      .post('/dialogues/character/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        book_id: bookWithCharacters,
        character_id: characterId,
        initial_message: '你好，请介绍一下你自己'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('type', 'character');
    expect(response.body).toHaveProperty('character_id', characterId);
    expect(response.body).toHaveProperty('character_name');
  });

  test('should reject invalid character ID', async () => {
    const response = await request(baseURL)
      .post('/dialogues/character/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        book_id: bookWithCharacters,
        character_id: 'invalid-character-id'
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Character not found');
  });

  test('should reject disabled character', async () => {
    const disabledCharacterId = await getDisabledCharacterId();

    const response = await request(baseURL)
      .post('/dialogues/character/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        book_id: bookWithCharacters,
        character_id: disabledCharacterId
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Character not available');
  });
});
```

---

## TASK-019: Message Exchange Tests

### Test Scenarios

#### 19.1 Send Messages in Dialogue
```javascript
describe('POST /dialogues/{sessionId}/messages', () => {
  let sessionId;

  beforeEach(async () => {
    const session = await createTestDialogueSession();
    sessionId = session.id;
  });

  test('should send and receive messages', async () => {
    const response = await request(baseURL)
      .post(`/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: '请解释一下书中关于领导力的观点'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('session_id', sessionId);
    expect(response.body).toHaveProperty('role', 'assistant');
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('references');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('tokens_used');
    expect(response.body).toHaveProperty('model_used');
  });

  test('should include references in response', async () => {
    const response = await request(baseURL)
      .post(`/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: '书中第一章讲了什么？'
      });

    expect(response.body.references).toBeDefined();
    expect(Array.isArray(response.body.references)).toBe(true);

    if (response.body.references.length > 0) {
      const reference = response.body.references[0];
      expect(reference).toHaveProperty('type');
      expect(['chapter', 'page', 'paragraph']).toContain(reference.type);
      expect(reference).toHaveProperty('text');
    }
  });

  test('should enforce message length limits', async () => {
    const longMessage = 'a'.repeat(2001); // Over 2000 character limit

    const response = await request(baseURL)
      .post(`/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: longMessage
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Message too long');
  });

  test('should handle empty messages', async () => {
    const response = await request(baseURL)
      .post(`/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Message cannot be empty');
  });
});
```

#### 19.2 Message History Retrieval
```javascript
describe('GET /dialogues/{sessionId}/messages', () => {
  let sessionWithMessages;

  beforeAll(async () => {
    sessionWithMessages = await createSessionWithMultipleMessages();
  });

  test('should retrieve message history', async () => {
    const response = await request(baseURL)
      .get(`/dialogues/${sessionWithMessages}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        page: 1,
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('messages');
    expect(response.body).toHaveProperty('pagination');
    expect(Array.isArray(response.body.messages)).toBe(true);

    // Messages should be in chronological order
    for (let i = 1; i < response.body.messages.length; i++) {
      const prevTime = new Date(response.body.messages[i-1].timestamp);
      const currTime = new Date(response.body.messages[i].timestamp);
      expect(currTime.getTime()).toBeGreaterThanOrEqual(prevTime.getTime());
    }
  });

  test('should paginate message history', async () => {
    const page1 = await request(baseURL)
      .get(`/dialogues/${sessionWithMessages}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ page: 1, limit: 5 });

    const page2 = await request(baseURL)
      .get(`/dialogues/${sessionWithMessages}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ page: 2, limit: 5 });

    expect(page1.body.messages.length).toBeLessThanOrEqual(5);
    expect(page1.body.pagination.page).toBe(1);

    // Messages should not overlap
    const page1Ids = page1.body.messages.map(m => m.id);
    const page2Ids = page2.body.messages.map(m => m.id);
    const overlap = page1Ids.filter(id => page2Ids.includes(id));
    expect(overlap.length).toBe(0);
  });
});
```

---

## TASK-020: Dialogue Context Tests

### Test Scenarios

#### 20.1 Get Dialogue Context
```javascript
describe('GET /dialogues/{sessionId}/context', () => {
  test('should retrieve dialogue context', async () => {
    const sessionId = await createActiveSession();

    const response = await request(baseURL)
      .get(`/dialogues/${sessionId}/context`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('session_id', sessionId);
    expect(response.body).toHaveProperty('book_context');

    const bookContext = response.body.book_context;
    expect(bookContext).toHaveProperty('discussed_topics');
    expect(bookContext).toHaveProperty('key_references');
    expect(Array.isArray(bookContext.discussed_topics)).toBe(true);
  });

  test('should include character context for character dialogues', async () => {
    const characterSessionId = await createCharacterSession();

    const response = await request(baseURL)
      .get(`/dialogues/${characterSessionId}/context`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.body).toHaveProperty('character_context');

    const charContext = response.body.character_context;
    expect(charContext).toHaveProperty('character_state');
    expect(charContext).toHaveProperty('emotional_tone');
    expect(charContext).toHaveProperty('remembered_facts');
  });
});
```

---

## TASK-021: User Dialogue History Tests

### Test Scenarios

#### 21.1 Get User's Dialogue History
```javascript
describe('GET /dialogues/history', () => {
  test('should retrieve all user dialogues', async () => {
    const response = await request(baseURL)
      .get('/dialogues/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        page: 1,
        limit: 20
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('sessions');
    expect(response.body).toHaveProperty('pagination');

    // Each session should belong to the current user
    response.body.sessions.forEach(session => {
      expect(session).toHaveProperty('user_id');
      expect(session).toHaveProperty('book_id');
      expect(session).toHaveProperty('type');
      expect(session).toHaveProperty('message_count');
      expect(session).toHaveProperty('last_message_at');
    });
  });

  test('should filter dialogues by book', async () => {
    const response = await request(baseURL)
      .get('/dialogues/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        book_id: testBookId
      });

    response.body.sessions.forEach(session => {
      expect(session.book_id).toBe(testBookId);
    });
  });

  test('should filter dialogues by type', async () => {
    const bookDialogues = await request(baseURL)
      .get('/dialogues/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ type: 'book' });

    const characterDialogues = await request(baseURL)
      .get('/dialogues/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ type: 'character' });

    bookDialogues.body.sessions.forEach(session => {
      expect(session.type).toBe('book');
    });

    characterDialogues.body.sessions.forEach(session => {
      expect(session.type).toBe('character');
    });
  });
});
```

---

## TASK-022: WebSocket Real-time Dialogue Tests

### Test Scenarios

#### 22.1 WebSocket Connection
```javascript
import io from 'socket.io-client';

describe('WebSocket /ws/dialogue/{sessionId}', () => {
  let socket;
  let sessionId;

  beforeEach(async () => {
    sessionId = await createTestDialogueSession();
  });

  afterEach(() => {
    if (socket) socket.disconnect();
  });

  test('should establish WebSocket connection', (done) => {
    socket = io(`${baseURL}/ws/dialogue/${sessionId}`, {
      query: { token: accessToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });

    socket.on('connect_error', (error) => {
      done(error);
    });
  });

  test('should reject connection without token', (done) => {
    socket = io(`${baseURL}/ws/dialogue/${sessionId}`, {
      transports: ['websocket']
    });

    socket.on('connect_error', (error) => {
      expect(error.message).toContain('Unauthorized');
      done();
    });
  });
});
```

#### 22.2 Real-time Message Exchange
```javascript
describe('WebSocket Message Exchange', () => {
  test('should send and receive messages via WebSocket', (done) => {
    socket = io(`${baseURL}/ws/dialogue/${sessionId}`, {
      query: { token: accessToken }
    });

    socket.on('connect', () => {
      // Send message
      socket.emit('message', {
        type: 'message',
        content: '这本书的主题是什么？'
      });
    });

    // Listen for response
    socket.on('response', (data) => {
      expect(data).toHaveProperty('type', 'response');
      expect(data).toHaveProperty('content');
      expect(data).toHaveProperty('references');
      expect(data).toHaveProperty('timestamp');
      done();
    });

    socket.on('error', (error) => {
      done(error);
    });
  });

  test('should receive typing indicators', (done) => {
    socket = io(`${baseURL}/ws/dialogue/${sessionId}`, {
      query: { token: accessToken }
    });

    let typingReceived = false;

    socket.on('connect', () => {
      socket.emit('message', {
        type: 'message',
        content: '请详细解释一下'
      });
    });

    socket.on('typing', (data) => {
      expect(data).toHaveProperty('type', 'typing');
      expect(data).toHaveProperty('isTyping');
      typingReceived = true;
    });

    socket.on('response', () => {
      expect(typingReceived).toBe(true);
      done();
    });
  });
});
```

#### 22.3 WebSocket Error Handling
```javascript
describe('WebSocket Error Scenarios', () => {
  test('should handle malformed messages', (done) => {
    socket = io(`${baseURL}/ws/dialogue/${sessionId}`, {
      query: { token: accessToken }
    });

    socket.on('connect', () => {
      // Send invalid message format
      socket.emit('message', {
        invalidField: 'test'
      });
    });

    socket.on('error', (data) => {
      expect(data).toHaveProperty('type', 'error');
      expect(data).toHaveProperty('message');
      done();
    });
  });

  test('should handle session timeout', (done) => {
    socket = io(`${baseURL}/ws/dialogue/${sessionId}`, {
      query: { token: accessToken }
    });

    socket.on('connect', () => {
      // Simulate idle timeout (wait for 5 minutes)
      setTimeout(() => {
        socket.emit('message', {
          type: 'message',
          content: 'Message after timeout'
        });
      }, 5 * 60 * 1000);
    });

    socket.on('disconnect', (reason) => {
      expect(reason).toContain('timeout');
      done();
    });
  }, 310000); // 5+ minute timeout
});
```

---

## TASK-023: Concurrent Dialogue Tests

### Test Scenarios

#### 23.1 Multiple Simultaneous Dialogues
```javascript
describe('Concurrent Dialogue Management', () => {
  test('should handle multiple active dialogues per user', async () => {
    // Create multiple dialogue sessions
    const sessions = await Promise.all([
      createDialogueSession(bookId1),
      createDialogueSession(bookId2),
      createDialogueSession(bookId3)
    ]);

    // Send messages to all sessions concurrently
    const messagePromises = sessions.map(session =>
      request(baseURL)
        .post(`/dialogues/${session.id}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Test concurrent message' })
    );

    const responses = await Promise.all(messagePromises);

    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  test('should isolate context between sessions', async () => {
    const session1 = await createDialogueSession(bookId1);
    const session2 = await createDialogueSession(bookId2);

    // Send specific message to session1
    await request(baseURL)
      .post(`/dialogues/${session1.id}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: '记住数字：42' });

    // Ask about the number in session2
    const response = await request(baseURL)
      .post(`/dialogues/${session2.id}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ message: '我刚才说的数字是什么？' });

    // Session2 should not know about session1's context
    expect(response.body.content).not.toContain('42');
  });
});
```

---

## Performance and Load Testing

### Dialogue Performance Benchmarks
```javascript
describe('Dialogue Performance Tests', () => {
  test('Message response time should be under 3 seconds', async () => {
    const sessionId = await createTestDialogueSession();

    const startTime = Date.now();

    const response = await request(baseURL)
      .post(`/dialogues/${sessionId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: '请简单介绍一下这本书'
      });

    const responseTime = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(3000);
  });

  test('Should handle 10 concurrent messages', async () => {
    const sessionId = await createTestDialogueSession();

    const messages = Array(10).fill(null).map((_, i) =>
      request(baseURL)
        .post(`/dialogues/${sessionId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: `并发消息 ${i}` })
    );

    const startTime = Date.now();
    const responses = await Promise.all(messages);
    const totalTime = Date.now() - startTime;

    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Should complete within reasonable time
    expect(totalTime).toBeLessThan(10000);
  });
});
```

---

## Test Utilities and Helpers

### WebSocket Test Helpers
```javascript
// websocket-helpers.js
export class WebSocketTestClient {
  constructor(sessionId, token) {
    this.sessionId = sessionId;
    this.token = token;
    this.socket = null;
    this.messages = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(`${baseURL}/ws/dialogue/${this.sessionId}`, {
        query: { token: this.token },
        transports: ['websocket']
      });

      this.socket.on('connect', resolve);
      this.socket.on('connect_error', reject);

      this.socket.on('response', (data) => {
        this.messages.push(data);
      });
    });
  }

  sendMessage(content) {
    return new Promise((resolve) => {
      this.socket.emit('message', {
        type: 'message',
        content
      });

      this.socket.once('response', resolve);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage
const wsClient = new WebSocketTestClient(sessionId, token);
await wsClient.connect();
const response = await wsClient.sendMessage('Test message');
wsClient.disconnect();
```

---

## CI/CD Integration

```yaml
# .github/workflows/dialogue-tests.yml
name: API E2E Tests - Dialogue & WebSocket

on:
  push:
    paths:
      - 'src/api/dialogues/**'
      - 'src/websocket/**'
  pull_request:
    paths:
      - 'src/api/dialogues/**'

jobs:
  dialogue-tests:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v2

      - name: Setup Test Environment
        run: |
          npm ci
          npm run db:test:setup

      - name: Run Dialogue API Tests
        run: npm run test:api:dialogues
        env:
          AI_MODEL_ENDPOINT: ${{ secrets.AI_MODEL_ENDPOINT }}
          AI_MODEL_KEY: ${{ secrets.AI_MODEL_KEY }}

      - name: Run WebSocket Tests
        run: npm run test:websocket

      - name: Load Testing
        run: npm run test:dialogue:load
```

---

## Success Criteria

✅ All dialogue initiation endpoints tested (2 endpoints)
✅ Message exchange fully validated
✅ Dialogue history retrieval tested
✅ Context management verified
✅ WebSocket connection established and tested
✅ Real-time messaging validated
✅ Typing indicators working
✅ Error handling comprehensive
✅ Concurrent dialogues supported
✅ Performance benchmarks met
✅ Session isolation verified
✅ Quota management accurate