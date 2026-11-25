#!/usr/bin/env node
/**
 * Verify minimal Demo E sources under asset-candidates/extracted (or --root).
 * Exit 1 if any required private-atlas file is missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  licenseMetaForRelative,
  optionalArtUpgradeSources,
  optionalPublicAtlasSources,
  requiredPrivateAtlasSources,
  resolveExtractedRoot,
} from './demo-e-source-manifest.mjs';

const args = process.argv.slice(2);
let rootArg = null;
let json = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--root') rootArg = args[++i];
  else if (args[i] === '--json') json = true;
  else if (args[i] === '--help') {
    console.log('Usage: node scripts/check-demo-e-sources.mjs [--root path/to/extracted] [--json]');
    process.exit(0);
  }
}

const extracted = resolveExtractedRoot(rootArg);
const required = requiredPrivateAtlasSources();
const missing = [];
const present = [];

for (const rel of required) {
  const abs = path.join(extracted, rel);
  if (fs.existsSync(abs)) present.push(rel);
  else missing.push(rel);
}

const optionalCheck = [...optionalPublicAtlasSources, ...optionalArtUpgradeSources].map((rel) => ({
  rel,
  exists: fs.existsSync(path.join(extracted, rel)),
  ...licenseMetaForRelative(rel),
}));

const report = {
  extractedRoot: extracted,
  requiredCount: required.length,
  presentCount: present.length,
  missing,
  present,
  optional: optionalCheck,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Demo E source check — root:', extracted);
  console.log(`Required for private atlas: ${present.length}/${required.length} present`);
  if (missing.length) {
    console.log('\nMissing (bắt buộc):');
    for (const rel of missing) {
      const meta = licenseMetaForRelative(rel);
      console.log('  -', rel, `[${meta.license}]`, meta.author);
    }
  }
  const optMissing = optionalCheck.filter((o) => !o.exists);
  if (optMissing.length) {
    console.log('\nOptional / art-upgrade (chưa có — không chặn atlas):');
    for (const o of optMissing) console.log('  -', o.rel);
  }
}

process.exit(missing.length ? 1 : 0);