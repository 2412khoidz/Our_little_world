import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { battleshipGame, caroCellIndex, memoryGame } from '../../src/shared/minigames';
import { MINIGAME_BASE_SEED, MINIGAME_PLAYER_IDS } from '../../src/features/minigames/useMinigame';
import {
  battleshipFirePlan,
  caroWinMoveCells,
  findMatchingPair,
  findMismatch,
  memoryAllPairs,
  othelloFirstLegalCell,
  shipCells,
} from './minigames-e2e-helpers';

const OUT = path.join(process.cwd(), 'test-results', 'minigames-quality');
const BEFORE_DIR = path.join(process.cwd(), 'test-results', 'art-pass', 'after');

function qualityShot(projectName: string, file: string): string {
  const safe = projectName.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
  return path.join(OUT, `${safe}--${file}`);
}

async function assertNoUnintendedOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > window.innerWidth + 2;
  });
  expect(overflow, 'horizontal overflow').toBe(false);
}

async function touchTargetMinSize(page: Page, testId: string, minPx = 40): Promise<void> {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(minPx - 2);
  }
}

async function dismissBattleshipGateIfNeeded(page: Page): Promise<void> {
  const gate = page.getByTestId('battleship-privacy');
  if (await gate.isVisible().catch(() => false)) {
    await page.getByTestId('battleship-reveal').click();
  }
}

async function battleshipWinLoop(
  page: Page,
  seed = MINIGAME_BASE_SEED + 7919,
): Promise<void> {
  const { playerOneTargets, playerTwoWater } = battleshipFirePlan(seed);
  let targetIndex = 0;
  let waterIndex = 0;
  for (let guard = 0; guard < 90; guard += 1) {
    if (await page.getByTestId('battleship-win').isVisible().catch(() => false)) break;
    await dismissBattleshipGateIfNeeded(page);
    const turn = (await page.getByTestId('minigame-turn').textContent()) ?? '';
    if (turn.includes('Người chơi 1')) {
      while (
        targetIndex < playerOneTargets.length &&
        (await page.getByTestId(`battleship-fire-${playerOneTargets[targetIndex]}`).getAttribute('data-shot')) !== '0'
      ) {
        targetIndex += 1;
      }
      const cell = playerOneTargets[targetIndex];
      expect(cell, 'P1 target cell').toBeDefined();
      targetIndex += 1;
      await page.getByTestId(`battleship-fire-${cell}`).click();
    } else {
      while (
        waterIndex < playerTwoWater.length &&
        (await page.getByTestId(`battleship-fire-${playerTwoWater[waterIndex]}`).getAttribute('data-shot')) !== '0'
      ) {
        waterIndex += 1;
      }
      const cell = playerTwoWater[waterIndex];
      expect(cell, 'P2 water cell').toBeDefined();
      waterIndex += 1;
      await page.getByTestId(`battleship-fire-${cell}`).click();
    }
  }
}

test.describe('Mini-games — functional cozy table QA', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT, { recursive: true });
  });

  test('Caro: win line, end state, restart', async ({ page }, testInfo) => {
    const shot = (file: string) => qualityShot(testInfo.project.name, file);
    await page.goto('/minigames.html');
    await expect(page.getByTestId('caro-shell')).toBeVisible();

    for (const cell of caroWinMoveCells()) {
      await page.getByTestId(`caro-cell-${cell}`).click();
    }

    await expect(page.getByTestId('minigame-outcome')).toContainText('Người chơi 1 thắng!');
    await expect(page.getByTestId('minigame-turn')).toHaveCount(0);
    for (let column = 0; column < 5; column += 1) {
      const index = caroCellIndex(column, 0);
      await expect(page.getByTestId(`caro-cell-${index}`)).toHaveAttribute('data-winning', 'true');
    }
    await page.screenshot({ path: shot('caro-end-win.png'), fullPage: true });

    await page.getByTestId('minigame-restart').click();
    await expect(page.getByTestId('caro-cell-0')).toHaveAttribute('data-owner', '0');
    await expect(page.getByTestId('minigame-turn')).toContainText('Người chơi 1');
    await page.screenshot({ path: shot('caro-after-restart.png'), fullPage: true });
  });

  test('Othello: flip, counts, pass flow, game end', async ({ page }, testInfo) => {
    const shot = (file: string) => qualityShot(testInfo.project.name, file);
    await page.goto('/minigames.html');
    await page.getByTestId('minigame-tab-othello').click();

    await expect(page.getByTestId('othello-count-black')).toContainText(': 2');
    await expect(page.getByTestId('othello-count-white')).toContainText(': 2');

    const firstLegal = othelloFirstLegalCell();
    const cellBefore = page.getByTestId(`othello-cell-${firstLegal}`);
    await expect(cellBefore).toHaveAttribute('data-owner', '0');
    await cellBefore.click();
    await expect(cellBefore).toHaveAttribute('data-owner', '1');
    await expect(page.getByTestId('othello-count-black')).toContainText(': 4');
    await expect(page.getByTestId('othello-count-white')).toContainText(': 1');
    await page.screenshot({ path: shot('othello-after-flip.png'), fullPage: true });

    for (let move = 0; move < 80; move += 1) {
      const outcome = await page.getByTestId('minigame-outcome').textContent();
      if (outcome && !outcome.includes('Đang chơi')) break;
      const passBtn = page.getByTestId('othello-pass');
      if (await passBtn.isVisible().catch(() => false)) {
        await passBtn.click();
        await expect(page.getByTestId('minigame-hint').or(page.getByTestId('minigame-turn'))).toBeVisible();
        continue;
      }
      const legal = page.locator('[data-legal="true"]').first();
      if ((await legal.count()) === 0) break;
      await legal.click();
    }

    const finalOutcome = await page.getByTestId('minigame-outcome').textContent();
    expect(finalOutcome).not.toContain('Đang chơi');
    await expect(page.getByTestId('minigame-turn')).toHaveCount(0);
    await page.screenshot({ path: shot('othello-end.png'), fullPage: true });

    await page.getByTestId('minigame-restart').click();
    await expect(page.getByTestId('othello-count-black')).toContainText(': 2');
  });

  test('Memory: match, mismatch, turn, rapid input, clear board', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const shot = (file: string) => qualityShot(testInfo.project.name, file);
    const deck = memoryGame.initialState(MINIGAME_BASE_SEED, MINIGAME_PLAYER_IDS).deck;
    const [misA, misB] = findMismatch(deck);
    const [pairA, pairB] = findMatchingPair(deck);

    await page.goto('/minigames.html');
    await page.getByTestId('minigame-tab-memory').click();

    await page.getByTestId(`memory-card-${misA}`).click();
    await page.getByTestId(`memory-card-${misB}`).click();
    await expect(page.getByTestId('minigame-turn')).toContainText('Người chơi 2');
    await page.screenshot({ path: shot('memory-mismatch-turn.png'), fullPage: true });

    await page.getByTestId(`memory-card-${pairA}`).click();
    await page.getByTestId(`memory-card-${pairB}`).click();
    await expect(page.getByTestId(`memory-card-${pairA}`)).toHaveAttribute('data-matched', 'true');
    await expect(page.getByTestId(`memory-card-${pairB}`)).toHaveAttribute('data-matched', 'true');
    await page.screenshot({ path: shot('memory-match.png'), fullPage: true });

    const errorCell = new Set([pairA, pairB]).has(misA) ? misB : misA;
    await page.getByTestId(`memory-card-${errorCell}`).click();
    await page.getByTestId(`memory-card-${errorCell}`).click();
    await expect(page.getByTestId('minigame-error')).toContainText('đã được lật');

    await page.getByTestId('minigame-restart').click();
    const restartSeed = MINIGAME_BASE_SEED + 7919;
    for (const [a, b] of memoryAllPairs(restartSeed)) {
      const cardA = page.getByTestId(`memory-card-${a}`);
      await expect(cardA).toHaveAttribute('data-matched', 'false', { timeout: 2000 });
      await cardA.click();
      await page.getByTestId(`memory-card-${b}`).click();
    }
    await expect(page.getByTestId('minigame-turn')).toHaveCount(0);
    await expect(page.getByTestId('minigame-outcome')).toContainText(/thắng|Hòa/);
    await page.screenshot({ path: shot('memory-end.png'), fullPage: true });
  });

  test('Battleship: hit, miss, sunk, privacy, viewer projection, restart', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const shot = (file: string) => qualityShot(testInfo.project.name, file);
    const initial = battleshipGame.initialState(MINIGAME_BASE_SEED, MINIGAME_PLAYER_IDS);
    const enemyShipCell = shipCells(initial, MINIGAME_PLAYER_IDS[1])[0]!;

    await page.goto('/minigames.html');
    await page.getByTestId('minigame-tab-battleship').click();

    await expect(page.getByTestId('battleship-own-0')).toBeVisible();
    await expect(page.locator('[data-testid^="battleship-fire-"][data-ship-owner]')).toHaveCount(0);

    await page.getByTestId(`battleship-fire-${enemyShipCell}`).click();
    await expect(page.getByTestId('minigame-hint')).toContainText('Trúng');
    await expect(page.getByTestId('battleship-privacy')).toBeVisible();
    await expect(page.getByTestId('battleship-own-0')).toHaveCount(0);

    await page.getByTestId('battleship-reveal').click();

    const { playerTwoWater } = battleshipFirePlan();
    const waterCell =
      playerTwoWater.find((c) => c !== enemyShipCell) ?? playerTwoWater[0]!;
    await page.getByTestId(`battleship-fire-${waterCell}`).click();
    await expect(page.getByTestId('minigame-hint')).toContainText('Trượt');
    await page.getByTestId('battleship-reveal').click();
    await page.screenshot({ path: shot('battleship-hit-miss.png'), fullPage: true });

    await page.getByTestId('minigame-restart').click();
    await dismissBattleshipGateIfNeeded(page);
    await battleshipWinLoop(page, MINIGAME_BASE_SEED + 7919);
    await expect(page.getByTestId('battleship-win')).toBeVisible();
    await expect(page.getByTestId('minigame-outcome')).toContainText('thắng');
    await page.screenshot({ path: shot('battleship-end-win.png'), fullPage: true });

    await page.getByTestId('minigame-restart').click();
    await expect(page.getByTestId('battleship-fire-0')).toBeVisible();
    await expect(page.getByTestId('battleship-privacy')).toHaveCount(0);
    await expect(page.getByTestId('battleship-own-0')).toBeVisible();
  });

  test('Shell: mute persistence, exit mid-game, reduced motion', async ({ page }, testInfo) => {
    const shot = (file: string) => qualityShot(testInfo.project.name, file);
    await page.goto('/minigames.html');
    await page.getByTestId('minigame-mute').click();
    await expect(page.getByTestId('minigame-mute')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page.getByTestId('minigame-mute')).toHaveAttribute('aria-pressed', 'true');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByTestId('caro-cell-112').click();
    const popAnim = await page
      .getByTestId('caro-cell-112')
      .evaluate((el) => getComputedStyle(el.querySelector('.mn-stone') ?? el).animationName);
    expect(popAnim === 'none' || popAnim === '').toBeTruthy();
    await page.screenshot({ path: shot('reduced-motion-caro.png'), fullPage: true });

    await page.getByTestId('caro-cell-113').click();
    await page.getByTestId('minigame-exit').click();
    await expect(page).toHaveURL(/\//);
    await page.goto('/minigames.html');
    await expect(page.getByTestId('caro-cell-112')).toHaveAttribute('data-owner', '0');
  });

  test('Responsive viewports — overflow and touch targets', async ({ page }, testInfo) => {
    const shot = (file: string) => qualityShot(testInfo.project.name, file);
    const viewports = [
      { w: 390, h: 844, tag: '390x844' },
      { w: 430, h: 932, tag: '430x932' },
      { w: 844, h: 390, tag: '844x390-landscape' },
    ] as const;

    for (const { w, h, tag } of viewports) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/minigames.html');
      await assertNoUnintendedOverflow(page);
      await touchTargetMinSize(page, 'minigame-restart');
      await touchTargetMinSize(page, 'caro-cell-112', w < 400 ? 18 : 20);
      await page.screenshot({ path: shot(`viewport-${tag}-caro.png`), fullPage: true });

      await page.getByTestId('minigame-tab-memory').click();
      await assertNoUnintendedOverflow(page);
      await touchTargetMinSize(page, 'memory-card-0', 40);
      await page.screenshot({ path: shot(`viewport-${tag}-memory.png`), fullPage: true });

      await page.getByTestId('minigame-tab-battleship').click();
      await assertNoUnintendedOverflow(page);
      await page.screenshot({ path: shot(`viewport-${tag}-battleship.png`), fullPage: true });
    }

    if (fs.existsSync(BEFORE_DIR)) {
      const before = path.join(BEFORE_DIR, 'after-minigame-caro-desktop.png');
      if (fs.existsSync(before)) {
        fs.copyFileSync(before, path.join(OUT, `${testInfo.project.name}--before-caro-reference.png`));
      }
    }
  });
});