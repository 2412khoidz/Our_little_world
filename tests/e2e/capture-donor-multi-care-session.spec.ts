import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const OUT_DIR = process.env.VQG_MEDIA_DIR || '/cursor/stores/self/media';
const FAST = process.env.VITE_OLW_DONOR_CARE_FAST === '1';

test.describe('Donor multi-care — 5min session capture', () => {
  test.skip(() => process.env.DONOR_CARE_CAPTURE !== '1', 'Set DONOR_CARE_CAPTURE=1');

  test('stroke, feed, partner swap, autonomy soak', async ({ page }) => {
    test.setTimeout(FAST ? 120_000 : 360_000);
    mkdirSync(OUT_DIR, { recursive: true });
    await page.goto('/?donor-pet-care=1');
    await expect(page.getByTestId('donor-pet-three-care')).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT_DIR}/donor-multi-care-session-0s.png` });

    const host = page.locator('[data-testid="donor-pet-three-care"] > div').nth(1);
    const box = await host.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.52, box.y + box.height * 0.5, { steps: 8 });
      await page.mouse.up();
    }

    await page.getByRole('button', { name: /Chải/ }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Cho ăn \(2P\)/ }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Đổi người chăm' }).click();
    await page.getByRole('button', { name: /Cho ăn \(2P\)/ }).click();
    await page.waitForTimeout(1500);

    const soakMs = FAST ? 45_000 : 300_000;
    await page.waitForTimeout(soakMs);
    await page.screenshot({ path: `${OUT_DIR}/donor-multi-care-session-5min.png`, fullPage: true });
    writeFileSync(
      `${OUT_DIR}/donor-multi-care-session-meta.json`,
      JSON.stringify({ soakMs, fast: FAST, simulatedLabel: '5min', route: 'donor-pet-care' }, null, 2),
    );
  });
});