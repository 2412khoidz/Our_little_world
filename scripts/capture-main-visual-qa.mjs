import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

const PORT = 4176;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(process.cwd(), 'test-results', 'v01-demo-e-restored');
const TMP_STATE = path.join(os.tmpdir(), `olw-qa-${Date.now()}.json`);

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/dev-lan/identities`);
      if (res.ok) return;
    } catch {
      // Wait for Vite server
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Vite server did not start in time');
}

async function waitSceneStable(page) {
  const canvas = page.getByTestId('game-canvas-host').locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="game-canvas-host"] canvas');
    return c && Number(c.dataset.camZoom || '0') > 0;
  }, { timeout: 15000 });
  await page.waitForTimeout(550);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const srv = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    {
      env: { ...process.env, OLW_DEV_LAN_STATE_FILE: TMP_STATE },
      stdio: 'ignore',
      shell: process.platform === 'win32',
    },
  );

  try {
    await waitForServer();
    await fetch(`${BASE}/api/dev-lan/reset`, { method: 'POST', body: '{}' });

    const browser = await chromium.launch();
    const ctxMay = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const ctxNang = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const pageA = await ctxMay.newPage();
    const pageB = await ctxNang.newPage();

    await pageA.goto(BASE);
    await pageA.getByTestId('btn-dev-seed-couple').click();
    await pageA.getByTestId('preset-partner-a').click();
    await waitSceneStable(pageA);

    await pageB.goto(BASE);
    await pageB.getByTestId('preset-partner-b').click();
    await waitSceneStable(pageB);

    // Move Nắng 2 steps right so Mây & Nắng stand clearly side-by-side
    await pageB.keyboard.down('ArrowRight');
    await pageB.waitForTimeout(380);
    await pageB.keyboard.up('ArrowRight');
    await pageA.waitForTimeout(650);

    // 1. Desktop 1280x720 Home (2 avatars)
    await pageA.screenshot({ path: path.join(OUT_DIR, '01-desktop-1280x720-home.png') });

    // 2. Desktop 1440x900 Home
    await pageA.setViewportSize({ width: 1440, height: 900 });
    await waitSceneStable(pageA);
    await pageA.screenshot({ path: path.join(OUT_DIR, '02-desktop-1440x900-home.png') });

    // 3. Decorate mode desktop
    await pageA.setViewportSize({ width: 1280, height: 720 });
    await pageA.getByTestId('nav-decorate').click();
    await pageA.waitForTimeout(450);
    await pageA.screenshot({ path: path.join(OUT_DIR, '07-decorate-mode-desktop.png') });
    await pageA.getByTestId('btn-exit-decorate').click();
    await pageA.waitForTimeout(450);

    // 4. Both go to Garden for Desktop 1280x720 Garden
    await pageA.getByTestId('nav-garden').click();
    await pageB.getByTestId('nav-garden').click();
    await waitSceneStable(pageA);
    await pageB.keyboard.down('ArrowRight');
    await pageB.waitForTimeout(360);
    await pageB.keyboard.up('ArrowRight');
    await pageA.waitForTimeout(650);
    await pageA.screenshot({ path: path.join(OUT_DIR, '03-desktop-1280x720-garden.png') });

    // 5. Mobile portrait 430x932 Garden
    await pageA.setViewportSize({ width: 430, height: 932 });
    await waitSceneStable(pageA);
    await pageA.screenshot({ path: path.join(OUT_DIR, '06-mobile-portrait-430x932-garden.png') });

    // 6. Mobile portrait 430x932 Home
    await pageA.getByTestId('nav-home').click();
    await pageB.getByTestId('nav-home').click();
    await waitSceneStable(pageA);
    await pageB.keyboard.down('ArrowRight');
    await pageB.waitForTimeout(380);
    await pageB.keyboard.up('ArrowRight');
    await pageA.waitForTimeout(650);
    await pageA.screenshot({ path: path.join(OUT_DIR, '04-mobile-portrait-430x932-home.png') });

    // 7. Mobile landscape 844x390 Home
    await pageA.setViewportSize({ width: 844, height: 390 });
    await waitSceneStable(pageA);
    await pageA.screenshot({ path: path.join(OUT_DIR, '05-mobile-landscape-844x390-home.png') });

    // 8. Avatar customizer mobile
    await pageA.setViewportSize({ width: 430, height: 932 });
    await pageA.getByTestId('nav-avatar').click();
    await pageA.waitForTimeout(450);
    await pageA.screenshot({ path: path.join(OUT_DIR, '08-avatar-customizer-mobile.png') });

    await browser.close();
    console.log('Captured all 8 screenshots in', OUT_DIR);
  } finally {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(srv.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      srv.kill('SIGTERM');
    }
    try { fs.unlinkSync(TMP_STATE); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
