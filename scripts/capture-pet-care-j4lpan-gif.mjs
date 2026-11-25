#!/usr/bin/env node
/**
 * Pet Care j4lpan SVG evidence — frame strip + optional GIF (ffmpeg).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const port = process.env.PLAYWRIGHT_PORT || '4173';
const base = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const outDir = process.env.OLW_CAPTURE_DIR || '/opt/cursor/artifacts';
const framesDir = path.join(outDir, 'pet-care-j4lpan-frames');

async function main() {
  fs.mkdirSync(framesDir, { recursive: true });
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

  const actions = ['pet-care-call', 'pet-care-call', 'pet-care-call'];
  let frameIdx = 0;
  for (const testId of actions) {
    await page.getByTestId(testId).click();
    for (let i = 0; i < 6; i += 1) {
      await page.waitForTimeout(180);
      await page.screenshot({ path: path.join(framesDir, `frame-${String(frameIdx).padStart(3, '0')}.png`) });
      frameIdx += 1;
    }
  }

  const j4lpanSvg = await page.locator('[data-testid="pet-shop-closeup-cat"] svg').count();
  const canvasFlags = await page
    .getByTestId('game-canvas-host')
    .locator('canvas')
    .evaluate((c) => ({ petCareJ4lpan: c.dataset.petCareJ4lpan, petCareRig: c.dataset.petCareRig }));

  fs.writeFileSync(
    path.join(outDir, 'pet-care-j4lpan-evidence.json'),
    JSON.stringify({ j4lpanSvgPresent: j4lpanSvg > 0, canvasFlags, frameCount: frameIdx }, null, 2),
  );

  const gifPath = path.join(outDir, 'pet-care-j4lpan-evidence.gif');
  try {
    execSync(
      `ffmpeg -y -framerate 6 -i "${framesDir}/frame-%03d.png" -vf "scale=390:-1:flags=neighbor" -loop 0 "${gifPath}"`,
      { stdio: 'pipe' },
    );
    console.log('GIF:', gifPath);
  } catch {
    console.warn('ffmpeg unavailable — frame strip only at', framesDir);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});