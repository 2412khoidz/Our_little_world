import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { assertCanvasPixelVariance, assertScreenshotCenterVariance } from './lib/assertScreenshotMapVariance.mjs';

const PORT = process.env.OLW_PORT || '4182';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.OUT || '/opt/cursor/artifacts/map-transplant-beach-olw.png';

async function waitServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return;
    } catch {
      /* spin */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('dev server timeout');
}

async function vqgJumpUntilMap(page, canvas, mapId, tx, ty) {
  await page.waitForFunction(
    () => typeof globalThis.__OLW_VQG?.jump === 'function',
    undefined,
    { timeout: 20_000 },
  );
  for (let i = 0; i < 50; i += 1) {
    const id = await canvas.getAttribute('data-map-id');
    if (id === mapId) return;
    await page.evaluate(
      ({ mapId: mid, tileX: x, tileY: y }) => {
        if (!globalThis.__OLW_VQG?.jump) throw new Error('VQG jump unavailable');
        globalThis.__OLW_VQG.jump(mid, x, y);
      },
      { mapId, tileX: tx, tileY: ty },
    );
    await page.waitForTimeout(250);
  }
  const finalId = await canvas.getAttribute('data-map-id');
  if (finalId !== mapId) throw new Error(`VQG: expected ${mapId}, got ${finalId}`);
}

async function main() {
  const srv = spawn(
    process.execPath,
    [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    { stdio: 'ignore', env: { ...process.env, VITE_OLW_EXTENDED_WORLD: '1' } },
  );
  try {
    await waitServer();
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await fetch(`${BASE}/api/dev-lan/seed-couple`, { method: 'POST', body: '{}' });
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 30_000 });
    await vqgJumpUntilMap(page, canvas, 'beach', 1, 16);
    await page.waitForTimeout(1200);
    await assertCanvasPixelVariance(canvas, { minUnique: 22 });
    await page.screenshot({ path: OUT, fullPage: false });
    const unique = assertScreenshotCenterVariance(OUT, { minUnique: 22 });
    await browser.close();
    console.log('Wrote', OUT, 'uniqueColors', unique);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});