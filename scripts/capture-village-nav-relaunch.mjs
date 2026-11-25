/**
 * VQG: village QuickNav survives reload without ?extended-world=1 (localStorage bootstrap).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_PORT || '4185';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.OUT || '/opt/cursor/artifacts/village-nav-after-relaunch.png';

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
    {
      stdio: 'ignore',
      env: { ...process.env, VITE_OLW_PRIVATE_ART: '1', VITE_OLW_EXTENDED_WORLD: '1' },
    },
  );
  try {
    await waitServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await page.getByTestId('btn-dev-seed-couple').click();
    await page.getByTestId('preset-partner-a').click();
    await page.goto(`${BASE}/`);
    const seedRelaunch = page.getByTestId('btn-dev-seed-couple');
    if (await seedRelaunch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await seedRelaunch.click();
      await page.getByTestId('preset-partner-a').click();
    }
    await page.getByTestId('nav-outdoor').click({ force: true });
    const canvas = page.getByTestId('game-canvas-host').locator('canvas');
    await canvas.waitFor({ state: 'visible', timeout: 20_000 });
    for (let i = 0; i < 40; i += 1) {
      if ((await canvas.getAttribute('data-map-id')) === 'village') break;
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1200);
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