import fs from 'node:fs';
import path from 'node:path';

const distAssets = path.join(process.cwd(), 'dist', 'assets');
if (!fs.existsSync(distAssets)) {
  console.error('Missing dist/assets directory — run npm run build first.');
  process.exit(1);
}

const FORBIDDEN_PROD_MARKERS = [
  '/api/dev-lan',
  '/asset-candidates',
  'art-demo-showcase',
  'seed-couple',
  'khachla.dev@ourlittleworld.test',
  'partner-a.dev@ourlittleworld.test',
  'partner-b.dev@ourlittleworld.test',
  'btn-dev-seed-couple',
  'menu-spike-lab',
  'dev-identity-picker',
];

const jsFiles = fs.readdirSync(distAssets).filter((f) => f.endsWith('.js'));
const leaks = [];

for (const file of jsFiles) {
  const text = fs.readFileSync(path.join(distAssets, file), 'utf8');
  for (const marker of FORBIDDEN_PROD_MARKERS) {
    if (text.includes(marker)) {
      leaks.push(`${file} contains "${marker}"`);
    }
  }
}

if (leaks.length > 0) {
  console.error('PRODUCTION GUARD FAILED — dev-only code leaked into dist/:', leaks);
  process.exit(1);
}

console.log(`Production guard PASSED: scanned ${jsFiles.length} JS bundle(s) in dist/assets/, zero dev-impersonation or Spike Lab leaks found.`);
