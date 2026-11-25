#!/usr/bin/env node
/**
 * Private-art avatar QA — wardrobe avatars.png must match 384×288;
 * gameplay PyDew farmer sheets vendored beside private-unified with manifest.avatarGameplay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const privateDir = path.join(root, 'public/assets/private-unified');
const publicFarmer = path.join(root, 'public/assets/donor/pydew-characters');

function fail(msg) {
  console.error('QA FAIL:', msg);
  process.exit(1);
}

const manifestPath = path.join(privateDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  fail(`Chưa có ${manifestPath} — chạy npm run assets:atlas:private (Demo E + Pillow).`);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const avatars = manifest.textures?.avatars;
if (!avatars) fail('manifest thiếu textures.avatars');
if (avatars.width !== 384 || avatars.height !== 288) {
  fail(`avatars.png manifest ${avatars.width}×${avatars.height} — expected 384×288 wardrobe strip.`);
}

const gameplay = manifest.avatarGameplay;
if (!gameplay) fail('manifest thiếu avatarGameplay (build-private-atlas.py donor sync).');
if (gameplay.frameWidth !== 64 || gameplay.frameHeight !== 64 || gameplay.colsPerRow !== 16) {
  fail('avatarGameplay indexing không khớp pydewFarmerCharacterSheet.ts');
}

const farmerPrivate = path.join(privateDir, 'donor-pydew-characters');
for (const file of ['farmer-may-atlas.png', 'farmer-nang-atlas.png', 'farmer-rose-atlas.png']) {
  if (!fs.existsSync(path.join(farmerPrivate, file))) {
    fail(`Thiếu private-unified/donor-pydew-characters/${file}`);
  }
}

if (!fs.existsSync(path.join(publicFarmer, 'farmer-may-atlas.png'))) {
  fail('Thiếu public/assets/donor/pydew-characters/farmer-may-atlas.png');
}

console.log(
  JSON.stringify(
    {
      ok: true,
      wardrobeAvatars: `${avatars.width}x${avatars.height}`,
      avatarGameplayProvider: gameplay.provider,
      privateFarmerDir: farmerPrivate,
    },
    null,
    2,
  ),
);