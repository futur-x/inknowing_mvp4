import { Page, expect } from '@playwright/test';

export interface TestUser {
  phone?: string;
  username?: string;
  email?: string;
  password: string;
  nickname?: string;
}

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Generate random test data
   */
  static generateTestUser(): TestUser {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);

    return {
      phone: `138${timestamp}${random}`.slice(0, 11),
      username: `testuser_${timestamp}_${random}`,
      email: `test_${timestamp}_${random}@test.com`,
      password: 'Test123456!',
      nickname: `TestUser${random}`
    };
  }

  /**
   * Wait for API response
   */
  async waitForAPI(url: string, method: string = 'POST') {
    return this.page.waitForResponse(
      response => response.url().includes(url) && response.request().method() === method
    );
  }

  /**
   * Check if element is visible and enabled
   */
  async checkElement(selector: string) {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
    return element;
  }

  /**
   * Fill form field with validation
   */
  async fillField(selector: string, value: string) {
    const field = await this.checkElement(selector);
    await field.fill(value);
    await expect(field).toHaveValue(value);
  }

  /**
   * Click button with loading state check
   */
  async clickButton(selector: string) {
    const button = await this.checkElement(selector);
    await button.click();
  }

  /**
   * Check for error message
   */
  async checkError(text: string) {
    const error = this.page.locator(`text="${text}"`);
    await expect(error).toBeVisible();
  }

  /**
   * Check for success message
   */
  async checkSuccess(text: string) {
    const success = this.page.locator(`text="${text}"`);
    await expect(success).toBeVisible();
  }

  /**
   * Get stored auth token
   */
  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });
  }

  /**
   * Set auth token
   */
  async setAuthToken(token: string) {
    await this.page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
    }, token);
  }

  /**
   * Clear all storage
   */
  async clearStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Take screenshot on failure
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: `./.futurxlab/test-e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }
}