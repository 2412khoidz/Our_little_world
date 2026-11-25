#!/usr/bin/env node
/**
 * Owner acceptance — pet care session screenshots (dev server on PLAYWRIGHT_PORT).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const port = process.env.PLAYWRIGHT_PORT || '4173';
const base = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const outDir = process.env.OLW_CAPTURE_DIR || '/opt/cursor/artifacts';

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.request.post(`${base}/api/dev-lan/reset`, { data: {} });
  await page.goto(`${base}/?living-pet=1`);
  await page.getByTestId('btn-dev-seed-couple').click();
  await page.getByTestId('preset-partner-a').click();
  await page.getByTestId('nav-menu').click({ force: true });
  await page.getByTestId('menu-pet').click();
  await page.getByTestId('input-pet-name').fill('Quýt');
  await page.getByTestId('btn-pet-save-name').click();
  await page.getByRole('button', { name: 'Đóng' }).first().click();
  await page.getByTestId('living-pet-telemetry').waitFor({ timeout: 30_000 });

  await page.evaluate(() => window.dispatchEvent(new Event('olw-dev-enter-pet-care')));
  await page.getByTestId('pet-care-overlay').waitFor({ timeout: 30_000 });
  await page.getByTestId('pet-care-j4lpan-portrait').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'pet-care-session-enter.png') });

  await page.getByTestId('pet-care-call').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'pet-care-session-call.png') });

  await page.keyboard.press('2');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'pet-care-session-toy.png') });

  await page.keyboard.press('1');
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'pet-care-session-food.png') });

  await page.getByTestId('pet-care-observe').click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, 'pet-care-session-observe.png') });

  await browser.close();
  console.log('Saved pet care session captures to', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});