import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = process.env.OLW_PORT || '4189';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_ROOT =
  process.env.OUT_DIR ||
  'C:\\Users\\admin\\.gemini\\antigravity\\brain\\b9c25d42-37c9-4732-b6fd-0855b62df60f\\evidence\\mission-n\\after';

fs.mkdirSync(OUT_ROOT, { recursive: true });
for (const sub of ['frames-walkthrough', 'frames-farming', 'frames-coop']) {
  const dir = path.join(OUT_ROOT, sub);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

const MAY_ID = '11111111-1111-4111-8111-111111111111';
const NANG_ID = '22222222-2222-4222-8222-222222222222';

async function waitServer() {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return;
    } catch {
      /* spin */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Vite dev server timeout');
}

async function waitCanvasReady(page) {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction(
    () => typeof window.__OLW_VQG?.jump === 'function' && window.document.querySelector('canvas')?.dataset.mapId,
    undefined,
    { timeout: 30_000 },
  );
  return canvas;
}

async function ensureLoggedIn(page, presetTestId) {
  const preset = page.getByTestId(presetTestId);
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await preset.or(canvas).first().waitFor({ state: 'visible', timeout: 30_000 });
  if (await preset.isVisible().catch(() => false)) {
    await preset.click();
  }
}

async function dismissCaptureOverlays(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem('olw_farm_fish_tutorial_v1', '1');
    } catch {
      /* ignore */
    }
  });
  const tutClose = page.getByTestId('farm-fish-tutorial').getByRole('button', { name: 'Đóng' });
  if (await tutClose.isVisible({ timeout: 500 }).catch(() => false)) {
    await tutClose.click({ force: true });
  }
  const devToggle = page.locator('button[aria-expanded="true"]', { hasText: 'Thế giới mở rộng' });
  if (await devToggle.isVisible({ timeout: 500 }).catch(() => false)) {
    await devToggle.click({ force: true });
  }
}

async function jump(page, mapId, tileX, tileY) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const cur = await page.evaluate(
      ({ m, x, y }) => {
        window.__OLW_VQG?.jump(m, x, y);
        const c = document.querySelector('canvas');
        return c ? { mapId: c.dataset.mapId, tx: Number(c.dataset.playerTileX), ty: Number(c.dataset.playerTileY) } : null;
      },
      { m: mapId, x: tileX, y: tileY },
    );
    if (cur && cur.mapId === mapId) {
      await page.waitForTimeout(700);
      return;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`Failed to jump to ${mapId} (${tileX},${tileY})`);
}

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function captureBurst(page, dir, startIdx, count, stepMs = 150) {
  let idx = startIdx;
  for (let i = 0; i < count; i += 1) {
    const p = path.join(dir, `frame-${String(idx).padStart(3, '0')}.png`);
    await page.screenshot({ path: p });
    idx += 1;
    if (i < count - 1) await page.waitForTimeout(stepMs);
  }
  return idx;
}

async function selectHotbarBySkuHint(page, labelHints) {
  const slots = page.locator('[data-testid^="hotbar-slot-"]');
  const count = await slots.count();
  for (let i = 0; i < count; i += 1) {
    const el = slots.nth(i);
    const title = ((await el.getAttribute('title')) || '') + ' ' + ((await el.getAttribute('aria-label')) || '');
    const text = await el.innerText().catch(() => '');
    const combined = `${title} ${text}`.toLowerCase();
    if (labelHints.some((h) => combined.includes(h.toLowerCase()))) {
      await el.click({ force: true });
      await page.waitForTimeout(180);
      return i;
    }
  }
  return -1;
}

async function main() {
  const srv = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
      '--host',
      '127.0.0.1',
      '--port',
      PORT,
      '--strictPort',
    ],
    {
      cwd: ROOT,
      stdio: 'ignore',
      env: {
        ...process.env,
        VITE_OLW_PRIVATE_ART: '1',
        VITE_OLW_EXTENDED_WORLD: '1',
        VITE_OLW_DONOR_ECONOMY: '1',
        OLW_FARM_DEV_FAST_GROW: '1',
      },
    },
  );

  try {
    await waitServer();
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await fetch(`${BASE}/api/dev-lan/seed-couple`, { method: 'POST', body: '{}' });

    const browser = await chromium.launch();

    // Context A: Mây (Daytime Desktop 1280x720)
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctxA.addInitScript(() => {
      try {
        localStorage.setItem('olw.time-of-day', 'day');
        localStorage.setItem('olw_farm_fish_tutorial_v1', '1');
      } catch {
        /* ignore */
      }
    });
    const pageA = await ctxA.newPage();
    await pageA.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await ensureLoggedIn(pageA, 'preset-partner-a');
    await waitCanvasReady(pageA);
    await dismissCaptureOverlays(pageA);

    // Trigger GET /farm so starter wallet + farm tools/seeds are seeded cleanly
    const worldSnapRes = await pageA.request.get(`${BASE}/api/dev-lan/world/snapshot`, {
      headers: { 'x-dev-user-id': MAY_ID },
    });
    const worldId = (await worldSnapRes.json()).data.world.id;
    const mayHdr = { 'x-dev-user-id': MAY_ID, 'content-type': 'application/json' };
    await pageA.request.get(`${BASE}/api/dev-lan/farm?worldId=${encodeURIComponent(worldId)}`, { headers: mayHdr });

    // Pre-seed a vibrant starter patch on the 16x16 farm so crops at multiple stages are visible
    const seedOps = [
      [0, 'till'],
      [0, 'plant', 'seed_wheat'],
      [0, 'water'],
      [1, 'till'],
      [1, 'plant', 'seed_wheat'],
      [1, 'water'],
      [2, 'till'],
      [2, 'plant', 'seed_carrot'],
      [2, 'water'],
      [12, 'till'],
      [12, 'plant', 'seed_tomato'],
      [12, 'water'],
      [13, 'till'],
      [13, 'plant', 'seed_wheat'],
      [13, 'water'],
    ];
    for (const [plotIndex, action, seedSku] of seedOps) {
      await pageA.request.post(`${BASE}/api/dev-lan/farm/apply`, {
        headers: mayHdr,
        data: {
          worldId,
          plotIndex,
          action,
          seedSku: seedSku ?? null,
          idempotencyKey: `mn-pre-${plotIndex}-${action}-${Date.now()}`,
        },
      });
    }

    // 1. Stills across all major zones (exact 1280x720 matching BEFORE)
    await jump(pageA, 'home', 8, 7);
    await dismissCaptureOverlays(pageA);
    await pageA.waitForTimeout(800);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '01-home.png') });

    await jump(pageA, 'garden', 9, 9);
    await pageA.waitForTimeout(800);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '02-garden.png') });

    await jump(pageA, 'farm', 22, 13);
    await dismissCaptureOverlays(pageA);
    await pageA.waitForTimeout(1200);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '03-farm.png') });

    await jump(pageA, 'village', 39, 31);
    await dismissCaptureOverlays(pageA);
    await pageA.waitForTimeout(900);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '04-village.png') });

    await jump(pageA, 'forest', 16, 17);
    await pageA.waitForTimeout(900);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '05-forest.png') });

    await jump(pageA, 'beach', 24, 16);
    await pageA.waitForTimeout(900);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '06-beach.png') });

    await jump(pageA, 'shop_seed', 10, 12);
    await pageA.waitForTimeout(900);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '07-shop-seed.png') });

    // Sunset/Night showcase on Gull Bay Beach with warm lanterns & string lights
    await pageA.evaluate(() => localStorage.setItem('olw.time-of-day', 'night'));
    await pageA.reload();
    await ensureLoggedIn(pageA, 'preset-partner-a');
    await waitCanvasReady(pageA);
    await dismissCaptureOverlays(pageA);
    await jump(pageA, 'beach', 24, 16);
    await pageA.waitForTimeout(900);
    await pageA.screenshot({ path: path.join(OUT_ROOT, '08-beach-night.png') });

    // Restore daytime for GIF bursts
    await pageA.evaluate(() => localStorage.setItem('olw.time-of-day', 'day'));
    await pageA.reload();
    await ensureLoggedIn(pageA, 'preset-partner-a');
    await waitCanvasReady(pageA);
    await dismissCaptureOverlays(pageA);

    // 2. GIF 1: Multi-zone continuous walkthrough + real garden->village portal traversal
    const dirWalk = path.join(OUT_ROOT, 'frames-walkthrough');
    let fWalk = 0;
    await jump(pageA, 'garden', 9, 10);
    await pageA.waitForTimeout(500);
    await pageA.keyboard.down('ArrowDown');
    fWalk = await captureBurst(pageA, dirWalk, fWalk, 8, 220);
    await pageA.keyboard.up('ArrowDown');
    await pageA.waitForTimeout(600);
    await pageA.keyboard.down('ArrowRight');
    fWalk = await captureBurst(pageA, dirWalk, fWalk, 6, 180);
    await pageA.keyboard.up('ArrowRight');

    // Walk along Gull Bay Beach coast onto the wooden dock
    await jump(pageA, 'beach', 26, 14);
    await pageA.waitForTimeout(500);
    await pageA.keyboard.down('ArrowDown');
    fWalk = await captureBurst(pageA, dirWalk, fWalk, 8, 200);
    await pageA.keyboard.up('ArrowDown');

    // Walk through Farm past greenhouse & plots
    await jump(pageA, 'farm', 22, 13);
    await pageA.waitForTimeout(500);
    await pageA.keyboard.down('ArrowLeft');
    fWalk = await captureBurst(pageA, dirWalk, fWalk, 6, 200);
    await pageA.keyboard.up('ArrowLeft');

    // Walk in Tuxemon Forest
    await jump(pageA, 'forest', 10, 28);
    await pageA.waitForTimeout(500);
    await pageA.keyboard.down('ArrowUp');
    fWalk = await captureBurst(pageA, dirWalk, fWalk, 6, 200);
    await pageA.keyboard.up('ArrowUp');

    // 3. GIF 2: Real Farming Loop (Till -> Plant -> Water -> Harvest -> Shipping Bin) on 16x16 farm
    const dirFarm = path.join(OUT_ROOT, 'frames-farming');
    let fFarm = 0;
    // Stand next to untouched plot index 4 at (20, 10) -> stand at (20, 11) facing up or on (20, 10)
    await jump(pageA, 'farm', 20, 10);
    await pageA.waitForTimeout(500);
    await selectHotbarBySkuHint(pageA, ['cuốc', 'hoe']);
    fFarm = await captureBurst(pageA, dirFarm, fFarm, 2, 180);
    await pageA.keyboard.press('KeyJ');
    await pageA.waitForTimeout(500);
    fFarm = await captureBurst(pageA, dirFarm, fFarm, 3, 220);

    await selectHotbarBySkuHint(pageA, ['lúa mì', 'wheat', 'cà rốt', 'carrot']);
    await pageA.keyboard.press('KeyJ');
    await pageA.waitForTimeout(500);
    fFarm = await captureBurst(pageA, dirFarm, fFarm, 3, 220);

    await selectHotbarBySkuHint(pageA, ['bình tưới', 'watering', 'tưới']);
    await pageA.keyboard.press('KeyJ');
    await pageA.waitForTimeout(500);
    fFarm = await captureBurst(pageA, dirFarm, fFarm, 3, 220);

    // Step left to plot 0 (16, 10) which was pre-planted & watered -> wait for fast-grow maturity & harvest!
    await jump(pageA, 'farm', 16, 10);
    await pageA.waitForTimeout(2800);
    fFarm = await captureBurst(pageA, dirFarm, fFarm, 2, 220);
    await pageA.keyboard.press('KeyJ');
    await pageA.waitForTimeout(700);
    fFarm = await captureBurst(pageA, dirFarm, fFarm, 3, 220);

    // Move to shipping bin area (13, 6) and open shipping / economy panel
    await jump(pageA, 'farm', 13, 6);
    await pageA.waitForTimeout(500);
    await pageA.keyboard.press('KeyJ');
    await pageA.waitForTimeout(600);
    fFarm = await captureBurst(pageA, dirFarm, fFarm, 3, 250);
    const shipPanel = pageA.getByTestId('nuvora-shipping-desk');
    if (await shipPanel.isVisible().catch(() => false)) {
      const firstCell = shipPanel.locator('.nuvora-grid button, button:not([aria-label="Đóng"])').first();
      await firstCell.click({ force: true }).catch(() => {});
      await pageA.waitForTimeout(600);
      fFarm = await captureBurst(pageA, dirFarm, fFarm, 4, 250);
      await pageA.keyboard.press('Escape');
    }

    // 4. GIF 3: Two-Player Co-op Exploration + Oceanfront Bench / Emote on Gull Bay Beach
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctxB.addInitScript(() => {
      try {
        localStorage.setItem('olw.time-of-day', 'day');
        localStorage.setItem('olw_farm_fish_tutorial_v1', '1');
      } catch {
        /* ignore */
      }
    });
    const pageB = await ctxB.newPage();
    await pageB.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await ensureLoggedIn(pageB, 'preset-partner-b');
    await waitCanvasReady(pageB);
    await dismissCaptureOverlays(pageB);

    await jump(pageA, 'beach', 20, 16);
    await jump(pageB, 'beach', 23, 16);
    await pageA.waitForTimeout(1000);

    const dirCoop = path.join(OUT_ROOT, 'frames-coop');
    let fCoop = 0;
    await pageA.keyboard.down('ArrowRight');
    await pageB.keyboard.down('ArrowRight');
    fCoop = await captureBurst(pageA, dirCoop, fCoop, 7, 180);
    await pageA.keyboard.up('ArrowRight');
    await pageB.keyboard.up('ArrowRight');

    // Walk toward ocean pier together & send heart/hug emote
    await pageA.keyboard.down('ArrowDown');
    await pageB.keyboard.down('ArrowDown');
    fCoop = await captureBurst(pageA, dirCoop, fCoop, 5, 180);
    await pageA.keyboard.up('ArrowDown');
    await pageB.keyboard.up('ArrowDown');

    // Bench sit together near beach_sunset_bench (21, 16)
    await jump(pageA, 'beach', 21, 17);
    await jump(pageB, 'beach', 22, 17);
    await pageA.waitForTimeout(500);
    await pageA.keyboard.press('KeyJ');
    await pageB.keyboard.press('KeyJ');
    await pageA.waitForTimeout(400);
    await pageA.getByTestId('btn-emote-toggle').click().catch(() => {});
    await pageA.getByTestId('btn-emote-heart').click().catch(() => {});
    fCoop = await captureBurst(pageA, dirCoop, fCoop, 8, 220);

    await ctxB.close();

    // 5. Mobile iPhone 16 Pro Max portrait (430x932) verification
    const ctxMob = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    await ctxMob.addInitScript(() => {
      try {
        localStorage.setItem('olw.time-of-day', 'day');
        localStorage.setItem('olw_farm_fish_tutorial_v1', '1');
      } catch {
        /* ignore */
      }
    });
    const pageMob = await ctxMob.newPage();
    await pageMob.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await ensureLoggedIn(pageMob, 'preset-partner-a');
    await waitCanvasReady(pageMob);
    await dismissCaptureOverlays(pageMob);
    await jump(pageMob, 'beach', 24, 16);
    await pageMob.waitForTimeout(900);
    await pageMob.screenshot({ path: path.join(OUT_ROOT, 'mobile-beach-430x932.png') });
    await jump(pageMob, 'farm', 22, 13);
    await pageMob.waitForTimeout(900);
    await pageMob.screenshot({ path: path.join(OUT_ROOT, 'mobile-farm-430x932.png') });
    await ctxMob.close();

    await ctxA.close();
    await browser.close();
    console.log('Mission N live private-art captures complete at:', OUT_ROOT);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
