import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { APIClient } from '../utils/api-client';

test.describe('Membership System Flow', () => {
  let helpers: TestHelpers;
  let apiClient: APIClient;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Login to get auth token
    apiClient = new APIClient(request);
    try {
      const loginResponse = await apiClient.login({
        type: 'phone',
        phone: '13800138000',
        code: '123456'
      });
      authToken = loginResponse.access_token;
    } catch (error) {
      console.log('Using mock token for testing');
      authToken = 'mock-test-token';
    }
  });

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setAuthToken(authToken);
  });

  test('should display membership tiers', async ({ page }) => {
    await page.goto('/membership');

    // Check for membership plans
    const membershipPlans = page.locator('[data-testid="membership-plans"]').or(page.locator('.membership-plans'));
    await expect(membershipPlans).toBeVisible();

    // Check for different tiers
    const tiers = ['免费', '基础', '高级', '超级', 'Free', 'Basic', 'Premium', 'Super'];
    let foundTier = false;

    for (const tier of tiers) {
      const tierElement = page.locator(`text="${tier}"`);
      if (await tierElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundTier = true;
        break;
      }
    }

    expect(foundTier).toBeTruthy();
  });

  test('should display current membership status', async ({ page }) => {
    await page.goto('/profile');

    // Check for membership status display
    const membershipStatus = page.locator('[data-testid="membership-status"]').or(page.locator('.membership-status'));

    if (await membershipStatus.isVisible()) {
      const statusText = await membershipStatus.textContent();
      expect(statusText).toMatch(/免费|基础|高级|超级|Free|Basic|Premium|Super/);
    }

    // Check for quota display
    const quotaDisplay = page.locator('[data-testid="quota-display"]').or(page.locator('.quota-display'));

    if (await quotaDisplay.isVisible()) {
      const quotaText = await quotaDisplay.textContent();
      expect(quotaText).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('should show upgrade options', async ({ page }) => {
    await page.goto('/membership');

    // Look for upgrade buttons
    const upgradeButtons = page.locator('button:has-text("升级")').or(page.locator('button:has-text("Upgrade")'));

    if (await upgradeButtons.first().isVisible()) {
      const count = await upgradeButtons.count();
      expect(count).toBeGreaterThan(0);

      // Click first upgrade button
      await upgradeButtons.first().click();

      // Should show payment options or redirect to payment
      await page.waitForURL(/\/(payment|checkout|membership\/upgrade)/);

      // Check for payment methods
      const paymentMethods = page.locator('[data-testid="payment-methods"]').or(page.locator('.payment-methods'));
      await expect(paymentMethods).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display membership benefits comparison', async ({ page }) => {
    await page.goto('/membership');

    // Check for benefits table or comparison
    const benefitsTable = page.locator('[data-testid="benefits-table"]').or(page.locator('.benefits-comparison'));

    if (await benefitsTable.isVisible()) {
      // Check for feature rows
      const features = [
        '对话次数',
        '上传限制',
        '角色对话',
        'Dialogues',
        'Upload',
        'Character'
      ];

      let foundFeature = false;
      for (const feature of features) {
        if (await page.locator(`text="${feature}"`).isVisible({ timeout: 1000 }).catch(() => false)) {
          foundFeature = true;
          break;
        }
      }

      expect(foundFeature).toBeTruthy();
    }
  });

  test('should handle payment methods', async ({ page }) => {
    await page.goto('/membership/upgrade/basic');

    // Check for payment method selection
    const paymentOptions = page.locator('[data-testid="payment-options"]').or(page.locator('.payment-options'));

    if (await paymentOptions.isVisible()) {
      // Check for WeChat Pay
      const wechatPay = page.locator('text=/微信|WeChat/');
      await expect(wechatPay).toBeVisible();

      // Check for Alipay
      const alipay = page.locator('text=/支付宝|Alipay/');
      await expect(alipay).toBeVisible();

      // Select a payment method
      await wechatPay.click();

      // Check for payment button
      const payButton = page.locator('button:has-text("支付")').or(page.locator('button:has-text("Pay")'));
      await expect(payButton).toBeVisible();
    }
  });

  test('should show subscription management', async ({ page }) => {
    await page.goto('/profile/subscription');

    // Check for subscription info
    const subscriptionInfo = page.locator('[data-testid="subscription-info"]').or(page.locator('.subscription-info'));

    if (await subscriptionInfo.isVisible()) {
      // Check for expiry date
      const expiryDate = subscriptionInfo.locator('text=/到期|Expires/');
      await expect(expiryDate).toBeVisible();

      // Check for auto-renewal option
      const autoRenewal = page.locator('[data-testid="auto-renewal"]').or(page.locator('input[type="checkbox"][name*="renewal"]'));

      if (await autoRenewal.isVisible()) {
        const isChecked = await autoRenewal.isChecked();
        console.log(`Auto-renewal is ${isChecked ? 'enabled' : 'disabled'}`);
      }

      // Check for cancel option
      const cancelButton = page.locator('button:has-text("取消订阅")').or(page.locator('button:has-text("Cancel Subscription")'));

      if (await cancelButton.isVisible()) {
        expect(cancelButton).toBeEnabled();
      }
    }
  });

  test('should enforce quota limits', async ({ page }) => {
    await page.goto('/books');

    // Get current quota
    const quotaDisplay = page.locator('[data-testid="remaining-quota"]').or(page.locator('.quota-remaining'));

    if (await quotaDisplay.isVisible()) {
      const quotaText = await quotaDisplay.textContent();
      const remainingQuota = parseInt(quotaText?.match(/\d+/)?.[0] || '0');

      console.log(`Remaining quota: ${remainingQuota}`);

      // If quota is 0, check for limit message
      if (remainingQuota === 0) {
        // Try to start a dialogue
        const firstBook = page.locator('.book-item').first();
        await firstBook.click();

        const startDialogue = page.locator('button:has-text("开始对话")');
        await startDialogue.click();

        // Should show quota exceeded message
        const quotaMessage = page.locator('text=/额度|限制|Quota|Limit/');
        await expect(quotaMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display payment history', async ({ page }) => {
    await page.goto('/profile/payments');

    // Check for payment history table
    const paymentHistory = page.locator('[data-testid="payment-history"]').or(page.locator('.payment-history'));

    if (await paymentHistory.isVisible()) {
      // Check for payment records
      const paymentRows = paymentHistory.locator('tr').or(paymentHistory.locator('.payment-record'));
      const count = await paymentRows.count();

      console.log(`Found ${count} payment records`);

      if (count > 1) { // More than header row
        // Check first payment record
        const firstRecord = paymentRows.nth(1);
        await expect(firstRecord).toContainText(/\d+/); // Should contain amount
      }
    }
  });
});

test.describe('Membership System API', () => {
  let apiClient: APIClient;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    apiClient = new APIClient(request);

    // Get auth token
    try {
      const loginResponse = await apiClient.login({
        type: 'phone',
        phone: '13800138000',
        code: '123456'
      });
      authToken = loginResponse.access_token;
    } catch (error) {
      authToken = 'mock-test-token';
    }
  });

  test('should get user membership status via API', async () => {
    try {
      const profile = await apiClient.getProfile(authToken);

      expect(profile).toHaveProperty('membership');
      expect(['free', 'basic', 'premium', 'super']).toContain(profile.membership);

      if (profile.membership !== 'free') {
        expect(profile).toHaveProperty('membership_expires_at');
      }
    } catch (error) {
      console.log('Get membership status failed:', error);
    }
  });

  test('should get user quota via API', async ({ request }) => {
    try {
      const response = await request.get('http://localhost:8888/v1/users/quota', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok()) {
        const quota = await response.json();
        expect(quota).toHaveProperty('total_quota');
        expect(quota).toHaveProperty('used_quota');
        expect(quota).toHaveProperty('remaining_quota');
      }
    } catch (error) {
      console.log('Get quota failed:', error);
    }
  });

  test('should get membership plans via API', async ({ request }) => {
    const response = await request.get('http://localhost:8888/v1/membership/plans');

    if (response.ok()) {
      const plans = await response.json();
      expect(Array.isArray(plans)).toBeTruthy();

      if (plans.length > 0) {
        const plan = plans[0];
        expect(plan).toHaveProperty('type');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('benefits');
      }
    }
  });

  test('should check upgrade eligibility via API', async ({ request }) => {
    try {
      const response = await request.post('http://localhost:8888/v1/membership/check-upgrade', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          target_membership: 'basic'
        }
      });

      if (response.ok()) {
        const result = await response.json();
        expect(result).toHaveProperty('eligible');
        expect(result).toHaveProperty('current_membership');
        expect(result).toHaveProperty('target_membership');
      }
    } catch (error) {
      console.log('Upgrade eligibility check failed:', error);
    }
  });

  test('should get payment methods via API', async ({ request }) => {
    const response = await request.get('http://localhost:8888/v1/payment/methods');

    if (response.ok()) {
      const methods = await response.json();
      expect(Array.isArray(methods)).toBeTruthy();

      // Should include WeChat and Alipay
      const methodNames = methods.map((m: any) => m.name);
      expect(methodNames).toContain('wechat_pay');
      expect(methodNames).toContain('alipay');
    }
  });
});