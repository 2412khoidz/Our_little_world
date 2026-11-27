// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { findDuplicatePrecacheUrls, parsePrecacheEntries } from '../../scripts/parse-sw-precache.mjs';

function ensureProductionDist() {
  const swPath = path.join(process.cwd(), 'dist/sw.js');
  if (fs.existsSync(swPath)) return;
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  if (build.status !== 0) {
    throw new Error('build failed: ' + (build.stderr || build.stdout));
  }
}

it('dist/sw.js has no duplicate precache URLs', { timeout: 120_000 }, () => {
  ensureProductionDist();
  const sw = fs.readFileSync(path.join(process.cwd(), 'dist/sw.js'), 'utf8');
  const dups = findDuplicatePrecacheUrls(sw);
  expect(dups, JSON.stringify(dups, null, 2)).toEqual([]);
});

it('each critical app shell asset appears once in precache', { timeout: 120_000 }, () => {
  ensureProductionDist();
  const sw = fs.readFileSync(path.join(process.cwd(), 'dist/sw.js'), 'utf8');
  const urls = parsePrecacheEntries(sw).map((e) => e.url);
  for (const key of ['index.html', 'assets/manifest.json', 'manifest.webmanifest']) {
    expect(urls.filter((u) => u === key), key).toHaveLength(1);
  }
});