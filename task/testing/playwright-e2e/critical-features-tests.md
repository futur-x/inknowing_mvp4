# Playwright E2E Testing Tasks - Critical Frontend Features

## Test Suite: Critical Feature Testing with Playwright
**Framework**: Playwright MCP Tools
**Base URL**: `https://inknowing.ai`

---

## TASK-044: Real-time WebSocket Features

### Test Implementation

#### 44.1 Real-time Message Streaming Tests
```typescript
describe('WebSocket Real-time Features', () => {
  test('should display typing indicator during AI response', async () => {
    // Start a dialogue
    await loginAndStartDialogue();

    // Send a message
    await mcp__playwright__browser_type({
      element: 'Message input',
      ref: 'textarea[data-testid="message-input"]',
      text: '请详细介绍这本书的主要内容',
      submit: true
    });

    // Check for typing indicator
    await mcp__playwright__browser_wait_for({
      text: '正在输入'
    });

    // Take screenshot of typing state
    await mcp__playwright__browser_take_screenshot({
      element: 'Chat interface with typing indicator',
      ref: '[data-testid="chat-container"]',
      filename: 'typing-indicator.png'
    });

    // Wait for typing to finish
    await mcp__playwright__browser_wait_for({
      textGone: '正在输入'
    });

    // Verify message appeared
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('主要内容');
  });

  test('should stream AI response progressively', async () => {
    // Send message
    await mcp__playwright__browser_type({
      element: 'Message input',
      ref: 'textarea[data-testid="message-input"]',
      text: '列举书中的10个要点',
      submit: true
    });

    // Monitor response streaming
    let previousLength = 0;
    let isStreaming = true;

    while (isStreaming) {
      await mcp__playwright__browser_wait_for({ time: 0.5 });

      const snapshot = await mcp__playwright__browser_snapshot();
      const currentMessage = extractLastMessage(snapshot);

      if (currentMessage.length > previousLength) {
        console.log('Message is streaming...');
        previousLength = currentMessage.length;
      } else if (snapshot.includes('消息已发送')) {
        isStreaming = false;
      }
    }

    expect(previousLength).toBeGreaterThan(0);
  });

  test('should handle connection interruption', async () => {
    // Simulate network interruption
    await mcp__playwright__browser_evaluate({
      function: '() => { window.dispatchEvent(new Event("offline")); }'
    });

    // Check for reconnection message
    await mcp__playwright__browser_wait_for({
      text: '连接已断开'
    });

    // Simulate reconnection
    await mcp__playwright__browser_evaluate({
      function: '() => { window.dispatchEvent(new Event("online")); }'
    });

    // Verify reconnection
    await mcp__playwright__browser_wait_for({
      text: '已重新连接'
    });
  });
});
```

---

## TASK-045: Search and Filter Functionality

### Test Implementation

#### 45.1 Advanced Search Tests
```typescript
describe('Advanced Search Features', () => {
  test('should filter search results by category', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/search'
    });

    // Enter search query
    await mcp__playwright__browser_type({
      element: 'Search input',
      ref: 'input[data-testid="search-input"]',
      text: '管理'
    });

    // Apply category filter
    await mcp__playwright__browser_click({
      element: 'Business category filter',
      ref: 'input[value="business"]'
    });

    // Submit search
    await mcp__playwright__browser_click({
      element: 'Search button',
      ref: 'button[data-testid="search-submit"]'
    });

    // Wait for filtered results
    await mcp__playwright__browser_wait_for({
      text: '商业管理'
    });

    // Verify all results are business category
    const snapshot = await mcp__playwright__browser_snapshot();
    const businessCount = (snapshot.match(/category.*business/g) || []).length;
    expect(businessCount).toBeGreaterThan(0);
  });

  test('should sort results by relevance', async () => {
    // Change sort order
    await mcp__playwright__browser_select_option({
      element: 'Sort dropdown',
      ref: 'select[data-testid="sort-select"]',
      values: ['relevance']
    });

    // Verify sort applied
    await mcp__playwright__browser_wait_for({
      text: '相关度最高'
    });

    // Check relevance scores are descending
    const snapshot = await mcp__playwright__browser_snapshot();
    const scores = extractRelevanceScores(snapshot);

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i-1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  test('should handle empty search results', async () => {
    await mcp__playwright__browser_type({
      element: 'Search input',
      ref: 'input[data-testid="search-input"]',
      text: 'xyzabc123456789',
      submit: true
    });

    // Check for no results message
    await mcp__playwright__browser_wait_for({
      text: '没有找到相关书籍'
    });

    // Verify suggestions are shown
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('推荐书籍');
  });
});
```

#### 45.2 Auto-complete and Suggestions
```typescript
describe('Search Auto-complete', () => {
  test('should show search suggestions', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai'
    });

    // Start typing in search
    await mcp__playwright__browser_type({
      element: 'Search input',
      ref: 'input[data-testid="search-input"]',
      text: '心理',
      slowly: true // Type slowly to trigger auto-complete
    });

    // Wait for suggestions dropdown
    await mcp__playwright__browser_wait_for({
      text: '心理学'
    });

    // Verify suggestions contain search term
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('心理学入门');
    expect(snapshot).toContain('认知心理学');

    // Click a suggestion
    await mcp__playwright__browser_click({
      element: 'First suggestion',
      ref: '[data-testid="suggestion-0"]'
    });
  });
});
```

---

## TASK-046: User Profile and Settings

### Test Implementation

#### 46.1 Profile Management Tests
```typescript
describe('User Profile Management', () => {
  beforeEach(async () => {
    await loginUser('13800138000', 'Test123456');
  });

  test('should update user nickname', async () => {
    // Navigate to profile
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/profile'
    });

    // Click edit profile
    await mcp__playwright__browser_click({
      element: 'Edit profile button',
      ref: 'button[data-testid="edit-profile"]'
    });

    // Clear and update nickname
    await mcp__playwright__browser_evaluate({
      element: 'Nickname input',
      ref: 'input[name="nickname"]',
      function: '(element) => { element.value = ""; }'
    });

    await mcp__playwright__browser_type({
      element: 'Nickname input',
      ref: 'input[name="nickname"]',
      text: 'TestUser2024'
    });

    // Save changes
    await mcp__playwright__browser_click({
      element: 'Save button',
      ref: 'button[data-testid="save-profile"]'
    });

    // Verify success message
    await mcp__playwright__browser_wait_for({
      text: '更新成功'
    });

    // Reload and verify
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/profile'
    });

    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('TestUser2024');
  });

  test('should upload avatar image', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/profile'
    });

    // Upload avatar
    await mcp__playwright__browser_file_upload({
      paths: ['/Users/test/avatar.jpg']
    });

    // Wait for upload
    await mcp__playwright__browser_wait_for({
      text: '头像已更新'
    });

    // Take screenshot
    await mcp__playwright__browser_take_screenshot({
      element: 'Profile with new avatar',
      ref: '[data-testid="user-avatar"]',
      filename: 'avatar-updated.png'
    });
  });

  test('should display dialogue history', async () => {
    // Click dialogue history tab
    await mcp__playwright__browser_click({
      element: 'Dialogue history tab',
      ref: '[data-testid="history-tab"]'
    });

    // Wait for history to load
    await mcp__playwright__browser_wait_for({
      text: '对话历史'
    });

    // Verify history items
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('对话时间');
    expect(snapshot).toContain('消息数');

    // Click to resume a dialogue
    await mcp__playwright__browser_click({
      element: 'First history item',
      ref: '[data-testid="history-item-0"]'
    });

    // Should navigate to dialogue
    await mcp__playwright__browser_wait_for({
      text: '继续对话'
    });
  });
});
```

---

## TASK-047: Payment Flow Testing

### Test Implementation

#### 47.1 Payment Process Tests
```typescript
describe('Payment Flow', () => {
  test('should display correct pricing', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/pricing'
    });

    // Verify pricing tiers
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('免费版');
    expect(snapshot).toContain('基础版 ¥29/月');
    expect(snapshot).toContain('高级版 ¥59/月');
    expect(snapshot).toContain('超级版 ¥99/月');

    // Test price calculation for different durations
    await mcp__playwright__browser_click({
      element: 'Premium plan',
      ref: '[data-testid="plan-premium"]'
    });

    await mcp__playwright__browser_select_option({
      element: 'Duration selector',
      ref: 'select[name="duration"]',
      values: ['6'] // 6 months
    });

    // Verify discounted price
    await mcp__playwright__browser_wait_for({
      text: '¥299'
    });
  });

  test('should handle payment method selection', async () => {
    // Select WeChat Pay
    await mcp__playwright__browser_click({
      element: 'WeChat Pay option',
      ref: 'input[value="wechat"]'
    });

    // Verify WeChat selected
    let snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('微信支付');

    // Switch to Alipay
    await mcp__playwright__browser_click({
      element: 'Alipay option',
      ref: 'input[value="alipay"]'
    });

    // Verify Alipay selected
    snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('支付宝');
  });

  test('should generate payment QR code', async () => {
    // Proceed to payment
    await mcp__playwright__browser_click({
      element: 'Proceed to payment',
      ref: 'button[data-testid="proceed-payment"]'
    });

    // Wait for QR code
    await mcp__playwright__browser_wait_for({
      text: '请扫码支付'
    });

    // Verify QR code element exists
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('qr-code');

    // Take screenshot of payment page
    await mcp__playwright__browser_take_screenshot({
      filename: 'payment-qr-code.png',
      fullPage: true
    });

    // Check for payment timeout timer
    expect(snapshot).toContain('支付有效期');
  });
});
```

---

## TASK-048: Admin Dashboard Tests

### Test Implementation

#### 48.1 Admin Login and Dashboard
```typescript
describe('Admin Dashboard', () => {
  test('should login as admin', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/admin/login'
    });

    // Fill admin credentials
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Username',
          type: 'textbox',
          ref: 'input[name="username"]',
          value: 'admin'
        },
        {
          name: 'Password',
          type: 'textbox',
          ref: 'input[name="password"]',
          value: 'AdminPassword123'
        }
      ]
    });

    // Submit login
    await mcp__playwright__browser_click({
      element: 'Admin login button',
      ref: 'button[type="submit"]'
    });

    // Verify dashboard loads
    await mcp__playwright__browser_wait_for({
      text: '管理控制台'
    });

    // Check dashboard stats
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('在线用户');
    expect(snapshot).toContain('今日对话');
    expect(snapshot).toContain('API成本');
  });

  test('should manage books in admin panel', async () => {
    // Navigate to books management
    await mcp__playwright__browser_click({
      element: 'Books menu item',
      ref: '[data-testid="admin-books-menu"]'
    });

    // Wait for books list
    await mcp__playwright__browser_wait_for({
      text: '书籍管理'
    });

    // Add new book
    await mcp__playwright__browser_click({
      element: 'Add book button',
      ref: 'button[data-testid="add-book"]'
    });

    // Fill book form
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Title',
          type: 'textbox',
          ref: 'input[name="title"]',
          value: 'Test Book'
        },
        {
          name: 'Author',
          type: 'textbox',
          ref: 'input[name="author"]',
          value: 'Test Author'
        },
        {
          name: 'Category',
          type: 'combobox',
          ref: 'select[name="category"]',
          value: 'business'
        }
      ]
    });

    // Save book
    await mcp__playwright__browser_click({
      element: 'Save book',
      ref: 'button[data-testid="save-book"]'
    });

    // Verify success
    await mcp__playwright__browser_wait_for({
      text: '添加成功'
    });
  });

  test('should view user statistics', async () => {
    // Navigate to users
    await mcp__playwright__browser_click({
      element: 'Users menu',
      ref: '[data-testid="admin-users-menu"]'
    });

    // Apply filters
    await mcp__playwright__browser_select_option({
      element: 'Membership filter',
      ref: 'select[name="membership"]',
      values: ['premium']
    });

    // Verify filtered results
    await mcp__playwright__browser_wait_for({
      text: '高级会员'
    });

    // Export user data
    await mcp__playwright__browser_click({
      element: 'Export button',
      ref: 'button[data-testid="export-users"]'
    });

    // Verify export started
    await mcp__playwright__browser_wait_for({
      text: '导出中'
    });
  });
});
```

---

## TASK-049: Accessibility Testing

### Test Implementation

#### 49.1 Accessibility Tests
```typescript
describe('Accessibility Testing', () => {
  test('should be keyboard navigable', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai'
    });

    // Tab through elements
    for (let i = 0; i < 5; i++) {
      await mcp__playwright__browser_press_key({ key: 'Tab' });
    }

    // Check focus is visible
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('focus');

    // Activate with Enter
    await mcp__playwright__browser_press_key({ key: 'Enter' });
  });

  test('should have proper ARIA labels', async () => {
    const ariaCheck = await mcp__playwright__browser_evaluate({
      function: `() => {
        const elements = document.querySelectorAll('[aria-label], [role]');
        return elements.length > 0;
      }`
    });

    expect(ariaCheck).toBe(true);
  });

  test('should support screen readers', async () => {
    // Get accessibility tree
    const snapshot = await mcp__playwright__browser_snapshot();

    // Check for semantic HTML
    expect(snapshot).toContain('navigation');
    expect(snapshot).toContain('main');
    expect(snapshot).toContain('button');
    expect(snapshot).toContain('heading');
  });
});
```

---

## TASK-050: Performance Monitoring

### Test Implementation

#### 50.1 Performance Tests
```typescript
describe('Performance Monitoring', () => {
  test('should load page within 3 seconds', async () => {
    const startTime = Date.now();

    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai'
    });

    await mcp__playwright__browser_wait_for({
      text: 'InKnowing'
    });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have optimized images', async () => {
    const imageCheck = await mcp__playwright__browser_evaluate({
      function: `() => {
        const images = document.querySelectorAll('img');
        const unoptimized = Array.from(images).filter(img => {
          return img.naturalWidth > 2000 || img.naturalHeight > 2000;
        });
        return unoptimized.length;
      }`
    });

    expect(imageCheck).toBe(0);
  });

  test('should monitor network performance', async () => {
    const requests = await mcp__playwright__browser_network_requests();

    // Check for large requests
    const largeRequests = requests.filter(r => r.size > 1000000); // > 1MB

    expect(largeRequests.length).toBeLessThan(3);

    // Check for slow requests
    const slowRequests = requests.filter(r => r.duration > 2000); // > 2s

    expect(slowRequests.length).toBeLessThan(5);
  });
});
```

---

## Test Utilities

```typescript
// playwright-helpers.ts
export class PlaywrightTestHelper {
  async waitForElement(selector: string, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const snapshot = await mcp__playwright__browser_snapshot();
      if (snapshot.includes(selector)) {
        return true;
      }
      await mcp__playwright__browser_wait_for({ time: 0.5 });
    }

    throw new Error(`Element ${selector} not found within ${timeout}ms`);
  }

  async scrollToElement(ref: string) {
    await mcp__playwright__browser_evaluate({
      element: 'Element to scroll to',
      ref: ref,
      function: '(element) => { element.scrollIntoView({ behavior: "smooth" }); }'
    });
  }

  async checkVisibility(ref: string): Promise<boolean> {
    return await mcp__playwright__browser_evaluate({
      element: 'Element to check',
      ref: ref,
      function: '(element) => { return element.offsetParent !== null; }'
    });
  }

  async getElementText(ref: string): Promise<string> {
    return await mcp__playwright__browser_evaluate({
      element: 'Element to get text',
      ref: ref,
      function: '(element) => { return element.textContent; }'
    });
  }
}
```

---

## CI/CD Configuration

```yaml
# playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 4,

  use: {
    baseURL: process.env.BASE_URL || 'https://inknowing.ai',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],

  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit.xml' }],
  ],
});
```

---

## Success Criteria

✅ WebSocket real-time features tested
✅ Search and filtering validated
✅ User profile management tested
✅ Payment flow completely tested
✅ Admin dashboard functionality verified
✅ Accessibility standards met
✅ Performance benchmarks achieved
✅ All MCP Playwright tools utilized
✅ Screenshots captured for evidence
✅ Network monitoring implemented
✅ Console errors tracked
✅ Cross-device testing complete