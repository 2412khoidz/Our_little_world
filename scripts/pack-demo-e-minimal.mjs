#!/usr/bin/env node
/**
 * Pack only files required for npm run assets:atlas:private into a tar.gz
 * (relative paths preserved under asset-candidates/extracted/).
 * Does not upload or commit assets — run locally on máy chủ dự án.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  licenseMetaForRelative,
  requiredPrivateAtlasSources,
  resolveExtractedRoot,
} from './demo-e-source-manifest.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let sourceRoot = null;
let outFile = path.join(repoRoot, 'asset-candidates', 'demo-e-minimal-sources.tar.gz');
let dryRun = false;

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--source') sourceRoot = args[++i];
  else if (args[i] === '--output') outFile = path.resolve(args[++i]);
  else if (args[i] === '--dry-run') dryRun = true;
  else if (args[i] === '--help') {
    console.log(
      'Usage: node scripts/pack-demo-e-minimal.mjs --source asset-candidates/extracted [--output file.tar.gz] [--dry-run]',
    );
    process.exit(0);
  }
}

const extracted = resolveExtractedRoot(sourceRoot);
const required = requiredPrivateAtlasSources();
const staging = path.join(repoRoot, '.tmp-demo-e-minimal-pack');
const stageExtracted = path.join(staging, 'asset-candidates', 'extracted');

const missing = required.filter((rel) => !fs.existsSync(path.join(extracted, rel)));
if (missing.length) {
  console.error('Không thể đóng gói — thiếu file bắt buộc:', missing.length);
  for (const rel of missing) console.error('  ', rel, licenseMetaForRelative(rel).license);
  process.exit(1);
}

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(stageExtracted, { recursive: true });

for (const rel of required) {
  const src = path.join(extracted, rel);
  const dest = path.join(stageExtracted, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!dryRun) fs.copyFileSync(src, dest);
}

const manifest = {
  createdAt: new Date().toISOString(),
  fileCount: required.length,
  files: required.map((rel) => ({ path: rel, ...licenseMetaForRelative(rel) })),
  installHint:
    'Giải nén vào repo root để có asset-candidates/extracted/<paths>. Không commit tarball vào git.',
};
fs.writeFileSync(path.join(staging, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));

if (dryRun) {
  console.log('Dry run OK — would pack', required.length, 'files to', outFile);
  fs.rmSync(staging, { recursive: true, force: true });
  process.exit(0);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
const tar = spawnSync('tar', ['-czf', outFile, '-C', staging, 'asset-candidates', 'MANIFEST.json'], {
  stdio: 'inherit',
});
fs.rmSync(staging, { recursive: true, force: true });
if (tar.status !== 0) {
  console.error('tar failed');
  process.exit(tar.status ?? 1);
}
console.log('Wrote', outFile, '(' + required.length + ' source files + MANIFEST.json)');