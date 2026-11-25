#!/usr/bin/env node
/**
 * VQG: inventory modal with props-manifest icons (run with VITE_OLW_PRIVATE_ART=1 dev server).
 * Usage: node scripts/vqg-inventory-modal-capture.mjs [--out /opt/cursor/artifacts/vqg-inventory-modal-after.png]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const port = process.env.PLAYWRIGHT_PORT || '4173';
const base = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const outArg = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : path.join(process.cwd(), 'test-results', 'vqg-inventory-modal-after.png');

async function main() {
  fs.mkdirSync(path.dirname(outArg), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  await page.goto(`${base}/?extended-world=1`);
  const reset = await page.request.post(`${base}/api/dev-lan/reset`, { data: {} });
  if (!reset.ok()) throw new Error(`dev-lan reset failed: ${reset.status()}`);
  await page.reload();
  await page.getByTestId('btn-dev-seed-couple').click({ timeout: 60_000 });
  await page.getByTestId('preset-partner-a').click();
  await page.getByTestId('game-canvas-host').locator('canvas').waitFor({ state: 'visible', timeout: 60_000 });

  await page.getByTestId('nav-menu').click();
  await page.getByTestId('menu-inventory').click();
  await page.getByTestId('inventory-modal').waitFor({ state: 'visible' });
  await page.getByTestId('btn-claim-free-kibble').click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: outArg, fullPage: false });
  await browser.close();
  console.log('Saved', outArg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});