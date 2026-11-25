#!/usr/bin/env node
/**
 * Vendors Tidefall fish.json into OLW (presentation catalog for FSM UI).
 * Upstream: stateloop-connected/source-tidefall-phaser
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const VENDOR = path.join(ROOT, 'vendor/tidefall-phaser-upstream');
const SRC = path.join(VENDOR, 'public/assets/data/fish.json');
const OUT = path.join(ROOT, 'src/shared/donor/tidefall-phaser/tidefallFishCatalog.v1.json');
const SHA_FILE = path.join(ROOT, 'src/shared/donor/tidefall-phaser/TIDEFALL_UPSTREAM_SHA.txt');

if (!fs.existsSync(SRC)) {
  console.error('Missing vendor clone — run: git clone ... vendor/tidefall-phaser-upstream');
  process.exit(1);
}

const sha = execSync('git rev-parse HEAD', { cwd: VENDOR, encoding: 'utf8' }).trim();
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const slim = {
  upstreamSha: sha,
  rarityWeights: raw.rarityWeights,
  fish: (raw.fish ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    rarity: f.rarity,
    biome: f.biome,
    size: f.size,
    difficulty: f.difficulty,
  })),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(slim, null, 2) + '\n');
fs.writeFileSync(SHA_FILE, sha + '\n');
console.log(`Wrote ${OUT} (${slim.fish.length} species) @ ${sha}`);