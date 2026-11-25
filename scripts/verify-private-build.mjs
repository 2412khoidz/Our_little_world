/**
 * Private-art build guard — scans dist-private/ after `npm run build:private`.
 * Khác verify-prod-guard.mjs (chỉ dist/ public): bản private PHẢI có atlas private-unified,
 * vẫn KHÔNG được chứa dev sandbox leaks trong JS bundle.
 */
import fs from 'node:fs';
import path from 'node:path';

const distRoot = path.join(process.cwd(), 'dist-private');
const distAssets = path.join(distRoot, 'assets');

if (!fs.existsSync(distRoot)) {
  console.error('Missing dist-private/ — run npm run build:private after npm run assets:atlas:private.');
  process.exit(1);
}
if (!fs.existsSync(distAssets)) {
  console.error('Missing dist-private/assets — private build failed or incomplete.');
  process.exit(1);
}

const FORBIDDEN_DEV_MARKERS = [
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
  'dev-console-drawer',
  'dev-console-k6',
  'dev-console/spawn-item',
  'v03-dev-prototypes',
  'pet-lab-sandbox',
  'menu-pet-debugger',
  'pet-art-sandbox',
  'ui-variant-sandbox',
  'world-expansion-sandbox',
  'combined-experience-demo',
];

const REQUIRED_PRIVATE_FILES = [
  'assets/private-unified/world.png',
  'assets/private-unified/world-props.png',
  'assets/private-unified/avatars.png',
  'assets/private-unified/manifest.json',
  'assets/private-unified/props-manifest.json',
  'assets/private-unified/CREDITS.md',
];

const leaks = [];

const jsFiles = fs.readdirSync(distAssets).filter((f) => f.endsWith('.js'));
for (const file of jsFiles) {
  const text = fs.readFileSync(path.join(distAssets, file), 'utf8');
  for (const marker of FORBIDDEN_DEV_MARKERS) {
    if (text.includes(marker)) {
      leaks.push(`${file} contains dev marker "${marker}"`);
    }
  }
}

for (const rel of REQUIRED_PRIVATE_FILES) {
  if (!fs.existsSync(path.join(distRoot, rel))) {
    leaks.push('Thiếu atlas private trong dist-private: ' + rel);
  }
}

const swPath = path.join(distRoot, 'sw.js');
if (fs.existsSync(swPath)) {
  const precache = fs.readFileSync(swPath, 'utf8');
  if (!precache.includes('assets/private-unified/world.png')) {
    leaks.push('Precache dist-private không chứa assets/private-unified/world.png');
  }
  if (/asset-candidates|local-licensed|\.dev-lan-state/i.test(precache)) {
    leaks.push('Precache dist-private chứa đường dẫn local nhạy cảm.');
  }
}

// Public dist must never bundle private-unified (complementary check message only)
const publicDist = path.join(process.cwd(), 'dist');
if (fs.existsSync(publicDist)) {
  const pubPrivate = path.join(publicDist, 'assets/private-unified');
  if (fs.existsSync(pubPrivate)) {
    console.warn(
      'WARNING: dist/ contains assets/private-unified — public build must not include Demo E atlas. Re-run verify-prod-guard.mjs.',
    );
  }
}

if (leaks.length > 0) {
  console.error('PRIVATE BUILD GUARD FAILED:', leaks);
  process.exit(1);
}

console.log(
  `Private build guard PASSED: ${jsFiles.length} JS bundle(s) in dist-private/assets/, Demo E atlas present, zero dev sandbox leaks.`,
);