/**
 * Headless Chromium screenshot of PyDew farm map (requires dev server).
 * OUT=/path.png BASE_URL=http://127.0.0.1:5173 node scripts/capture-donor-pydew-farm.mjs
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const OUT =
  process.env.OUT ??
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media/map-transplant-farm-pydew-olw.png';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(`${BASE}/?dev=1&map=farm`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT, fullPage: false });
  await browser.close();
  console.log('Wrote', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});