#!/usr/bin/env node
/**
 * Vend Cabacos farming presentation art (tools, indicators) @ 79e423d.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const UP = path.join(ROOT, 'vendor/farming-simulator-cabacos-upstream');
const DEST = path.join(ROOT, 'public/assets/donor/cabacos-plantation');

const COPIES = [
  ['public/assets/tools/watering_can.png', 'tools/watering_can.png'],
  ['public/assets/tools/sickle.png', 'tools/sickle.png'],
  ['public/assets/tools/rod.png', 'tools/rod.png'],
  ['public/assets/farming/indicators/crop_need_water.png', 'indicators/crop_need_water.png'],
  ['public/assets/farming/indicators/ready_to_collect.png', 'indicators/ready_to_collect.png'],
];

if (!fs.existsSync(UP)) {
  console.error('Missing vendor clone — run: node scripts/vendor-wave1-farm-donors.mjs');
  process.exit(1);
}

const sha = fs.readFileSync(path.join(UP, 'UPSTREAM_SHA.txt'), 'utf8').trim();
for (const [srcRel, destRel] of COPIES) {
  const src = path.join(UP, srcRel);
  const dest = path.join(DEST, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(src)) {
    console.error('Missing upstream', srcRel);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log('copied', destRel);
}

const cred = `Cabacos Farming-Simulator @ ${sha}\nhttps://github.com/goncalojbsousa/Farming-Simulator-Cabacos\nMIT — see public/maps/donor/cabacos/UPSTREAM-LICENSE.txt\n`;
fs.writeFileSync(path.join(DEST, 'UPSTREAM_SHA.txt'), cred);
console.log('Cabacos farming art @', sha);