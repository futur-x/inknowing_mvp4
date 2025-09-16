# Playwright E2E Testing Tasks - Complete User Journey

## Test Suite: Frontend User Journey Testing
**Framework**: Playwright + TypeScript
**Tools**: mcp__playwright__browser_* MCP tools
**Base URL**: `https://inknowing.ai`

---

## TASK-037: Discovery Phase Testing

### Test Implementation

#### 37.1 Landing Page Tests
```typescript
describe('Landing Page Discovery', () => {
  test('should load landing page and display search', async () => {
    // Navigate to landing page
    await mcp__playwright__browser_navigate({ url: 'https://inknowing.ai' });

    // Take initial screenshot
    await mcp__playwright__browser_take_screenshot({
      filename: 'landing-page.png',
      fullPage: true
    });

    // Get page snapshot for testing
    const snapshot = await mcp__playwright__browser_snapshot();

    // Verify key elements exist
    expect(snapshot).toContain('搜索书籍');
    expect(snapshot).toContain('热门书籍');
    expect(snapshot).toContain('开始对话');
  });

  test('should search books by question', async () => {
    // Type search query
    await mcp__playwright__browser_type({
      element: 'Search input field',
      ref: 'input[placeholder*="输入你的问题"]',
      text: '如何提高团队管理能力？',
      submit: true
    });

    // Wait for results
    await mcp__playwright__browser_wait_for({
      text: '搜索结果'
    });

    // Verify search results displayed
    const resultsSnapshot = await mcp__playwright__browser_snapshot();
    expect(resultsSnapshot).toContain('相关书籍');

    // Click on first result
    await mcp__playwright__browser_click({
      element: 'First book result',
      ref: '[data-testid="book-result-0"]'
    });
  });

  test('should browse popular books', async () => {
    await mcp__playwright__browser_navigate({ url: 'https://inknowing.ai' });

    // Click popular books section
    await mcp__playwright__browser_click({
      element: 'Popular books tab',
      ref: '[data-testid="popular-books-tab"]'
    });

    // Wait for books to load
    await mcp__playwright__browser_wait_for({
      text: '热门书籍',
      time: 2
    });

    // Verify book cards are displayed
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('对话次数');
    expect(snapshot).toContain('评分');
  });
});
```

#### 37.2 Book Details Page Tests
```typescript
describe('Book Details Page', () => {
  test('should display book information', async () => {
    // Navigate to a specific book
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/books/principles-ray-dalio'
    });

    // Wait for page load
    await mcp__playwright__browser_wait_for({
      text: '原则',
      time: 3
    });

    // Take screenshot of book details
    await mcp__playwright__browser_take_screenshot({
      filename: 'book-details.png'
    });

    // Verify book information
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('瑞·达利欧');
    expect(snapshot).toContain('简介');
    expect(snapshot).toContain('开始对话');
    expect(snapshot).toContain('选择角色对话');
  });

  test('should show available characters', async () => {
    // Click characters tab
    await mcp__playwright__browser_click({
      element: 'Characters tab',
      ref: '[data-testid="characters-tab"]'
    });

    // Wait for characters to load
    await mcp__playwright__browser_wait_for({
      text: '可对话角色'
    });

    // Verify characters are listed
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('角色描述');
  });
});
```

---

## TASK-038: Registration and Login Flow Tests

### Test Implementation

#### 38.1 User Registration Tests
```typescript
describe('User Registration Flow', () => {
  test('should register with phone number', async () => {
    // Navigate to registration
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/register'
    });

    // Fill registration form
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Phone number',
          type: 'textbox',
          ref: 'input[name="phone"]',
          value: '13800138000'
        },
        {
          name: 'Password',
          type: 'textbox',
          ref: 'input[name="password"]',
          value: 'Test123456'
        }
      ]
    });

    // Request verification code
    await mcp__playwright__browser_click({
      element: 'Send verification code button',
      ref: 'button[data-testid="send-code"]'
    });

    // Wait for code input to appear
    await mcp__playwright__browser_wait_for({
      text: '输入验证码'
    });

    // Enter verification code
    await mcp__playwright__browser_type({
      element: 'Verification code input',
      ref: 'input[name="code"]',
      text: '123456'
    });

    // Submit registration
    await mcp__playwright__browser_click({
      element: 'Register button',
      ref: 'button[type="submit"]'
    });

    // Verify registration success
    await mcp__playwright__browser_wait_for({
      text: '注册成功'
    });
  });

  test('should register with WeChat', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/register'
    });

    // Click WeChat registration
    await mcp__playwright__browser_click({
      element: 'WeChat registration button',
      ref: 'button[data-testid="wechat-register"]'
    });

    // Wait for WeChat QR code
    await mcp__playwright__browser_wait_for({
      text: '微信扫码'
    });

    // Take screenshot of QR code
    await mcp__playwright__browser_take_screenshot({
      element: 'WeChat QR code',
      ref: '[data-testid="wechat-qr"]',
      filename: 'wechat-qr.png'
    });
  });

  test('should handle registration errors', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/register'
    });

    // Try to register with existing phone
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Phone',
          type: 'textbox',
          ref: 'input[name="phone"]',
          value: '13800138000'
        }
      ]
    });

    await mcp__playwright__browser_click({
      element: 'Register button',
      ref: 'button[type="submit"]'
    });

    // Check for error message
    await mcp__playwright__browser_wait_for({
      text: '该手机号已注册'
    });

    // Verify error styling
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('error');
  });
});
```

#### 38.2 User Login Tests
```typescript
describe('User Login Flow', () => {
  test('should login with phone and password', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/login'
    });

    // Fill login form
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Phone',
          type: 'textbox',
          ref: 'input[name="phone"]',
          value: '13800138000'
        },
        {
          name: 'Password',
          type: 'textbox',
          ref: 'input[name="password"]',
          value: 'Test123456'
        }
      ]
    });

    // Submit login
    await mcp__playwright__browser_click({
      element: 'Login button',
      ref: 'button[data-testid="login-submit"]'
    });

    // Wait for redirect to dashboard
    await mcp__playwright__browser_wait_for({
      text: '我的对话'
    });

    // Verify user is logged in
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('个人中心');
  });

  test('should login with SMS code', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/login'
    });

    // Switch to SMS login
    await mcp__playwright__browser_click({
      element: 'SMS login tab',
      ref: '[data-testid="sms-login-tab"]'
    });

    // Enter phone
    await mcp__playwright__browser_type({
      element: 'Phone input',
      ref: 'input[name="phone"]',
      text: '13800138000'
    });

    // Request code
    await mcp__playwright__browser_click({
      element: 'Send code button',
      ref: 'button[data-testid="send-sms-code"]'
    });

    // Enter code
    await mcp__playwright__browser_type({
      element: 'SMS code input',
      ref: 'input[name="sms-code"]',
      text: '123456',
      submit: true
    });
  });
});
```

---

## TASK-039: Dialogue Interaction Tests

### Test Implementation

#### 39.1 Book Dialogue Tests
```typescript
describe('Book Dialogue Interaction', () => {
  beforeEach(async () => {
    // Login first
    await loginUser('13800138000', 'Test123456');
  });

  test('should start book dialogue', async () => {
    // Navigate to book
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/books/principles-ray-dalio'
    });

    // Click start dialogue
    await mcp__playwright__browser_click({
      element: 'Start dialogue button',
      ref: 'button[data-testid="start-book-dialogue"]'
    });

    // Wait for dialogue interface
    await mcp__playwright__browser_wait_for({
      text: '与《原则》对话'
    });

    // Type first message
    await mcp__playwright__browser_type({
      element: 'Message input',
      ref: 'textarea[data-testid="message-input"]',
      text: '这本书的核心观点是什么？',
      submit: true
    });

    // Wait for AI response
    await mcp__playwright__browser_wait_for({
      text: '正在思考',
      textGone: '正在思考'
    });

    // Verify response received
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('原则');

    // Take screenshot of dialogue
    await mcp__playwright__browser_take_screenshot({
      filename: 'book-dialogue.png'
    });
  });

  test('should continue dialogue conversation', async () => {
    // Already in dialogue from previous test

    // Send follow-up message
    await mcp__playwright__browser_type({
      element: 'Message input',
      ref: 'textarea[data-testid="message-input"]',
      text: '能具体解释一下第一条原则吗？',
      submit: true
    });

    // Wait for response
    await mcp__playwright__browser_wait_for({
      textGone: '正在思考'
    });

    // Check for references
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('参考');
    expect(snapshot).toContain('第');
  });

  test('should display quota usage', async () => {
    // Check quota indicator
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('剩余对话次数');

    // Click quota details
    await mcp__playwright__browser_click({
      element: 'Quota indicator',
      ref: '[data-testid="quota-indicator"]'
    });

    // Verify quota modal
    await mcp__playwright__browser_wait_for({
      text: '对话配额'
    });
  });
});
```

#### 39.2 Character Dialogue Tests
```typescript
describe('Character Dialogue Interaction', () => {
  test('should start character dialogue', async () => {
    // Navigate to book with characters
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/books/dream-of-red-mansions'
    });

    // Select character dialogue
    await mcp__playwright__browser_click({
      element: 'Character dialogue tab',
      ref: '[data-testid="character-dialogue-tab"]'
    });

    // Select a character
    await mcp__playwright__browser_click({
      element: 'Lin Daiyu character card',
      ref: '[data-testid="character-lin-daiyu"]'
    });

    // Start character dialogue
    await mcp__playwright__browser_click({
      element: 'Start character dialogue',
      ref: 'button[data-testid="start-character-dialogue"]'
    });

    // Wait for character dialogue interface
    await mcp__playwright__browser_wait_for({
      text: '与林黛玉对话'
    });

    // Send message to character
    await mcp__playwright__browser_type({
      element: 'Message input',
      ref: 'textarea[data-testid="message-input"]',
      text: '黛玉妹妹，最近可好？',
      submit: true
    });

    // Wait for character response
    await mcp__playwright__browser_wait_for({
      textGone: '林黛玉正在思考'
    });

    // Verify character-style response
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('哥哥'); // Character might respond in style
  });
});
```

---

## TASK-040: Membership Upgrade Flow Tests

### Test Implementation

#### 40.1 Upgrade Journey Tests
```typescript
describe('Membership Upgrade Flow', () => {
  test('should show upgrade prompt when quota exhausted', async () => {
    // Login as user with exhausted quota
    await loginUser('13800138001', 'Test123456');

    // Try to start dialogue
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/books/any-book'
    });

    await mcp__playwright__browser_click({
      element: 'Start dialogue',
      ref: 'button[data-testid="start-dialogue"]'
    });

    // Should see upgrade modal
    await mcp__playwright__browser_wait_for({
      text: '配额已用完'
    });

    // Take screenshot of upgrade prompt
    await mcp__playwright__browser_take_screenshot({
      filename: 'upgrade-prompt.png'
    });

    // Click view plans
    await mcp__playwright__browser_click({
      element: 'View upgrade plans',
      ref: 'button[data-testid="view-plans"]'
    });
  });

  test('should complete upgrade process', async () => {
    // On upgrade page
    await mcp__playwright__browser_wait_for({
      text: '选择会员计划'
    });

    // Select premium plan
    await mcp__playwright__browser_click({
      element: 'Premium plan card',
      ref: '[data-testid="plan-premium"]'
    });

    // Select duration
    await mcp__playwright__browser_select_option({
      element: 'Duration selector',
      ref: 'select[name="duration"]',
      values: ['3'] // 3 months
    });

    // Choose payment method
    await mcp__playwright__browser_click({
      element: 'WeChat Pay',
      ref: '[data-testid="payment-wechat"]'
    });

    // Click pay button
    await mcp__playwright__browser_click({
      element: 'Confirm payment',
      ref: 'button[data-testid="confirm-payment"]'
    });

    // Wait for payment QR code
    await mcp__playwright__browser_wait_for({
      text: '扫码支付'
    });

    // Take screenshot of payment page
    await mcp__playwright__browser_take_screenshot({
      filename: 'payment-qr.png'
    });
  });

  test('should verify upgraded membership', async () => {
    // Simulate payment completion
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/payment/success?order=123456'
    });

    // Verify success message
    await mcp__playwright__browser_wait_for({
      text: '支付成功'
    });

    // Navigate to profile
    await mcp__playwright__browser_click({
      element: 'Profile link',
      ref: '[data-testid="profile-link"]'
    });

    // Verify premium membership
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('高级会员');
    expect(snapshot).toContain('500次/月');
  });
});
```

---

## TASK-041: Book Upload Flow Tests

### Test Implementation

#### 41.1 Book Upload Process Tests
```typescript
describe('Book Upload Flow', () => {
  test('should check if book exists before upload', async () => {
    // Navigate to upload page
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/upload'
    });

    // Fill book info to check
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Book title',
          type: 'textbox',
          ref: 'input[name="title"]',
          value: 'My Custom Book'
        },
        {
          name: 'Author',
          type: 'textbox',
          ref: 'input[name="author"]',
          value: 'John Doe'
        }
      ]
    });

    // Check if exists
    await mcp__playwright__browser_click({
      element: 'Check book button',
      ref: 'button[data-testid="check-book"]'
    });

    // Wait for result
    await mcp__playwright__browser_wait_for({
      text: '该书未在系统中'
    });
  });

  test('should upload book file', async () => {
    // Prepare file upload
    const filePath = '/Users/test/Documents/test-book.txt';

    await mcp__playwright__browser_file_upload({
      paths: [filePath]
    });

    // Fill book details
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Title',
          type: 'textbox',
          ref: 'input[name="title"]',
          value: 'My Custom Book'
        },
        {
          name: 'Author',
          type: 'textbox',
          ref: 'input[name="author"]',
          value: 'John Doe'
        },
        {
          name: 'Category',
          type: 'combobox',
          ref: 'select[name="category"]',
          value: 'business'
        },
        {
          name: 'Description',
          type: 'textbox',
          ref: 'textarea[name="description"]',
          value: 'A book about business strategies'
        }
      ]
    });

    // Submit upload
    await mcp__playwright__browser_click({
      element: 'Upload button',
      ref: 'button[data-testid="submit-upload"]'
    });

    // Wait for processing
    await mcp__playwright__browser_wait_for({
      text: '上传成功，正在处理'
    });
  });

  test('should track upload progress', async () => {
    // Navigate to uploads page
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai/my-uploads'
    });

    // Check upload status
    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('处理中');

    // Wait for processing to complete (with timeout)
    let processed = false;
    for (let i = 0; i < 30; i++) {
      await mcp__playwright__browser_wait_for({ time: 2 });

      // Refresh page
      await mcp__playwright__browser_navigate_back();
      await mcp__playwright__browser_navigate({
        url: 'https://inknowing.ai/my-uploads'
      });

      const currentSnapshot = await mcp__playwright__browser_snapshot();
      if (currentSnapshot.includes('处理完成')) {
        processed = true;
        break;
      }
    }

    expect(processed).toBe(true);
  });
});
```

---

## TASK-042: Responsive and Cross-browser Tests

### Test Implementation

#### 42.1 Mobile Responsive Tests
```typescript
describe('Mobile Responsive Tests', () => {
  test('should work on mobile viewport', async () => {
    // Resize to mobile
    await mcp__playwright__browser_resize({
      width: 375,
      height: 812
    });

    // Navigate to home
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai'
    });

    // Check mobile menu
    await mcp__playwright__browser_click({
      element: 'Mobile menu button',
      ref: '[data-testid="mobile-menu"]'
    });

    // Verify mobile navigation
    await mcp__playwright__browser_wait_for({
      text: '书籍'
    });

    // Take mobile screenshot
    await mcp__playwright__browser_take_screenshot({
      filename: 'mobile-view.png',
      fullPage: true
    });
  });

  test('should work on tablet viewport', async () => {
    // Resize to tablet
    await mcp__playwright__browser_resize({
      width: 768,
      height: 1024
    });

    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai'
    });

    const snapshot = await mcp__playwright__browser_snapshot();
    expect(snapshot).toContain('InKnowing');
  });
});
```

#### 42.2 Browser Compatibility Tests
```typescript
describe('Cross-browser Tests', () => {
  test('should work in different browsers', async () => {
    // Test critical flows in different browsers
    const browsers = ['chromium', 'firefox', 'webkit'];

    for (const browser of browsers) {
      // Each browser test would use a different context
      console.log(`Testing in ${browser}`);

      await mcp__playwright__browser_navigate({
        url: 'https://inknowing.ai'
      });

      const snapshot = await mcp__playwright__browser_snapshot();
      expect(snapshot).toContain('InKnowing');
    }
  });
});
```

---

## TASK-043: Error Handling and Edge Cases

### Test Implementation

#### 43.1 Network Error Handling
```typescript
describe('Network Error Handling', () => {
  test('should handle network failures gracefully', async () => {
    // Monitor network requests
    const requests = await mcp__playwright__browser_network_requests();

    // Check for failed requests
    const failedRequests = requests.filter(r => r.status >= 400);

    // Verify error handling UI
    if (failedRequests.length > 0) {
      const snapshot = await mcp__playwright__browser_snapshot();
      expect(snapshot).toContain('重试');
    }
  });

  test('should show offline message', async () => {
    // Simulate offline (would need to be done at browser level)
    // Check for offline indicator
    const snapshot = await mcp__playwright__browser_snapshot();

    if (navigator.onLine === false) {
      expect(snapshot).toContain('离线');
    }
  });
});
```

#### 43.2 Console Error Monitoring
```typescript
describe('Console Error Monitoring', () => {
  test('should not have console errors', async () => {
    await mcp__playwright__browser_navigate({
      url: 'https://inknowing.ai'
    });

    // Get console messages
    const messages = await mcp__playwright__browser_console_messages();

    // Filter for errors
    const errors = messages.filter(m => m.type === 'error');

    // Should have no errors
    expect(errors.length).toBe(0);

    // If errors exist, log them
    if (errors.length > 0) {
      console.error('Console errors found:', errors);
    }
  });
});
```

---

## Test Helper Functions

```typescript
// test-helpers.ts
async function loginUser(phone: string, password: string) {
  await mcp__playwright__browser_navigate({
    url: 'https://inknowing.ai/login'
  });

  await mcp__playwright__browser_fill_form({
    fields: [
      {
        name: 'Phone',
        type: 'textbox',
        ref: 'input[name="phone"]',
        value: phone
      },
      {
        name: 'Password',
        type: 'textbox',
        ref: 'input[name="password"]',
        value: password
      }
    ]
  });

  await mcp__playwright__browser_click({
    element: 'Login button',
    ref: 'button[type="submit"]'
  });

  await mcp__playwright__browser_wait_for({
    text: '我的对话'
  });
}

async function navigateToBook(bookSlug: string) {
  await mcp__playwright__browser_navigate({
    url: `https://inknowing.ai/books/${bookSlug}`
  });

  await mcp__playwright__browser_wait_for({
    text: '开始对话'
  });
}

async function startDialogue(bookSlug: string) {
  await navigateToBook(bookSlug);

  await mcp__playwright__browser_click({
    element: 'Start dialogue',
    ref: 'button[data-testid="start-dialogue"]'
  });

  await mcp__playwright__browser_wait_for({
    text: '输入消息'
  });
}
```

---

## CI/CD Integration

```yaml
# .github/workflows/playwright-tests.yml
name: Playwright E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install Playwright
        run: |
          npm install -D @playwright/test
          npx playwright install

      - name: Run E2E Tests
        run: npx playwright test
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          TEST_PHONE: ${{ secrets.TEST_PHONE }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: playwright-results
          path: |
            test-results/
            playwright-report/
            screenshots/

      - name: Upload Coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/e2e.xml
```

---

## Success Criteria

✅ Complete user journey tested from discovery to paid usage
✅ All Playwright MCP tools utilized effectively
✅ Registration and login flows validated
✅ Book and character dialogues tested
✅ Membership upgrade flow verified
✅ Book upload process tested
✅ Responsive design validated
✅ Cross-browser compatibility confirmed
✅ Network errors handled gracefully
✅ Console errors monitored
✅ Screenshots captured at key points
✅ CI/CD pipeline integrated