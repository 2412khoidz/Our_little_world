/**
 * Capture live private-art gameplay screenshots across all zones + wardrobe + 2-player multiplayer,
 * plus optional couple-life animation frames for GIF synthesis (OLW_CAPTURE_GIFS=1).
 *
 * Usage:
 *   OLW_CAPTURE_DIR=".../after" OLW_CAPTURE_GIFS=1 node scripts/capture-cozy-art-v2-evidence.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_CAPTURE_PORT || '4179';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = process.env.OLW_CAPTURE_DIR || path.join(process.cwd(), 'test-results', 'cozy-art-v2-capture');
const CAPTURE_GIFS = process.env.OLW_CAPTURE_GIFS === '1';
const TMP_STATE = path.join(os.tmpdir(), `olw-art-v2-${Date.now()}.json`);

const ZONES = [
  { file: '01-home', mapId: 'home', tileX: 8, tileY: 9 },
  { file: '02-garden', mapId: 'garden', tileX: 8, tileY: 5 },
  { file: '03-forest', mapId: 'forest', tileX: 16, tileY: 28 },
  { file: '04-village', mapId: 'village', tileX: 24, tileY: 20 },
  { file: '05-shop-seed', mapId: 'shop_seed', tileX: 11, tileY: 13 },
  { file: '06-farm', mapId: 'farm', tileX: 24, tileY: 25 },
  { file: '07-beach', mapId: 'beach', tileX: 18, tileY: 16 },
];

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/dev-lan/identities`);
      if (res.ok) return;
    } catch {
      // spin
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Vite server did not start in time');
}

async function waitSceneStable(page) {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="game-canvas-host"] canvas');
    return c && Number(c.dataset.camZoom || '0') > 0;
  }, { timeout: 20_000 });
  await page.waitForTimeout(700);
}

async function jumpTo(page, mapId, tileX, tileY) {
  await page.waitForFunction(() => Boolean(window.__OLW_VQG?.jump), { timeout: 15_000 });
  await page.evaluate(
    ({ mapId: mid, tileX: tx, tileY: ty }) => {
      window.__OLW_VQG.jump(mid, tx, ty);
    },
    { mapId, tileX, tileY },
  );
  await waitSceneStable(page);
  await page.waitForTimeout(450);
}

async function captureBurst(page, dir, prefix, count, intervalMs) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < count; i += 1) {
    await page.screenshot({
      path: path.join(dir, `${prefix}-${String(i).padStart(2, '0')}.png`),
    });
    if (i < count - 1) await page.waitForTimeout(intervalMs);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
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
      env: {
        ...process.env,
        OLW_DEV_LAN_STATE_FILE: TMP_STATE,
        VITE_OLW_PRIVATE_ART: 'true',
      },
      stdio: 'ignore',
    },
  );

  try {
    await waitForServer();
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });

    const browser = await chromium.launch();
    const ctxMay = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const ctxNang = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const pageA = await ctxMay.newPage();
    const pageB = await ctxNang.newPage();

    await pageA.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await pageA.getByTestId('btn-dev-seed-couple').click();
    await pageA.getByTestId('preset-partner-a').click();
    await waitSceneStable(pageA);

    await pageB.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await pageB.getByTestId('preset-partner-b').click();
    await waitSceneStable(pageB);

    // Move Nắng slightly right so Mây & Nắng stand cleanly side-by-side
    await pageB.keyboard.down('ArrowRight');
    await pageB.waitForTimeout(420);
    await pageB.keyboard.up('ArrowRight');
    await pageA.waitForTimeout(700);

    await pageA.screenshot({ path: path.join(OUT_DIR, '00-multiplayer-home.png') });

    // Capture all 7 world zones at identical camera positions as BEFORE
    for (const z of ZONES) {
      await jumpTo(pageA, z.mapId, z.tileX, z.tileY);
      const metrics = await pageA.evaluate(() => {
        const c = document.querySelector('[data-testid="game-canvas-host"] canvas');
        return c ? { ...c.dataset } : {};
      });
      console.log('Zone', z.mapId, JSON.stringify(metrics));
      await pageA.screenshot({ path: path.join(OUT_DIR, `${z.file}.png`) });
    }

    // Extra outdoor farm shot (24, 27) + held hoe
    await jumpTo(pageA, 'farm', 24, 27);
    await pageA.keyboard.press('Digit1').catch(() => {});
    await pageA.waitForTimeout(300);
    await pageA.screenshot({ path: path.join(OUT_DIR, '06b-farm-outdoor.png') });

    // Back to home & open Wardrobe
    await jumpTo(pageA, 'home', 8, 9);
    await pageA.getByTestId('nav-avatar').click();
    await pageA.waitForTimeout(450);
    await pageA.screenshot({ path: path.join(OUT_DIR, '08-wardrobe.png') });

    if (CAPTURE_GIFS) {
      const framesRoot = path.join(OUT_DIR, 'gif_frames');
      const seqCouple = path.join(framesRoot, 'couple');
      const seqWardrobe = path.join(framesRoot, 'wardrobe');

      // Wardrobe sequence: idle -> walk -> sit -> customize -> close
      await captureBurst(pageA, seqWardrobe, '01-init', 3, 180);
      await pageA.getByRole('button', { name: 'Đi bộ', exact: true }).click();
      await captureBurst(pageA, seqWardrobe, '02-walk', 5, 130);
      await pageA.getByRole('button', { name: 'Ngồi', exact: true }).click();
      await captureBurst(pageA, seqWardrobe, '03-sit', 4, 150);
      await pageA.getByRole('button', { name: 'Nâu hạt dẻ', exact: true }).click();
      await pageA.getByRole('button', { name: 'Xanh mây nhạt', exact: true }).click();
      await captureBurst(pageA, seqWardrobe, '04-custom', 3, 160);
      await pageA.getByTestId('btn-save-avatar').click();
      await pageA.waitForTimeout(450);
      await captureBurst(pageA, seqWardrobe, '05-synced', 4, 180);

      // Couple life sequence in Home
      await pageA.evaluate(() => {
        const dev = globalThis;
        dev.__OLW_VQG?.jump('home', 8, 9);
      });
      await waitSceneStable(pageA);
      // Dismiss dev banner for crisp full-room frames if visible
      const closeBanner = pageA.locator('.olw-dev-banner--extended-world button[aria-label="Thu gọn"]');
      if (await closeBanner.isVisible().catch(() => false)) {
        await closeBanner.click().catch(() => {});
      }

      // Walk + Shift Run
      await pageA.keyboard.down('ArrowLeft');
      await captureBurst(pageA, seqCouple, '01-walk', 5, 110);
      await pageA.keyboard.up('ArrowLeft');
      await pageA.keyboard.down('Shift');
      await pageA.keyboard.down('ArrowRight');
      await captureBurst(pageA, seqCouple, '02-run', 6, 95);
      await pageA.keyboard.up('ArrowRight');
      await pageA.keyboard.up('Shift');

      // Sit together on sofa
      await pageA.evaluate(() => globalThis.__olwDevEnterPosture?.('sofa_sit'));
      await pageB.evaluate(() => globalThis.__olwDevEnterPosture?.('sofa_sit'));
      await pageA.waitForTimeout(550);
      await pageA.screenshot({ path: path.join(OUT_DIR, '09-sit-sofa-together.png') });
      await captureBurst(pageA, seqCouple, '03-sit', 5, 180);

      // Lie in bed under cozy quilts
      await pageA.evaluate(() => globalThis.__olwDevEnterPosture?.('bed_lie'));
      await pageB.evaluate(() => globalThis.__olwDevEnterPosture?.('bed_lie'));
      await pageA.waitForTimeout(550);
      await pageA.screenshot({ path: path.join(OUT_DIR, '10-lie-bed-together.png') });
      await captureBurst(pageA, seqCouple, '04-lie', 4, 200);

      // Stand up -> Hug invite & accept
      await pageA.keyboard.press('ArrowDown');
      await pageB.keyboard.press('ArrowDown');
      await pageA.waitForTimeout(300);
      await pageA.getByTestId('couple-emote-fab').click();
      await pageB.getByTestId('couple-emote-fab').click();
      await pageA.waitForTimeout(200);
      await pageA.getByTestId('couple-hug-btn').click();
      await pageB.getByTestId('couple-hug-accept').waitFor({ state: 'visible', timeout: 5000 });
      await pageB.getByTestId('couple-hug-accept').click();
      await pageA.waitForTimeout(350);
      await pageA.screenshot({ path: path.join(OUT_DIR, '11-hug-together.png') });
      await captureBurst(pageA, seqCouple, '05-hug', 6, 150);

      // Hold hands invite & accept
      await pageA.getByTestId('couple-standup-btn').click();
      await pageA.waitForTimeout(250);
      await pageA.getByTestId('couple-hold-hands-btn').click();
      await pageB.getByTestId('couple-hug-accept').waitFor({ state: 'visible', timeout: 5000 });
      await pageB.getByTestId('couple-hug-accept').click();
      await pageA.waitForTimeout(350);
      await pageA.screenshot({ path: path.join(OUT_DIR, '12-hold-hands.png') });
      await captureBurst(pageA, seqCouple, '06-hands', 6, 150);
    }

    await browser.close();
    console.log('Captured screenshots into', OUT_DIR);
  } finally {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(srv.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      srv.kill('SIGTERM');
    }
    try {
      fs.unlinkSync(TMP_STATE);
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
