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

    // Launch Local 2P 2D (8-Ball) — rule lives cleanly in secondary settings modal
    await page.getByTestId('billiards-edition-2d').click();
    await page.getByTestId('billiards-mode-local').click();
    await page.getByTestId('billiards-entry-settings-btn').click();
    await page.getByTestId('billiards-entry-rule-8ball').click();
    await page.getByTestId('billiards-entry-settings-close').click();
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
    await page.getByTestId('billiards-entry-settings-btn').click();
    await page.getByTestId('billiards-bot-medium').click();
    await page.getByTestId('billiards-entry-rule-9ball').click();
    await page.getByTestId('billiards-entry-settings-close').click();
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

    // Open 3D Local 2P (settings modal holds 3D quality)
    const modal = await openEntryMenu(page);
    await page.getByTestId('billiards-edition-3d').click();
    await page.getByTestId('billiards-mode-local').click();
    await page.getByTestId('billiards-entry-settings-btn').click();
    await page.getByTestId('billiards-3d-quality-medium').click();
    await page.getByTestId('billiards-entry-settings-close').click();
    await page.getByTestId('billiards-start-btn').click();

    const game3d = page.getByTestId('billiards-3d-game');
    await expect(game3d).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('billiards-3d-stage')).toBeVisible();
    await expect(page.getByTestId('billiards-canvas-3d')).toBeVisible();

    const box = await page.getByTestId('billiards-canvas-3d').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(150);

    // Verify 3-button direct 3D camera switcher + Massé elevation slider
    await expect(game3d).toHaveAttribute('data-camera-mode', 'follow');
    await page.getByTestId('billiards-3d-cam-top').click();
    await expect(game3d).toHaveAttribute('data-camera-mode', 'top');
    await page.getByTestId('billiards-3d-cam-orbit').click();
    await expect(game3d).toHaveAttribute('data-camera-mode', 'orbit');
    await page.getByTestId('billiards-3d-cam-follow').click();
    await expect(game3d).toHaveAttribute('data-camera-mode', 'follow');

    const elevSlider = page.getByTestId('billiards-3d-elev-slider');
    await elevSlider.fill('15');
    await expect(elevSlider).toHaveValue('15');
    await elevSlider.fill('0');

    // Collect Chromium 3D RAF frame-time stats once 15+ frames render
    await expect
      .poll(async () => await game3d.getAttribute('data-perf-p50'), { timeout: 5_000 })
      .not.toBeNull();
    const perfP50 = await game3d.getAttribute('data-perf-p50');
    const perfP95 = await game3d.getAttribute('data-perf-p95');
    console.log(`[Chromium Desktop 3D] frame-time p50=${perfP50}ms p95=${perfP95}ms`);

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
    await page.getByTestId('billiards-entry-settings-btn').click();
    await page.getByTestId('billiards-bot-easy').click();
    await page.getByTestId('billiards-entry-settings-close').click();
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

    // Regression check: after exiting 3D Online, entering Online from Entry Menu stays in Lobby (never auto-opens 3D)
    await pageA.getByTestId('billiards-menu-btn').click();
    await pageA.getByTestId('billiards-exit-to-menu').click();
    await expect(pageA.getByTestId('billiards-entry-menu')).toBeVisible({ timeout: 5_000 });
    await pageB.getByTestId('billiards-menu-btn').click();
    await pageB.getByTestId('billiards-exit-to-menu').click();

    await pageA.getByTestId('billiards-edition-3d').click();
    await pageA.getByTestId('billiards-mode-online').click();
    await pageA.getByTestId('billiards-start-btn').click();
    await expect(pageA.getByTestId('billiards-online-lobby')).toBeVisible({ timeout: 5_000 });
    await pageA.waitForTimeout(400);
    await expect(game3dA).toBeHidden();
    await pageA.getByTestId('lobby-edition-2d').click();
    await expect(pageA.getByTestId('billiards-online-lobby')).toBeVisible();

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

    const boxesOverlap = (
      a: { x: number; y: number; width: number; height: number } | null,
      b: { x: number; y: number; width: number; height: number } | null,
    ) => {
      if (!a || !b) return false;
      return (
        a.x < b.x + b.width - 1 &&
        a.x + a.width > b.x + 1 &&
        a.y < b.y + b.height - 1 &&
        a.y + a.height > b.y + 1
      );
    };

    await page.goto('/');
    await joinSingleClient(page, 'preset-partner-a');

    await openEntryMenu(page);
    await page.getByTestId('billiards-edition-2d').click();
    await page.getByTestId('billiards-mode-practice').click();
    await page.getByTestId('billiards-start-btn').click();
    const game2d = page.getByTestId('billiards-2d-game');
    await expect(game2d).toBeVisible({ timeout: 10_000 });

    // Verify 2D Portrait Vertical Table & Zero-Overlap 2-Row HUD on 430x932
    await expect(game2d).toHaveAttribute('data-portrait', '1');
    const canvas2dBox = await page.getByTestId('billiards-canvas').boundingBox();
    expect(canvas2dBox).not.toBeNull();
    expect(canvas2dBox!.height).toBeGreaterThan(canvas2dBox!.width * 1.3);

    const menuBox = await page.getByTestId('billiards-menu-btn').boundingBox();
    const lockBox = await page.getByTestId('billiards-aim-lock').boundingBox();
    const spinBox = await page.getByTestId('billiards-spin-btn').boundingBox();
    const scoreBox = await page.getByTestId('billiards-score').boundingBox();
    expect(boxesOverlap(menuBox, scoreBox)).toBe(false);
    expect(boxesOverlap(lockBox, scoreBox)).toBe(false);
    expect(boxesOverlap(spinBox, scoreBox)).toBe(false);

    // Aim Lock toggles cleanly
    await page.getByTestId('billiards-aim-lock').click();
    await expect(game2d).toHaveAttribute('data-aim-locked', '1');
    await page.getByTestId('billiards-aim-lock').click();
    await expect(game2d).toHaveAttribute('data-aim-locked', '0');

    // Touch power cancel zone: pulling sideways aborts shot without firing
    const slot = page.getByTestId('billiards-power-slot');
    const box = await slot.boundingBox();
    expect(box).not.toBeNull();
    await slot.dispatchEvent('pointerdown', {
      pointerId: 11,
      pointerType: 'touch',
      clientX: box!.x + box!.width / 2,
      clientY: box!.y + 16,
    });
    await slot.dispatchEvent('pointermove', {
      pointerId: 11,
      pointerType: 'touch',
      clientX: box!.x + box!.width / 2 + 80,
      clientY: box!.y + 110,
    });
    await expect(page.getByTestId('billiards-power-cancel-tag')).toBeVisible();
    await slot.dispatchEvent('pointerup', { pointerId: 11, pointerType: 'touch' });
    await expect(game2d).toHaveAttribute('data-shot-count', '0');

    // Touch V3.2: short tap aims directly on table WITHOUT shooting, and drag obeys intuitive clockwise/CCW direction
    const canvas2d = page.getByTestId('billiards-canvas');
    const initialAimDeg = Number((await game2d.getAttribute('data-aim-deg')) ?? '0');
    const tapX = canvas2dBox!.x + canvas2dBox!.width * 0.78;
    const tapY = canvas2dBox!.y + canvas2dBox!.height * 0.25;
    await canvas2d.dispatchEvent('pointerdown', { pointerId: 21, pointerType: 'touch', clientX: tapX, clientY: tapY });
    await canvas2d.dispatchEvent('pointerup', { pointerId: 21, pointerType: 'touch', clientX: tapX, clientY: tapY });
    await expect(game2d).toHaveAttribute('data-shot-count', '0');
    await expect
      .poll(async () => Number((await game2d.getAttribute('data-aim-deg')) ?? '0'), { timeout: 2_000 })
      .not.toBe(initialAimDeg);

    // 2->1 finger pinch transition never jumps aimAngle
    const aimBeforePinch = Number((await game2d.getAttribute('data-aim-deg')) ?? '0');
    await canvas2d.dispatchEvent('pointerdown', { pointerId: 31, pointerType: 'touch', clientX: tapX - 20, clientY: tapY });
    await canvas2d.dispatchEvent('pointerdown', { pointerId: 32, pointerType: 'touch', clientX: tapX + 20, clientY: tapY });
    await canvas2d.dispatchEvent('pointermove', { pointerId: 32, pointerType: 'touch', clientX: tapX + 60, clientY: tapY + 20 });
    await canvas2d.dispatchEvent('pointerup', { pointerId: 32, pointerType: 'touch', clientX: tapX + 60, clientY: tapY + 20 });
    await canvas2d.dispatchEvent('pointermove', { pointerId: 31, pointerType: 'touch', clientX: tapX - 80, clientY: tapY + 80 });
    await canvas2d.dispatchEvent('pointerup', { pointerId: 31, pointerType: 'touch', clientX: tapX - 80, clientY: tapY + 80 });
    expect(Number((await game2d.getAttribute('data-aim-deg')) ?? '0')).toBe(aimBeforePinch);

    // Mobile aim buttons visible & functional + normal power pull shoots (Practice mode keeps cue free!)
    await expect(page.getByTestId('billiards-aim-left')).toBeVisible();
    await expect(page.getByTestId('billiards-aim-right')).toBeVisible();
    await page.getByTestId('billiards-aim-right').dispatchEvent('pointerdown');
    await page.waitForTimeout(120);
    await page.getByTestId('billiards-aim-right').dispatchEvent('pointerup');

    await page.mouse.move(box!.x + box!.width / 2, box!.y + 12);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.65, { steps: 6 });
    await page.mouse.up();

    await expect(game2d).toHaveAttribute('data-shot-count', '1', { timeout: 10_000 });
    await expect(game2d).toHaveAttribute('data-phase', 'aim', { timeout: 15_000 });

    // Switch to 3D Practice on mobile 430x932 and verify zero HUD/dock/hand-hint overlap + non-zero 3D canvas
    await page.getByTestId('billiards-menu-btn').click();
    await page.getByTestId('billiards-exit-to-menu').click();
    await page.getByTestId('billiards-edition-3d').click();
    await page.getByTestId('billiards-mode-practice').click();
    await page.getByTestId('billiards-start-btn').click();
    const game3d = page.getByTestId('billiards-3d-game');
    await expect(game3d).toBeVisible({ timeout: 20_000 });
    const box3d = await page.getByTestId('billiards-canvas-3d').boundingBox();
    expect(box3d).not.toBeNull();
    expect(box3d!.width).toBeGreaterThan(250);
    expect(box3d!.height).toBeGreaterThan(180);

    const cam3dBox = await page.getByTestId('billiards-3d-cam-top').boundingBox();
    const score3dBox = await page.getByTestId('billiards-score').boundingBox();
    const hint3dBox = await page.getByTestId('billiards-3d-hand-hint').boundingBox();
    const elev3dBox = await page.getByTestId('billiards-3d-elev-slider').boundingBox();
    expect(boxesOverlap(cam3dBox, score3dBox)).toBe(false);
    expect(boxesOverlap(hint3dBox, elev3dBox)).toBe(false);

    await page.getByTestId('billiards-3d-cam-top').click();
    await expect(game3d).toHaveAttribute('data-camera-mode', 'top');
    await page.getByTestId('billiards-3d-cam-orbit').click();
    await expect(game3d).toHaveAttribute('data-camera-mode', 'orbit');

    await expect
      .poll(async () => await game3d.getAttribute('data-perf-p50'), { timeout: 5_000 })
      .not.toBeNull();
    console.log(
      `[Chromium 430x932 Mobile 3D] frame-time p50=${await game3d.getAttribute('data-perf-p50')}ms p95=${await game3d.getAttribute('data-perf-p95')}ms`,
    );

    expect(errors).toEqual([]);
    await ctx.close();
  });
});
