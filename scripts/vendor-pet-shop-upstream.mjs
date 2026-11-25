#!/usr/bin/env node
/**
 * Refresh local pet-shop upstream clone for UPSTREAM_REUSE evidence (not shipped in bundle).
 * License: MIT — https://github.com/j4lpan/pet-shop
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const vendorDir = path.join(repoRoot, 'vendor', 'pet-shop-j4lpan-upstream');
const cloneUrl = 'https://github.com/j4lpan/pet-shop';

if (!fs.existsSync(vendorDir)) {
  execSync(`git clone --depth 1 ${cloneUrl} "${vendorDir}"`, { stdio: 'inherit', cwd: repoRoot });
} else {
  execSync('git fetch --depth 1 origin main', { stdio: 'inherit', cwd: vendorDir });
  execSync('git checkout main && git reset --hard origin/main', { stdio: 'inherit', cwd: vendorDir });
}

const sha = execSync('git rev-parse HEAD', { cwd: vendorDir, encoding: 'utf8' }).trim();
console.log(`pet-shop upstream @ ${sha} → ${vendorDir}`);