/**
 * Visual Quality Gate — extended world zone captures (`?extended-world=1&vqg-capture=1`).
 * Output: test-results/vqg-capture/<name>-after.png (1280×720).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_VQG_PORT || '4178';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = process.env.OLW_VQG_OUTPUT_DIR || path.join(process.cwd(), 'test-results', 'vqg-capture');
const TMP_STATE = path.join(os.tmpdir(), `olw-vqg-${Date.now()}.json`);

/** Same framing across before/after runs. */
const SHOTS = [
  { file: 'vqg-village-pond', mapId: 'village', tileX: 10, tileY: 17 },
  { file: 'vqg-shop-interior', mapId: 'shop', tileX: 6, tileY: 5 },
  { file: 'vqg-home-interior', mapId: 'home', tileX: 8, tileY: 8 },
  { file: 'vqg-secret-spring', mapId: 'forest', tileX: 35, tileY: 34 },
  { file: 'vqg-shoreline', mapId: 'beach', tileX: 28, tileY: 26 },
  { file: 'vqg-beach-dune-north', mapId: 'beach', tileX: 24, tileY: 6 },
  { file: 'vqg-portal-west-gate', mapId: 'village', tileX: 2, tileY: 21 },
  { file: 'vqg-portal-farm-entry', mapId: 'farm', tileX: 56, tileY: 20 },
];

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/dev-lan/identities`);
      if (res.ok) return;
    } catch {
      /* spin */
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
  await page.waitForTimeout(400);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const srv = spawn(
    process.execPath,
    [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    {
      env: { ...process.env, OLW_DEV_LAN_STATE_FILE: TMP_STATE },
      stdio: 'ignore',
    },
  );

  try {
    await waitForServer();
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await waitSceneStable(page);

    for (const shot of SHOTS) {
      await jumpTo(page, shot.mapId, shot.tileX, shot.tileY);
      await page.screenshot({
        path: path.join(OUT_DIR, `${shot.file}-after.png`),
        fullPage: false,
      });
      console.log('Wrote', shot.file);
    }

    await browser.close();
    console.log('VQG captures in', OUT_DIR);
  } finally {
    srv.kill('SIGTERM');
    try {
      fs.unlinkSync(TMP_STATE);
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});