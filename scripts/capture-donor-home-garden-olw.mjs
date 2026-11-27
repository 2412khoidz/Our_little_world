import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { assertCanvasPixelVariance } from './lib/assertScreenshotMapVariance.mjs';

const PORT = process.env.OLW_PORT || '4185';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT =
  process.env.OUT ||
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media/map-transplant-home-olw.png';
const MAP = process.env.MAP || 'garden';

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

async function main() {
  const srv = spawn(
    process.execPath,
    [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    { stdio: 'ignore', env: { ...process.env, VITE_OLW_PRIVATE_ART: '0' } },
  );
  try {
    await waitServer();
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await fetch(`${BASE}/api/dev-lan/seed-couple`, { method: 'POST', body: '{}' });
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE}/?vqg-capture=1`);
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 30_000 });
    await page.evaluate((mapId) => globalThis.__OLW_VQG?.jump(mapId, 8, 8), MAP);
    await page.waitForTimeout(1500);
    await assertCanvasPixelVariance(canvas, { minUnique: 18 });
    await page.screenshot({ path: OUT, fullPage: false });
    await browser.close();
    console.log('Wrote', OUT, 'map', MAP);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});