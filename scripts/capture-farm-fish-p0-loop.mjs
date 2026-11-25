import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_PORT || '4182';
const BASE = `http://127.0.0.1:${PORT}`;
const ART = process.env.ART_DIR || '/opt/cursor/artifacts';

async function waitServer() {
  for (let i = 0; i < 80; i += 1) {
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
    { stdio: 'ignore', env: { ...process.env, VITE_OLW_DONOR_ECONOMY: '1' } },
  );
  try {
    await waitServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    await page.goto(`${BASE}/?extended-world=1`);
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('game-canvas-host').locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.getByTestId('game-hotbar').waitFor({ state: 'visible', timeout: 15000 });
    await page.screenshot({ path: path.join(ART, 'farm-fish-p0-hotbar.png') });
  await page.getByTestId('farm-fish-tutorial').waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);
    await page.evaluate(() => window.__OLW_VQG?.jump?.('farm', 20, 28));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(ART, 'farm-fish-p0-farm-map.png') });
    await page.evaluate(() => window.__OLW_VQG?.jump?.('outdoor', 32, 40));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ART, 'farm-fish-p0-outdoor-fishing.png') });
    await browser.close();
    console.log('Wrote farm-fish P0 captures to', ART);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});