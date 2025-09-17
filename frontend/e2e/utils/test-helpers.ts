import { Page } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  static generateTestUser() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return {
      phone: `138${timestamp.toString().slice(-8)}`,
      nickname: `TestUser_${random}`,
      email: `test_${random}@example.com`,
    };
  }

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
      // Ignore security errors when accessing storage
      console.log('Storage clear skipped due to security restrictions');
    }
  }

  async getAuthToken(): Promise<string | null> {
    return this.page.evaluate(() => localStorage.getItem('auth_token'));
  }

  async setAuthToken(token: string) {
    await this.page.evaluate((t) => localStorage.setItem('auth_token', t), token);
  }

  async fillField(selector: string, value: string) {
    const input = this.page.locator(selector).first();
    await input.fill(value);
  }

  async clickButton(selector: string) {
    const button = this.page.locator(selector).first();
    await button.click();
  }

  async waitForAPI(endpoint: string) {
    return this.page.waitForResponse((response) =>
      response.url().includes(endpoint)
    );
  }
}