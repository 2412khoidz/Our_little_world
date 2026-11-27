#!/usr/bin/env node
/**
 * Worker K — in-game buy / sell / wallet evidence (Cabacos seed shop + shipping).
 * Output: OLW_WORKER_K_DEMO_MP4 or project store media path.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const port = process.env.PLAYWRIGHT_PORT || '4173';
const base = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const outMp4 =
  process.env.OLW_WORKER_K_DEMO_MP4 ||
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media/worker-k-economy-buy-demo.mp4';
const workDir = path.dirname(outMp4);
const DEV_LAN = `${base}/api/dev-lan`;
const MAY = '11111111-1111-4111-8111-111111111111';

async function seedCouple(request) {
  await request.post(`${DEV_LAN}/reset`, { data: {} });
  await request.post(`${DEV_LAN}/seed-couple`, { data: {} });
}

async function worldId(request) {
  const res = await request.get(`${DEV_LAN}/world/snapshot`, {
    headers: { 'x-dev-user-id': MAY },
  });
  const json = await res.json();
  return json?.data?.world?.id ?? null;
}

async function vqgJumpMap(page, canvas, mapId, tileX, tileY, timeoutMs = 35_000) {
  await page.waitForFunction(
    () => typeof globalThis.__OLW_VQG?.jump === 'function',
    undefined,
    { timeout: 25_000 },
  );
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await canvas.getAttribute('data-map-id');
    if (current === mapId) return;
    await page.evaluate(
      ({ mapId: mid, tileX: tx, tileY: ty }) => {
        globalThis.__OLW_VQG?.jump?.(mid, tx, ty);
      },
      { mapId, tileX, tileY },
    );
    await page.waitForTimeout(400);
  }
  throw new Error(`VQG jump failed: expected map ${mapId}`);
}

async function vqgOpen(page, fn, arg) {
  await page.waitForFunction(
    (name) => typeof globalThis.__OLW_VQG?.[name] === 'function',
    fn,
    { timeout: 25_000 },
  );
  await page.evaluate(
    ({ name, value }) => {
      const api = globalThis.__OLW_VQG;
      if (!api?.[name]) throw new Error(`__OLW_VQG.${name} missing`);
      if (value === undefined) api[name]();
      else api[name](value);
    },
    { name: fn, value: arg },
  );
  await page.waitForTimeout(500);
}

async function main() {
  fs.mkdirSync(workDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: workDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  await seedCouple(page.request);
  const wId = await worldId(page.request);

  await page.goto(`${base}/?extended-world=1&vqg-capture=1`);
  await page.getByTestId('dev-identity-picker').waitFor({ timeout: 45_000 });
  const seedBtn = page.getByTestId('btn-dev-seed-couple');
  if (await seedBtn.isVisible().catch(() => false)) {
    await seedBtn.click();
    await page.getByTestId('dev-identity-picker').waitFor({ timeout: 15_000 });
  }
  await page.getByTestId('preset-partner-a').click({ timeout: 45_000 });
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 35_000 });

  if (wId) {
    await page.request.post(`${DEV_LAN}/farm/buy-seed`, {
      headers: { 'x-dev-user-id': MAY, 'Content-Type': 'application/json' },
      data: { worldId: wId, seedSku: 'seed_wheat', qty: 1, idempotencyKey: 'cap-prime' },
    }).catch(() => {});
    await page.request.post(`${DEV_LAN}/dev-console/spawn-item`, {
      headers: { 'x-dev-user-id': MAY, 'Content-Type': 'application/json' },
      data: { worldId: wId, scope: 'shared', itemSku: 'wheat', qty: 3, quality: 'normal' },
    });
  }

  await vqgJumpMap(page, canvas, 'shop_seed', 11, 7).catch(() => {});
  await vqgOpen(page, 'openFarmMarket', 'seed');
  const panel = page.getByTestId('farm-economy-panel');
  await panel.waitFor({ timeout: 25_000 });
  await page.waitForTimeout(600);
  await page.getByTestId('nuvora-shop-row-seed_carrot').getByRole('button', { name: 'Mua' }).click();
  await page.waitForTimeout(1200);

  await vqgOpen(page, 'openFarmShipping');
  const ship = page.getByTestId('nuvora-shipping-desk');
  await ship.waitFor({ timeout: 25_000 });
  await page.waitForTimeout(600);
  const shipCell = page.locator('[data-testid^="nuvora-ship-cell-"]').first();
  if (await shipCell.count()) {
    await shipCell.click();
    await page.getByRole('button', { name: /Giao|Bán/i }).first().click().catch(() => {});
  }
  await page.waitForTimeout(2000);

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = video ? await video.path() : null;
  if (webmPath && fs.existsSync(webmPath)) {
    spawnSync(
      'ffmpeg',
      ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4],
      { stdio: 'inherit' },
    );
    if (fs.existsSync(outMp4)) {
      console.log('Saved', outMp4);
      return;
    }
  }
  console.error('No video captured');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});