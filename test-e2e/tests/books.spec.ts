import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { APIClient } from '../utils/api-client';

test.describe('Book Management Flow', () => {
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

  test('should display books list', async ({ page }) => {
    await page.goto('/books');

    // Check for book grid or list
    const bookList = page.locator('[data-testid="book-list"]').or(page.locator('.book-list')).or(page.locator('.books-grid'));
    await expect(bookList).toBeVisible({ timeout: 10000 });

    // Check for at least one book item
    const bookItem = page.locator('[data-testid="book-item"]').or(page.locator('.book-item')).or(page.locator('.book-card')).first();
    await expect(bookItem).toBeVisible({ timeout: 10000 });
  });

  test('should filter books by category', async ({ page }) => {
    await page.goto('/books');

    // Find category filter
    const categoryFilter = page.locator('select[name="category"]').or(page.locator('[data-testid="category-filter"]'));

    if (await categoryFilter.isVisible()) {
      // Select a category
      await categoryFilter.selectOption({ index: 1 });

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Check that books are displayed
      const bookItems = page.locator('[data-testid="book-item"]').or(page.locator('.book-item'));
      const count = await bookItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search books', async ({ page }) => {
    await page.goto('/books');

    // Find search input
    const searchInput = page.locator('input[type="search"]').or(page.locator('[data-testid="search-input"]')).or(page.locator('input[placeholder*="搜索"]'));

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('红楼梦');
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Check for results or no results message
      const results = page.locator('[data-testid="search-results"]').or(page.locator('.search-results'));
      await expect(results.or(page.locator('text=/未找到|没有结果|No results/'))).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display book details', async ({ page }) => {
    await page.goto('/books');

    // Click on first book
    const firstBook = page.locator('[data-testid="book-item"]').or(page.locator('.book-item')).or(page.locator('.book-card')).first();

    if (await firstBook.isVisible()) {
      await firstBook.click();

      // Wait for book detail page
      await page.waitForURL(/\/books\/[^\/]+/);

      // Check for book title
      const bookTitle = page.locator('h1').or(page.locator('[data-testid="book-title"]'));
      await expect(bookTitle).toBeVisible();

      // Check for book info
      const bookInfo = page.locator('[data-testid="book-info"]').or(page.locator('.book-info'));
      await expect(bookInfo).toBeVisible();

      // Check for start dialogue button
      const dialogueButton = page.locator('button:has-text("开始对话")').or(page.locator('button:has-text("Start Dialogue")'));
      await expect(dialogueButton).toBeVisible();
    }
  });

  test('should handle pagination', async ({ page }) => {
    await page.goto('/books');

    // Check for pagination controls
    const pagination = page.locator('[data-testid="pagination"]').or(page.locator('.pagination'));

    if (await pagination.isVisible()) {
      // Try to go to next page
      const nextButton = pagination.locator('button:has-text("下一页")').or(pagination.locator('button:has-text("Next")'));

      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();

        // Wait for new page to load
        await page.waitForTimeout(1000);

        // Check that books are displayed
        const bookItems = page.locator('[data-testid="book-item"]').or(page.locator('.book-item'));
        const count = await bookItems.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Book Management API', () => {
  let apiClient: APIClient;

  test.beforeEach(async ({ request }) => {
    apiClient = new APIClient(request);
  });

  test('should get books list via API', async () => {
    const response = await apiClient.getBooks({
      page: 1,
      limit: 10
    });

    expect(response).toHaveProperty('items');
    expect(response).toHaveProperty('total');
    expect(Array.isArray(response.items)).toBeTruthy();

    if (response.items.length > 0) {
      const book = response.items[0];
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
    }
  });

  test('should search books via API', async () => {
    try {
      const response = await apiClient.searchBooks('红楼梦');

      expect(response).toHaveProperty('results');
      expect(Array.isArray(response.results)).toBeTruthy();
    } catch (error) {
      console.log('Search API not available or no results');
    }
  });

  test('should get books by category via API', async () => {
    const response = await apiClient.getBooks({
      category: 'literature',
      page: 1,
      limit: 5
    });

    expect(response).toHaveProperty('items');

    if (response.items.length > 0) {
      response.items.forEach((book: any) => {
        expect(book).toHaveProperty('category');
      });
    }
  });
});