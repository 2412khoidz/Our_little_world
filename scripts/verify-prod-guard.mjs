import fs from 'node:fs';
import path from 'node:path';
import productionPublicFiles from './production-public-files.json' with { type: 'json' };

const distAssets = path.join(process.cwd(), 'dist', 'assets');
if (!fs.existsSync(distAssets)) {
  console.error('Missing dist/assets directory — run npm run build first.');
  process.exit(1);
}

const FORBIDDEN_PROD_MARKERS = [
  '/api/dev-lan',
  '/asset-candidates',
  '/assets/private-unified',
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

const dist = path.resolve(distAssets, '..');
const precache = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
const publicPaths = new Set(productionPublicFiles);
for (const file of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!file.isFile()) continue;
  const relative = path.relative(dist, path.join(file.parentPath, file.name)).split(path.sep).join('/');
  const inPublicDirectory = /^(assets|icons|spike)\//.test(relative);
  const isBundle = /^assets\/[^/]+\.(js|css)$/.test(relative);
  if ((inPublicDirectory && !isBundle && !publicPaths.has(relative)) ||
      /(?:asset-candidates|local-licensed|private-unified|\.dev-lan-state|\.(?:zip|aseprite|7z|rar)$)/i.test(relative)) {
    leaks.push('Tệp công khai ngoài danh sách được duyệt: ' + relative);
  }
}
for (const file of productionPublicFiles) {
  if (!fs.existsSync(path.join(dist, file))) leaks.push('Thiếu tài nguyên đã duyệt: ' + file);
  if (file.startsWith('assets/unified/') && !precache.includes(file)) {
    leaks.push('Thiếu tài nguyên atlas trong precache: ' + file);
  }
}
if (/asset-candidates|local-licensed|private-unified|sample-cozy-sync\.mp4|\.dev-lan-state/i.test(precache)) {
  leaks.push('Precache chứa tài nguyên local hoặc video.');
}

if (leaks.length > 0) {
  console.error('PRODUCTION GUARD FAILED — dev-only code leaked into dist/:', leaks);
  process.exit(1);
}

console.log(`Production guard PASSED: scanned ${jsFiles.length} JS bundle(s) in dist/assets/, zero dev leaks and public assets/precache verified.`);
