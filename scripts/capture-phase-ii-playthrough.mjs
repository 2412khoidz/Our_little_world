#!/usr/bin/env node
/**
 * Phase II — 11-step integration playthrough (no vqg-capture / no map jump).
 * Dev LAN: preset Mây/Nắng = normal dev accounts. Screenshots → OLW_PHASE2_MEDIA_DIR.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_PORT || '4188';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.OLW_PHASE2_MEDIA_DIR || '/cursor/stores/self/media';
const SHA = process.env.OLW_PREVIEW_SHA || '7474eb0';

async function waitServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/dev-lan/identities`);
      if (res.ok) return;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('dev server timeout');
}

async function shot(page, name, log) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  log.push({ step: name.replace('.png', ''), file, url: page.url() });
}

async function waitCanvas(page) {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(700);
  return canvas;
}

async function seedCouple(page) {
  await page.request.post(`${BASE}/api/dev-lan/reset`, { data: {} });
  await page.request.post(`${BASE}/api/dev-lan/seed-couple`, { data: {} });
}

async function gotoWorld(page) {
  await page.goto(`${BASE}/?extended-world=1`);
  await page.getByTestId('preset-partner-a').click();
  await waitCanvas(page);
}

async function pickHotbarSlot(page, slot) {
  await page.getByTestId(`hotbar-slot-${slot}`).click();
  await page.keyboard.press(String(slot));
  return slot;
}

async function pressContextIfVisible(page) {
  const primary = page.getByTestId('btn-context-primary');
  if (await primary.isVisible().catch(() => false)) {
    await primary.click();
    return true;
  }
  await page.keyboard.press('j');
  return false;
}

async function farmApply(request, worldId, body) {
  const res = await request.post(`${BASE}/api/dev-lan/farm/apply`, {
    headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111', 'Content-Type': 'application/json' },
    data: { worldId, ...body },
  });
  return res;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const log = [];
  const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  const srv = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    stdio: 'ignore',
    env: {
      ...process.env,
      VITE_OLW_PRIVATE_ART: '1',
      VITE_OLW_EXTENDED_WORLD: '1',
    },
  });

  const report = { sha: SHA, capturedAt: new Date().toISOString(), steps: [], hudNotes: [], gaps: [] };

  try {
    await waitServer();
    const browser = await chromium.launch();
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const ctxB = await browser.newContext({ viewport: { width: 430, height: 932 } });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // 1–2: two clients + home HUD
    await seedCouple(pageA);
    await gotoWorld(pageA);
    const hotbarVisible = await pageA.getByTestId('game-hotbar').isVisible();
    const slots = await pageA.locator('[data-testid^="hotbar-slot-"]').count();
    report.hudNotes.push(`hotbar visible=${hotbarVisible}, visible_slots=${slots} (P0 target=8)`);
    if (slots < 8) report.gaps.push(`HUD P0: hotbar shows ${slots}/8 slots @ ${SHA}`);
    await shot(pageA, 'phase-ii-step-01-home-hud-desktop.png', log);

    await pageB.goto(`${BASE}/?extended-world=1`);
    await pageB.getByTestId('preset-partner-b').click();
    await waitCanvas(pageB);
    await shot(pageB, 'phase-ii-step-02-two-client-mobile.png', log);

    // 3: garden (starter kit on first /farm)
    await pageA.getByTestId('nav-farm').click({ force: true });
    await waitCanvas(pageA);
    await pageA.waitForTimeout(1200);
    await shot(pageA, 'phase-ii-step-03-garden-enter.png', log);

    const worldRes = await pageA.request.get(`${BASE}/api/dev-lan/world/snapshot`, {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    const worldJson = await worldRes.json();
    const worldId = worldJson?.data?.world?.id;
    if (!worldId) throw new Error('no worldId');
    await pageA.request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });

    // 4–8: hoe → plant → water → harvest (UI attempt + authority API for growth timing)
    await pickHotbarSlot(pageA, 1);
    await shot(pageA, 'phase-ii-step-04-hotbar-hoe.png', log);
    let farm = await pageA.request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    let ver = (await farm.json()).data.version;
    await farmApply(pageA.request, worldId, { plotIndex: 0, action: 'till', farmVersion: ver, idempotencyKey: 'p2-till' });
    farm = await pageA.request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    ver = (await farm.json()).data.version;
    await shot(pageA, 'phase-ii-step-05-till-plot.png', log);

    await pickHotbarSlot(pageA, 3);
    await farmApply(pageA.request, worldId, {
      plotIndex: 0,
      action: 'plant',
      seedSku: 'seed_wheat',
      farmVersion: ver,
      idempotencyKey: 'p2-plant',
    });
    await shot(pageA, 'phase-ii-step-06-plant.png', log);
    farm = await pageA.request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    ver = (await farm.json()).data.version;
    await farmApply(pageA.request, worldId, { plotIndex: 0, action: 'water', farmVersion: ver, idempotencyKey: 'p2-water' });
    await pageA.waitForTimeout(2500);
    farm = await pageA.request.get(`${BASE}/api/dev-lan/farm?worldId=${worldId}`, {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    ver = (await farm.json()).data.version;
    await farmApply(pageA.request, worldId, { plotIndex: 0, action: 'harvest', farmVersion: ver, idempotencyKey: 'p2-harvest' });
    await shot(pageA, 'phase-ii-step-07-harvest.png', log);

    // 8 sell — shipping modal via menu if world prompt missing
    await pageA.getByTestId('nav-menu').click();
    report.gaps.push('sell/shipping: no menu entry — walk to shipping_bin on farm (discoverability P0)');
    await pageA.waitForTimeout(600);
    await shot(pageA, 'phase-ii-step-08-sell-shipping.png', log);
    const close = pageA.getByRole('button', { name: 'Đóng' }).first();
    if (await close.isVisible().catch(() => false)) await close.click();

    // 9 fish — donor dev modal (discoverability gap if menu-only)
    await pageA.getByTestId('nav-menu').click();
    const fishItem = pageA.getByTestId('menu-donor-fishing');
    if (await fishItem.isVisible().catch(() => false)) {
      await fishItem.click();
      await pageA.waitForTimeout(800);
      await shot(pageA, 'phase-ii-step-09-fish-modal.png', log);
      await pageA.getByRole('button', { name: 'Đóng' }).first().click();
    } else {
      report.gaps.push('fishing via Dev menu only');
      await pageA.getByRole('button', { name: 'Đóng' }).first().click().catch(() => undefined);
      await shot(pageA, 'phase-ii-step-09-fish-gap.png', log);
    }

    // 10 shop — village nav + shop interact or market menu
    await pageA.getByTestId('nav-outdoor').click({ force: true });
    await waitCanvas(pageA);
    await pageA.waitForTimeout(1500);
    await shot(pageA, 'phase-ii-step-10-village-shop-nav.png', log);

    // 11 two-client shared state snapshot
    await shot(pageA, 'phase-ii-step-11-two-client-desktop.png', log);
    await shot(pageB, 'phase-ii-step-11-two-client-mobile-b.png', log);

    report.steps = log;
    fs.writeFileSync(path.join(OUT, 'phase-ii-playthrough-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    await browser.close();
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});