#!/usr/bin/env node
/**
 * P0 preview QA — console + network per zone (home / village / pet).
 * Run with VITE_OLW_PRIVATE_ART=1 dev server on OLW_QA_PORT (default 4177).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_QA_PORT || '4177';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = process.env.OLW_P0_QA_DIR || '/opt/cursor/artifacts/p0-preview-qa-d8450cb';
const TMP_STATE = path.join(os.tmpdir(), `olw-p0-qa-${Date.now()}.json`);
const SHA = process.env.OLW_PREVIEW_SHA || 'd8450cb';

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/dev-lan/identities`);
      if (res.ok) return;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Vite did not start');
}

function summarizeLogs(zone, consoleMsgs, failedReqs, pageErrors) {
  return {
    zone,
    consoleErrorCount: consoleMsgs.filter((m) => m.type === 'error').length,
    consoleWarnCount: consoleMsgs.filter((m) => m.type === 'warning').length,
    consoleErrors: consoleMsgs.filter((m) => m.type === 'error').map((m) => m.text).slice(0, 12),
    consoleWarnings: consoleMsgs.filter((m) => m.type === 'warning').map((m) => m.text).slice(0, 8),
    failedNetwork: failedReqs.slice(0, 20),
    pageErrors: pageErrors.slice(0, 8),
  };
}

async function seedDevCouple(page) {
  await page.request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
  await page.request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });
}

async function waitHomeCanvas(page) {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 25_000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="game-canvas-host"] canvas');
    return c && Number(c.dataset.camZoom || '0') > 0;
  }, { timeout: 20_000 });
  await page.waitForTimeout(600);
  return canvas;
}

async function runZone(page, label, fn) {
  const consoleMsgs = [];
  const failedReqs = [];
  const pageErrors = [];
  const onConsole = (msg) => consoleMsgs.push({ type: msg.type(), text: msg.text() });
  const onFail = (req) => {
    if (req.resourceType() === 'websocket') return;
    failedReqs.push({ url: req.url(), status: req.failure()?.errorText ?? 'failed' });
  };
  const onPageError = (err) => pageErrors.push(String(err));
  page.on('console', onConsole);
  page.on('requestfailed', onFail);
  page.on('pageerror', onPageError);
  const meta = await fn();
  page.removeListener('console', onConsole);
  page.removeListener('requestfailed', onFail);
  page.removeListener('pageerror', onPageError);
  const summary = summarizeLogs(label, consoleMsgs, failedReqs, pageErrors);
  return { ...summary, ...meta };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  const srv = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    env: {
      ...process.env,
      OLW_DEV_LAN_STATE_FILE: TMP_STATE,
      VITE_OLW_PRIVATE_ART: '1',
      VITE_OLW_EXTENDED_WORLD: '1',
    },
    stdio: 'ignore',
  });

  const results = { sha: SHA, port: PORT, zones: [], capturedAt: new Date().toISOString() };

  try {
    await waitForServer();

    const browser = await chromium.launch();
    const viewports = [
      { id: 'desktop-1280x720', width: 1280, height: 720 },
      { id: 'mobile-430x932', width: 430, height: 932 },
    ];

    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();

      // HOME
      const home = await runZone(page, 'home', async () => {
        await seedDevCouple(page);
        await page.goto(`${BASE}/?extended-world=1`);
        await page.getByTestId('preset-partner-a').click();
        const canvas = await waitHomeCanvas(page);
        const mapId = await canvas.getAttribute('data-map-id');
        const shot = path.join(OUT_DIR, `${vp.id}-home.png`);
        await page.screenshot({ path: shot, fullPage: false });
        return { viewport: vp.id, mapId, png: shot };
      });
      results.zones.push(home);

      // VILLAGE (Cabacos)
      const village = await runZone(page, 'village', async () => {
        await page.getByTestId('nav-outdoor').click({ force: true });
        const canvas = page.getByTestId('game-canvas-host').locator('canvas');
        await canvas.waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForTimeout(1200);
        const mapId = await canvas.getAttribute('data-map-id');
        const shot = path.join(OUT_DIR, `${vp.id}-village.png`);
        await page.screenshot({ path: shot, fullPage: false });
        return { viewport: vp.id, mapId, png: shot };
      });
      results.zones.push(village);

      await ctx.close();

      const ctxPet = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const pagePet = await ctxPet.newPage();
      const petPhaser = await runZone(pagePet, 'pet-phaser', async () => {
        await seedDevCouple(pagePet);
        await pagePet.goto(`${BASE}/?extended-world=1&living-pet=1`);
        await pagePet.getByTestId('preset-partner-a').click();
        await waitHomeCanvas(pagePet);
        await pagePet.evaluate(() => window.dispatchEvent(new Event('olw-dev-enter-pet-care')));
        const overlay = pagePet.getByTestId('pet-care-overlay');
        await overlay.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => undefined);
        await pagePet.waitForTimeout(800);
        const shot = path.join(OUT_DIR, `${vp.id}-pet-phaser.png`);
        await pagePet.screenshot({ path: shot, fullPage: false });
        const overlayVisible = await overlay.isVisible().catch(() => false);
        return { viewport: vp.id, overlayVisible, png: shot };
      });
      results.zones.push(petPhaser);
      await ctxPet.close();

      const ctxThree = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const pageThree = await ctxThree.newPage();
      const petThree = await runZone(pageThree, 'pet-three', async () => {
        await pageThree.goto(`${BASE}/?donor-pet-three=1`);
        const host = pageThree.getByTestId('donor-pet-three-care');
        await host.waitFor({ state: 'visible', timeout: 25_000 });
        await pageThree.waitForTimeout(1500);
        const shot = path.join(OUT_DIR, `${vp.id}-pet-three.png`);
        await pageThree.screenshot({ path: shot, fullPage: false });
        return { viewport: vp.id, png: shot };
      });
      results.zones.push(petThree);
      await ctxThree.close();
    }

    await browser.close();
    fs.writeFileSync(path.join(OUT_DIR, 'zone-qa-log.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});