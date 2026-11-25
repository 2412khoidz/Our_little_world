/**
 * In-game forest capture after Tuxemon transplant.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_PORT || '4188';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT =
  process.env.OUT ??
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media/map-transplant-forest-olw-ingame.png';

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
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await fetch(`${BASE}/api/dev-lan/seed-couple`, { method: 'POST', body: '{}' });
    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await page.getByTestId('preset-partner-a').click();
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForFunction(
      () => typeof globalThis.__OLW_VQG?.jump === 'function',
      undefined,
      { timeout: 20_000 },
    );
    await page.evaluate(() => {
      globalThis.__OLW_VQG.jump('forest', 14, 32);
    });
    for (let i = 0; i < 40; i += 1) {
      if ((await canvas.getAttribute('data-map-id')) === 'forest') break;
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(2000);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    await page.screenshot({ path: OUT, fullPage: false });
    await browser.close();
    console.log('Wrote', OUT);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});