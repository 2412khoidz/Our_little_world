import { expect, test, type Locator, type Page } from '@playwright/test';

async function joinSingleClient(
  page: Page,
  presetTestId: 'preset-partner-a' | 'preset-partner-b' = 'preset-partner-a',
): Promise<Locator> {
  const seedBtn = page.getByTestId('btn-dev-seed-couple');
  await expect(seedBtn).toBeVisible({ timeout: 10_000 });
  await seedBtn.click();
  const preset = page.getByTestId(presetTestId);
  await expect(preset).toBeVisible({ timeout: 10_000 });
  await preset.click();
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-render-suspended', '0', { timeout: 15_000 });
  return canvas;
}

async function openEntryMenu(page: Page): Promise<Locator> {
  await page.getByTestId('nav-menu').click();
  await expect(page.getByTestId('menu-billiards')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('menu-billiards').click();
  const modal = page.getByTestId('billiards-modal');
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('billiards-entry-menu')).toBeVisible({ timeout: 5_000 });
  return modal;
}

test.describe('Billiards V3 — Entry Menu, Modes, Controls, 3D Edition & Mobile Touch', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/dev-lan/reset', { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('plays 2D Local 2P offline, restores Space oscillating power + Escape cancel, isolates overworld WASD, and runs 2D Bot with separate stats', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    const worldCanvas = await joinSingleClient(page, 'preset-partner-a');

    // Verify partner does NOT need to be online for local/bot modes
    await expect(page.getByTestId('partner-presence-pill')).not.toHaveClass(/pill--partner-online/);

    const tileX0 = Number((await worldCanvas.getAttribute('data-player-tile-x')) ?? '0');
    const tileY0 = Number((await worldCanvas.getAttribute('data-player-tile-y')) ?? '0');

    const modal = await openEntryMenu(page);
    await expect(worldCanvas).toHaveAttribute('data-render-suspended', '1', { timeout: 5_000 });

    // Launch Local 2P 2D (8-Ball)
    await page.getByTestId('billiards-edition-2d').click();
    await page.getByTestId('billiards-mode-local').click();
    await page.getByTestId('billiards-entry-rule-8ball').click();
    await page.getByTestId('billiards-start-btn').click();

    const game2d = page.getByTestId('billiards-2d-game');
    await expect(game2d).toBeVisible({ timeout: 10_000 });
    await expect(game2d).toHaveAttribute('data-rule', '8ball');
    await expect(game2d).toHaveAttribute('data-phase', 'aim');

    // Keyboard isolation: Arrow/WASD while open must NOT move overworld avatar
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(350);
    await page.keyboard.up('KeyD');
    expect(Number((await worldCanvas.getAttribute('data-player-tile-x')) ?? '0')).toBe(tileX0);
    expect(Number((await worldCanvas.getAttribute('data-player-tile-y')) ?? '0')).toBe(tileY0);

    // Space oscillating power + Escape cancel
    await page.keyboard.down('Space');
    await expect
      .poll(async () => Number((await game2d.getAttribute('data-power-pct')) ?? '0'), { timeout: 3_000 })
      .toBeGreaterThan(20);
    await page.keyboard.press('Escape');
    await page.keyboard.up('Space');
    await expect(game2d).toHaveAttribute('data-power-pct', '0');
    await expect(game2d).toHaveAttribute('data-shot-count', '0');

    // Original ArrowRight aim + Space hold & release shoots
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(120);
    await page.keyboard.up('ArrowRight');

    await page.keyboard.down('Space');
    await expect
      .poll(async () => Number((await game2d.getAttribute('data-power-pct')) ?? '0'), { timeout: 3_000 })
      .toBeGreaterThan(25);
    await page.keyboard.up('Space');

    await expect(game2d).toHaveAttribute('data-shot-count', '1', { timeout: 10_000 });
    await expect(game2d).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });

    // Switch via in-game menu to Bot 2D (9-ball, medium)
    await page.getByTestId('billiards-menu-btn').click();
    await page.getByTestId('billiards-exit-to-menu').click();
    await expect(page.getByTestId('billiards-entry-menu')).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('billiards-edition-2d').click();
    await page.getByTestId('billiards-mode-ai').click();
    await page.getByTestId('billiards-bot-medium').click();
    await page.getByTestId('billiards-entry-rule-9ball').click();
    await page.getByTestId('billiards-start-btn').click();

    await expect(game2d).toBeVisible({ timeout: 10_000 });
    await expect(game2d).toHaveAttribute('data-rule', '9ball');
    await expect(game2d).toHaveAttribute('data-current-player', '0');

    // Human gentle break/shot using Space -> pass turn to Bot (slot 1), Bot shoots automatically!
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(120);
    await page.keyboard.up('ArrowDown');
    await page.keyboard.down('Space');
    await expect
      .poll(async () => Number((await game2d.getAttribute('data-power-pct')) ?? '0'), { timeout: 3_000 })
      .toBeGreaterThan(15);
    await page.keyboard.up('Space');

    await expect
      .poll(async () => Number((await game2d.getAttribute('data-shot-count')) ?? '0'), { timeout: 25_000 })
      .toBeGreaterThanOrEqual(2);

    // Online DB stats must remain untouched by Local/Bot modes
    const statsRes = await request.get('/api/dev-lan/billiards/stats', {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    if (statsRes.ok()) {
      const json = (await statsRes.json()) as { data?: { totalMatches: number } };
      expect(json.data?.totalMatches ?? 0).toBe(0);
    }

    // Close modal -> overworld render & keyboard movement resume cleanly
    await page.getByTestId('billiards-close').click();
    await expect(modal).toBeHidden();
    await expect(worldCanvas).toHaveAttribute('data-render-suspended', '0', { timeout: 5_000 });

    await worldCanvas.click({ position: { x: 180, y: 200 } });
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(450);
    await page.keyboard.up('KeyD');
    await expect
      .poll(
        async () => {
          const x = Number((await worldCanvas.getAttribute('data-player-tile-x')) ?? '0');
          const y = Number((await worldCanvas.getAttribute('data-player-tile-y')) ?? '0');
          return Math.abs(x - tileX0) + Math.abs(y - tileY0);
        },
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);

    expect(errors).toEqual([]);
  });

  test('plays 3D Local 2P & 3D Bot with camera modes, massé elevation, Space shooting & repeated open/close lifecycle', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    const worldCanvas = await joinSingleClient(page, 'preset-partner-a');

    // Open 3D Local 2P
    const modal = await openEntryMenu(page);
    await page.getByTestId('billiards-edition-3d').click();
    await page.getByTestId('billiards-mode-local').click();
    await page.getByTestId('billiards-3d-quality-medium').click();
    await page.getByTestId('billiards-start-btn').click();

    const game3d = page.getByTestId('billiards-3d-game');
    await expect(game3d).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('billiards-3d-stage')).toBeVisible();
    await expect(page.getByTestId('billiards-canvas-3d')).toBeVisible();

    const box = await page.getByTestId('billiards-canvas-3d').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(150);

    // Cycle 3D cameras & test Massé elevation slider
    const camBtn = page.getByTestId('billiards-3d-cam-btn');
    await expect(camBtn).toContainText('Gậy');
    await expect(game3d).toHaveAttribute('data-camera-mode', 'follow');
    await camBtn.click();
    await expect(camBtn).toContainText('Trên cao');
    await expect(game3d).toHaveAttribute('data-camera-mode', 'top');
    await camBtn.click();
    await expect(camBtn).toContainText('Góc rộng');
    await expect(game3d).toHaveAttribute('data-camera-mode', 'orbit');
    await camBtn.click();
    await expect(game3d).toHaveAttribute('data-camera-mode', 'follow');

    const elevSlider = page.getByTestId('billiards-3d-elev-slider');
    await elevSlider.fill('15');
    await expect(elevSlider).toHaveValue('15');
    await elevSlider.fill('0');

    // Fire 3D shot with original Space hold/release control
    await page.keyboard.down('Space');
    await expect
      .poll(async () => Number((await game3d.getAttribute('data-power-pct')) ?? '0'), { timeout: 3_000 })
      .toBeGreaterThan(20);
    await page.keyboard.up('Space');

    await expect(game3d).toHaveAttribute('data-shot-count', '1', { timeout: 15_000 });
    await expect(game3d).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });

    // Switch to 3D Bot and verify AI takes its turn in 3D physics
    await page.getByTestId('billiards-menu-btn').click();
    await page.getByTestId('billiards-exit-to-menu').click();
    await page.getByTestId('billiards-edition-3d').click();
    await page.getByTestId('billiards-mode-ai').click();
    await page.getByTestId('billiards-bot-easy').click();
    await page.getByTestId('billiards-start-btn').click();

    await expect(game3d).toBeVisible({ timeout: 15_000 });
    await page.keyboard.down('Space');
    await expect
      .poll(async () => Number((await game3d.getAttribute('data-power-pct')) ?? '0'), { timeout: 3_000 })
      .toBeGreaterThan(15);
    await page.keyboard.up('Space');

    await expect
      .poll(async () => Number((await game3d.getAttribute('data-shot-count')) ?? '0'), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(2);

    // Repeated open/close lifecycle (disposes WebGL cleanly and resumes overworld)
    await page.getByTestId('billiards-close').click();
    await expect(modal).toBeHidden();
    await expect(worldCanvas).toHaveAttribute('data-render-suspended', '0', { timeout: 5_000 });

    for (let i = 0; i < 3; i++) {
      await openEntryMenu(page);
      await page.getByTestId('billiards-edition-3d').click();
      await page.getByTestId('billiards-mode-local').click();
      await page.getByTestId('billiards-start-btn').click();
      await expect(game3d).toBeVisible({ timeout: 15_000 });
      await expect(worldCanvas).toHaveAttribute('data-render-suspended', '1');
      await page.getByTestId('billiards-close').click();
      await expect(worldCanvas).toHaveAttribute('data-render-suspended', '0', { timeout: 5_000 });
    }

    expect(errors).toEqual([]);
  });

  test('supports Online 3D partner invite, ready check, synchronized shot & reconnect', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const errors: string[] = [];
    pageA.on('pageerror', (err) => errors.push(`A:${err.message}`));
    pageB.on('pageerror', (err) => errors.push(`B:${err.message}`));

    await pageA.goto('/');
    await pageB.goto('/');
    await joinSingleClient(pageA, 'preset-partner-a');
    await joinSingleClient(pageB, 'preset-partner-b');

    // Client A opens Online Lobby, switches to 3D, invites Client B
    await openEntryMenu(pageA);
    await pageA.getByTestId('billiards-mode-online').click();
    await pageA.getByTestId('billiards-start-btn').click();
    await expect(pageA.getByTestId('billiards-online-lobby')).toBeVisible({ timeout: 10_000 });
    await pageA.getByTestId('lobby-edition-3d').click();
    await pageA.getByTestId('billiards-invite-partner').click();

    // Client B receives overworld invite toast & clicks accept -> goes to lobby
    await expect(pageB.getByTestId('billiards-invite-banner')).toBeVisible({ timeout: 10_000 });
    await pageB.getByTestId('billiards-invite-accept').click();
    await expect(pageB.getByTestId('billiards-online-lobby')).toBeVisible({ timeout: 10_000 });

    // Wait for both clients to finish preloading Three.js / 3D assets
    await expect(pageA.getByTestId('lobby-player-0')).toHaveAttribute('data-assets-ready', '1', { timeout: 20_000 });
    await expect(pageA.getByTestId('lobby-player-1')).toHaveAttribute('data-assets-ready', '1', { timeout: 20_000 });
    await expect(pageB.getByTestId('lobby-player-0')).toHaveAttribute('data-assets-ready', '1', { timeout: 20_000 });
    await expect(pageB.getByTestId('lobby-player-1')).toHaveAttribute('data-assets-ready', '1', { timeout: 20_000 });

    await Promise.all([
      pageA.getByTestId('billiards-lobby-ready-btn').click(),
      pageB.getByTestId('billiards-lobby-ready-btn').click(),
    ]);

    const game3dA = pageA.getByTestId('billiards-3d-game');
    const game3dB = pageB.getByTestId('billiards-3d-game');
    await expect(game3dA).toBeVisible({ timeout: 20_000 });
    await expect(game3dB).toBeVisible({ timeout: 20_000 });

    const matchIdA = await game3dA.getAttribute('data-match-id');
    expect(matchIdA).toBeTruthy();
    await expect(game3dB).toHaveAttribute('data-match-id', matchIdA!, { timeout: 10_000 });

    // Client A shoots 3D break via Space -> Client B synchronizes shotSeq=1 & settled stateVersion
    await expect(game3dA).toHaveAttribute('data-phase', 'aim', { timeout: 10_000 });
    await pageA.keyboard.down('Space');
    await expect
      .poll(async () => Number((await game3dA.getAttribute('data-power-pct')) ?? '0'), { timeout: 3_000 })
      .toBeGreaterThan(20);
    await pageA.keyboard.up('Space');

    await expect(game3dA).toHaveAttribute('data-shot-seq', '1', { timeout: 20_000 });
    await expect(game3dB).toHaveAttribute('data-shot-seq', '1', { timeout: 20_000 });
    await expect(game3dA).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
    await expect(game3dB).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });

    const svAfterShot = await game3dA.getAttribute('data-state-version');
    expect(await game3dB.getAttribute('data-state-version')).toBe(svAfterShot);

    // Reload Client B -> reopen modal -> resume online 3D match cleanly
    await pageB.reload();
    await pageB.getByTestId('game-canvas-host').locator('canvas').waitFor({ state: 'visible', timeout: 15_000 });
    await openEntryMenu(pageB);
    await expect(pageB.getByTestId('billiards-resume-online-btn')).toBeVisible({ timeout: 10_000 });
    await pageB.getByTestId('billiards-resume-online-btn').click();
    await expect(game3dB).toBeVisible({ timeout: 20_000 });
    await expect(game3dB).toHaveAttribute('data-match-id', matchIdA!, { timeout: 10_000 });
    await expect(game3dB).toHaveAttribute('data-shot-seq', '1', { timeout: 10_000 });

    expect(errors).toEqual([]);
    await ctxA.close();
    await ctxB.close();
  });

  test('supports mobile touch controls & responsive 2D/3D layout at 430x932 viewport', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const ctx = await browser.newContext({
      viewport: { width: 430, height: 932 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await joinSingleClient(page, 'preset-partner-a');

    await openEntryMenu(page);
    await page.getByTestId('billiards-edition-2d').click();
    await page.getByTestId('billiards-mode-local').click();
    await page.getByTestId('billiards-start-btn').click();
    const game2d = page.getByTestId('billiards-2d-game');
    await expect(game2d).toBeVisible({ timeout: 10_000 });

    // Mobile aim buttons visible & functional
    await expect(page.getByTestId('billiards-aim-left')).toBeVisible();
    await expect(page.getByTestId('billiards-aim-right')).toBeVisible();
    await page.getByTestId('billiards-aim-right').dispatchEvent('pointerdown');
    await page.waitForTimeout(120);
    await page.getByTestId('billiards-aim-right').dispatchEvent('pointerup');

    // Touch drag on power slot
    const slot = page.getByTestId('billiards-power-slot');
    const box = await slot.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 12);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.65, { steps: 6 });
    await page.mouse.up();

    await expect(game2d).toHaveAttribute('data-shot-count', '1', { timeout: 10_000 });

    // Switch to 3D on mobile 430x932 and verify no broken/zero-sized canvas
    await page.getByTestId('billiards-menu-btn').click();
    await page.getByTestId('billiards-exit-to-menu').click();
    await page.getByTestId('billiards-edition-3d').click();
    await page.getByTestId('billiards-start-btn').click();
    await expect(page.getByTestId('billiards-3d-game')).toBeVisible({ timeout: 20_000 });
    const box3d = await page.getByTestId('billiards-canvas-3d').boundingBox();
    expect(box3d).not.toBeNull();
    expect(box3d!.width).toBeGreaterThan(250);
    expect(box3d!.height).toBeGreaterThan(180);

    expect(errors).toEqual([]);
    await ctx.close();
  });
});
