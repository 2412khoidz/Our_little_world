import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const OUT_DIR = process.env.VQG_MEDIA_DIR || '/cursor/stores/self/media';

test.describe('VQG capture — donor Three.js care', () => {
  test.skip(() => process.env.VQG_CAPTURE !== '1', 'Set VQG_CAPTURE=1');

  test('donor-pet-three licensed cat billboard', async ({ page }) => {
    mkdirSync(OUT_DIR, { recursive: true });
    await page.goto('/?donor-pet-three=1');
    await expect(page.getByTestId('donor-pet-three-care')).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT_DIR}/vqg-donor-pet-three-c2.png`, fullPage: true });
  });
});