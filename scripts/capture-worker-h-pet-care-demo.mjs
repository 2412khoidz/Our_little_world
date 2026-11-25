#!/usr/bin/env node
/**
 * Worker H — ~3 min living pet care gameplay (Phaser body, no j4lpan default).
 * Output: OLW_WORKER_H_DEMO_MP4 or project store media path.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const port = process.env.PLAYWRIGHT_PORT || '4173';
const base = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const outMp4 =
  process.env.OLW_WORKER_H_DEMO_MP4 ||
  '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media/worker-h-pet-care-demo.mp4';
const workDir = path.dirname(outMp4);
const framesDir = path.join(workDir, 'worker-h-pet-care-frames');

const DURATION_MS = 180_000;
const FRAME_MS = 250;

async function main() {
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: workDir, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  await page.request.post(`${base}/api/dev-lan/reset`, { data: {} });
  await page.goto(`${base}/?living-pet=1&pet-care-illustration=0`);
  await page.getByTestId('btn-dev-seed-couple').click();
  await page.getByTestId('preset-partner-a').click();
  await page.getByTestId('nav-menu').click({ force: true });
  await page.getByTestId('menu-pet').click();
  await page.getByTestId('input-pet-name').fill('Quýt');
  await page.getByTestId('btn-pet-save-name').click();
  await page.getByRole('button', { name: 'Đóng' }).first().click();
  await page.getByTestId('living-pet-telemetry').waitFor({ timeout: 35_000 });

  await page.evaluate(() => window.dispatchEvent(new Event('olw-dev-enter-pet-care')));
  await page.getByTestId('pet-care-overlay').waitFor({ timeout: 25_000 });

  const started = Date.now();
  let frameIdx = 0;
  const script = [
    { at: 5_000, fn: () => page.getByTestId('pet-care-call').click() },
    { at: 18_000, fn: () => page.getByTestId('pet-care-brush').click() },
    { at: 32_000, fn: () => page.getByTestId('pet-care-water').click() },
    { at: 48_000, fn: () => page.keyboard.press('2') },
    { at: 49_000, fn: () => page.keyboard.press('KeyJ') },
    { at: 68_000, fn: () => page.keyboard.press('1') },
    { at: 69_500, fn: () => page.keyboard.press('KeyJ') },
    { at: 92_000, fn: () => page.getByTestId('pet-care-observe').click() },
    { at: 118_000, fn: () => page.getByTestId('pet-care-call').click() },
    { at: 142_000, fn: () => page.mouse.move(195, 380) },
    { at: 143_000, fn: () => page.mouse.down() },
    { at: 147_000, fn: () => page.mouse.up() },
    { at: 165_000, fn: () => page.getByTestId('pet-care-brush').click() },
  ];
  let scriptIdx = 0;

  while (Date.now() - started < DURATION_MS) {
    const elapsed = Date.now() - started;
    while (scriptIdx < script.length && script[scriptIdx].at <= elapsed) {
      await script[scriptIdx].fn();
      scriptIdx += 1;
    }
  await page.screenshot({
      path: path.join(framesDir, `frame-${String(frameIdx).padStart(5, '0')}.png`),
      type: 'png',
    });
    frameIdx += 1;
    await page.waitForTimeout(FRAME_MS);
  }

  const video = page.video();
  await page.getByTestId('pet-care-exit').click();
  await page.waitForTimeout(600);
  await context.close();
  await browser.close();

  const webmPath = video ? await video.path() : null;
  if (webmPath && fs.existsSync(webmPath)) {
    const tmp = webmPath.replace(/\.webm$/, '') + '-h264.mp4';
    spawnSync(
      'ffmpeg',
      ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp],
      { stdio: 'inherit' },
    );
    if (fs.existsSync(tmp)) {
      fs.copyFileSync(tmp, outMp4);
      console.log('Saved', outMp4);
      return;
    }
  }

  const listPath = path.join(framesDir, 'frames.txt');
  fs.writeFileSync(
    listPath,
    fs
      .readdirSync(framesDir)
      .filter((f) => f.endsWith('.png'))
      .sort()
      .map((f) => `file '${path.join(framesDir, f)}'\nduration ${FRAME_MS / 1000}`)
      .join('\n'),
  );
  spawnSync(
    'ffmpeg',
    ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-vf', 'fps=4', '-pix_fmt', 'yuv420p', outMp4],
    { stdio: 'inherit' },
  );
  console.log('Saved', outMp4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});