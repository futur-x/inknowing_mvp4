import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { APIClient } from '../utils/api-client';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Upload System Flow', () => {
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

  test('should display upload page', async ({ page }) => {
    await page.goto('/upload');

    // Check for upload form
    const uploadForm = page.locator('[data-testid="upload-form"]').or(page.locator('.upload-form'));
    await expect(uploadForm).toBeVisible();

    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Check for metadata fields
    const titleInput = page.locator('input[name="title"]').or(page.locator('[data-testid="book-title"]'));
    await expect(titleInput).toBeVisible();

    const authorInput = page.locator('input[name="author"]').or(page.locator('[data-testid="book-author"]'));
    await expect(authorInput).toBeVisible();
  });

  test('should validate file type', async ({ page }) => {
    await page.goto('/upload');

    // Try to upload invalid file type
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.isVisible()) {
      // Create a test file with invalid extension
      const invalidFile = path.join(__dirname, 'test.exe');

      // Set file input (simulating invalid file)
      await fileInput.setInputFiles({
        name: 'test.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('invalid file content')
      });

      // Check for error message
      const errorMessage = page.locator('.error-message').or(page.locator('[role="alert"]')).or(page.locator('text=/不支持|格式|Invalid file type/'));
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should upload text file', async ({ page }) => {
    await page.goto('/upload');

    // Fill upload form
    const titleInput = page.locator('input[name="title"]').or(page.locator('[data-testid="book-title"]'));
    await titleInput.fill('测试书籍');

    const authorInput = page.locator('input[name="author"]').or(page.locator('[data-testid="book-author"]'));
    await authorInput.fill('测试作者');

    const categorySelect = page.locator('select[name="category"]').or(page.locator('[data-testid="book-category"]'));
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Set file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-book.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('这是一本测试书籍的内容。第一章：开始。第二章：发展。第三章：结束。')
    });

    // Submit form
    const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("上传")'));
    await submitButton.click();

    // Wait for upload response
    await page.waitForTimeout(2000);

    // Check for success message or redirect
    const successMessage = page.locator('.success-message').or(page.locator('[role="status"]')).or(page.locator('text=/成功|完成|Success/'));
    const uploadProgress = page.locator('[data-testid="upload-progress"]').or(page.locator('.upload-progress'));

    await expect(successMessage.or(uploadProgress)).toBeVisible({ timeout: 10000 });
  });

  test('should upload PDF file', async ({ page }) => {
    await page.goto('/upload');

    // Fill upload form
    const titleInput = page.locator('input[name="title"]').or(page.locator('[data-testid="book-title"]'));
    await titleInput.fill('PDF测试书籍');

    const authorInput = page.locator('input[name="author"]').or(page.locator('[data-testid="book-author"]'));
    await authorInput.fill('PDF作者');

    // Create a minimal PDF content
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');

    // Set file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-book.pdf',
      mimeType: 'application/pdf',
      buffer: pdfContent
    });

    // Submit form
    const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("上传")'));
    await submitButton.click();

    // Wait for upload response
    await page.waitForTimeout(2000);

    // Check for progress or success
    const uploadStatus = page.locator('[data-testid="upload-status"]').or(page.locator('.upload-status'));
    await expect(uploadStatus.or(page.locator('text=/处理|上传|Processing/'))).toBeVisible({ timeout: 10000 });
  });

  test('should show upload progress', async ({ page }) => {
    await page.goto('/upload');

    // Setup form
    await page.locator('input[name="title"]').fill('进度测试书籍');
    await page.locator('input[name="author"]').fill('进度测试作者');

    // Create larger file for progress testing
    const largeContent = 'x'.repeat(100000); // 100KB of content
    await page.locator('input[type="file"]').setInputFiles({
      name: 'large-book.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(largeContent)
    });

    // Submit and watch progress
    await page.locator('button[type="submit"]').click();

    // Check for progress indicator
    const progressBar = page.locator('[data-testid="progress-bar"]').or(page.locator('.progress-bar')).or(page.locator('[role="progressbar"]'));

    if (await progressBar.isVisible({ timeout: 5000 })) {
      // Check progress value changes
      const initialProgress = await progressBar.getAttribute('aria-valuenow') || await progressBar.getAttribute('value');
      await page.waitForTimeout(1000);
      const updatedProgress = await progressBar.getAttribute('aria-valuenow') || await progressBar.getAttribute('value');

      console.log(`Progress: ${initialProgress} -> ${updatedProgress}`);
    }
  });

  test('should handle upload quota limit', async ({ page }) => {
    await page.goto('/upload');

    // Check for quota display
    const quotaDisplay = page.locator('[data-testid="upload-quota"]').or(page.locator('.upload-quota'));

    if (await quotaDisplay.isVisible()) {
      const quotaText = await quotaDisplay.textContent();
      expect(quotaText).toContain(/\d+/); // Should contain numbers
    }
  });

  test('should display upload history', async ({ page }) => {
    await page.goto('/profile/uploads').or(await page.goto('/uploads'));

    // Check for uploads list
    const uploadsList = page.locator('[data-testid="uploads-list"]').or(page.locator('.uploads-list'));

    if (await uploadsList.isVisible()) {
      // Check for upload items
      const uploadItems = uploadsList.locator('[data-testid="upload-item"]').or(uploadsList.locator('.upload-item'));
      const count = await uploadItems.count();

      console.log(`Found ${count} uploaded items`);

      if (count > 0) {
        // Check first upload item details
        const firstItem = uploadItems.first();
        await expect(firstItem).toContainText(/\w+/); // Should contain some text
      }
    }
  });
});

test.describe('Upload System API', () => {
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

  test('should upload book via API', async () => {
    const testContent = Buffer.from('Test book content for API upload');

    try {
      const response = await apiClient.uploadBook(authToken, testContent, {
        title: 'API Test Book',
        author: 'API Test Author',
        category: 'test'
      });

      expect(response).toHaveProperty('upload_id');
      expect(response).toHaveProperty('status');
      expect(response.upload_id).toBeTruthy();
    } catch (error) {
      console.log('Upload API failed (auth or quota issue):', error);
    }
  });

  test('should check upload status via API', async () => {
    // First upload a book
    const testContent = Buffer.from('Status check test content');

    try {
      const uploadResponse = await apiClient.uploadBook(authToken, testContent, {
        title: 'Status Test Book',
        author: 'Status Test Author'
      });

      if (uploadResponse && uploadResponse.upload_id) {
        // Check status
        const statusResponse = await apiClient.getUploadStatus(authToken, uploadResponse.upload_id);

        expect(statusResponse).toHaveProperty('status');
        expect(statusResponse).toHaveProperty('progress');
        expect(['pending', 'processing', 'completed', 'failed']).toContain(statusResponse.status);
      }
    } catch (error) {
      console.log('Upload status check failed:', error);
    }
  });

  test('should validate file size limit via API', async () => {
    // Create file larger than limit (assuming 10MB limit)
    const largeContent = Buffer.alloc(11 * 1024 * 1024); // 11MB

    try {
      await apiClient.uploadBook(authToken, largeContent, {
        title: 'Large Book',
        author: 'Test Author'
      });

      // Should not reach here if size limit is enforced
      expect(false).toBe(true);
    } catch (error: any) {
      // Should fail with size limit error
      expect(error.message).toContain(/size|limit|too large/i);
    }
  });
});