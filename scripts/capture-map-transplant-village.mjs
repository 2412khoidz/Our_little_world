import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_PORT || '4182';
const BASE = `http://127.0.0.1:${PORT}`;
const STORE = process.env.STORE_MEDIA || '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media';

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
    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1200);

    const jump = async (mapId, x, y) => {
      await page.evaluate(
        ([m, tx, ty]) => window.__OLW_VQG?.jump?.(m, tx, ty),
        [mapId, x, y],
      );
      for (let i = 0; i < 40; i += 1) {
        const id = await canvas.getAttribute('data-map-id');
        if (id === mapId) break;
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(900);
    };

    await jump('village', 42, 31);
    const villageOut = path.join(STORE, 'map-transplant-village-olw.png');
    await page.screenshot({ path: villageOut });
    console.log('Wrote', villageOut);

    await jump('shop_seed', 11, 14);
    const shopOut = path.join(STORE, 'map-transplant-village-shop-seed-olw.png');
    await page.screenshot({ path: shopOut });
    console.log('Wrote', shopOut);

    await browser.close();
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});