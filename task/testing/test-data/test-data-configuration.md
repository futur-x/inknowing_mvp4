# Test Data and Mock Configuration - InKnowing Platform

## Test Data Management Strategy
**Framework**: Faker.js, Factory Bot Pattern, Docker Fixtures
**Scope**: Complete test data lifecycle management

---

## TASK-086: User Test Data Factory

### Implementation
```javascript
// test-data/user-factory.js
import { faker } from '@faker-js/faker/locale/zh_CN';
import bcrypt from 'bcrypt';

class UserFactory {
  constructor() {
    this.userCounter = 0;
  }

  /**
   * Generate a single test user
   */
  async createUser(overrides = {}) {
    this.userCounter++;

    const baseUser = {
      id: faker.string.uuid(),
      username: `testuser_${this.userCounter}`,
      phone: this.generateChinesePhone(),
      password: await bcrypt.hash('Test123456', 10),
      nickname: faker.person.firstName('female') + faker.person.lastName(),
      avatar: faker.image.avatar(),
      membership: faker.helpers.arrayElement(['free', 'basic', 'premium', 'super']),
      points: faker.number.int({ min: 0, max: 1000 }),
      quota_total: this.getQuotaByMembership(overrides.membership || 'free'),
      quota_used: faker.number.int({ min: 0, max: 20 }),
      wechat_openid: overrides.wechat_openid || null,
      created_at: faker.date.past(),
      updated_at: faker.date.recent(),
      last_active: faker.date.recent(),
      status: 'active',
      ...overrides
    };

    return baseUser;
  }

  /**
   * Generate multiple test users with different profiles
   */
  async createUserSet() {
    return {
      freeUser: await this.createUser({
        membership: 'free',
        quota_total: 20,
        quota_used: 0
      }),

      exhaustedFreeUser: await this.createUser({
        membership: 'free',
        quota_total: 20,
        quota_used: 20
      }),

      basicMember: await this.createUser({
        membership: 'basic',
        quota_total: 200,
        quota_used: 50,
        membership_expires_at: faker.date.future()
      }),

      premiumMember: await this.createUser({
        membership: 'premium',
        quota_total: 500,
        quota_used: 100,
        membership_expires_at: faker.date.future()
      }),

      superMember: await this.createUser({
        membership: 'super',
        quota_total: 1000,
        quota_used: 200,
        membership_expires_at: faker.date.future()
      }),

      expiredMember: await this.createUser({
        membership: 'free',
        quota_total: 20,
        membership_expires_at: faker.date.past()
      }),

      suspendedUser: await this.createUser({
        status: 'suspended',
        suspended_reason: 'Violation of terms'
      }),

      adminUser: await this.createUser({
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'manage_users']
      }),

      wechatUser: await this.createUser({
        wechat_openid: `wx_${faker.string.alphanumeric(28)}`,
        phone: null
      })
    };
  }

  /**
   * Generate bulk users for load testing
   */
  async createBulkUsers(count = 1000) {
    const users = [];

    for (let i = 0; i < count; i++) {
      const membershipDistribution = {
        free: 0.7,    // 70% free users
        basic: 0.15,  // 15% basic
        premium: 0.10, // 10% premium
        super: 0.05   // 5% super
      };

      const membership = this.weightedRandom(membershipDistribution);

      users.push(await this.createUser({
        membership,
        username: `loadtest_${i}`,
        phone: `1${String(3800000000 + i).padStart(10, '0')}`
      }));
    }

    return users;
  }

  generateChinesePhone() {
    const prefixes = ['138', '139', '137', '136', '135', '134', '133', '132', '131', '130',
                      '189', '188', '187', '186', '185', '184', '183', '182', '181', '180',
                      '178', '177', '176', '175', '173', '170', '199', '198', '166'];

    const prefix = faker.helpers.arrayElement(prefixes);
    const suffix = faker.string.numeric(8);

    return prefix + suffix;
  }

  getQuotaByMembership(membership) {
    const quotaMap = {
      free: 20,
      basic: 200,
      premium: 500,
      super: 1000
    };
    return quotaMap[membership] || 20;
  }

  weightedRandom(weights) {
    const random = Math.random();
    let sum = 0;

    for (const [key, weight] of Object.entries(weights)) {
      sum += weight;
      if (random < sum) {
        return key;
      }
    }
  }
}

export default UserFactory;
```

---

## TASK-087: Book Test Data Factory

### Implementation
```javascript
// test-data/book-factory.js
class BookFactory {
  constructor() {
    this.bookCounter = 0;
  }

  createBook(overrides = {}) {
    this.bookCounter++;

    const categories = ['business', 'psychology', 'fiction', 'science', 'history', 'philosophy'];
    const bookTemplates = this.getBookTemplates();
    const template = faker.helpers.arrayElement(bookTemplates);

    return {
      id: faker.string.uuid(),
      title: template.title || `测试书籍 ${this.bookCounter}`,
      author: template.author || faker.person.fullName(),
      cover: faker.image.url(),
      category: faker.helpers.arrayElement(categories),
      description: template.description || faker.lorem.paragraph(5),
      type: faker.helpers.arrayElement(['ai_known', 'vectorized']),
      chapters: faker.number.int({ min: 5, max: 30 }),
      estimated_reading_time: faker.number.int({ min: 30, max: 600 }),
      dialogue_count: faker.number.int({ min: 0, max: 10000 }),
      rating: faker.number.float({ min: 3.0, max: 5.0, precision: 0.1 }),
      tags: this.generateTags(template.category),
      created_at: faker.date.past(),
      status: 'published',
      vector_count: faker.number.int({ min: 100, max: 5000 }),
      ...overrides
    };
  }

  createBookWithCharacters(overrides = {}) {
    const book = this.createBook(overrides);
    const characterCount = faker.number.int({ min: 3, max: 10 });
    const characters = [];

    for (let i = 0; i < characterCount; i++) {
      characters.push(this.createCharacter(book.id));
    }

    return {
      ...book,
      characters
    };
  }

  createCharacter(bookId) {
    const characterTemplates = this.getCharacterTemplates();
    const template = faker.helpers.arrayElement(characterTemplates);

    return {
      id: faker.string.uuid(),
      book_id: bookId,
      name: template.name || faker.person.fullName(),
      alias: template.alias || [],
      description: template.description || faker.lorem.paragraph(3),
      personality: template.personality || faker.lorem.paragraph(2),
      personality_prompt: this.generatePersonalityPrompt(template),
      dialogue_style: {
        language_style: faker.helpers.arrayElement(['elegant', 'poetic', 'modern', 'casual']),
        emotional_tone: faker.helpers.arrayElement(['melancholic', 'cheerful', 'serious', 'rebellious']),
        knowledge_scope: faker.helpers.arrayElement(['book_only', 'extended'])
      },
      dialogue_count: faker.number.int({ min: 0, max: 1000 }),
      enabled: true,
      created_at: faker.date.past()
    };
  }

  getBookTemplates() {
    return [
      {
        title: '原则',
        author: '瑞·达利欧',
        category: 'business',
        description: '生活和工作的原则，帮助你做出更好的决策',
        tags: ['管理', '决策', '投资', '成功学']
      },
      {
        title: '红楼梦',
        author: '曹雪芹',
        category: 'fiction',
        description: '中国古典文学巅峰之作，描绘了贾府的兴衰',
        tags: ['古典文学', '爱情', '家族', '社会']
      },
      {
        title: '思考，快与慢',
        author: '丹尼尔·卡尼曼',
        category: 'psychology',
        description: '探讨人类思维的两个系统',
        tags: ['心理学', '认知', '决策', '行为经济学']
      }
    ];
  }

  getCharacterTemplates() {
    return [
      {
        name: '林黛玉',
        alias: ['黛玉', '林妹妹', '潇湘妃子'],
        personality: '敏感、才华横溢、多愁善感',
        description: '贾母外孙女，才貌双全，性格孤傲'
      },
      {
        name: '贾宝玉',
        alias: ['宝玉', '宝二爷', '怡红公子'],
        personality: '温柔、叛逆、重情',
        description: '贾府公子，不喜功名，钟情女儿'
      }
    ];
  }

  generateTags(category) {
    const tagsByCategory = {
      business: ['管理', '创业', '营销', '领导力', '战略', '投资'],
      psychology: ['心理学', '认知', '情绪', '人际关系', '成长', '治疗'],
      fiction: ['小说', '文学', '故事', '人物', '情节', '想象'],
      science: ['科学', '技术', '研究', '创新', '发现', '理论'],
      history: ['历史', '文明', '战争', '人物', '事件', '文化'],
      philosophy: ['哲学', '思想', '伦理', '存在', '知识', '真理']
    };

    const tags = tagsByCategory[category] || [];
    return faker.helpers.arrayElements(tags, faker.number.int({ min: 3, max: 5 }));
  }

  generatePersonalityPrompt(character) {
    return `You are ${character.name}, a character from a Chinese classic novel.
            Your personality: ${character.personality}.
            Respond in character, maintaining the tone and knowledge from the book.`;
  }

  /**
   * Create test book content for vectorization
   */
  generateBookContent(chapters = 10) {
    const content = [];

    for (let i = 1; i <= chapters; i++) {
      content.push({
        chapter: i,
        title: `第${i}章 ${faker.lorem.sentence()}`,
        content: faker.lorem.paragraphs(50, '\n\n'),
        wordCount: faker.number.int({ min: 3000, max: 8000 })
      });
    }

    return content;
  }
}
```

---

## TASK-088: Dialogue Test Data Factory

### Implementation
```javascript
// test-data/dialogue-factory.js
class DialogueFactory {
  createDialogueSession(overrides = {}) {
    return {
      id: faker.string.uuid(),
      user_id: overrides.user_id || faker.string.uuid(),
      book_id: overrides.book_id || faker.string.uuid(),
      type: faker.helpers.arrayElement(['book', 'character']),
      character_id: overrides.character_id || null,
      status: 'active',
      message_count: 0,
      created_at: faker.date.recent(),
      last_message_at: faker.date.recent(),
      ...overrides
    };
  }

  createDialogueMessage(sessionId, role = 'user') {
    const userMessages = [
      '这本书的主要观点是什么？',
      '能详细解释一下吗？',
      '有什么具体的例子吗？',
      '如何在实际中应用？',
      '作者的背景是什么？'
    ];

    const aiResponses = [
      '这本书主要探讨了...',
      '让我详细解释一下...',
      '举个例子来说...',
      '在实际应用中...',
      '作者的经历非常丰富...'
    ];

    return {
      id: faker.string.uuid(),
      session_id: sessionId,
      role: role,
      content: role === 'user'
        ? faker.helpers.arrayElement(userMessages)
        : faker.helpers.arrayElement(aiResponses),
      references: role === 'assistant' ? this.generateReferences() : [],
      tokens_used: faker.number.int({ min: 50, max: 500 }),
      model_used: role === 'assistant' ? 'gpt-4' : null,
      timestamp: faker.date.recent()
    };
  }

  createDialogueHistory(sessionId, messageCount = 10) {
    const messages = [];

    for (let i = 0; i < messageCount; i++) {
      // Alternate between user and assistant
      const role = i % 2 === 0 ? 'user' : 'assistant';
      messages.push(this.createDialogueMessage(sessionId, role));
    }

    return messages;
  }

  generateReferences() {
    const count = faker.number.int({ min: 0, max: 3 });
    const references = [];

    for (let i = 0; i < count; i++) {
      references.push({
        type: faker.helpers.arrayElement(['chapter', 'page', 'paragraph']),
        chapter: faker.number.int({ min: 1, max: 20 }),
        page: faker.number.int({ min: 1, max: 500 }),
        text: faker.lorem.paragraph(),
        highlight: faker.lorem.sentence()
      });
    }

    return references;
  }

  createWebSocketMessage(type = 'message') {
    const messageTypes = {
      message: {
        type: 'message',
        content: faker.lorem.sentence()
      },
      typing: {
        type: 'typing',
        isTyping: true
      },
      response: {
        type: 'response',
        content: faker.lorem.paragraph(),
        references: this.generateReferences(),
        timestamp: new Date().toISOString()
      },
      error: {
        type: 'error',
        message: 'An error occurred'
      }
    };

    return messageTypes[type];
  }
}
```

---

## TASK-089: Mock Services Configuration

### Mock AI Service
```javascript
// mocks/ai-service-mock.js
class MockAIService {
  constructor(options = {}) {
    this.responseDelay = options.responseDelay || 100;
    this.errorRate = options.errorRate || 0;
    this.responses = options.responses || this.getDefaultResponses();
  }

  async generateResponse(prompt, context = {}) {
    // Simulate processing delay
    await this.delay(this.responseDelay);

    // Simulate random errors
    if (Math.random() < this.errorRate) {
      throw new Error('AI Service temporarily unavailable');
    }

    // Generate contextual response
    const response = this.selectResponse(prompt, context);

    return {
      content: response,
      model: 'gpt-4-mock',
      tokens: {
        prompt: this.countTokens(prompt),
        completion: this.countTokens(response),
        total: this.countTokens(prompt + response)
      },
      references: this.generateMockReferences(context.book_id)
    };
  }

  streamResponse(prompt, callbacks) {
    const response = this.selectResponse(prompt);
    const chunks = response.split(' ');

    let index = 0;
    const interval = setInterval(() => {
      if (index < chunks.length) {
        callbacks.onChunk(chunks[index] + ' ');
        index++;
      } else {
        clearInterval(interval);
        callbacks.onComplete();
      }
    }, 50); // Stream word by word
  }

  selectResponse(prompt, context = {}) {
    // Simple keyword matching for predictable testing
    if (prompt.includes('主要观点')) {
      return '这本书的主要观点是关于如何通过建立原则来指导决策...';
    }

    if (prompt.includes('例子')) {
      return '让我举一个具体的例子：在投资决策中...';
    }

    if (context.character_id) {
      return this.getCharacterResponse(context.character_id);
    }

    return faker.lorem.paragraph();
  }

  getCharacterResponse(characterId) {
    const responses = {
      'lin-daiyu': '哥哥，你又来看我了。今日天气甚好，不如一起读诗如何？',
      'jia-baoyu': '妹妹莫要伤心，一切都会好起来的。'
    };

    return responses[characterId] || '这是一个角色回复。';
  }

  getDefaultResponses() {
    return [
      '根据书中的观点...',
      '作者认为...',
      '这个问题很有意思...',
      '让我们深入探讨一下...'
    ];
  }

  generateMockReferences(bookId) {
    return [
      {
        type: 'chapter',
        chapter: 3,
        text: 'Mock reference text from chapter 3',
        relevance: 0.95
      }
    ];
  }

  countTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Mock Payment Gateway
```javascript
// mocks/payment-gateway-mock.js
class MockPaymentGateway {
  constructor(options = {}) {
    this.successRate = options.successRate || 0.95;
    this.webhookDelay = options.webhookDelay || 2000;
  }

  async createPayment(order) {
    await this.delay(500);

    if (Math.random() > this.successRate) {
      throw new Error('Payment gateway error');
    }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate QR code generation
    const qrCode = this.generateMockQRCode(paymentId);

    // Schedule webhook callback
    if (this.webhookDelay > 0) {
      setTimeout(() => {
        this.sendWebhook(order.id, 'success');
      }, this.webhookDelay);
    }

    return {
      payment_id: paymentId,
      order_id: order.id,
      amount: order.amount,
      currency: 'CNY',
      status: 'pending',
      payment_url: `https://payment.mock/${paymentId}`,
      qr_code: qrCode,
      expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
  }

  generateMockQRCode(paymentId) {
    // Return base64 encoded mock QR code
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  async sendWebhook(orderId, status) {
    const webhook = {
      order_id: orderId,
      status: status,
      paid_at: new Date().toISOString(),
      transaction_id: `trans_${Date.now()}`,
      signature: this.generateSignature(orderId)
    };

    // In real test, this would call the webhook endpoint
    console.log('Webhook sent:', webhook);
    return webhook;
  }

  generateSignature(data) {
    // Mock signature generation
    return Buffer.from(data).toString('base64');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## TASK-090: Database Seed Scripts

### Seed Data Script
```javascript
// scripts/seed-database.js
import { UserFactory, BookFactory, DialogueFactory } from '../test-data';

class DatabaseSeeder {
  constructor(db) {
    this.db = db;
    this.userFactory = new UserFactory();
    this.bookFactory = new BookFactory();
    this.dialogueFactory = new DialogueFactory();
  }

  async seed(options = {}) {
    console.log('🌱 Seeding database...');

    const config = {
      users: options.users || 100,
      books: options.books || 50,
      dialogues: options.dialogues || 200,
      clean: options.clean || false,
      ...options
    };

    if (config.clean) {
      await this.clean();
    }

    // Seed users
    const users = await this.seedUsers(config.users);
    console.log(`✅ Created ${users.length} users`);

    // Seed books
    const books = await this.seedBooks(config.books);
    console.log(`✅ Created ${books.length} books`);

    // Seed dialogues
    const dialogues = await this.seedDialogues(config.dialogues, users, books);
    console.log(`✅ Created ${dialogues.length} dialogue sessions`);

    // Seed uploads
    if (config.uploads) {
      const uploads = await this.seedUploads(config.uploads, users);
      console.log(`✅ Created ${uploads.length} uploads`);
    }

    // Seed admin data
    if (config.admin) {
      await this.seedAdminData();
      console.log(`✅ Created admin data`);
    }

    console.log('✅ Database seeding complete!');

    return {
      users,
      books,
      dialogues
    };
  }

  async seedUsers(count) {
    const users = [];

    // Create specific test users
    const testSet = await this.userFactory.createUserSet();
    for (const [key, user] of Object.entries(testSet)) {
      await this.db.users.insert(user);
      users.push(user);
    }

    // Create bulk users
    const bulkUsers = await this.userFactory.createBulkUsers(count - Object.keys(testSet).length);
    for (const user of bulkUsers) {
      await this.db.users.insert(user);
      users.push(user);
    }

    return users;
  }

  async seedBooks(count) {
    const books = [];

    for (let i = 0; i < count; i++) {
      const hasCharacters = i < 10; // First 10 books have characters
      const book = hasCharacters
        ? this.bookFactory.createBookWithCharacters()
        : this.bookFactory.createBook();

      await this.db.books.insert(book);

      if (book.characters) {
        for (const character of book.characters) {
          await this.db.characters.insert(character);
        }
      }

      books.push(book);
    }

    return books;
  }

  async seedDialogues(count, users, books) {
    const dialogues = [];

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);
      const book = faker.helpers.arrayElement(books);

      const session = this.dialogueFactory.createDialogueSession({
        user_id: user.id,
        book_id: book.id
      });

      await this.db.dialogue_sessions.insert(session);

      // Create message history
      const messages = this.dialogueFactory.createDialogueHistory(
        session.id,
        faker.number.int({ min: 2, max: 20 })
      );

      for (const message of messages) {
        await this.db.dialogue_messages.insert(message);
      }

      dialogues.push(session);
    }

    return dialogues;
  }

  async seedUploads(count, users) {
    const uploads = [];

    for (let i = 0; i < count; i++) {
      const user = faker.helpers.arrayElement(users);

      const upload = {
        id: faker.string.uuid(),
        user_id: user.id,
        filename: `upload_${i}.txt`,
        file_size: faker.number.int({ min: 10000, max: 5000000 }),
        file_type: faker.helpers.arrayElement(['txt', 'pdf']),
        title: `Uploaded Book ${i}`,
        author: faker.person.fullName(),
        status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
        created_at: faker.date.recent()
      };

      await this.db.uploads.insert(upload);
      uploads.push(upload);
    }

    return uploads;
  }

  async seedAdminData() {
    // Create admin users
    const admins = [
      {
        id: faker.string.uuid(),
        username: 'admin',
        password: await bcrypt.hash('AdminPassword123', 10),
        role: 'super_admin',
        permissions: ['all']
      },
      {
        id: faker.string.uuid(),
        username: 'moderator',
        password: await bcrypt.hash('ModeratorPassword123', 10),
        role: 'moderator',
        permissions: ['read', 'write', 'review']
      }
    ];

    for (const admin of admins) {
      await this.db.admins.insert(admin);
    }

    // Create system configuration
    await this.db.config.insert({
      key: 'ai_models',
      value: JSON.stringify({
        primary: 'gpt-4',
        backup: ['claude-3', 'qwen-max']
      })
    });
  }

  async clean() {
    console.log('🧹 Cleaning database...');

    const tables = [
      'dialogue_messages',
      'dialogue_sessions',
      'characters',
      'books',
      'uploads',
      'users',
      'admins'
    ];

    for (const table of tables) {
      await this.db.raw(`TRUNCATE TABLE ${table} CASCADE`);
    }

    console.log('✅ Database cleaned');
  }
}

// CLI execution
if (require.main === module) {
  const seeder = new DatabaseSeeder(db);

  const args = process.argv.slice(2);
  const options = {
    users: parseInt(args.find(a => a.startsWith('--users='))?.split('=')[1] || 100),
    books: parseInt(args.find(a => a.startsWith('--books='))?.split('=')[1] || 50),
    dialogues: parseInt(args.find(a => a.startsWith('--dialogues='))?.split('=')[1] || 200),
    clean: args.includes('--clean'),
    admin: args.includes('--admin')
  };

  seeder.seed(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

// Usage: node seed-database.js --users=1000 --books=100 --dialogues=500 --clean --admin
```

---

## Docker Test Data Setup

```yaml
# docker-compose.test-data.yml
version: '3.8'

services:
  postgres-test:
    image: postgres:14
    environment:
      POSTGRES_DB: inknowing_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    volumes:
      - ./test-data/sql:/docker-entrypoint-initdb.d
    ports:
      - "5433:5432"

  redis-test:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - ./test-data/redis:/data
    ports:
      - "6380:6379"

  minio-test:
    image: minio/minio
    command: server /data
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - ./test-data/minio:/data
    ports:
      - "9001:9000"

  seed-data:
    build: .
    command: npm run seed:test
    depends_on:
      - postgres-test
      - redis-test
    environment:
      DATABASE_URL: postgres://test:test@postgres-test:5432/inknowing_test
      REDIS_URL: redis://redis-test:6379
    volumes:
      - ./test-data:/app/test-data
```

---

## Test Data Management Commands

```json
// package.json scripts
{
  "scripts": {
    "test:seed": "node scripts/seed-database.js --clean --users=100 --books=50",
    "test:seed:large": "node scripts/seed-database.js --clean --users=10000 --books=1000",
    "test:seed:minimal": "node scripts/seed-database.js --clean --users=10 --books=5",
    "test:clean": "node scripts/seed-database.js --clean",
    "test:backup": "pg_dump $DATABASE_URL > test-data/backup/test-data.sql",
    "test:restore": "psql $DATABASE_URL < test-data/backup/test-data.sql",
    "test:fixtures": "docker-compose -f docker-compose.test-data.yml up -d",
    "test:fixtures:down": "docker-compose -f docker-compose.test-data.yml down -v"
  }
}
```

---

## Test Environment Configuration

```javascript
// config/test.env.js
module.exports = {
  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  API_VERSION: 'v1',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://test:test@localhost:5433/inknowing_test',
  DATABASE_POOL_SIZE: 10,

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6380',

  // Mock Services
  USE_MOCK_AI: true,
  USE_MOCK_PAYMENT: true,
  USE_MOCK_SMS: true,

  // Test User Credentials
  TEST_USERS: {
    FREE_USER: { phone: '13800000001', password: 'Test123456' },
    PREMIUM_USER: { phone: '13800000002', password: 'Test123456' },
    ADMIN_USER: { username: 'admin', password: 'AdminPassword123' }
  },

  // Test Data Paths
  TEST_FILES: {
    SAMPLE_BOOK_TXT: './test-data/files/sample-book.txt',
    SAMPLE_BOOK_PDF: './test-data/files/sample-book.pdf',
    LARGE_FILE: './test-data/files/large-file.txt'
  },

  // Feature Flags
  FEATURES: {
    WECHAT_LOGIN: false,
    VIRUS_SCAN: false,
    RATE_LIMITING: true
  },

  // Performance Thresholds
  PERFORMANCE: {
    API_TIMEOUT: 5000,
    DB_QUERY_TIMEOUT: 1000,
    CACHE_TTL: 300
  }
};
```

---

## Success Criteria

✅ Complete user test data factory with all membership types
✅ Book factory with characters and content generation
✅ Dialogue factory with realistic conversation flows
✅ Mock AI service with predictable responses
✅ Mock payment gateway with webhook simulation
✅ Database seeding scripts for all entities
✅ Docker-based test data environment
✅ Bulk data generation for load testing
✅ Test environment configuration management
✅ Data cleanup and restore capabilities
✅ Reproducible test data sets
✅ CLI tools for test data management