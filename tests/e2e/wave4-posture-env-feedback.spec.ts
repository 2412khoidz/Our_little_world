import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const OUT_DIR = process.env.OLW_VQG_OUT || '/cursor/stores/self/media';

async function seedCouple(page: import('@playwright/test').Page) {
  await page.request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
  await page.request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });
}

async function enterHome(page: import('@playwright/test').Page) {
  await page.goto('/?vqg-capture=1');
  await page.getByTestId('preset-partner-a').click();
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(500);
  return canvas;
}

test.describe('Wave 4 — posture + env feedback', () => {
  test('baked sit/lie anims replace blanket overlay', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop VQG');
    test.setTimeout(90_000);
    await seedCouple(page);
    const canvas = await enterHome(page);

    await page.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('sofa_sit'));
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localPosture)).toBe('sit_sofa');
    await expect
      .poll(async () => canvas.evaluate((c) => c.dataset.localAvatarAnim ?? ''), { timeout: 10_000 })
      .toContain(':sit-');

    await page.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('bed_lie'));
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localPosture)).toBe('lie_bed');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localAvatarAnim ?? '')).toContain(':lie-');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localBlanketVisible ?? '1')).toBe('0');
    await page.screenshot({ path: `${OUT_DIR}/vqg-wave4-avatar-lie-atlas.png`, fullPage: true });

    await page.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('study_sit'));
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localPosture)).toBe('sit_study');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localAvatarAnim ?? '')).toContain(':sit-up');
  });

  test('door/ladder feedback keeps posture anim dataset', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop VQG');
    test.setTimeout(90_000);
    await seedCouple(page);
    const canvas = await enterHome(page);

    await page.evaluate(() => (globalThis as { __olwDevEnterPosture?: (k: string) => void }).__olwDevEnterPosture?.('sofa_sit'));
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localAvatarAnim ?? '')).toContain(':sit-');

    await canvas.evaluate(() =>
      (globalThis as { __olwDevEnvTransition?: (id: string, kind?: string) => void }).__olwDevEnvTransition?.(
        'home_garden_door',
        'door',
      ),
    );
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.envTransitionHook)).toBe('home_garden_door');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.envTransitionKind)).toBe('door');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localAvatarAnim ?? '')).toContain(':sit-');

    await canvas.evaluate(() =>
      (globalThis as { __olwDevEnvTransition?: (id: string, kind?: string) => void }).__olwDevEnvTransition?.(
        'village_forest_ladder',
        'ladder',
      ),
    );
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.envTransitionKind)).toBe('ladder');
    await expect.poll(async () => canvas.evaluate((c) => c.dataset.localAvatarAnim ?? '')).toContain(':sit-');
    await page.screenshot({ path: `${OUT_DIR}/vqg-wave4-sofa-door-ladder.png`, fullPage: true });
  });
});