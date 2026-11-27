#!/usr/bin/env node
/**
 * Wave 1 C1 — clone priority farm donors for local transplant work.
 * Re-run to refresh; SHAs are recorded in docs/UPSTREAM_REUSE.md.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const VENDOR = path.join(ROOT, 'vendor');

const DONORS = [
  {
    id: 'farm-rai-larn-na-upstream',
    url: 'https://github.com/kensfpon/Farm-Rai-Larn-Na.git',
    shaFile: 'UPSTREAM_SHA.txt',
  },
  {
    id: 'farming-simulator-cabacos-upstream',
    url: 'https://github.com/goncalojbsousa/Farming-Simulator-Cabacos.git',
    shaFile: 'UPSTREAM_SHA.txt',
  },
];

function cloneOrFetch(dir, url) {
  if (!fs.existsSync(dir)) {
    execSync(`git clone --depth 1 ${url} ${dir}`, { stdio: 'inherit' });
    return;
  }
  execSync('git fetch --depth 1 origin HEAD', { cwd: dir, stdio: 'inherit' });
  execSync('git checkout FETCH_HEAD', { cwd: dir, stdio: 'inherit' });
}

for (const donor of DONORS) {
  const dir = path.join(VENDOR, donor.id);
  cloneOrFetch(dir, donor.url);
  const sha = execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(dir, donor.shaFile), `${sha}\n`);
  console.log(`${donor.id} @ ${sha}`);
}