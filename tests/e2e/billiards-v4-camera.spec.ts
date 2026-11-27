import { expect, test, type Locator, type Page } from '@playwright/test';

const EVIDENCE_DIR =
  'C:/Users/admin/.gemini/antigravity/brain/24b47324-befd-429f-943a-9e667665073e/scratch';

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

async function openEntryMenu(page: Page): Promise<void> {
  await page.getByTestId('nav-menu').click();
  await expect(page.getByTestId('menu-billiards')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('menu-billiards').click();
  await expect(page.getByTestId('billiards-modal')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('billiards-entry-menu')).toBeVisible({ timeout: 5_000 });
}

test.describe('Billiards V4 — Touch Sensitivity, Ball Tap Discrimination & Adaptive Camera', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post('/api/dev-lan/reset', { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('P0-A / P4: persists touch sensitivities & shot camera mode across reload and resets to defaults', async ({
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

    await page.getByTestId('billiards-entry-settings-btn').click();
    await expect(page.getByTestId('billiards-touch-settings')).toBeVisible();

    // Verify P0-A defaults & mobile P4 default (Adaptive)
    await expect(page.getByTestId('billiards-sens-aim')).toHaveValue('65');
    await expect(page.getByTestId('billiards-sens-fine')).toHaveValue('30');
    await expect(page.getByTestId('billiards-sens-cam')).toHaveValue('75');
    await expect(page.getByTestId('billiards-sens-zoom')).toHaveValue('80');
    await expect(page.getByTestId('billiards-shot-cam-adaptive')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Adjust min/max & switch shot camera mode to Tactical Overview
    await page.getByTestId('billiards-sens-aim').fill('15');
    await page.getByTestId('billiards-sens-fine').fill('10');
    await page.getByTestId('billiards-sens-cam').fill('150');
    await page.getByTestId('billiards-sens-zoom').fill('180');
    await page.getByTestId('billiards-shot-cam-overview').click();
    await expect(page.getByTestId('billiards-shot-cam-overview')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Reload and verify localStorage persistence
    await page.reload();
    await page.getByTestId('game-canvas-host').locator('canvas').waitFor({ state: 'visible', timeout: 15_000 });
    await openEntryMenu(page);
    await page.getByTestId('billiards-entry-settings-btn').click();
    await expect(page.getByTestId('billiards-sens-aim')).toHaveValue('15');
    await expect(page.getByTestId('billiards-sens-fine')).toHaveValue('10');
    await expect(page.getByTestId('billiards-sens-cam')).toHaveValue('150');
    await expect(page.getByTestId('billiards-sens-zoom')).toHaveValue('180');
    await expect(page.getByTestId('billiards-shot-cam-overview')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    // Reset to default restores exact baseline values
    await page.getByTestId('billiards-touch-reset').click();
    await expect(page.getByTestId('billiards-sens-aim')).toHaveValue('65');
    await expect(page.getByTestId('billiards-sens-fine')).toHaveValue('30');
    await expect(page.getByTestId('billiards-sens-cam')).toHaveValue('75');
    await expect(page.getByTestId('billiards-sens-zoom')).toHaveValue('80');
    await expect(page.getByTestId('billiards-shot-cam-adaptive')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('P0-B through P4: accurate 3D ball tap focus, locked-cue fine aim, Adaptive Cinematic, Tactical Overview & Manual Override on Mobile 3D', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
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

    await page.getByTestId('billiards-edition-3d').click();
    await page.getByTestId('billiards-mode-local').click();
    await page.getByTestId('billiards-start-btn').click();

    const game3d = page.getByTestId('billiards-3d-game');
    await expect(game3d).toBeVisible({ timeout: 20_000 });
    await expect(game3d).toHaveAttribute('data-shot-camera-mode', 'adaptive');
    await expect(game3d).toHaveAttribute('data-camera-stage', 'aiming');
    await page.waitForTimeout(350);

    await page.screenshot({ path: `${EVIDENCE_DIR}/v4-mobile-3d-aiming.png` });

    // Switch to Top view cleanly so ball #1 (apex) and empty felt positions are geometrically known
    await page.getByTestId('billiards-3d-cam-top').click();
    await expect(game3d).toHaveAttribute('data-camera-mode', 'top');
    await expect
      .poll(async () => Number((await game3d.getAttribute('data-cam-y')) ?? '0'), { timeout: 5_000 })
      .toBeGreaterThan(2.75);
    await page.waitForTimeout(250); // allow final quaternion alignment before raycasting tap tests

    const canvas3d = page.getByTestId('billiards-canvas-3d');
    const cBox = await canvas3d.boundingBox();
    expect(cBox).not.toBeNull();

    const aimBeforeTaps = await game3d.getAttribute('data-aim-deg');

    // 1. Tap empty felt (upper-left quadrant away from rack/cue) -> focus must remain empty
    const emptyX = cBox!.x + cBox!.width * 0.72;
    const emptyY = cBox!.y + cBox!.height * 0.52;
    await canvas3d.dispatchEvent('pointerdown', {
      pointerId: 101,
      pointerType: 'touch',
      clientX: emptyX,
      clientY: emptyY,
    });
    await canvas3d.dispatchEvent('pointerup', {
      pointerId: 101,
      pointerType: 'touch',
      clientX: emptyX,
      clientY: emptyY,
    });
    await expect(game3d).toHaveAttribute('data-focused-ball-id', '');
    await expect(game3d).toHaveAttribute('data-aim-deg', aimBeforeTaps!);

    // 2. Tap rail / background corner -> focus must remain empty
    await canvas3d.dispatchEvent('pointerdown', {
      pointerId: 102,
      pointerType: 'touch',
      clientX: cBox!.x + 14,
      clientY: cBox!.y + 14,
    });
    await canvas3d.dispatchEvent('pointerup', {
      pointerId: 102,
      pointerType: 'touch',
      clientX: cBox!.x + 14,
      clientY: cBox!.y + 14,
    });
    await expect(game3d).toHaveAttribute('data-focused-ball-id', '');

    // 3. Probe/tap rack apex ball (#1 at +HALF_W_3D*0.5, z=0 => top-center ~0.294 H in top portrait view)
    let foundApexFocus = false;
    let apexTapY = cBox!.y + cBox!.height * 0.294;
    for (const fracY of [0.294, 0.282, 0.305, 0.27, 0.318]) {
      const bx = cBox!.x + cBox!.width * 0.5;
      const by = cBox!.y + cBox!.height * fracY;
      await canvas3d.dispatchEvent('pointerdown', {
        pointerId: 103,
        pointerType: 'touch',
        clientX: bx,
        clientY: by,
      });
      await canvas3d.dispatchEvent('pointerup', {
        pointerId: 103,
        pointerType: 'touch',
        clientX: bx,
        clientY: by,
      });
      const fId = await game3d.getAttribute('data-focused-ball-id');
      if (fId && fId !== '0') {
        foundApexFocus = true;
        apexTapY = by;
        break;
      }
    }
    expect(foundApexFocus).toBe(true);
    const focusedBallAfterTap = await game3d.getAttribute('data-focused-ball-id');
    // Aim & lock & power must NEVER be disturbed by tapping a ball
    await expect(game3d).toHaveAttribute('data-aim-deg', aimBeforeTaps!);
    await expect(game3d).toHaveAttribute('data-aim-locked', '0');
    await expect(game3d).toHaveAttribute('data-power-pct', '0');

    // 4. Lock cue, switch to Follow view after focusing ball #1, then tap empty space & fine-drag
    await page.getByTestId('billiards-3d-cam-follow').click();
    await expect(game3d).toHaveAttribute('data-focused-ball-id', '');

    // Re-focus ball #1 from top view, then lock cue & drag empty space
    await page.getByTestId('billiards-3d-cam-top').click();
    await expect
      .poll(async () => Number((await game3d.getAttribute('data-cam-y')) ?? '0'), { timeout: 5_000 })
      .toBeGreaterThan(2.75);
    await page.waitForTimeout(200);
    const bx = cBox!.x + cBox!.width * 0.5;
    const by = apexTapY;
    await canvas3d.dispatchEvent('pointerdown', { pointerId: 104, pointerType: 'touch', clientX: bx, clientY: by });
    await canvas3d.dispatchEvent('pointerup', { pointerId: 104, pointerType: 'touch', clientX: bx, clientY: by });

    await page.getByTestId('billiards-aim-lock').click();
    await expect(game3d).toHaveAttribute('data-aim-locked', '1');
    const aimAtLock = Number((await game3d.getAttribute('data-aim-deg')) ?? '0');

    // Tapping empty felt while locked must NOT change aim OR focused ball
    await canvas3d.dispatchEvent('pointerdown', { pointerId: 105, pointerType: 'touch', clientX: emptyX, clientY: emptyY });
    await canvas3d.dispatchEvent('pointerup', { pointerId: 105, pointerType: 'touch', clientX: emptyX, clientY: emptyY });
    await expect(game3d).toHaveAttribute('data-focused-ball-id', focusedBallAfterTap!);
    expect(Number((await game3d.getAttribute('data-aim-deg')) ?? '0')).toBe(aimAtLock);

    // Dragging starting directly ON ball must NOT refocus or jump aim
    await canvas3d.dispatchEvent('pointerdown', { pointerId: 106, pointerType: 'touch', clientX: bx, clientY: by });
    await canvas3d.dispatchEvent('pointermove', { pointerId: 106, pointerType: 'touch', clientX: bx + 65, clientY: by + 20 });
    await canvas3d.dispatchEvent('pointerup', { pointerId: 106, pointerType: 'touch', clientX: bx + 65, clientY: by + 20 });
    await expect(game3d).toHaveAttribute('data-focused-ball-id', focusedBallAfterTap!);

    // Pinch zoom (2 fingers) must NOT select cue ball / alter focus
    await canvas3d.dispatchEvent('pointerdown', { pointerId: 107, pointerType: 'touch', clientX: bx - 15, clientY: by });
    await canvas3d.dispatchEvent('pointerdown', { pointerId: 108, pointerType: 'touch', clientX: bx + 15, clientY: by });
    await canvas3d.dispatchEvent('pointermove', { pointerId: 108, pointerType: 'touch', clientX: bx + 55, clientY: by + 15 });
    await canvas3d.dispatchEvent('pointerup', { pointerId: 108, pointerType: 'touch', clientX: bx + 55, clientY: by + 15 });
    await canvas3d.dispatchEvent('pointerup', { pointerId: 107, pointerType: 'touch', clientX: bx - 15, clientY: by });
    await expect(game3d).toHaveAttribute('data-focused-ball-id', focusedBallAfterTap!);

    // Unlock cue, return to Follow view, fire break shot in Adaptive Cinematic mode
    await page.getByTestId('billiards-aim-lock').click();
    await page.getByTestId('billiards-3d-cam-follow').click();
    await page.waitForTimeout(300);

    // Pull power bar to shoot!
    const slot = page.getByTestId('billiards-power-slot');
    const slotBox = await slot.boundingBox();
    expect(slotBox).not.toBeNull();
    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + 12);
    await page.mouse.down();
    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + slotBox!.height * 0.72, {
      steps: 6,
    });
    await page.mouse.up();

    // Verify camera transitions automatically into tracking -> overview and STAYS in overview after settle!
    await expect(game3d).toHaveAttribute('data-phase', 'moving', { timeout: 5_000 });
    await expect
      .poll(async () => await game3d.getAttribute('data-camera-stage'), { timeout: 5_000 })
      .toMatch(/shot_transition|tracking/);

    await page.waitForTimeout(300);
    await page.screenshot({ path: `${EVIDENCE_DIR}/v4-mobile-3d-tracking.png` });

    await expect(game3d).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
    await expect(game3d).toHaveAttribute('data-camera-stage', 'overview');
    await expect(game3d).toHaveAttribute('data-camera-mode', 'top');
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${EVIDENCE_DIR}/v4-mobile-3d-postshot-overview.png` });

    // P3 Manual Override during next active shot
    await page.getByTestId('billiards-3d-cam-follow').click();
    await expect(game3d).toHaveAttribute('data-camera-stage', 'aiming');
    await page.waitForTimeout(250);

    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + 12);
    await page.mouse.down();
    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + slotBox!.height * 0.68, {
      steps: 6,
    });
    await page.mouse.up();

    await expect(game3d).toHaveAttribute('data-phase', 'moving', { timeout: 5_000 });
    await expect
      .poll(async () => await game3d.getAttribute('data-camera-stage'), { timeout: 5_000 })
      .toBe('tracking');

    // Deliberately drag canvas during active shot -> hands over camera immediately to manual_override + orbit!
    await canvas3d.dispatchEvent('pointerdown', {
      pointerId: 120,
      pointerType: 'touch',
      clientX: emptyX,
      clientY: emptyY,
    });
    await canvas3d.dispatchEvent('pointermove', {
      pointerId: 120,
      pointerType: 'touch',
      clientX: emptyX + 45,
      clientY: emptyY + 15,
    });
    await canvas3d.dispatchEvent('pointerup', {
      pointerId: 120,
      pointerType: 'touch',
      clientX: emptyX + 45,
      clientY: emptyY + 15,
    });
    await expect(game3d).toHaveAttribute('data-camera-stage', 'manual_override');
    await expect(game3d).toHaveAttribute('data-camera-mode', 'orbit');

    // Wait for shot settle -> stays under player control rather than reclaiming
    await expect(game3d).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
    await expect(game3d).toHaveAttribute('data-camera-mode', 'orbit');

    // Switch shot camera mode to Manual in in-game Settings -> shot stays in follow view
    await page.getByTestId('billiards-menu-btn').click();
    await page.getByTestId('billiards-shot-cam-manual').click();
    await page.keyboard.press('Escape');
    await expect(game3d).toHaveAttribute('data-shot-camera-mode', 'manual');

    await page.getByTestId('billiards-3d-cam-follow').click();
    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + 12);
    await page.mouse.down();
    await page.mouse.move(slotBox!.x + slotBox!.width / 2, slotBox!.y + slotBox!.height * 0.45, {
      steps: 4,
    });
    await page.mouse.up();
    await expect(game3d).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
    await expect(game3d).toHaveAttribute('data-camera-mode', 'follow');
    await expect(game3d).toHaveAttribute('data-camera-stage', 'aiming');

    // Switch shot camera mode to Overview + test Landscape Mobile (844x390)
    await page.getByTestId('billiards-menu-btn').click();
    await page.getByTestId('billiards-shot-cam-overview').click();
    await page.keyboard.press('Escape');
    await expect(game3d).toHaveAttribute('data-shot-camera-mode', 'overview');

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(350);
    const landscapeBox = await canvas3d.boundingBox();
    expect(landscapeBox).not.toBeNull();
    expect(landscapeBox!.width).toBeGreaterThan(landscapeBox!.height);
    // Verify zero HUD button overlap on landscape 844x390 header
    const fsBtnBox = await page.getByTestId('billiards-fullscreen-btn').boundingBox();
    const scoreBoxLand = await page.getByTestId('billiards-score').boundingBox();
    expect(fsBtnBox).not.toBeNull();
    expect(scoreBoxLand).not.toBeNull();
    expect(fsBtnBox!.x + fsBtnBox!.width).toBeLessThan(scoreBoxLand!.x + 1);

    const slotLand = await slot.boundingBox();
    expect(slotLand).not.toBeNull();
    await page.mouse.move(slotLand!.x + slotLand!.width / 2, slotLand!.y + 10);
    await page.mouse.down();
    await page.mouse.move(slotLand!.x + slotLand!.width / 2, slotLand!.y + slotLand!.height * 0.45, {
      steps: 4,
    });
    await page.mouse.up();
    await expect(game3d).toHaveAttribute('data-phase', 'aim', { timeout: 20_000 });
    await expect(game3d).toHaveAttribute('data-camera-stage', 'overview');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${EVIDENCE_DIR}/v4-mobile-3d-landscape-overview.png` });

    // Record measured frame-time telemetry
    await expect
      .poll(async () => await game3d.getAttribute('data-perf-p50'), { timeout: 5_000 })
      .not.toBeNull();
    const p50 = await game3d.getAttribute('data-perf-p50');
    const p95 = await game3d.getAttribute('data-perf-p95');
    console.log(`[Chromium V4 Mobile 3D] frame-time p50=${p50}ms p95=${p95}ms`);

    expect(errors).toEqual([]);
    await ctx.close();
  });
});
