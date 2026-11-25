/**
 * Vendor artemn0va/pydew-valley farm map + tilesets into public/maps/donor/pydew-valley/
 * Run after shallow-cloning upstream (see UPSTREAM-LICENSE.txt).
 */
import fs from 'node:fs';
import path from 'node:path';

const UPSTREAM =
  process.env.PYDEW_VALLEY_ROOT ??
  path.resolve('vendor/pydew-valley-upstream');

const DEST = path.resolve('public/maps/donor/pydew-valley');
const SHA_PATH = path.join(DEST, 'UPSTREAM_SHA.txt');
const LICENSE_PATH = path.join(DEST, 'UPSTREAM-LICENSE.txt');

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function gitSha(repoRoot) {
  try {
    const head = fs.readFileSync(path.join(repoRoot, '.git/HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) {
      const ref = head.slice(5).trim();
      return fs.readFileSync(path.join(repoRoot, '.git', ref), 'utf8').trim();
    }
    return head;
  } catch {
    return process.env.PYDEW_VALLEY_SHA ?? 'unknown';
  }
}

function main() {
  const dataDir = path.join(UPSTREAM, 'data');
  const graphicsDir = path.join(UPSTREAM, 'graphics');
  if (!fs.existsSync(path.join(dataDir, 'map.tmx'))) {
    console.error('Missing upstream data/map.tmx at', UPSTREAM);
    console.error('Clone: git clone --depth 1 https://github.com/artemn0va/pydew-valley.git vendor/pydew-valley-upstream');
    process.exit(1);
  }

  rmrf(DEST);
  fs.mkdirSync(DEST, { recursive: true });
  copyTree(dataDir, path.join(DEST, 'data'));
  copyTree(graphicsDir, path.join(DEST, 'graphics'));

  const sha = gitSha(UPSTREAM);
  fs.writeFileSync(SHA_PATH, `${sha}\n`);
  if (!fs.existsSync(LICENSE_PATH)) {
    fs.writeFileSync(
      LICENSE_PATH,
      `PyDew Valley (artemn0va/pydew-valley)\n@ ${sha}\nhttps://github.com/artemn0va/pydew-valley\n`,
    );
  }

  console.log(`Vendored pydew-valley → ${DEST} sha=${sha}`);
}

main();