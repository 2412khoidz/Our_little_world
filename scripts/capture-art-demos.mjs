import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const PORT = 5179;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.resolve(process.cwd(), 'asset-candidates', 'screenshots');

const DEFAULT_TARGETS = [
  { demoId: 'A', view: 'overview', mode: 'desktop', filename: 'demo-A-desktop.png', width: 1280, height: 720, scale: 1, isMobile: false },
  { demoId: 'A', view: 'overview', mode: 'mobile', filename: 'demo-A-mobile.png', width: 430, height: 932, scale: 2, isMobile: true },
  { demoId: 'B', view: 'overview', mode: 'desktop', filename: 'demo-B-desktop.png', width: 1280, height: 720, scale: 1, isMobile: false },
  { demoId: 'B', view: 'overview', mode: 'mobile', filename: 'demo-B-mobile.png', width: 430, height: 932, scale: 2, isMobile: true },
  { demoId: 'C', view: 'overview', mode: 'desktop', filename: 'demo-C-desktop.png', width: 1280, height: 720, scale: 1, isMobile: false },
  { demoId: 'C', view: 'overview', mode: 'mobile', filename: 'demo-C-mobile.png', width: 430, height: 932, scale: 2, isMobile: true },
  { demoId: 'D', view: 'overview', mode: 'desktop', filename: 'demo-D-desktop.png', width: 1280, height: 720, scale: 1, isMobile: false },
  { demoId: 'D', view: 'overview', mode: 'mobile', filename: 'demo-D-mobile.png', width: 430, height: 932, scale: 2, isMobile: true },
];

const DEMO_E_TARGETS = [
  { demoId: 'E', view: 'overview', mode: 'desktop-overview', filename: 'demo-E-desktop-overview.png', width: 1280, height: 720, scale: 1, isMobile: false },
  { demoId: 'E', view: 'overview', mode: 'mobile-overview', filename: 'demo-E-mobile-overview.png', width: 430, height: 932, scale: 2, isMobile: true },
  { demoId: 'E', view: 'interior', mode: 'desktop-interior', filename: 'demo-E-interior.png', width: 1280, height: 720, scale: 1, isMobile: false },
  { demoId: 'E', view: 'garden', mode: 'desktop-garden', filename: 'demo-E-garden.png', width: 1280, height: 720, scale: 1, isMobile: false },
  { demoId: 'E', view: 'interior', mode: 'mobile-interior', filename: 'demo-E-mobile-interior.png', width: 430, height: 932, scale: 2, isMobile: true },
  { demoId: 'E', view: 'garden', mode: 'mobile-garden', filename: 'demo-E-mobile-garden.png', width: 430, height: 932, scale: 2, isMobile: true },
  { demoId: 'E', view: 'overview', mode: 'mobile-landscape', filename: 'demo-E-mobile-landscape.png', width: 844, height: 390, scale: 2, isMobile: true },
  { demoId: 'E', view: 'overview', mode: 'mobile-small', filename: 'demo-E-mobile-small.png', width: 390, height: 844, scale: 2, isMobile: true },
];

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Retry until ready
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for Vite dev server at ${url}`);
}

async function captureTarget(browser, target) {
  const context = await browser.newContext({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: target.scale,
    isMobile: target.isMobile,
    hasTouch: target.isMobile,
  });

  const page = await context.newPage();
  const errors = [];

  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
      errors.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });

  const targetUrl = `${BASE_URL}/?art-demo=${target.demoId}&view=${target.view}`;
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const ready = window.__OLW_ART_DEMO_READY__;
    return Boolean(ready && typeof ready === 'object');
  }, { timeout: 20000 });
  await page.waitForTimeout(450);

  if (errors.length > 0) {
    throw new Error(`Demo ${target.demoId} (${target.mode}) hit runtime/asset errors:\n${errors.join('\n')}`);
  }

  const outPath = path.join(OUT_DIR, target.filename);
  await page.screenshot({ path: outPath });
  const info = await page.evaluate(() => window.__OLW_ART_DEMO_READY__);
  console.log(`Captured ${target.filename} ->`, JSON.stringify(info));
  await context.close();
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length).toUpperCase();
  const targets =
    onlyArg === 'E'
      ? DEMO_E_TARGETS
      : onlyArg === 'ALL'
        ? [...DEFAULT_TARGETS, ...DEMO_E_TARGETS]
        : onlyArg
          ? DEFAULT_TARGETS.filter((t) => t.demoId === onlyArg)
          : DEFAULT_TARGETS;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: process.platform === 'win32',
    },
  );

  let serverLogs = '';
  server.stdout.on('data', (d) => {
    serverLogs += d.toString();
  });
  server.stderr.on('data', (d) => {
    serverLogs += d.toString();
  });

  try {
    await waitForServer(`${BASE_URL}/`);
    const browser = await chromium.launch({ headless: true });
    try {
      for (const target of targets) {
        await captureTarget(browser, target);
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('Server logs:\n', serverLogs);
    throw err;
  } finally {
    if (process.platform === 'win32' && server.pid) {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      server.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
