import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Test Configuration for InKnowing Platform
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],

  use: {
    baseURL: 'http://localhost:3555',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
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
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: [
    {
      command: 'cd ../../backend && python main.py',
      port: 8888,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '8888',
        DEBUG: 'True',
        DATABASE_URL: 'postgresql+asyncpg://postgres@localhost:5432/inknowing_db',
        CORS_ORIGINS: '["http://localhost:3555"]'
      }
    },
    {
      command: 'cd ../../frontend && npm run dev -- --port 3555',
      port: 3555,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});