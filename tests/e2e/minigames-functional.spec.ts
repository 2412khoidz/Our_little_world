import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const OUT = path.join(process.cwd(), 'test-results', 'minigames-quality');

test.describe('Mini-games — functional cozy table QA', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test('Caro: place, turn swap, restart', async ({ page }) => {
    await page.goto('/minigames.html');
    await expect(page.getByTestId('caro-shell')).toBeVisible();
    await page.getByTestId('caro-cell-112').click();
    await expect(page.getByTestId('caro-cell-112')).toHaveAttribute('data-owner', '1');
    await expect(page.getByTestId('minigame-turn')).toContainText('Người chơi 2');
    await page.getByTestId('caro-cell-113').click();
    await page.screenshot({ path: path.join(OUT, 'caro-playing-desktop.png') });
    await page.getByTestId('minigame-restart').click();
    await expect(page.getByTestId('caro-cell-112')).toHaveAttribute('data-owner', '0');
  });

  test('Othello: legal move, pass when stuck', async ({ page }) => {
    await page.goto('/minigames.html');
    await page.getByTestId('minigame-tab-othello').click();
    await expect(page.getByTestId('othello-table')).toBeVisible();
    const legal = page.locator('[data-legal="true"]').first();
    await legal.click();
    await page.screenshot({ path: path.join(OUT, 'othello-legal-move-desktop.png') });
  });

  test('Memory: flip pair flow', async ({ page }) => {
    await page.goto('/minigames.html');
    await page.getByTestId('minigame-tab-memory').click();
    await page.getByTestId('memory-card-0').click();
    await expect(page.getByTestId('memory-card-0')).toHaveAttribute('data-face', 'up');
    await page.getByTestId('memory-card-1').click();
    await page.screenshot({ path: path.join(OUT, 'memory-flip-mobile.png') });
  });

  test('Battleship: privacy gate and fire', async ({ page }) => {
    await page.goto('/minigames.html');
    await page.getByTestId('minigame-tab-battleship').click();
    await expect(page.getByTestId('battleship-fire-0')).toBeVisible();
    await expect(page.getByTestId('battleship-own-0')).toBeVisible();
    await expect(page.locator('[data-testid^="battleship-fire-"][data-ship-owner]')).toHaveCount(0);

    await page.getByTestId('battleship-fire-0').click();
    await expect(page.getByTestId('battleship-privacy')).toBeVisible();
    await expect(page.getByTestId('battleship-own-0')).toHaveCount(0);
    await expect(page.getByTestId('battleship-fire-0')).toHaveCount(0);

    await page.getByTestId('battleship-reveal').click();
    await expect(page.getByTestId('battleship-fire-0')).toBeVisible();
    await expect(page.locator('[data-testid^="battleship-fire-"][data-ship-owner]')).toHaveCount(0);
    await page.getByTestId('battleship-fire-5').click();
    await page.screenshot({ path: path.join(OUT, 'battleship-fire-desktop.png') });
  });

  test('mobile portrait screenshots for all four', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/minigames.html');
    for (const [tab, shot] of [
      ['caro', 'caro-portrait-menu.png'],
      ['othello', 'othello-portrait.png'],
      ['memory', 'memory-portrait.png'],
      ['battleship', 'battleship-portrait-gate.png'],
    ] as const) {
      if (tab !== 'caro') await page.getByTestId(`minigame-tab-${tab}`).click();
      await page.screenshot({ path: path.join(OUT, shot) });
    }
  });
});