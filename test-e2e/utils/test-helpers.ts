import { Page, expect } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Clear browser storage
   */
  async clearStorage() {
    try {
      await this.page.evaluate(() => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      });
    } catch (error) {
      // Storage may not be available in some contexts
      console.log('Storage clearing skipped:', error);
    }
  }

  /**
   * Set auth token in storage
   */
  async setAuthToken(token: string) {
    await this.page.evaluate((token) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('auth_token', token);
    }, token);
  }

  /**
   * Get auth token from storage
   */
  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    });
  }

  /**
   * Fill form field with retry logic
   */
  async fillField(selector: string, value: string) {
    const field = this.page.locator(selector).first();
    await field.waitFor({ state: 'visible' });
    await field.clear();
    await field.fill(value);
  }

  /**
   * Click button with retry logic
   */
  async clickButton(selector: string) {
    const button = this.page.locator(selector).first();
    await button.waitFor({ state: 'visible' });
    await button.click();
  }

  /**
   * Wait for API response
   */
  async waitForAPI(endpoint: string) {
    return this.page.waitForResponse(
      response => response.url().includes(endpoint),
      { timeout: 10000 }
    );
  }

  /**
   * Generate test user data
   */
  static generateTestUser() {
    const timestamp = Date.now();
    return {
      phone: `138${String(timestamp).slice(-8)}`,
      username: `testuser_${timestamp}`,
      nickname: `测试用户_${timestamp}`,
      email: `test_${timestamp}@example.com`
    };
  }

  /**
   * Generate test book data
   */
  static generateTestBook() {
    const timestamp = Date.now();
    return {
      title: `测试书籍_${timestamp}`,
      author: `测试作者_${timestamp}`,
      category: 'test',
      description: `这是一本测试书籍，创建于 ${new Date().toISOString()}`
    };
  }

  /**
   * Wait for WebSocket connection
   */
  async waitForWebSocket(urlPattern: RegExp) {
    return new Promise((resolve) => {
      this.page.on('websocket', ws => {
        if (urlPattern.test(ws.url())) {
          resolve(ws);
        }
      });
    });
  }

  /**
   * Mock API response
   */
  async mockAPIResponse(endpoint: string, response: any) {
    await this.page.route(`**${endpoint}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Take screenshot for debugging
   */
  async takeDebugScreenshot(name: string) {
    await this.page.screenshot({
      path: `./screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  /**
   * Check element visibility with custom timeout
   */
  async isElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.locator(selector).first().waitFor({
        state: 'visible',
        timeout
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for navigation with timeout
   */
  async waitForNavigation(urlPattern: RegExp, timeout: number = 10000) {
    await this.page.waitForURL(urlPattern, { timeout });
  }

  /**
   * Get element text content
   */
  async getElementText(selector: string): Promise<string> {
    const element = this.page.locator(selector).first();
    await element.waitFor({ state: 'visible' });
    return await element.textContent() || '';
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  /**
   * Login helper
   */
  async login(phone: string = '13800138000', code: string = '123456') {
    await this.page.goto('/login');
    await this.fillField('input[name="phone"]', phone);
    await this.fillField('input[name="code"]', code);
    await this.clickButton('button[type="submit"]');
    await this.page.waitForURL(/(home|dashboard|books)/, { timeout: 10000 });
  }

  /**
   * Logout helper
   */
  async logout() {
    const logoutButton = this.page.locator('button:has-text("退出")').or(this.page.locator('button:has-text("Logout")'));
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.page.waitForURL(/\/(login)?$/, { timeout: 5000 });
    }
  }
}