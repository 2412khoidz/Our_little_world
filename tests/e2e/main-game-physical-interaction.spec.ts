import { expect, test } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;

test.describe('Main game — physical interaction (Mission 03)', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('shows hotbar, slot select, and contextual prompt without sandbox URL', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await expect(page.getByTestId('main-game-interaction-hud')).toBeVisible();
    await expect(page.getByTestId('game-hotbar')).toBeVisible();
    await expect(page.getByTestId('hotbar-slot-8')).toBeVisible();
    await expect(page.getByTestId('couple-emote-fab')).toBeVisible();

    await page.getByTestId('nav-menu').click();
    await page.getByTestId('menu-inventory').click();
    await page.getByTestId('btn-claim-free-kibble').click();
    await page.getByRole('button', { name: 'Đóng' }).first().click();

    await page.keyboard.press('1');
    await expect(page.getByTestId('hotbar-slot-1')).toHaveClass(/olw-hotbar-slot--selected/);

    await expect(page.getByTestId('btn-context-secondary')).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: 'test-results/mission-03-main-hotbar.png' });
  });

  test('does not fire J when typing in modal input', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('nav-menu').click();
    await page.getByTestId('menu-pet').click();
    const input = page.getByTestId('input-pet-name');
    await input.fill('Qu');
    await page.keyboard.press('j');
    await expect(input).toHaveValue('Quj');
    await page.keyboard.press('Escape');
    await expect(input).not.toBeVisible();
    await expect(page.getByTestId('main-game-interaction-hud')).toBeVisible();
  });
});