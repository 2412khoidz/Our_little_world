import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { assertCanvasPixelVariance } from './lib/assertScreenshotMapVariance.mjs';

const PORT = process.env.OLW_PORT || '4181';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.OUT || '/cursor/stores/self/media/donor-cabacos-olw-village-after.png';

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
    { stdio: 'ignore', env: { ...process.env } },
  );
  try {
    await waitServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__OLW_VQG?.jump?.('village', 42, 31));
    for (let i = 0; i < 40; i += 1) {
      const id = await canvas.getAttribute('data-map-id');
      if (id === 'village') break;
      await page.waitForTimeout(250);
    }
    const mapId = await canvas.getAttribute('data-map-id');
    if (mapId !== 'village') throw new Error(`Expected village map, got ${mapId}`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT, fullPage: false });
    const { assertScreenshotCenterVariance } = await import('./lib/assertScreenshotMapVariance.mjs');
    const unique = assertScreenshotCenterVariance(OUT, { minUnique: 28 });
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