#!/usr/bin/env node
/**
 * Wave 3 — clone AI Farm donor (game-xay-nha day/night + clock HUD source).
 * Re-run to refresh; SHAs recorded in docs/UPSTREAM_REUSE.md.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DONOR = {
  id: 'game-xay-nha-upstream',
  url: 'https://github.com/nhungcute/game-xay-nha.git',
};

const dir = path.join(ROOT, 'vendor', DONOR.id);
if (!fs.existsSync(dir)) {
  execSync(`git clone --depth 1 ${DONOR.url} ${dir}`, { stdio: 'inherit' });
} else {
  execSync('git fetch --depth 1 origin HEAD', { cwd: dir, stdio: 'inherit' });
  execSync('git checkout FETCH_HEAD', { cwd: dir, stdio: 'inherit' });
}
const sha = execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(dir, 'UPSTREAM_SHA.txt'), `${sha}\n`);
console.log(`${DONOR.id} @ ${sha}`);