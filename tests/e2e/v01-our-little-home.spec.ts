import { expect, test, type Page } from '@playwright/test';
import { fitWorldZoom } from '../../src/game/art/worldCamera';

const BASE = 'http://127.0.0.1:4173';

async function tapWorldTile(page: Page, map: 'home' | 'garden', tileX: number, tileY: number, touch: boolean) {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) =>
    element.width === element.parentElement?.clientWidth && element.height === element.parentElement?.clientHeight,
  )).toBe(true);
  const box = (await canvas.boundingBox())!;
  const width = map === 'home' ? 256 : 288;
  const height = map === 'home' ? 192 : 224;
  const zoom = fitWorldZoom(box.width, box.height, width, height);
  const x = box.x + box.width / 2 + ((tileX + 0.5) * 16 - width / 2) * zoom;
  const y = box.y + box.height / 2 + ((tileY + 0.5) * 16 - height / 2) * zoom;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function testPlacements(page: Page) {
  const response = await page.request.get(BASE + '/api/dev-lan/world/snapshot', {
    headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
  });
  expect(response.ok()).toBe(true);
  const result = await response.json();
  return result.data.placements as { sku: string; mapId: string; tileX: number; tileY: number }[];
}


test.describe('Spike 0 + V0.1 — Multi-Device LAN E2E (Isolated Browser Contexts)', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    expect(res.ok()).toBe(true);
  });

  test('pairs Mây & Nắng across isolated device contexts, rejects 3rd outsider, syncs room/avatar/furniture', async ({
    browser,
  }, testInfo) => {
    const { viewport, hasTouch, isMobile } = testInfo.project.use;
    const options = { viewport, hasTouch, isMobile };
    const ctxMay = await browser.newContext(options);
    const ctxNang = await browser.newContext(options);
    const ctxOutsider = await browser.newContext(options);

    const errors: string[] = [];
    const pageA = await ctxMay.newPage();
    const pageB = await ctxNang.newPage();
    const pageC = await ctxOutsider.newPage();
    pageA.on('pageerror', (e) => errors.push(e.message));
    pageB.on('pageerror', (e) => errors.push(e.message));

    // 1. Device A (Mây) creates world & invite code
    await pageA.goto('/');
    await expect(pageA.getByTestId('dev-lan-banner')).toBeVisible();
    await pageA.getByTestId('preset-partner-a').click();
    await pageA.getByTestId('btn-create-world').click();

    await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();
    await pageA.getByTestId('btn-top-invite').click();
    await pageA.getByTestId('btn-generate-invite').click();
    const inviteCode = (await pageA.getByTestId('generated-invite-code').textContent())?.trim() ?? '';
    expect(inviteCode).toMatch(/^OLW-/);
    await pageA.getByRole('button', { name: 'Đóng' }).click();

    // 2. Device B (Nắng, completely isolated storage) redeems invite
    await pageB.goto('/');
    await pageB.getByTestId('preset-partner-b').click();
    await pageB.getByTestId('tab-join-world').click();
    await pageB.getByTestId('input-invite-code').fill(inviteCode);
    await pageB.getByTestId('btn-redeem-invite').click();

    await expect(pageB.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();
    await expect(pageA.getByTestId('partner-presence-pill')).toContainText('Nắng đang ở Trong nhà');
    await expect(pageB.getByTestId('partner-presence-pill')).toContainText('Mây đang ở Trong nhà');

    // 3. Device C (Outsider 3rd account) is rejected
    await pageC.goto('/');
    await pageC.getByTestId('preset-outsider').click();
    await pageC.getByTestId('tab-join-world').click();
    await pageC.getByTestId('input-invite-code').fill(inviteCode);
    await pageC.getByTestId('btn-redeem-invite').click();
    await expect(pageC.getByTestId('onboarding-error')).toBeVisible();
    await ctxOutsider.close();

    // 4. Tap-to-move follows the original collision grid through the door.
    await tapWorldTile(pageA, 'home', 7, 10, !!hasTouch);
    await expect(pageA.getByTestId('btn-nearby-action')).toHaveText('Ra khu vườn');
    await pageA.getByTestId('btn-nearby-action').click();
    await expect(pageB.getByTestId('partner-presence-pill')).toContainText('Mây đang ở Ngoài vườn');
    await tapWorldTile(pageA, 'garden', 8, 3, !!hasTouch);
    await expect(pageA.getByTestId('btn-nearby-action')).toHaveText('Vào trong nhà');
    await pageA.getByTestId('btn-nearby-action').click();
    await expect(pageB.getByTestId('partner-presence-pill')).toContainText('Mây đang ở Trong nhà');

    // 5. Both clients redraw the same configuration and preserve it after reload.
    const peerCanvas = pageB.getByTestId('game-canvas-host').locator('canvas');
    const peerBefore = await peerCanvas.screenshot();
    await pageA.getByTestId('nav-avatar').click();
    const wardrobeCanvas = pageA.getByTestId('avatar-preview-canvas');
    await expect(wardrobeCanvas).toHaveAttribute('data-atlas-ready', 'true');
    const readPreview = () => wardrobeCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    const originalPreview = await readPreview();
    for (const name of ['Tóc bob', 'Hồng anh đào', 'Yếm làm vườn', 'Xanh mây nhạt', 'Không có', 'Kính tròn']) {
      await pageA.getByRole('button', { name, exact: true }).click();
    }
    const selectedPreview = await readPreview();
    expect(selectedPreview).not.toBe(originalPreview);
    await pageA.getByTestId('input-avatar-nickname').fill('Mây Cute');
    await pageA.getByTestId('btn-save-avatar').click();
    await expect(pageB.getByTestId('partner-presence-pill')).toContainText('Mây Cute');
    await expect.poll(async () => (await peerCanvas.screenshot()).equals(peerBefore)).toBe(false);
    await pageB.getByTestId('nav-avatar').click();
    await pageB.getByRole('button', { name: 'Nắng mật ong', exact: true }).click();
    await pageB.getByRole('button', { name: 'Tóc ngắn gọn', exact: true }).click();
    await pageB.getByRole('button', { name: 'Kính tròn', exact: true }).click();
    await pageB.getByTestId('btn-save-avatar').click();

    await pageA.reload();
    await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await pageA.getByTestId('nav-avatar').click();
    await expect.poll(readPreview).toBe(selectedPreview);
    await pageA.getByRole('button', { name: 'Đóng' }).click();

    // 6. Furniture placement persists & occupied-tile conflict rejects duplicate placement
    await pageA.getByTestId('nav-decorate').click();
    await expect(pageA.getByTestId('decorate-sku-lamp_floor')).toContainText('Còn 1/2');
    await pageA.getByTestId('decorate-sku-lamp_floor').click();
    await tapWorldTile(pageA, 'home', 8, 6, !!hasTouch);
    await expect(pageA.getByTestId('decorate-sku-lamp_floor')).toContainText('Còn 0/2');

    // The same object-layer tile rejects overlap.
    await pageA.getByTestId('decorate-sku-plant_monstera').click();
    await tapWorldTile(pageA, 'home', 8, 6, !!hasTouch);
    await expect(pageA.getByTestId('stage-toast')).toContainText('chiếm chỗ');
    await pageA.getByTestId('decorate-sku-plant_monstera').click();

    // Select that existing frame and move by exact tile coordinates.
    await tapWorldTile(pageA, 'home', 8, 6, !!hasTouch);
    await expect(pageA.getByTestId('btn-stow-selected')).toBeVisible();
    await tapWorldTile(pageA, 'home', 12, 8, !!hasTouch);
    await expect.poll(async () => testPlacements(pageA)).toEqual(expect.arrayContaining([
      expect.objectContaining({ sku: 'lamp_floor', mapId: 'home', tileX: 12, tileY: 8 }),
    ]));

    // Reload Device B (Nắng) -> sees updated furniture count persisted on server!
    await pageB.reload();
    await pageB.getByTestId('nav-decorate').click();
    await expect(pageB.getByTestId('decorate-sku-lamp_floor')).toContainText('Còn 0/2');
    await tapWorldTile(pageB, 'home', 12, 8, !!hasTouch);
    await expect(pageB.getByTestId('btn-stow-selected')).toBeVisible();

    await ctxMay.close();
    await ctxNang.close();
    expect(errors).toEqual([]);
  });

  test('allows the same account to log in on multiple devices while keeping world at 2/2', async ({
    browser,
  }) => {
    // Seed 2/2 world first via dev helper UI
    const ctxDevice1 = await browser.newContext();
    const ctxDevice2 = await browser.newContext();
    const p1 = await ctxDevice1.newPage();
    const p2 = await ctxDevice2.newPage();

    await p1.goto('/');
    await p1.getByTestId('btn-dev-seed-couple').click();
    await p1.getByTestId('preset-partner-a').click();
    await expect(p1.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    // Second device also logs in as Mây (same account) -> enters seamlessly
    await p2.goto('/');
    await p2.getByTestId('preset-partner-a').click();
    await expect(p2.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await p1.getByTestId('nav-menu').click();
    await p1.getByTestId('menu-invite').click();
    await expect(p1.getByText('Ghép cặp ngôi nhà (2/2)')).toBeVisible();

    await ctxDevice1.close();
    await ctxDevice2.close();
  });

  test('renders mobile-first layout cleanly on 430x932 viewport without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/');
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('btn-create-world').click();

    await expect(page.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    const layoutCheck = await page.evaluate(() => {
      const overflowX = document.documentElement.scrollWidth > window.innerWidth;
      const navButtons = Array.from(document.querySelectorAll('.quick-nav .nav-btn'));
      const minHeight = Math.min(...navButtons.map((el) => el.getBoundingClientRect().height));
      return { overflowX, navCount: navButtons.length, minHeight };
    });

    expect(layoutCheck.overflowX).toBe(false);
    expect(layoutCheck.navCount).toBe(5);
    expect(layoutCheck.minHeight).toBeGreaterThanOrEqual(44);
  });

  test('Spike 0 Video Sync PoC synchronizes Play/Seek across 2 isolated contexts via Dev LAN SSE', async ({
    browser,
  }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const pageA = await ctx1.newPage();
    const pageB = await ctx2.newPage();

    await pageA.goto('/');
    await pageA.getByTestId('btn-dev-seed-couple').click();
    await pageA.getByTestId('preset-partner-a').click();
    await expect(pageA.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await pageB.goto('/');
    await pageB.getByTestId('preset-partner-b').click();
    await expect(pageB.getByTestId('game-canvas-host').locator('canvas')).toBeVisible();

    await pageA.getByTestId('nav-menu').click();
    await pageA.getByTestId('menu-spike-lab').click();
    await pageA.getByTestId('spike-tab-media').click();

    await pageB.getByTestId('nav-menu').click();
    await pageB.getByTestId('menu-spike-lab').click();
    await pageB.getByTestId('spike-tab-media').click();

    await pageA.getByTestId('spike-btn-ready').click();
    await pageB.getByTestId('spike-btn-ready').click();

    await pageA.getByTestId('spike-btn-seek-3').click();
    await pageA.getByTestId('spike-btn-play').click();

    await expect(pageB.getByTestId('spike-media-telemetry')).toContainText('playing');
    await expect(pageB.getByTestId('spike-media-telemetry')).toContainText('rev #3');

    await pageA.getByTestId('spike-btn-pause').click();
    await expect(pageB.getByTestId('spike-media-telemetry')).toContainText('paused');

    await ctx1.close();
    await ctx2.close();
  });
});
