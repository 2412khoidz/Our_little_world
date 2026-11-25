#!/usr/bin/env node
/**
 * Vendor pixel sprites from kofkdk/fishing-frenzy (presentation layer for Tidefall FSM UI).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const VENDOR = path.join(ROOT, 'vendor/fishing-frenzy-upstream');
const OUT = path.join(ROOT, 'public/assets/donor/fishing-frenzy/sprites');
const SHA_FILE = path.join(ROOT, 'public/assets/donor/fishing-frenzy/FISHING_FRENZY_UPSTREAM_SHA.txt');
const MANIFEST = path.join(ROOT, 'public/assets/donor/fishing-frenzy/manifest.json');
const REPO = 'https://github.com/kofkdk/fishing-frenzy.git';

if (!fs.existsSync(path.join(VENDOR, '.git'))) {
  fs.mkdirSync(path.dirname(VENDOR), { recursive: true });
  execSync(`git clone --depth 1 ${REPO} "${VENDOR}"`, { stdio: 'inherit' });
}

const sha = execSync('git rev-parse HEAD', { cwd: VENDOR, encoding: 'utf8' }).trim();
const srcDir = path.join(VENDOR, 'src/assets/sprites');
if (!fs.existsSync(srcDir)) {
  console.error('Missing sprites in upstream:', srcDir);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const copied = [];
for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith('.png')) continue;
  fs.copyFileSync(path.join(srcDir, name), path.join(OUT, name));
  copied.push(name);
}
copied.sort();

fs.writeFileSync(SHA_FILE, `${sha}\n`);
fs.writeFileSync(
  MANIFEST,
  JSON.stringify({ upstream: 'kofkdk/fishing-frenzy', sha, sprites: copied }, null, 2) + '\n',
);
console.log(`Vendored ${copied.length} sprites @ ${sha} → ${OUT}`);