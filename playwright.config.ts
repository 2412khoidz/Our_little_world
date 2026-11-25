import { defineConfig, devices } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const pwBaseUrl = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const pwStateFile = process.env.OLW_DEV_LAN_STATE_FILE || `.dev-lan-state-pw-${pwPort}.json`;

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: /pwa-runtime\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: pwBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-iphone-16-pro-max',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 430, height: 932 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${pwPort} --strictPort`,
    env: {
      ...process.env,
      OLW_DEV_LAN_STATE_FILE: pwStateFile,
      VITE_OLW_PRIVATE_ART: process.env.VITE_OLW_PRIVATE_ART ?? '',
      VITE_OLW_DONOR_CARE_FAST: process.env.VITE_OLW_DONOR_CARE_FAST ?? '',
      VITE_OLW_DONOR_PET_CARE: process.env.VITE_OLW_DONOR_PET_CARE ?? '',
    },
    url: pwBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
