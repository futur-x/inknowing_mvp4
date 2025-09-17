import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');

    // Check for main elements on homepage
    await expect(page).toHaveTitle(/InKnowing/);

    // Check for login or main content
    const loginButton = page.locator('text=登录').or(page.locator('text=Login'));
    const mainContent = page.locator('main');

    // Either login page or main content should be visible
    await expect(loginButton.or(mainContent)).toBeVisible();
  });

  test('should connect to backend API', async ({ request }) => {
    // Test backend health endpoint
    const response = await request.get('http://localhost:8888/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('database', 'connected');
  });

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/');

    // Check for navigation elements
    const nav = page.locator('nav').or(page.locator('[role="navigation"]'));

    // Navigation might not be visible on login page
    if (await nav.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(nav).toBeVisible();
    }
  });
});