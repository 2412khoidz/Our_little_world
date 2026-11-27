import { expect, test, type Page } from '@playwright/test';
import { vqgJumpMap } from './helpers/extendedWorldVqg';

const OUT_DIR = process.env.OLW_VQG_OUT || '/opt/cursor/artifacts';
const DEV_LAN = '/api/dev-lan';
const MAY_ID = '11111111-1111-4111-8111-111111111111';
const devHeaders = { 'x-dev-user-id': MAY_ID };

test.use({ video: 'on' });

async function enterGameplay(page: Page): Promise<import('@playwright/test').Locator> {
  await page.goto('/?extended-world=1&vqg-capture=1');
  const seed = page.getByTestId('btn-dev-seed-couple');
  if (await seed.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await seed.click();
  }
  await page.getByTestId('preset-partner-a').click();
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    () => typeof (globalThis as { __OLW_VQG?: { jump: (m: string, x: number, y: number) => void } }).__OLW_VQG?.jump === 'function',
    undefined,
    { timeout: 20_000 },
  );
  await expect.poll(async () => canvas.getAttribute('data-map-id'), { timeout: 20_000 }).not.toBeNull();
  return canvas;
}

async function sampleCanvasEntropy(page: Page): Promise<number> {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  return canvas.evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;
    const w = canvas.width;
    const h = canvas.height;
    let sum = 0;
    const samples = 48;
    for (let i = 0; i < samples; i += 1) {
      const x = Math.floor((w * (i + 1)) / (samples + 1));
      const y = Math.floor(h * (0.35 + (i % 7) * 0.08));
      const d = ctx.getImageData(x, y, 1, 1).data;
      sum += d[0]! + d[1]! + d[2]!;
    }
    return sum;
  });
}

test.describe('Worker I — world recovery capture', () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${DEV_LAN}/reset`, { data: {} });
    expect(res.ok()).toBe(true);
    await request.post(`${DEV_LAN}/seed-couple`, { data: {} });
  });

  test('farm PyDew donor canvas non-empty + portal walk-through', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const canvas = await enterGameplay(page);
    await vqgJumpMap(page, canvas, 'farm', 24, 27);
    await page.waitForTimeout(1500);
    const entropy = await sampleCanvasEntropy(page);
    expect(entropy).toBeGreaterThan(2000);
    await page.screenshot({ path: `${OUT_DIR}/worker-i-farm-pydew-donor.png`, fullPage: true });

    await vqgJumpMap(page, canvas, 'village', 50, 40);
    await vqgJumpMap(page, canvas, 'beach', 8, 16);
    await expect.poll(async () => canvas.getAttribute('data-map-id')).toBe('beach');
    await page.screenshot({ path: `${OUT_DIR}/worker-i-beach-village-portal.png`, fullPage: true });

    const video = page.video();
    if (video) {
      await video.saveAs(`${OUT_DIR}/worker-i-world-walkthrough.webm`);
    }
    testInfo.annotations.push({ type: 'artifact', description: `${OUT_DIR}/worker-i-world-walkthrough.webm` });
  });

  test('collision debug overlay on farm', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/?extended-world=1&vqg-capture=1&collision-debug=1');
    const seed = page.getByTestId('btn-dev-seed-couple');
    if (await seed.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await seed.click();
    }
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await vqgJumpMap(page, canvas, 'farm', 20, 22);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT_DIR}/worker-i-farm-collision-debug.png`, fullPage: true });
    const video = page.video();
    if (video) {
      await video.saveAs(`${OUT_DIR}/worker-i-collision-debug.webm`);
    }
  });

  test('farm plant water harvest loop (Dev LAN)', async ({ page, request }) => {
    test.setTimeout(120_000);
    const worldRes = await request.get(`${DEV_LAN}/world/snapshot`, { headers: devHeaders });
    const worldId = ((await worldRes.json()) as { data?: { world?: { id?: string } } }).data?.world?.id;
    expect(worldId).toBeTruthy();

    const farm0 = await request.get(`${DEV_LAN}/farm?worldId=${worldId}`, { headers: devHeaders });
    let farmVersion = ((await farm0.json()) as { data: { version: number } }).data.version;

    for (const step of [
      { key: 'till', action: 'till' as const, seedSku: undefined },
      { key: 'plant', action: 'plant' as const, seedSku: 'seed_wheat' },
      { key: 'water', action: 'water' as const, seedSku: undefined },
    ]) {
      const res = await request.post(`${DEV_LAN}/farm/apply`, {
        headers: devHeaders,
        data: {
          worldId,
          plotIndex: 0,
          action: step.action,
          seedSku: step.seedSku,
          farmVersion,
          idempotencyKey: `worker-i-${step.key}`,
        },
      });
      expect(res.ok(), await res.text()).toBeTruthy();
      const next = await request.get(`${DEV_LAN}/farm?worldId=${worldId}`, { headers: devHeaders });
      farmVersion = ((await next.json()) as { data: { version: number } }).data.version;
    }

    const canvas = await enterGameplay(page);
    await page.getByTestId('nav-farm').click({ force: true });
    await expect.poll(async () => canvas.getAttribute('data-map-id'), { timeout: 20_000 }).toBe('farm');
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT_DIR}/worker-i-farm-till-water.png`, fullPage: true });

    for (let i = 0; i < 4; i += 1) {
      const waterRes = await request.post(`${DEV_LAN}/farm/apply`, {
        headers: devHeaders,
        data: {
          worldId,
          plotIndex: 0,
          action: 'water',
          farmVersion,
          idempotencyKey: `worker-i-water-extra-${i}`,
        },
      });
      if (!waterRes.ok()) break;
      const next = await request.get(`${DEV_LAN}/farm?worldId=${worldId}`, { headers: devHeaders });
      farmVersion = ((await next.json()) as { data: { version: number } }).data.version;
    }
    await page.waitForTimeout(500);
    const harvest = await request.post(`${DEV_LAN}/farm/apply`, {
      headers: devHeaders,
      data: {
        worldId,
        plotIndex: 0,
        action: 'harvest',
        farmVersion,
        idempotencyKey: 'worker-i-harvest',
      },
    });
    if (!harvest.ok()) {
      const retryFarm = await request.get(`${DEV_LAN}/farm?worldId=${worldId}`, { headers: devHeaders });
      farmVersion = ((await retryFarm.json()) as { data: { version: number } }).data.version;
      await page.waitForTimeout(2000);
      const harvest2 = await request.post(`${DEV_LAN}/farm/apply`, {
        headers: devHeaders,
        data: {
          worldId,
          plotIndex: 0,
          action: 'harvest',
          farmVersion,
          idempotencyKey: 'worker-i-harvest-2',
        },
      });
      expect(harvest2.ok(), await harvest2.text()).toBeTruthy();
    } else {
      expect(harvest.ok()).toBeTruthy();
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT_DIR}/worker-i-farm-harvest.png`, fullPage: true });
    const video = page.video();
    if (video) {
      await video.saveAs(`${OUT_DIR}/worker-i-farm-cycle.webm`);
    }
  });
});