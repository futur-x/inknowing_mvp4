# Performance Testing Tasks - InKnowing Platform

## Test Suite: Performance and Optimization Tests
**Framework**: k6, Artillery, Lighthouse
**Metrics**: Response Time, Throughput, Resource Usage

---

## TASK-066: API Response Time Testing

### Implementation with k6
```javascript
// api-performance.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% under 500ms
    'errors': ['rate<0.05'], // Error rate under 5%
  },
};

export default function () {
  // Test 1: Search endpoint performance
  const searchResponse = http.get(`${__ENV.API_URL}/api/search?q=管理`);
  check(searchResponse, {
    'search status 200': (r) => r.status === 200,
    'search response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(searchResponse.status !== 200);

  sleep(1);

  // Test 2: Book details endpoint
  const bookResponse = http.get(`${__ENV.API_URL}/api/books/test-book-id`);
  check(bookResponse, {
    'book details status 200': (r) => r.status === 200,
    'book details response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // Test 3: Login endpoint
  const loginPayload = JSON.stringify({
    type: 'phone',
    phone: '13800138000',
    password: 'Test123456'
  });

  const loginResponse = http.post(
    `${__ENV.API_URL}/api/auth/login`,
    loginPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginResponse, {
    'login status 200': (r) => r.status === 200,
    'login response time < 300ms': (r) => r.timings.duration < 300,
  });

  const token = loginResponse.json('access_token');

  // Test 4: Protected endpoint with auth
  const profileResponse = http.get(`${__ENV.API_URL}/api/users/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  check(profileResponse, {
    'profile status 200': (r) => r.status === 200,
    'profile response time < 150ms': (r) => r.timings.duration < 150,
  });
}

// Run with: k6 run --env API_URL=https://api.inknowing.ai api-performance.js
```

---

## TASK-067: Database Query Performance

### Implementation
```javascript
// db-performance.test.js
describe('Database Performance Tests', () => {
  test('Search query performance', async () => {
    const queries = [
      'SELECT * FROM books WHERE category = ? LIMIT 20',
      'SELECT * FROM books WHERE title LIKE ? LIMIT 10',
      'SELECT b.*, COUNT(d.id) as dialogue_count FROM books b LEFT JOIN dialogues d ON b.id = d.book_id GROUP BY b.id ORDER BY dialogue_count DESC LIMIT 10'
    ];

    for (const query of queries) {
      const startTime = process.hrtime.bigint();
      await db.query(query, ['test']);
      const endTime = process.hrtime.bigint();

      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      expect(duration).toBeLessThan(50); // Should complete in 50ms
    }
  });

  test('Index effectiveness', async () => {
    const explainResult = await db.query(
      'EXPLAIN SELECT * FROM users WHERE phone = ?',
      ['13800138000']
    );

    // Should use index
    expect(explainResult[0].type).toBe('ref');
    expect(explainResult[0].key).toBe('idx_phone');
  });

  test('N+1 query detection', async () => {
    const queryLog = [];
    db.on('query', (q) => queryLog.push(q));

    // Fetch dialogues with messages
    await getDialoguesWithMessages();

    // Should use JOIN instead of N+1
    const selectQueries = queryLog.filter(q => q.startsWith('SELECT'));
    expect(selectQueries.length).toBeLessThan(5); // Not N+1
  });

  test('Connection pool performance', async () => {
    const concurrentQueries = Array(100).fill(null).map(() =>
      db.query('SELECT 1')
    );

    const startTime = Date.now();
    await Promise.all(concurrentQueries);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // 100 queries in under 1 second
  });
});
```

---

## TASK-068: Frontend Performance Testing

### Lighthouse Configuration
```javascript
// lighthouse-config.js
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  },
  categories: {
    performance: {
      weight: 1,
    },
  },
  audits: [
    { id: 'first-contentful-paint', weight: 3 },
    { id: 'largest-contentful-paint', weight: 5 },
    { id: 'cumulative-layout-shift', weight: 2 },
    { id: 'total-blocking-time', weight: 3 },
    { id: 'speed-index', weight: 2 },
  ],
};
```

### Web Vitals Testing
```javascript
// web-vitals.test.js
import { chromium } from 'playwright';

describe('Core Web Vitals', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  test('Landing page performance metrics', async () => {
    await page.goto('https://inknowing.ai');

    // Measure LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });

    expect(lcp).toBeLessThan(2500); // Good LCP < 2.5s

    // Measure FID (First Input Delay)
    const fid = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((entryList) => {
          const firstInput = entryList.getEntries()[0];
          resolve(firstInput.processingStart - firstInput.startTime);
        }).observe({ entryTypes: ['first-input'] });

        // Simulate user interaction
        document.body.click();
      });
    });

    expect(fid).toBeLessThan(100); // Good FID < 100ms

    // Measure CLS (Cumulative Layout Shift)
    const cls = await page.evaluate(() => {
      let clsValue = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });

      return new Promise((resolve) => {
        setTimeout(() => resolve(clsValue), 3000);
      });
    });

    expect(cls).toBeLessThan(0.1); // Good CLS < 0.1
  });

  test('Bundle size optimization', async () => {
    const coverage = await page.coverage.startJSCoverage();
    await page.goto('https://inknowing.ai');
    const jsCoverage = await page.coverage.stopJSCoverage();

    let totalBytes = 0;
    let usedBytes = 0;

    for (const entry of jsCoverage) {
      totalBytes += entry.text.length;
      for (const range of entry.ranges) {
        usedBytes += range.end - range.start;
      }
    }

    const unusedPercentage = ((totalBytes - usedBytes) / totalBytes) * 100;
    expect(unusedPercentage).toBeLessThan(40); // Less than 40% unused code
  });
});
```

---

## TASK-069: AI Response Performance

### Implementation
```javascript
// ai-performance.test.js
describe('AI Service Performance', () => {
  test('Dialogue response time with context', async () => {
    const contexts = [
      { size: 'small', tokens: 500 },
      { size: 'medium', tokens: 2000 },
      { size: 'large', tokens: 4000 }
    ];

    for (const context of contexts) {
      const startTime = Date.now();

      await aiService.generateResponse({
        message: 'Test question',
        context: 'x'.repeat(context.tokens * 4), // ~4 chars per token
      });

      const responseTime = Date.now() - startTime;

      // Define acceptable response times
      const maxTime = context.size === 'small' ? 2000 :
                      context.size === 'medium' ? 3000 : 5000;

      expect(responseTime).toBeLessThan(maxTime);
    }
  });

  test('Streaming response performance', (done) => {
    const chunks = [];
    let firstChunkTime;

    aiService.streamResponse('Generate a long response', {
      onChunk: (chunk) => {
        if (chunks.length === 0) {
          firstChunkTime = Date.now();
        }
        chunks.push(chunk);
      },
      onComplete: () => {
        // Time to first byte should be fast
        expect(firstChunkTime - Date.now()).toBeLessThan(500);

        // Should stream smoothly
        const avgChunkTime = (Date.now() - firstChunkTime) / chunks.length;
        expect(avgChunkTime).toBeLessThan(100);

        done();
      }
    });
  });
});
```

---

## TASK-070: Vector Search Performance

### Implementation
```javascript
// vector-search-performance.js
import { VectorDB } from './vectordb-client';

describe('Vector Database Performance', () => {
  let vectorDB;

  beforeAll(async () => {
    vectorDB = new VectorDB();
    await vectorDB.connect();

    // Seed test vectors
    await seedTestVectors(10000); // 10k vectors
  });

  test('Semantic search performance', async () => {
    const queries = [
      'How to improve management skills?',
      '如何提高团队效率？',
      'What are the principles of success?'
    ];

    for (const query of queries) {
      const startTime = Date.now();

      const results = await vectorDB.search({
        query,
        limit: 10,
        threshold: 0.7
      });

      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(200); // Under 200ms
      expect(results.length).toBeGreaterThan(0);
    }
  });

  test('Batch vector operations', async () => {
    const vectors = Array(100).fill(null).map(() => ({
      id: Math.random().toString(),
      vector: Array(768).fill(0).map(() => Math.random()),
      metadata: { test: true }
    }));

    const startTime = Date.now();
    await vectorDB.batchInsert(vectors);
    const insertTime = Date.now() - startTime;

    expect(insertTime).toBeLessThan(2000); // 100 vectors in 2 seconds
  });

  test('Concurrent search performance', async () => {
    const concurrentSearches = Array(50).fill(null).map(() =>
      vectorDB.search({ query: 'test query', limit: 5 })
    );

    const startTime = Date.now();
    const results = await Promise.all(concurrentSearches);
    const totalTime = Date.now() - startTime;

    expect(totalTime).toBeLessThan(3000); // 50 searches in 3 seconds

    results.forEach(result => {
      expect(result).toBeDefined();
    });
  });
});
```

---

## TASK-071: Memory and Resource Usage

### Implementation
```javascript
// resource-monitoring.js
import v8 from 'v8';
import { performance } from 'perf_hooks';

class ResourceMonitor {
  constructor() {
    this.baseline = process.memoryUsage();
  }

  checkMemoryLeak(fn, iterations = 1000) {
    const memoryBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      fn();

      if (i % 100 === 0) {
        global.gc(); // Force garbage collection
      }
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = memoryAfter - memoryBefore;

    // Should not leak more than 10MB
    return memoryIncrease < 10 * 1024 * 1024;
  }

  measureCPU(fn) {
    const startCPU = process.cpuUsage();
    const startTime = performance.now();

    fn();

    const endCPU = process.cpuUsage(startCPU);
    const endTime = performance.now();

    return {
      user: endCPU.user / 1000, // Convert to ms
      system: endCPU.system / 1000,
      total: (endTime - startTime)
    };
  }
}

describe('Resource Usage Tests', () => {
  const monitor = new ResourceMonitor();

  test('Dialogue session memory management', () => {
    const noLeak = monitor.checkMemoryLeak(() => {
      const session = createDialogueSession();
      session.addMessage('User message');
      session.addMessage('AI response');
      // Session should be garbage collected
    });

    expect(noLeak).toBe(true);
  });

  test('WebSocket connection memory', () => {
    const noLeak = monitor.checkMemoryLeak(() => {
      const ws = new WebSocket('ws://localhost:3000');
      ws.send('test message');
      ws.close();
    });

    expect(noLeak).toBe(true);
  });

  test('CPU usage for text processing', () => {
    const cpu = monitor.measureCPU(() => {
      preprocessLargeText('x'.repeat(100000));
    });

    expect(cpu.total).toBeLessThan(100); // Under 100ms
    expect(cpu.user).toBeLessThan(80);   // User CPU under 80ms
  });
});
```

---

## Artillery Load Testing Configuration

```yaml
# load-test-config.yml
config:
  target: "https://api.inknowing.ai"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 300
      arrivalRate: 20
      name: "Sustained load"
    - duration: 60
      arrivalRate: 50
      name: "Peak load"

  processor: "./performance-processors.js"

scenarios:
  - name: "User Journey"
    weight: 60
    flow:
      - post:
          url: "/api/auth/login"
          json:
            type: "phone"
            phone: "{{ $randomPhoneNumber() }}"
            password: "Test123456"
          capture:
            - json: "$.access_token"
              as: "token"

      - get:
          url: "/api/search"
          qs:
            q: "{{ $randomQuestion() }}"
          headers:
            Authorization: "Bearer {{ token }}"

      - post:
          url: "/api/dialogues/book/start"
          json:
            book_id: "test-book"
          headers:
            Authorization: "Bearer {{ token }}"
          capture:
            - json: "$.id"
              as: "sessionId"

      - loop:
        - post:
            url: "/api/dialogues/{{ sessionId }}/messages"
            json:
              message: "{{ $randomMessage() }}"
            headers:
              Authorization: "Bearer {{ token }}"
        count: 5

  - name: "Search Heavy"
    weight: 30
    flow:
      - loop:
        - get:
            url: "/api/search"
            qs:
              q: "{{ $randomSearchTerm() }}"
        count: 10

  - name: "Admin Operations"
    weight: 10
    flow:
      - post:
          url: "/api/admin/login"
          json:
            username: "admin"
            password: "AdminPassword"
          capture:
            - json: "$.access_token"
              as: "adminToken"

      - get:
          url: "/api/admin/dashboard"
          headers:
            Authorization: "Bearer {{ adminToken }}"
```

---

## Performance Monitoring Dashboard

```javascript
// performance-dashboard.js
class PerformanceDashboard {
  constructor() {
    this.metrics = {
      responseTime: [],
      throughput: [],
      errorRate: [],
      cpuUsage: [],
      memoryUsage: []
    };
  }

  collectMetrics() {
    setInterval(() => {
      this.metrics.responseTime.push(this.getAverageResponseTime());
      this.metrics.throughput.push(this.getRequestsPerSecond());
      this.metrics.errorRate.push(this.getErrorRate());
      this.metrics.cpuUsage.push(process.cpuUsage());
      this.metrics.memoryUsage.push(process.memoryUsage());

      this.generateReport();
    }, 1000);
  }

  generateReport() {
    const report = {
      timestamp: new Date(),
      avgResponseTime: this.average(this.metrics.responseTime),
      p95ResponseTime: this.percentile(this.metrics.responseTime, 95),
      throughput: this.average(this.metrics.throughput),
      errorRate: this.average(this.metrics.errorRate),
      peakMemory: Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed)),
      avgCPU: this.average(this.metrics.cpuUsage.map(c => c.user))
    };

    // Alert if thresholds exceeded
    if (report.avgResponseTime > 500) {
      this.alert('Response time exceeds 500ms');
    }

    if (report.errorRate > 0.05) {
      this.alert('Error rate exceeds 5%');
    }

    return report;
  }
}
```

---

## CI/CD Performance Testing

```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  pull_request:
    types: [opened, synchronize]

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run API Performance Tests
        run: k6 run --out json=results.json api-performance.js

      - name: Run Lighthouse Tests
        run: |
          npm install -g @lhci/cli
          lhci autorun --config=lighthouse-config.js

      - name: Analyze Results
        run: node analyze-performance.js

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./performance-results.json');
            const comment = `
              ## Performance Test Results
              - Average Response Time: ${results.avgResponseTime}ms
              - P95 Response Time: ${results.p95ResponseTime}ms
              - Error Rate: ${results.errorRate}%
              - Lighthouse Score: ${results.lighthouseScore}
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

---

## Success Criteria

✅ API response times < 500ms for 95% of requests
✅ Database queries optimized with proper indexes
✅ Frontend Core Web Vitals in "Good" range
✅ AI responses stream within 3 seconds
✅ Vector search completes in < 200ms
✅ No memory leaks detected
✅ CPU usage remains stable under load
✅ Error rate < 5% under peak load
✅ Bundle size optimized (< 40% unused code)
✅ Performance monitoring automated in CI/CD