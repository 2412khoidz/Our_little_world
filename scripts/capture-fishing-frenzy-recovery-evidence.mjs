#!/usr/bin/env node
/**
 * Worker J recovery evidence: short webm videos — upstream kofkdk/fishing-frenzy vs OLW Tidefall+FSM UI.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DONOR_VENDOR = path.join(ROOT, 'vendor/fishing-frenzy-upstream');
const ART =
  process.env.ART_DIR || '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media';
const DONOR_VIDEO = path.join(ART, 'fishing-frenzy-recovery-donor.webm');
const OLW_VIDEO = path.join(ART, 'fishing-frenzy-recovery-olw.webm');
const OLW_PORT = process.env.OLW_PORT || '4184';
const DONOR_PORT = process.env.DONOR_PORT || '5191';
const OLW_BASE = `http://127.0.0.1:${OLW_PORT}`;
const DONOR_BASE = `http://127.0.0.1:${DONOR_PORT}`;

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { stdio: 'inherit', ...opts });
}

async function waitHttp(base, tries = 90) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(`${base}/`);
      if (res.ok) return;
    } catch {
      /* spin */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`timeout waiting for ${base}`);
}

async function recordDonor() {
  if (!fs.existsSync(path.join(DONOR_VENDOR, 'package.json'))) {
    throw new Error('Run npm run vendor-donor:fishing-frenzy first');
  }
  const nodeModules = path.join(DONOR_VENDOR, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    await new Promise((resolve, reject) => {
      const p = run('npm', ['ci'], { cwd: DONOR_VENDOR });
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`npm ci donor ${code}`))));
    });
  }
  const srv = run('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', DONOR_PORT, '--strictPort'], {
    cwd: DONOR_VENDOR,
    stdio: 'ignore',
  });
  try {
    await waitHttp(DONOR_BASE);
    fs.mkdirSync(ART, { recursive: true });
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 700 },
      recordVideo: { dir: ART, size: { width: 390, height: 700 } },
    });
    const page = await context.newPage();
    await page.goto(DONOR_BASE);
    await page.waitForTimeout(1200);
    const cast = page.locator('.cast-btn').first();
    await cast.waitFor({ state: 'visible', timeout: 15_000 });
    await cast.click();
    await page.waitForTimeout(2500);
    const hook = page.locator('.hook-btn, .reel-btn, button').filter({ hasText: /hook|gigit|tarik/i }).first();
    if (await hook.isVisible().catch(() => false)) {
      await hook.click();
      await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(1500);
    await context.close();
    await browser.close();
    const webms = fs
      .readdirSync(ART)
      .filter((f) => f.endsWith('.webm'))
      .map((f) => ({ f, m: fs.statSync(path.join(ART, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    const latest = webms[0];
    if (latest) {
      fs.renameSync(path.join(ART, latest.f), DONOR_VIDEO);
    }
    console.log('Donor video →', DONOR_VIDEO);
  } finally {
    srv.kill('SIGTERM');
  }
}

async function recordOlw() {
  const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  const srv = spawn(process.execPath, [vite, '--host', '127.0.0.1', '--port', OLW_PORT, '--strictPort'], {
    stdio: 'ignore',
    env: {
      ...process.env,
      VITE_OLW_DONOR_ECONOMY: '1',
      VITE_OLW_EXTENDED_WORLD: '1',
    },
  });
  try {
    await waitHttp(OLW_BASE);
    fs.mkdirSync(ART, { recursive: true });
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 780 },
      recordVideo: { dir: ART, size: { width: 390, height: 780 } },
    });
    const page = await context.newPage();
    await page.goto(`${OLW_BASE}/?extended-world=1&vqg-capture=1`);
    await fetch(`${OLW_BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await fetch(`${OLW_BASE}/api/dev-lan/seed-couple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    await page.reload();
    await page.getByTestId('preset-partner-a').click({ timeout: 45_000 });
    await page.getByTestId('game-canvas-host').locator('canvas').waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.__OLW_VQG?.openFishing('meadow_pond');
    });
    await page.getByTestId('donor-fishing-modal').waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByTestId('tidefall-fishing-first-run').waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(800);
    await page.getByTestId('tidefall-cast-btn').click();
    await page.waitForTimeout(3500);
    const hook = page.getByTestId('tidefall-hook-btn');
    if (await hook.isVisible().catch(() => false)) {
      await hook.click();
      await page.waitForTimeout(500);
    }
    const canvas = page.getByTestId('tidefall-fishing-canvas');
    for (let i = 0; i < 8; i += 1) {
      await canvas.click({ position: { x: 160, y: 90 } }).catch(() => undefined);
      await page.waitForTimeout(280);
    }
    await page.waitForTimeout(2000);
    await context.close();
    await browser.close();
    const webms = fs
      .readdirSync(ART)
      .filter((f) => f.endsWith('.webm'))
      .map((f) => ({ f, m: fs.statSync(path.join(ART, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    const latest = webms[0];
    if (latest && path.join(ART, latest.f) !== DONOR_VIDEO) {
      fs.renameSync(path.join(ART, latest.f), OLW_VIDEO);
    }
    console.log('OLW video →', OLW_VIDEO);
  } finally {
    srv.kill('SIGTERM');
  }
}

async function main() {
  if (process.env.SKIP_DONOR !== '1') await recordDonor();
  if (process.env.SKIP_OLW !== '1') await recordOlw();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});