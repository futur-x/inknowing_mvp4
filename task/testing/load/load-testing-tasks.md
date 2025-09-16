# Load Testing Tasks - InKnowing Platform

## Test Suite: Load and Stress Testing
**Framework**: k6, JMeter, Locust
**Target**: 10,000+ concurrent users

---

## TASK-079: User Journey Load Testing

### k6 Load Test Script
```javascript
// user-journey-load.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginSuccess = new Rate('login_success');
const searchLatency = new Trend('search_latency');
const dialogueLatency = new Trend('dialogue_latency');
const errorRate = new Rate('errors');

// Test data
const users = new SharedArray('users', function() {
  return JSON.parse(open('./test-users.json'));
});

export const options = {
  scenarios: {
    // Gradual load increase
    ramping: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 1000 },  // Ramp up to 1000 users
        { duration: '10m', target: 1000 }, // Stay at 1000
        { duration: '5m', target: 5000 },  // Ramp up to 5000
        { duration: '10m', target: 5000 }, // Stay at 5000
        { duration: '5m', target: 10000 }, // Ramp up to 10000
        { duration: '15m', target: 10000 }, // Stay at 10000
        { duration: '10m', target: 0 },    // Ramp down
      ],
    },
    // Spike test
    spike: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 2000,
      maxVUs: 5000,
      startTime: '60m', // Start after ramping test
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.1'], // Error rate < 10%
    'login_success': ['rate>0.9'], // 90% login success
    'search_latency': ['p(95)<1000'],
    'dialogue_latency': ['p(95)<3000'],
  },
};

export function setup() {
  // Warm up the system
  http.get(`${__ENV.BASE_URL}/health`);
  return { startTime: Date.now() };
}

export default function() {
  const user = users[Math.floor(Math.random() * users.length)];
  const BASE_URL = __ENV.BASE_URL || 'https://api.inknowing.ai';

  group('User Authentication', () => {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        type: 'phone',
        phone: user.phone,
        password: user.password
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' }
      }
    );

    const loginOk = check(loginRes, {
      'login successful': (r) => r.status === 200,
      'token received': (r) => r.json('access_token') !== undefined,
    });

    loginSuccess.add(loginOk);

    if (!loginOk) {
      errorRate.add(1);
      return; // Skip rest if login failed
    }

    const token = loginRes.json('access_token');
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    sleep(randomBetween(1, 3));

    group('Book Discovery', () => {
      // Search for books
      const searchStart = Date.now();
      const searchRes = http.get(
        `${BASE_URL}/api/search?q=${encodeURIComponent(randomQuestion())}`,
        { headers: authHeaders, tags: { name: 'search' } }
      );

      searchLatency.add(Date.now() - searchStart);

      check(searchRes, {
        'search successful': (r) => r.status === 200,
        'results returned': (r) => r.json('results.length') > 0,
      });

      if (searchRes.status !== 200) {
        errorRate.add(1);
        return;
      }

      // Get book details
      const books = searchRes.json('results');
      if (books && books.length > 0) {
        const bookId = books[0].book.id;

        const bookRes = http.get(
          `${BASE_URL}/api/books/${bookId}`,
          { headers: authHeaders, tags: { name: 'book_details' } }
        );

        check(bookRes, {
          'book details loaded': (r) => r.status === 200,
        });
      }
    });

    sleep(randomBetween(2, 5));

    group('Dialogue Interaction', () => {
      // Start dialogue
      const dialogueStart = Date.now();
      const startRes = http.post(
        `${BASE_URL}/api/dialogues/book/start`,
        JSON.stringify({
          book_id: 'test-book-id',
          initial_question: randomQuestion()
        }),
        { headers: authHeaders, tags: { name: 'start_dialogue' } }
      );

      if (startRes.status === 403) {
        // Quota exceeded
        return;
      }

      check(startRes, {
        'dialogue started': (r) => r.status === 201,
        'session created': (r) => r.json('id') !== undefined,
      });

      if (startRes.status !== 201) {
        errorRate.add(1);
        return;
      }

      const sessionId = startRes.json('id');

      // Send messages
      for (let i = 0; i < 3; i++) {
        const messageRes = http.post(
          `${BASE_URL}/api/dialogues/${sessionId}/messages`,
          JSON.stringify({
            message: randomMessage()
          }),
          { headers: authHeaders, tags: { name: 'send_message' } }
        );

        dialogueLatency.add(Date.now() - dialogueStart);

        check(messageRes, {
          'message sent': (r) => r.status === 200,
          'response received': (r) => r.json('content') !== undefined,
        });

        sleep(randomBetween(3, 8)); // Simulate reading time
      }
    });

    sleep(randomBetween(5, 15)); // Simulate user thinking time
  });
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60; // minutes
  console.log(`Test completed in ${duration} minutes`);
}

// Helper functions
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomQuestion() {
  const questions = [
    '如何提高工作效率？',
    '怎样管理团队？',
    '创业需要什么准备？',
    '如何处理职场关系？',
    '投资理财的原则是什么？'
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function randomMessage() {
  const messages = [
    '请详细解释一下',
    '能举个例子吗？',
    '这个观点的依据是什么？',
    '还有其他方法吗？',
    '如何在实际中应用？'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
```

---

## TASK-080: WebSocket Load Testing

### WebSocket Load Test with k6
```javascript
// websocket-load.js
import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const wsConnectionTime = new Trend('ws_connection_time');
const wsMessageLatency = new Trend('ws_message_latency');
const wsErrorRate = new Rate('ws_errors');

export const options = {
  scenarios: {
    websocket_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },   // 500 WebSocket connections
        { duration: '5m', target: 500 },
        { duration: '2m', target: 2000 },  // 2000 connections
        { duration: '5m', target: 2000 },
        { duration: '2m', target: 5000 },  // 5000 connections
        { duration: '10m', target: 5000 },
        { duration: '5m', target: 0 },
      ],
    },
  },
  thresholds: {
    'ws_connection_time': ['p(95)<1000'],
    'ws_message_latency': ['p(95)<500'],
    'ws_errors': ['rate<0.05'],
  },
};

export default function() {
  const url = `wss://api.inknowing.ai/ws/dialogue/${generateSessionId()}`;
  const token = getAuthToken();

  const connectionStart = Date.now();

  const res = ws.connect(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  }, function(socket) {
    wsConnectionTime.add(Date.now() - connectionStart);

    socket.on('open', () => {
      console.log('WebSocket connected');

      // Send messages at intervals
      socket.setInterval(() => {
        const messageStart = Date.now();

        socket.send(JSON.stringify({
          type: 'message',
          content: 'Load test message ' + Date.now()
        }));

        socket.setTimeout(() => {
          wsMessageLatency.add(Date.now() - messageStart);
        }, 100);
      }, 5000); // Send message every 5 seconds
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);

      check(message, {
        'valid message format': (m) => m.type !== undefined,
        'has content': (m) => m.content !== undefined,
      });
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      wsErrorRate.add(1);
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Keep connection open for test duration
    socket.setTimeout(() => {
      socket.close();
    }, 60000); // 1 minute per connection
  });

  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}
```

---

## TASK-081: Database Load Testing

### Database Connection Pool Testing
```javascript
// db-load-test.js
import sql from 'k6/x/sql';
import { check } from 'k6';

const db = sql.open('postgres', __ENV.DATABASE_URL);

export const options = {
  scenarios: {
    database_load: {
      executor: 'constant-arrival-rate',
      rate: 1000, // 1000 queries per second
      duration: '10m',
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    'iteration_duration': ['p(95)<100'], // 95% of queries under 100ms
  },
};

export default function() {
  // Test different query types
  const queryTypes = [
    // Simple select
    () => db.query('SELECT * FROM books WHERE id = $1', [randomBookId()]),

    // Complex join
    () => db.query(`
      SELECT b.*, COUNT(d.id) as dialogue_count
      FROM books b
      LEFT JOIN dialogues d ON b.id = d.book_id
      WHERE b.category = $1
      GROUP BY b.id
      ORDER BY dialogue_count DESC
      LIMIT 10
    `, [randomCategory()]),

    // Insert operation
    () => db.query(`
      INSERT INTO dialogue_messages (session_id, role, content)
      VALUES ($1, $2, $3)
    `, [randomSessionId(), 'user', 'Load test message']),

    // Update operation
    () => db.query(`
      UPDATE users
      SET quota_used = quota_used + 1
      WHERE id = $1
    `, [randomUserId()]),
  ];

  // Execute random query type
  const query = queryTypes[Math.floor(Math.random() * queryTypes.length)];
  const result = query();

  check(result, {
    'query successful': (r) => r !== null,
  });
}

export function teardown() {
  db.close();
}
```

---

## TASK-082: Cache Layer Load Testing

### Redis Load Testing
```javascript
// redis-load-test.js
import redis from 'k6/x/redis';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const redisClient = redis.connect(__ENV.REDIS_URL);
const cacheHitRate = new Trend('cache_hit_rate');
const cacheLatency = new Trend('cache_latency');

export const options = {
  scenarios: {
    cache_load: {
      executor: 'constant-arrival-rate',
      rate: 5000, // 5000 operations per second
      duration: '10m',
      preAllocatedVUs: 200,
    },
  },
};

export default function() {
  const operations = [
    // Session management
    () => {
      const sessionKey = `session:${randomSessionId()}`;
      redisClient.setex(sessionKey, 3600, JSON.stringify({ userId: randomUserId() }));
      return redisClient.get(sessionKey);
    },

    // Rate limiting
    () => {
      const rateLimitKey = `ratelimit:${randomUserId()}`;
      const count = redisClient.incr(rateLimitKey);
      redisClient.expire(rateLimitKey, 60);
      return count;
    },

    // Cache retrieval
    () => {
      const cacheKey = `book:${randomBookId()}`;
      const startTime = Date.now();
      const cached = redisClient.get(cacheKey);
      cacheLatency.add(Date.now() - startTime);

      if (cached) {
        cacheHitRate.add(1);
        return cached;
      } else {
        cacheHitRate.add(0);
        // Simulate cache miss - fetch and store
        const data = JSON.stringify({ id: randomBookId(), title: 'Test Book' });
        redisClient.setex(cacheKey, 300, data);
        return data;
      }
    },
  ];

  const operation = operations[Math.floor(Math.random() * operations.length)];
  const result = operation();

  check(result, {
    'operation successful': (r) => r !== null,
  });
}
```

---

## TASK-083: API Gateway Stress Testing

### Nginx/Kong Load Testing
```javascript
// gateway-stress-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    // Test rate limiting
    rate_limit_test: {
      executor: 'constant-arrival-rate',
      rate: 10000, // Try 10,000 requests per second
      duration: '5m',
      preAllocatedVUs: 1000,
      maxVUs: 2000,
    },
    // Test connection limits
    connection_test: {
      executor: 'constant-vus',
      vus: 5000, // 5000 concurrent connections
      duration: '10m',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.1'],
  },
};

export default function() {
  const scenarios = [
    // High frequency small requests
    () => {
      const res = http.get(`${__ENV.BASE_URL}/api/health`, {
        tags: { name: 'health_check' }
      });
      return res;
    },

    // Large payload requests
    () => {
      const payload = 'x'.repeat(1024 * 100); // 100KB payload
      const res = http.post(`${__ENV.BASE_URL}/api/echo`, payload, {
        headers: { 'Content-Type': 'text/plain' },
        tags: { name: 'large_payload' }
      });
      return res;
    },

    // Slow requests
    () => {
      const res = http.get(`${__ENV.BASE_URL}/api/slow?delay=5000`, {
        timeout: '10s',
        tags: { name: 'slow_request' }
      });
      return res;
    },
  ];

  const scenario = scenarios[__VU % scenarios.length];
  const response = scenario();

  check(response, {
    'status not 502': (r) => r.status !== 502, // Bad Gateway
    'status not 503': (r) => r.status !== 503, // Service Unavailable
    'status not 504': (r) => r.status !== 504, // Gateway Timeout
  });
}
```

---

## TASK-084: Microservices Load Testing

### Service Mesh Testing with Locust
```python
# microservices-load.py
from locust import HttpUser, TaskSet, task, between
import random
import json

class MicroservicesUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        # Login and get token
        response = self.client.post("/api/auth/login", json={
            "type": "phone",
            "phone": f"138{random.randint(10000000, 99999999)}",
            "password": "Test123456"
        })

        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

    @task(30)
    def search_service(self):
        """Test search microservice"""
        queries = ["management", "psychology", "business", "success"]
        self.client.get(
            f"/api/search?q={random.choice(queries)}",
            headers=self.headers,
            name="/api/search"
        )

    @task(20)
    def book_service(self):
        """Test book microservice"""
        book_ids = ["book1", "book2", "book3", "book4", "book5"]
        self.client.get(
            f"/api/books/{random.choice(book_ids)}",
            headers=self.headers,
            name="/api/books/[id]"
        )

    @task(40)
    def dialogue_service(self):
        """Test dialogue microservice"""
        # Start dialogue
        response = self.client.post(
            "/api/dialogues/book/start",
            json={"book_id": "test-book"},
            headers=self.headers,
            name="/api/dialogues/start"
        )

        if response.status_code == 201:
            session_id = response.json()["id"]

            # Send messages
            for _ in range(random.randint(1, 5)):
                self.client.post(
                    f"/api/dialogues/{session_id}/messages",
                    json={"message": "Test message"},
                    headers=self.headers,
                    name="/api/dialogues/messages"
                )

    @task(10)
    def upload_service(self):
        """Test upload microservice"""
        self.client.post(
            "/api/uploads/check",
            json={"title": "Test Book", "author": "Test Author"},
            headers=self.headers,
            name="/api/uploads/check"
        )

# Run with: locust -f microservices-load.py --host=https://api.inknowing.ai --users=10000 --spawn-rate=100
```

---

## TASK-085: Distributed Load Testing

### Multi-region Load Testing Configuration
```yaml
# distributed-load-config.yml
apiVersion: k6.io/v1alpha1
kind: K6
metadata:
  name: distributed-load-test
spec:
  parallelism: 10  # 10 distributed runners
  script:
    configMap:
      name: load-test-script
      file: user-journey-load.js
  arguments: --out cloud

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: load-test-regions
data:
  regions: |
    - name: us-east-1
      vus: 2000
      duration: 30m
    - name: eu-west-1
      vus: 2000
      duration: 30m
    - name: ap-southeast-1
      vus: 2000
      duration: 30m
    - name: cn-north-1
      vus: 4000  # More users from China
      duration: 30m
```

### Kubernetes Job for Load Testing
```yaml
# k8s-load-test-job.yml
apiVersion: batch/v1
kind: Job
metadata:
  name: load-test-job
spec:
  parallelism: 5
  template:
    spec:
      containers:
      - name: k6-load-test
        image: loadimpact/k6:latest
        args:
          - run
          - --vus=2000
          - --duration=30m
          - /scripts/user-journey-load.js
        env:
          - name: BASE_URL
            value: https://api.inknowing.ai
          - name: K6_CLOUD_TOKEN
            valueFrom:
              secretKeyRef:
                name: k6-cloud-secret
                key: token
        volumeMounts:
          - name: scripts
            mountPath: /scripts
        resources:
          requests:
            cpu: 2
            memory: 4Gi
          limits:
            cpu: 4
            memory: 8Gi
      volumes:
        - name: scripts
          configMap:
            name: load-test-scripts
      restartPolicy: Never
```

---

## Load Test Monitoring and Reporting

```javascript
// load-test-monitor.js
class LoadTestMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      throughput: [],
      concurrentUsers: 0,
      cpuUsage: [],
      memoryUsage: [],
      diskIO: [],
      networkIO: []
    };
  }

  collectMetrics() {
    // Collect from Prometheus
    const prometheus = new PrometheusClient();

    this.metrics.requests = prometheus.query('http_requests_total');
    this.metrics.errors = prometheus.query('http_errors_total');
    this.metrics.responseTime = prometheus.query('http_request_duration_seconds');
    this.metrics.cpuUsage = prometheus.query('node_cpu_usage');
    this.metrics.memoryUsage = prometheus.query('node_memory_usage');
  }

  generateReport() {
    return {
      summary: {
        totalRequests: this.metrics.requests,
        errorRate: (this.metrics.errors / this.metrics.requests) * 100,
        avgResponseTime: this.average(this.metrics.responseTime),
        p95ResponseTime: this.percentile(this.metrics.responseTime, 95),
        p99ResponseTime: this.percentile(this.metrics.responseTime, 99),
        peakConcurrentUsers: Math.max(...this.metrics.concurrentUsers),
        avgThroughput: this.average(this.metrics.throughput)
      },
      infrastructure: {
        avgCPU: this.average(this.metrics.cpuUsage),
        peakCPU: Math.max(...this.metrics.cpuUsage),
        avgMemory: this.average(this.metrics.memoryUsage),
        peakMemory: Math.max(...this.metrics.memoryUsage)
      },
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.average(this.metrics.responseTime) > 1000) {
      recommendations.push('Consider caching frequently accessed data');
    }

    if (Math.max(...this.metrics.cpuUsage) > 80) {
      recommendations.push('CPU bottleneck detected - consider horizontal scaling');
    }

    if (this.metrics.errors / this.metrics.requests > 0.05) {
      recommendations.push('High error rate - investigate application logs');
    }

    return recommendations;
  }
}
```

---

## CI/CD Load Testing Pipeline

```yaml
# .github/workflows/load-tests.yml
name: Load Testing Pipeline

on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday at 2 AM
  workflow_dispatch:
    inputs:
      target_vus:
        description: 'Number of virtual users'
        required: true
        default: '1000'
      duration:
        description: 'Test duration'
        required: true
        default: '30m'

jobs:
  load-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run Load Test
        run: |
          k6 run \
            --vus ${{ github.event.inputs.target_vus || '1000' }} \
            --duration ${{ github.event.inputs.duration || '30m' }} \
            --out json=results.json \
            user-journey-load.js
        env:
          BASE_URL: ${{ secrets.LOAD_TEST_URL }}

      - name: Analyze Results
        run: node analyze-load-results.js

      - name: Upload Results to S3
        run: |
          aws s3 cp results.json s3://load-test-results/$(date +%Y%m%d-%H%M%S).json
          aws s3 cp load-test-report.html s3://load-test-results/$(date +%Y%m%d-%H%M%S).html

      - name: Send Report
        run: |
          node send-load-report.js --email=devops@inknowing.ai
```

---

## Success Criteria

✅ Support 10,000 concurrent users
✅ Maintain < 2s response time at 95th percentile
✅ Error rate < 1% under normal load
✅ System recovers from spike loads
✅ Database handles 5000 queries/second
✅ WebSocket supports 5000 concurrent connections
✅ Cache hit rate > 80%
✅ No memory leaks under sustained load
✅ Auto-scaling triggers correctly
✅ Graceful degradation under extreme load
✅ Load balancing distributes evenly
✅ All services remain responsive