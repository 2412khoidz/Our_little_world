import { defineConfig, devices } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4178';
const pwBaseUrl = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'pwa-runtime.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: pwBaseUrl,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${pwPort} --strictPort`,
    url: pwBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});