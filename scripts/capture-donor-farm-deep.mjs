/**
 * VQG: Cabacos donor farm map (deep reuse) — asserts data-map-id farm + variance.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { assertCanvasPixelVariance } from './lib/assertScreenshotMapVariance.mjs';

const PORT = process.env.OLW_PORT || '4186';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.OUT || '/opt/cursor/artifacts/donor-cabacos-farm-deep.png';

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
    { stdio: 'ignore', env: { ...process.env, VITE_OLW_EXTENDED_WORLD: '1' } },
  );
  try {
    await waitServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1&map=farm`);
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 20000 });
    await page.evaluate(() => window.__OLW_VQG?.jump?.('farm', 55, 20));
    for (let i = 0; i < 40; i += 1) {
      if ((await canvas.getAttribute('data-map-id')) === 'farm') break;
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1200);
    await assertCanvasPixelVariance(canvas, { minUnique: 28 });
    await page.screenshot({ path: OUT, fullPage: false });
    await browser.close();
    console.log('Wrote', OUT);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});