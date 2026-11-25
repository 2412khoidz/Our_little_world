#!/usr/bin/env node
/**
 * Worker I — PyDew farm render, collision debug, beach↔village, farm till/plant/water/harvest.
 * Outputs: worker-i-* under OLW_WORKER_I_MEDIA (default: Project store media/).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { assertCanvasPixelVariance } from './lib/assertScreenshotMapVariance.mjs';

const PORT = process.env.OLW_PORT || '4192';
const BASE = `http://127.0.0.1:${PORT}`;
const MEDIA =
  process.env.OLW_WORKER_I_MEDIA ||
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media';
const ARTIFACTS = process.env.OLW_ARTIFACTS_DIR || '/opt/cursor/artifacts';
const MAY_ID = '11111111-1111-4111-8111-111111111111';
const devHeaders = { 'x-dev-user-id': MAY_ID, 'Content-Type': 'application/json' };

async function waitServer() {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/dev-lan/identities`);
      if (res.ok) return;
    } catch {
      /* spin */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('dev server timeout');
}

async function jumpMap(page, canvas, mapId, tileX, tileY) {
  for (let i = 0; i < 24; i += 1) {
    const cur = await canvas.getAttribute('data-map-id');
    if (cur === mapId) return;
    await page.evaluate(
      ({ mid, tx, ty }) => window.__OLW_VQG?.jump?.(mid, tx, ty),
      { mid: mapId, tx: tileX, ty: tileY },
    );
    await page.waitForTimeout(280);
  }
  if ((await canvas.getAttribute('data-map-id')) !== mapId) {
    throw new Error(`VQG jump failed: expected ${mapId}`);
  }
}

async function farmLoop(request, worldId) {
  const farm0 = await request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, { headers: devHeaders });
  let v = (await farm0.json()).data.version;
  for (const step of [
    { action: 'till', key: 'till' },
    { action: 'plant', key: 'plant', seedSku: 'seed_wheat' },
    { action: 'water', key: 'water' },
  ]) {
    const res = await request.post(`${BASE}/api/dev-lan/farm/apply`, {
      headers: devHeaders,
      data: { worldId, plotIndex: 0, action: step.action, seedSku: step.seedSku, farmVersion: v, idempotencyKey: `wi-${step.key}` },
    });
    if (!res.ok()) throw new Error(`farm ${step.action}: ${await res.text()}`);
    const snap = await request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, { headers: devHeaders });
    v = (await snap.json()).data.version;
  }
  for (let i = 0; i < 5; i += 1) {
    const w = await request.post(`${BASE}/api/dev-lan/farm/apply`, {
      headers: devHeaders,
      data: { worldId, plotIndex: 0, action: 'water', farmVersion: v, idempotencyKey: `wi-wx-${i}` },
    });
    if (!w.ok()) break;
    const snap = await request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, { headers: devHeaders });
    v = (await snap.json()).data.version;
  }
  await new Promise((r) => setTimeout(r, 1500));
  const harvest = await request.post(`${BASE}/api/dev-lan/farm/apply`, {
    headers: devHeaders,
    data: { worldId, plotIndex: 0, action: 'harvest', farmVersion: v, idempotencyKey: 'wi-harvest' },
  });
  if (!harvest.ok()) {
    const snap = await request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, { headers: devHeaders });
    v = (await snap.json()).data.version;
    await new Promise((r) => setTimeout(r, 2500));
    const retry = await request.post(`${BASE}/api/dev-lan/farm/apply`, {
      headers: devHeaders,
      data: { worldId, plotIndex: 0, action: 'harvest', farmVersion: v, idempotencyKey: 'wi-harvest-2' },
    });
    if (!retry.ok()) throw new Error(`harvest: ${await retry.text()}`);
  }
}

async function main() {
  fs.mkdirSync(MEDIA, { recursive: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const meta = { base: BASE, media: MEDIA, capturedAt: new Date().toISOString(), shots: [] };

  const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  const srv = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    stdio: 'ignore',
    env: { ...process.env, VITE_OLW_EXTENDED_WORLD: '1' },
  });

  try {
    await waitServer();
    const browser = await chromium.launch();
    const videoDir = path.join(MEDIA, 'worker-i-video-tmp');
    fs.mkdirSync(videoDir, { recursive: true });
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
    });
    const page = await ctx.newPage();

    await page.request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
    await page.request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });
    const worldId = (await (await page.request.get(`${BASE}/api/dev-lan/world/snapshot`, { headers: devHeaders })).json()).data
      ?.world?.id;

    await farmLoop(page.request, worldId);

    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await page.getByTestId('btn-dev-seed-couple').click({ timeout: 15_000 }).catch(() => null);
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForFunction(() => typeof window.__OLW_VQG?.jump === 'function', null, { timeout: 20_000 });

    await jumpMap(page, canvas, 'farm', 24, 27);
    await page.waitForTimeout(1200);
    await assertCanvasPixelVariance(canvas, { minUnique: 24 });
    const farmShot = path.join(MEDIA, 'worker-i-farm-pydew-full.png');
    await page.screenshot({ path: farmShot, fullPage: false });
    meta.shots.push(farmShot);

    await jumpMap(page, canvas, 'forest', 16, 20);
    await page.waitForTimeout(900);
    const forestShot = path.join(MEDIA, 'worker-i-forest-tuxemon.png');
    await page.screenshot({ path: forestShot, fullPage: false });
    meta.shots.push(forestShot);

    await jumpMap(page, canvas, 'village', 43, 38);
    await page.waitForTimeout(700);
    await jumpMap(page, canvas, 'beach', 4, 16);
    await page.waitForTimeout(1000);
    const beachShot = path.join(MEDIA, 'worker-i-beach-village-portal.png');
    await page.screenshot({ path: beachShot, fullPage: false });
    meta.shots.push(beachShot);

    await ctx.close();
    const videos = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
    const walkVideo = path.join(MEDIA, 'worker-i-world-walkthrough.webm');
    if (videos[0]) fs.copyFileSync(path.join(videoDir, videos[0]), walkVideo);

    const ctxDbg = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } } });
    const pageDbg = await ctxDbg.newPage();
    await pageDbg.goto(`${BASE}/?extended-world=1&vqg-capture=1&collision-debug=1`);
    await pageDbg.getByTestId('preset-partner-a').click();
    const c2 = pageDbg.getByTestId('game-canvas-host').locator('canvas');
    await c2.waitFor({ state: 'visible', timeout: 30_000 });
    await pageDbg.waitForFunction(() => typeof window.__OLW_VQG?.jump === 'function', null, { timeout: 20_000 });
    await jumpMap(pageDbg, c2, 'farm', 20, 22);
    await pageDbg.waitForTimeout(900);
    const collShot = path.join(MEDIA, 'worker-i-farm-collision-debug.png');
    await pageDbg.screenshot({ path: collShot, fullPage: false });
    meta.shots.push(collShot);
    await ctxDbg.close();
    const dbgVideos = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
    const collVideo = path.join(MEDIA, 'worker-i-collision-debug.webm');
    if (dbgVideos.at(-1)) fs.copyFileSync(path.join(videoDir, dbgVideos.at(-1)), collVideo);

    const ctxFarm = await browser.newContext({
      viewport: { width: 430, height: 932 },
      recordVideo: { dir: videoDir, size: { width: 430, height: 932 } },
    });
    const pageFarm = await ctxFarm.newPage();
    await pageFarm.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await pageFarm.getByTestId('preset-partner-a').click();
    const c3 = pageFarm.getByTestId('game-canvas-host').locator('canvas');
    await c3.waitFor({ state: 'visible', timeout: 30_000 });
    await pageFarm.getByTestId('nav-farm').click({ force: true });
    await pageFarm.waitForTimeout(2000);
    const cycle1 = path.join(MEDIA, 'worker-i-farm-after-till-plant-water.png');
    await pageFarm.screenshot({ path: cycle1, fullPage: false });
    meta.shots.push(cycle1);
    await pageFarm.waitForTimeout(600);
    const cycle2 = path.join(MEDIA, 'worker-i-farm-harvest-ready.png');
    await pageFarm.screenshot({ path: cycle2, fullPage: false });
    meta.shots.push(cycle2);
    await ctxFarm.close();
    const farmVideos = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
    const farmClip = path.join(MEDIA, 'worker-i-farm-plant-water-harvest.webm');
    if (farmVideos.at(-1)) fs.copyFileSync(path.join(videoDir, farmVideos.at(-1)), farmClip);

    await browser.close();

    for (const name of [
      'worker-i-farm-pydew-full.png',
      'worker-i-forest-tuxemon.png',
      'worker-i-beach-village-portal.png',
      'worker-i-farm-collision-debug.png',
      'worker-i-farm-after-till-plant-water.png',
      'worker-i-farm-harvest-ready.png',
      'worker-i-world-walkthrough.webm',
      'worker-i-collision-debug.webm',
      'worker-i-farm-plant-water-harvest.webm',
    ]) {
      const src = path.join(MEDIA, name);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(ARTIFACTS, name));
    }

    const metaPath = path.join(MEDIA, 'worker-i-capture-meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    fs.copyFileSync(metaPath, path.join(ARTIFACTS, 'worker-i-capture-meta.json'));
    console.log('Worker I media written to', MEDIA);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});