// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, expect, it } from 'vitest';

const temps = [];

function mkPrivateDist({ precacheIncludesPrivate = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-private-guard-'));
  temps.push(root);
  const priv = path.join(root, 'assets/private-unified');
  fs.mkdirSync(priv, { recursive: true });
  for (const f of ['world.png', 'world-props.png', 'avatars.png', 'manifest.json', 'props-manifest.json', 'CREDITS.md']) {
    fs.writeFileSync(path.join(priv, f), f === 'world.png' ? 'PNG' : '{}');
  }
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets', 'index-demo.js'), 'console.log("ok")');
  const precache = precacheIncludesPrivate
    ? 'assets/private-unified/world.png'
    : 'assets/unified/world.png';
  fs.writeFileSync(path.join(root, 'sw.js'), `precacheAndRoute([{url:"${precache}"}])`);
  return root;
}

function runGuard(distRoot) {
  return spawnSync(process.execPath, ['scripts/verify-private-build.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, OLW_PRIVATE_DIST_ROOT: distRoot },
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const d of temps.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

it('verify-private-build fails when private-unified appears in SW precache', () => {
  const dist = mkPrivateDist({ precacheIncludesPrivate: true });
  const res = runGuard(dist);
  expect(res.status).toBe(1);
  expect(`${res.stderr}${res.stdout}`).toMatch(/không được chứa assets\/private-unified/i);
});

it('verify-private-build passes when atlas on disk but omitted from precache', () => {
  const dist = mkPrivateDist({ precacheIncludesPrivate: false });
  const res = runGuard(dist);
  expect(res.status).toBe(0);
  expect(res.stdout).toMatch(/Private build guard PASSED/);
});