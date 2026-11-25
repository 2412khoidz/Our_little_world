import { expect, test } from '@playwright/test';

test.use({ trace: 'on' });

/**
 * Owner checklist — structured care session (90s CI / 300s when OLW_ACCEPTANCE_LONG=1).
 */
test.describe('Pet care — owner session', () => {
  const sessionMs = process.env.OLW_ACCEPTANCE_LONG === '1' ? 360_000 : 60_000;

  test.beforeEach(async ({ request }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
    const res = await request.post(`${base}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('varied care interactions over multi-minute session', async ({ page }) => {
    test.setTimeout(sessionMs + 60_000);

    await page.goto('/?living-pet=1');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-menu').click({ force: true });
    await page.getByTestId('menu-pet').click();
    await page.getByTestId('input-pet-name').fill('Quýt');
    await page.getByTestId('btn-pet-save-name').click();
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('living-pet-telemetry').waitFor({ timeout: 30_000 });

    await page.evaluate(() => {
      window.dispatchEvent(new Event('olw-dev-pet-care-fast-autonomy'));
      window.dispatchEvent(new Event('olw-dev-enter-pet-care'));
    });
    await page.getByTestId('pet-care-overlay').waitFor({ timeout: 20_000 });

    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.petCareRig === 'portrait')).toBe(true);

    const reactions = new Set<string>();
    const started = Date.now();

    while (Date.now() - started < sessionMs) {
      await page.getByTestId('pet-care-call').click();
      reactions.add('call');
      await page.waitForTimeout(2200);

      await page.keyboard.press('3');
      await page.keyboard.press('KeyJ');
      reactions.add('toy');
      await page.waitForTimeout(2800);

      for (const zone of ['chin', 'head', 'back'] as const) {
        await page.evaluate((z) => {
          window.dispatchEvent(new CustomEvent('olw-dev-pet-care-stroke', { detail: { zone: z } }));
        }, zone);
        await page.waitForTimeout(400);
      }
      reactions.add('stroke');
      await page.waitForTimeout(2000);

      await page.keyboard.press('1');
      await page.keyboard.press('KeyJ');
      reactions.add('food');
      await page.waitForTimeout(3500);

      await page.getByTestId('pet-care-observe').click();
      reactions.add('observe');
      await page.waitForTimeout(4000);

      await page.getByTestId('pet-care-stroke-hint').waitFor({ state: 'visible' });
    }

    expect(reactions.size).toBeGreaterThanOrEqual(5);
    await page.screenshot({ path: '/opt/cursor/artifacts/pet-care-session-final.png' });
  });
});