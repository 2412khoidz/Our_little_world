#!/usr/bin/env node
/**
 * Contact sheet for fishing-frenzy vendored sprites (no native canvas dep).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const SPRITES = path.join(ROOT, 'public/assets/donor/fishing-frenzy/sprites');
const OUT =
  process.env.OUT ||
  path.join(ROOT, 'out/fishing-frenzy-olw-contact.png');

const names = fs.existsSync(SPRITES)
  ? fs.readdirSync(SPRITES).filter((f) => f.endsWith('.png')).sort()
  : [];

if (names.length === 0) {
  console.error('Run npm run vendor-donor:fishing-frenzy first');
  process.exit(1);
}

const cells = names
  .map(
    (n) => `
  <figure class="cell">
    <img src="/assets/donor/fishing-frenzy/sprites/${n}" alt="" width="64" height="40" />
    <figcaption>${n.replace('.png', '')}</figcaption>
  </figure>`,
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
body { background:#1a2636; color:#e8e2d4; font:12px system-ui,sans-serif; margin:12px; }
h1 { font-size:14px; margin:0 0 12px; }
.grid { display:grid; grid-template-columns:repeat(8,88px); gap:8px; }
.cell { margin:0; text-align:center; }
.cell img { image-rendering:pixelated; display:block; margin:0 auto 4px; }
.cell figcaption { font-size:8px; color:#9aa8b8; word-break:break-all; }
</style></head>
<body>
<h1>OLW — kofkdk/fishing-frenzy sprites</h1>
<div class="grid">${cells}</div>
</body></html>`;

const tmpDir = path.join(ROOT, 'out/.fishing-contact');
fs.mkdirSync(tmpDir, { recursive: true });
const tmpHtml = path.join(tmpDir, 'index.html');
fs.writeFileSync(tmpHtml, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 760, height: 520 } });
await page.goto(`file://${tmpHtml}`);
await page.waitForTimeout(200);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await page.screenshot({ path: OUT, fullPage: true });
await browser.close();
console.log('Wrote', OUT);