#!/usr/bin/env node
/**
 * Vend Cabacos / Sunnyside-lineage player strips for reference + village alignment.
 * Upstream: vendor/farming-simulator-cabacos-upstream @ 79e423d (MIT).
 * Gameplay 8-dir locomotion uses Puny CC0 sheets (true diagonals); Cabacos is flipX 4-way only.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UPSTREAM = path.join(ROOT, 'vendor/farming-simulator-cabacos-upstream/public/assets/characters/player');
const OUT = path.join(ROOT, 'public/assets/donor/cabacos-characters');

const FILES = [
  ['idle/base_waiting_strip9.png', 'base_waiting_strip9.png'],
  ['walk/base_walk_strip8.png', 'base_walk_strip8.png'],
];

function readSha() {
  const shaFile = path.join(ROOT, 'vendor/farming-simulator-cabacos-upstream/UPSTREAM_SHA.txt');
  if (!fs.existsSync(shaFile)) {
    throw new Error('Run node scripts/vendor-wave1-farm-donors.mjs first');
  }
  return fs.readFileSync(shaFile, 'utf8').trim();
}

const sha = readSha();
fs.mkdirSync(OUT, { recursive: true });

for (const [rel, dest] of FILES) {
  const src = path.join(UPSTREAM, rel);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing upstream character asset: ${rel}`);
  }
  fs.copyFileSync(src, path.join(OUT, dest));
  console.log('Wrote', dest);
}

const licenseSrc = path.join(ROOT, 'vendor/farming-simulator-cabacos-upstream/LICENSE');
if (fs.existsSync(licenseSrc)) {
  fs.copyFileSync(licenseSrc, path.join(OUT, 'UPSTREAM-LICENSE.txt'));
}

fs.writeFileSync(
  path.join(OUT, 'CREDITS.md'),
  `# Cabacos player character strips (Sunnyside lineage)

- **Upstream:** [Farming-Simulator-Cabacos](https://github.com/goncalojbsousa/Farming-Simulator-Cabacos) @ \`${sha}\`
- **License:** MIT (see \`UPSTREAM-LICENSE.txt\`)
- **Frames:** 96×64 per cell; idle ×9, walk ×8 (horizontal flip for left)
- **OLW gameplay:** Human avatars use **Puny CC0 8-dir** sheets; these strips are donor reference + future NPC alignment.
`,
);

fs.writeFileSync(path.join(OUT, 'UPSTREAM_SHA.txt'), `${sha}\n`);
console.log(`Vendored Cabacos character strips → public/assets/donor/cabacos-characters/ @ ${sha}`);