import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = process.env.OLW_PORT || '4188';
const BASE = `http://127.0.0.1:${PORT}`;
const ART = process.env.ART_DIR || '/cursor/stores/bc-2e22f11f-fecd-46d0-800e-ec62bb2a932f/media';
const DONOR_SHEET = process.env.DONOR_SHEET_OUT || path.join(ART, 'farming-transplant-contact-sheet-donor.png');
const OLW_SHEET = process.env.OLW_SHEET_OUT || path.join(ART, 'farming-transplant-contact-sheet-olw.png');

async function waitServer() {
  for (let i = 0; i < 80; i += 1) {
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
  const { execFileSync } = await import('node:child_process');
  execFileSync('node', ['scripts/build-farming-transplant-contact-sheet.mjs'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: { ...process.env, OUT: OLW_SHEET },
    stdio: 'inherit',
  });
  const fs = await import('node:fs');
  const donorSrc = path.resolve(
    import.meta.dirname,
    '../vendor/farming-simulator-cabacos-upstream/public/assets/plantation/crops/wheat.png',
  );
  if (fs.existsSync(donorSrc)) {
    execFileSync(
      'python3',
      [
        '-c',
        `from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2])`,
        donorSrc,
        DONOR_SHEET.replace('-donor.png', '-wheat-donor.png'),
      ],
      { stdio: 'inherit' },
    );
  }

  const srv = spawn(
    process.execPath,
    [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1', '--port', PORT, '--strictPort'],
    {
      stdio: 'ignore',
      env: {
        ...process.env,
        VITE_OLW_DONOR_ECONOMY: '1',
        VITE_OLW_EXTENDED_WORLD: '1',
        VITE_OLW_PRIVATE_ART: '1',
      },
    },
  );
  try {
    await waitServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(`${BASE}/?extended-world=1&vqg-capture=1`);
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });
    await page.getByTestId('btn-dev-seed-couple').click({ timeout: 60_000 });
    await page.getByTestId('preset-partner-a').click();
    await page.getByTestId('game-canvas-host').locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500);
    const worldRes = await page.request.get(`${BASE}/api/dev-lan/world`);
    const worldId = (await worldRes.json()).world?.id;
    const hdr = { 'x-dev-user-id': 'dev-user-a', 'content-type': 'application/json' };
    for (const [plotIndex, action, seedSku] of [
      [0, 'till'],
      [0, 'plant', 'seed_wheat'],
      [0, 'water'],
      [1, 'till'],
      [1, 'plant', 'seed_tomato'],
      [2, 'till'],
      [2, 'plant', 'seed_carrot'],
    ]) {
      await page.request.post(`${BASE}/api/dev-lan/farm/apply`, {
        headers: hdr,
        data: {
          worldId,
          plotIndex,
          action,
          seedSku: seedSku ?? null,
          idempotencyKey: `cap-${plotIndex}-${action}-${Date.now()}`,
        },
      });
    }
    await page.getByTestId('nav-farm').click({ force: true });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.__OLW_VQG?.jump('farm', 12, 14));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ART, 'farming-transplant-gameplay-farm-crops.png') });
    await page.getByTestId('hotbar-slot-0').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ART, 'farming-transplant-held-hoe.png') });
    await browser.close();
    console.log('Wrote captures to', ART);
  } finally {
    srv.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});