import { expect, test, type Page } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

async function seedAndEnterHome(page: Page) {
  await page.goto('/?living-pet=1');
  await page.getByTestId('btn-dev-seed-couple').click();
  await page.getByTestId('preset-partner-a').click();
  await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible({ timeout: 30_000 });
}

async function adoptPetQuyt(page: Page) {
  await page.getByTestId('nav-menu').click({ force: true });
  await page.getByTestId('menu-pet').click();
  await expect(page.getByTestId('pet-panel')).toBeVisible();
  await page.getByTestId('input-pet-name').fill('Quýt');
  await page.getByTestId('btn-pet-save-name').click();
  await expect(page.getByTestId('pet-name-heading')).toHaveText('Quýt');
  await page.getByRole('button', { name: 'Đóng' }).first().click();
}

function readTelemetry(page: Page) {
  return page.getByTestId('living-pet-telemetry');
}

test.describe('Living pet — main game DEV simulation', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('shows compact banner and pet in home when ?living-pet=1', async ({ page }) => {
    await seedAndEnterHome(page);
    await expect(page.getByTestId('living-pet-local-sim')).toBeVisible();
  });

  test('pet sprite moves, animates, and reacts to dev food offer', async ({ page }) => {
    test.setTimeout(120_000);
    await seedAndEnterHome(page);
    await adoptPetQuyt(page);

    const tel = readTelemetry(page);
    await expect(tel).toHaveAttribute('data-visible', '1', { timeout: 20_000 });

    const samples: Array<{ x: number; y: number; anim: string; phase: string }> = [];
    for (let i = 0; i < 50; i += 1) {
      await page.waitForTimeout(1500);
      const x = Number(await tel.getAttribute('data-x'));
      const y = Number(await tel.getAttribute('data-y'));
      const anim = (await tel.getAttribute('data-anim')) ?? '';
      const phase = (await tel.getAttribute('data-brain-phase')) ?? '';
      samples.push({ x, y, anim, phase });
    }

    const first = samples[0]!;
    const maxDist = Math.max(...samples.map((s) => Math.hypot(s.x - first.x, s.y - first.y)));
    const uniqueAnim = new Set(samples.map((s) => s.anim)).size;
    const uniquePhase = new Set(samples.map((s) => s.phase)).size;

    expect(maxDist).toBeGreaterThan(12);
    expect(uniqueAnim).toBeGreaterThanOrEqual(2);
    expect(uniquePhase).toBeGreaterThanOrEqual(1);

    const x0 = Number(await tel.getAttribute('data-x'));
    const y0 = Number(await tel.getAttribute('data-y'));
    expect(x0).toBeGreaterThan(40);
    expect(x0).toBeLessThan(16 * 16);
    expect(y0).toBeGreaterThan(40);
    expect(y0).toBeLessThan(12 * 16);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('olw-dev-living-pet-food-offer'));
    });

    await expect(tel).toHaveAttribute('data-food-offer', '1', { timeout: 15_000 });
  });
});