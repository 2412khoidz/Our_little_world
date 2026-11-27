import { expect, test, type Locator, type Page } from '@playwright/test';

const pwPort = process.env.PLAYWRIGHT_PORT || '4173';
const BASE = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${pwPort}`;
const DEV_LAN = `${BASE}/api/dev-lan`;

const PORTRAIT_SHOT =
  'C:\\Users\\admin\\.gemini\\antigravity\\brain\\abe0ea89-5653-4f0c-a880-f2914bd8c9c0\\m0-portrait-candidate.png';
const LANDSCAPE_SHOT =
  'C:\\Users\\admin\\.gemini\\antigravity\\brain\\abe0ea89-5653-4f0c-a880-f2914bd8c9c0\\m0-landscape-candidate.png';

interface Box {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectsOverlap(a: Box, b: Box, tolerance = 1): boolean {
  return !(
    a.x + a.width <= b.x + tolerance ||
    b.x + b.width <= a.x + tolerance ||
    a.y + a.height <= b.y + tolerance ||
    b.y + b.height <= a.y + tolerance
  );
}

async function collectVisibleBoxes(items: Array<[string, Locator]>): Promise<Box[]> {
  const boxes: Box[] = [];
  for (const [name, loc] of items) {
    if ((await loc.count()) === 0) continue;
    const first = loc.first();
    if (!(await first.isVisible().catch(() => false))) continue;
    const box = await first.boundingBox();
    if (box && box.width > 0 && box.height > 0) {
      boxes.push({ name, ...box });
    }
  }
  return boxes;
}

async function assertNoHudOverlaps(page: Page, viewport: { width: number; height: number }) {
  const boxes = await collectVisibleBoxes([
    ['mobile-top-left-hud', page.getByTestId('mobile-top-left-hud')],
    ['mobile-top-right-hud', page.getByTestId('mobile-top-right-hud')],
    ['touch-joystick', page.getByTestId('touch-joystick')],
    ['game-hotbar', page.getByTestId('game-hotbar')],
    ['btn-context-primary', page.getByTestId('btn-context-primary')],
    ['btn-context-secondary', page.getByTestId('btn-context-secondary')],
    ['couple-emote-fab', page.getByTestId('couple-emote-fab')],
  ]);

  expect(boxes.length).toBeGreaterThanOrEqual(4);

  for (const b of boxes) {
    expect(b.x, `${b.name} x >= 0`).toBeGreaterThanOrEqual(-1);
    expect(b.y, `${b.name} y >= 0`).toBeGreaterThanOrEqual(-1);
    expect(b.x + b.width, `${b.name} fits width`).toBeLessThanOrEqual(viewport.width + 1);
    expect(b.y + b.height, `${b.name} fits height`).toBeLessThanOrEqual(viewport.height + 1);
  }

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      expect(
        rectsOverlap(a, b),
        `HUD overlap between ${a.name} (${JSON.stringify(a)}) and ${b.name} (${JSON.stringify(b)}) at ${viewport.width}x${viewport.height}`,
      ).toBe(false);
    }
  }
}

async function enterDevSeededWorld(page: Page, url = '/?vqg-capture=1') {
  await page.goto(url);
  await page.getByTestId('btn-dev-seed-couple').click();
  await page.getByTestId('preset-partner-a').click();
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await expect(canvas).toHaveAttribute('data-map-id', 'home', { timeout: 20_000 });
  await expect(page.getByTestId('game-hotbar')).toBeVisible({ timeout: 20_000 });
  return canvas;
}

test.describe('M0 — Mobile-first Game HUD, Touch Controls & Global Fullscreen', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${DEV_LAN}/reset`, { data: {} });
    expect(res.ok()).toBeTruthy();
  });

  test('portrait and landscape HUDs have zero overlaps, no J/K/I keycaps, and keep all 8 hotbar slots + inventory reachable', async ({
    browser,
  }) => {
    const viewports = [
      { width: 360, height: 800, mode: 'mobile-portrait' },
      { width: 390, height: 844, mode: 'mobile-portrait' },
      { width: 430, height: 932, mode: 'mobile-portrait' },
      { width: 800, height: 360, mode: 'mobile-landscape' },
      { width: 844, height: 390, mode: 'mobile-landscape' },
      { width: 932, height: 430, mode: 'mobile-landscape' },
    ] as const;

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const canvas = await enterDevSeededWorld(page);

    // Jump to farm so contextual plot actions + wallet + farm tools are visible
    await page.evaluate(() => {
      const w = window as Window & { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } };
      w.__OLW_VQG?.jump('farm', 29, 22);
    });
    await expect(canvas).toHaveAttribute('data-map-id', 'farm', { timeout: 15_000 });
    await page.waitForTimeout(350);

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(250);

      await expect(page.locator('.app-shell')).toHaveAttribute('data-hud-mode', vp.mode);
      // Oversized 7-button bottom quick-nav must be absent on mobile
      await expect(page.locator('.quick-nav')).toHaveCount(0);
      // Desktop J/K/I keycaps must NOT be displayed in mobile layout
      await expect(page.locator('.olw-keycap')).toHaveCount(0);
      await expect(page.getByTestId('hotbar-open-inventory-btn')).toBeVisible();
      await expect(page.getByTestId('btn-global-fullscreen')).toBeVisible();

      if (vp.mode === 'mobile-portrait') {
        await expect(page.getByTestId('hotbar-slot-1')).toBeVisible();
        await expect(page.getByTestId('hotbar-slot-4')).toBeVisible();
        await expect(page.getByTestId('hotbar-page-toggle')).toBeVisible();
        // Page 2 gives touch access to slots 5-8
        await page.getByTestId('hotbar-page-toggle').click();
        await expect(page.getByTestId('hotbar-slot-5')).toBeVisible();
        await expect(page.getByTestId('hotbar-slot-8')).toBeVisible();
        await page.getByTestId('hotbar-page-toggle').click();
      } else {
        // Landscape renders all 8 bound slots horizontally in one row
        for (let i = 1; i <= 8; i += 1) {
          await expect(page.getByTestId(`hotbar-slot-${i}`)).toBeVisible();
        }
      }

      if (vp.width === 390 && vp.height === 844) {
        // Stand beside a farm plot with Hoe selected so primary "Cuốc" action button is visible in shot
        await page.evaluate(() => {
          const w = window as Window & { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } };
          w.__OLW_VQG?.jump('farm', 16, 20);
        });
        await page.getByTestId('hotbar-slot-1').click();
        await page.waitForTimeout(250);
        await assertNoHudOverlaps(page, vp);
        await page.screenshot({ path: PORTRAIT_SHOT });
      } else if (vp.width === 844 && vp.height === 390) {
        await page.waitForTimeout(250);
        await assertNoHudOverlaps(page, vp);
        await page.screenshot({ path: LANDSCAPE_SHOT });
      } else {
        await assertNoHudOverlaps(page, vp);
      }
    }

    await context.close();
  });

  test('desktop layout remains unchanged (QuickNavBar + TopStatusBar + WorldClockHud + keycaps)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      hasTouch: false,
      isMobile: false,
    });
    const page = await context.newPage();
    await enterDevSeededWorld(page, '/');

    await expect(page.locator('.app-shell')).toHaveAttribute('data-hud-mode', 'desktop');
    await expect(page.locator('.quick-nav')).toBeVisible();
    await expect(page.locator('.top-status-bar')).toBeVisible();
    await expect(page.getByTestId('world-clock-hud')).toBeVisible();
    await expect(page.getByTestId('touch-joystick')).toHaveCount(0);
    await expect(page.getByTestId('hotbar-slot-8')).toBeVisible();
    await context.close();
  });

  test('orientation change preserves map, player position, held slot & pointer mapping without reloading', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const canvas = await enterDevSeededWorld(page);

    await page.evaluate(() => {
      const w = window as Window & { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } };
      w.__OLW_VQG?.jump('farm', 29, 22);
    });
    await expect(canvas).toHaveAttribute('data-map-id', 'farm', { timeout: 15_000 });
    await page.getByTestId('hotbar-slot-2').click();
    await expect(page.getByTestId('hotbar-slot-2')).toHaveAttribute('aria-pressed', 'true');

    const beforeTileX = await canvas.getAttribute('data-player-tile-x');
    const beforeTileY = await canvas.getAttribute('data-player-tile-y');

    // Rotate to landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);

    await expect(page.locator('.app-shell')).toHaveAttribute('data-hud-mode', 'mobile-landscape');
    await expect(canvas).toHaveAttribute('data-map-id', 'farm');
    expect(await canvas.getAttribute('data-player-tile-x')).toBe(beforeTileX);
    expect(await canvas.getAttribute('data-player-tile-y')).toBe(beforeTileY);
    await expect(page.getByTestId('hotbar-slot-2')).toHaveAttribute('aria-pressed', 'true');

    // Tap world canvas after rotation and verify pointer mapping moves player toward tap
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(box!.x + box!.width * 0.65, box!.y + box!.height * 0.45);
    await page.waitForTimeout(900);
    const afterX = await canvas.getAttribute('data-player-tile-x');
    const afterY = await canvas.getAttribute('data-player-tile-y');
    expect(afterX !== beforeTileX || afterY !== beforeTileY).toBe(true);

    await context.close();
  });

  test('simultaneous joystick movement + hotbar/action interaction & clean release/cancel lifecycle', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const canvas = await enterDevSeededWorld(page);

    const joy = page.getByTestId('touch-joystick');
    const jBox = await joy.boundingBox();
    expect(jBox).toBeTruthy();

    const cx = jBox!.x + jBox!.width / 2;
    const cy = jBox!.y + jBox!.height / 2;

    // Dispatch pointerdown + move with pointerId 101, then tap hotbar while stick stays active
    await joy.dispatchEvent('pointerdown', {
      pointerId: 101,
      pointerType: 'touch',
      clientX: cx,
      clientY: cy,
    });
    await joy.dispatchEvent('pointermove', {
      pointerId: 101,
      pointerType: 'touch',
      clientX: cx + 30,
      clientY: cy,
    });

    await expect(joy).toHaveAttribute('data-joy-active', '1');
    const vxActive = Number(await joy.getAttribute('data-joy-vx'));
    expect(vxActive).toBeGreaterThan(0.5);

    // While thumb #1 holds joystick, second thumb taps hotbar slot 1 cleanly
    await page.getByTestId('hotbar-slot-1').click();
    await expect(page.getByTestId('hotbar-slot-1')).toHaveAttribute('aria-pressed', 'true');
    await expect(joy).toHaveAttribute('data-joy-active', '1');

    // Pointercancel resets joystick to zero immediately (never stuck walking)
    await joy.dispatchEvent('pointercancel', {
      pointerId: 101,
      pointerType: 'touch',
      clientX: cx + 30,
      clientY: cy,
    });
    await expect(joy).toHaveAttribute('data-joy-active', '0');
    await expect(joy).toHaveAttribute('data-joy-vx', '0');
    await expect(joy).toHaveAttribute('data-joy-vy', '0');

    // Floating mode switches cleanly via MobileNavDrawer and also resets when modal opens
    await page.getByTestId('nav-menu').click();
    await expect(page.getByTestId('mobile-nav-drawer')).toBeVisible();
    await page.getByTestId('joystick-mode-floating').click();
    await page.getByTestId('mobile-nav-close').click();

    await expect(joy).toHaveAttribute('data-joy-mode', 'floating');
    await expect(canvas).toBeVisible();
    await context.close();
  });

  test('global fullscreen toggle persists across inventory & billiards open/close', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await enterDevSeededWorld(page);

    const fsBtn = page.getByTestId('btn-global-fullscreen');
    await fsBtn.click();
    await expect(page.locator('.app-shell')).toHaveAttribute('data-focus-expanded', '1');

    // Open & close Inventory — app focus/fullscreen must stay active
    await page.getByTestId('hotbar-open-inventory-btn').click();
    await expect(page.getByTestId('inventory-modal')).toBeVisible();
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.locator('.app-shell')).toHaveAttribute('data-focus-expanded', '1');

    // Open & close Billiards — app focus/fullscreen must stay active
    await page.getByTestId('nav-menu').click();
    await page.getByTestId('menu-billiards').click();
    const billiardsCloseBtn = page.getByTestId('billiards-close');
    await expect(billiardsCloseBtn).toBeVisible({ timeout: 15_000 });
    await billiardsCloseBtn.click();
    await expect(billiardsCloseBtn).toHaveCount(0);
    await expect(page.locator('.app-shell')).toHaveAttribute('data-focus-expanded', '1');

    // Explicit exit restores normal mode
    await fsBtn.click();
    await expect(page.locator('.app-shell')).toHaveAttribute('data-focus-expanded', '0');
    await context.close();
  });

  test('touch-only farming cycle: inventory bind hoe -> till -> plant -> water -> refill -> harvest -> shipping bin', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const canvas = await enterDevSeededWorld(page);

    // Jump right next to farm_main plot (16, 19) -> player stands at (16, 20)
    await page.evaluate(() => {
      const w = window as Window & { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } };
      w.__OLW_VQG?.jump('farm', 16, 20);
    });
    await expect(canvas).toHaveAttribute('data-map-id', 'farm', { timeout: 15_000 });

    // 1. Open inventory via persistent mobile backpack button & equip Hoe with tap ("Cầm ngay")
    await page.getByTestId('hotbar-open-inventory-btn').click();
    await expect(page.getByTestId('inventory-modal')).toBeVisible();
    await page.getByTestId('nuvora-cell-tool_hoe').click();
    await page.getByTestId('btn-equip-inspected-item').click();
    await expect(page.getByTestId('inventory-modal')).toHaveCount(0);

    // 2. Till soil using primary touch action button
    await expect(page.getByTestId('btn-context-primary')).toContainText('Cuốc');
    await page.getByTestId('btn-context-primary').click();
    await expect(page.getByTestId('stage-toast')).toContainText('Đã cuốc', { timeout: 10_000 });

    // 3. Switch directly on hotbar to wheat seeds & plant
    await page.getByTestId('hotbar-slot-3').click();
    await expect(page.getByTestId('btn-context-primary')).toContainText('Gieo');
    await page.getByTestId('btn-context-primary').click();
    await expect(page.getByTestId('stage-toast')).toContainText('Đã gieo', { timeout: 10_000 });

    // 4. Switch to watering can & water
    await page.getByTestId('hotbar-slot-2').click();
    await expect(page.getByTestId('btn-context-primary')).toContainText('Tưới');
    await page.getByTestId('btn-context-primary').click();
    await expect(page.getByTestId('stage-toast')).toContainText('Đã tưới', { timeout: 10_000 });

    // 5. Move to wishing well water source (30, 14) -> stand at (30, 16) & refill water can via touch
    await page.evaluate(() => {
      const w = window as Window & { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } };
      w.__OLW_VQG?.jump('farm', 30, 16);
    });
    await page.waitForTimeout(300);
    await expect(page.getByTestId('btn-context-primary')).toContainText('Múc nước');
    await page.getByTestId('btn-context-primary').click();
    await expect(page.getByTestId('interaction-notice-toast')).toContainText('múc đầy', { timeout: 10_000 });

    // 6. Wait for dev fast-grow wheat (~2.5s at 120x), return to plot (16, 20), and harvest via touch!
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const w = window as Window & { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } };
      w.__OLW_VQG?.jump('farm', 16, 20);
    });
    await page.waitForTimeout(350);
    await expect(page.getByTestId('btn-context-primary')).toContainText('Thu hoạch');
    await page.getByTestId('btn-context-primary').click();
    await expect(page.getByTestId('stage-toast')).toContainText('Thu hoạch', { timeout: 10_000 });

    // 7. Move beside shipping bin (13, 5) -> stand at (13, 6) and open shipping/sell via touch
    await page.evaluate(() => {
      const w = window as Window & { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } };
      w.__OLW_VQG?.jump('farm', 13, 6);
    });
    await page.waitForTimeout(300);
    await expect(page.getByTestId('btn-context-primary')).toContainText('Bán');
    await page.getByTestId('btn-context-primary').click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});
