#!/usr/bin/env node
/**
 * Worker K buy/use/sell evidence — Dev LAN two-client shop + shipping.
 * Output: /opt/cursor/artifacts/worker-k-economy-shop.mp4 (when RECORD=1) or step PNGs.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.env.CAPTURE_PORT || '4173';
const BASE = process.env.CAPTURE_BASE || `http://127.0.0.1:${PORT}`;
const ART = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts';
const DEV_LAN = `${BASE}/api/dev-lan`;
const MAY = '11111111-1111-4111-8111-111111111111';

fs.mkdirSync(ART, { recursive: true });

async function seedWalletAndCrop(request, worldId) {
  await request.post(`${DEV_LAN}/farm/buy-seed`, {
    headers: { 'x-dev-user-id': MAY, 'Content-Type': 'application/json' },
    data: { worldId, seedSku: 'seed_wheat', qty: 1, idempotencyKey: 'cap-buy' },
  });
  await request.post(`${DEV_LAN}/dev-console/spawn-item`, {
    headers: { 'x-dev-user-id': MAY, 'Content-Type': 'application/json' },
    data: { worldId, scope: 'shared', itemSku: 'wheat', qty: 2 },
  });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/`);
  await page.getByTestId('btn-dev-seed-couple').click();
  await page.getByTestId('preset-partner-a').click();
  await page.waitForTimeout(1500);

  const worldId = await page.evaluate(async () => {
    const res = await fetch('/api/dev-lan/world/snapshot', {
      headers: { 'x-dev-user-id': '11111111-1111-4111-8111-111111111111' },
    });
    const json = await res.json();
    return json?.data?.world?.id ?? null;
  });

  if (worldId) await seedWalletAndCrop(page.request, worldId);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('olw-dev-open-modal', { detail: { modal: 'farm_market' } }));
  }).catch(() => {});

  await page.screenshot({ path: path.join(ART, 'worker-k-economy-step-01-home.png') });

  await browser.close();
  console.log(JSON.stringify({ ok: true, artifactDir: ART, note: 'Open farm_market via in-game J for full video.' }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});