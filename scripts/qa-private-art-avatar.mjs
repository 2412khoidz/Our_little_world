#!/usr/bin/env node
/**
 * Private-art avatar QA — wardrobe avatars.png must match 384×288;
 * gameplay Puny sheets vendored beside private-unified with manifest.avatarGameplay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const privateDir = path.join(root, 'public/assets/private-unified');
const publicPuny = path.join(root, 'public/assets/donor/cc0-puny-8d');

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
if (gameplay.frameWidth !== 32 || gameplay.frameHeight !== 32 || gameplay.colsPerRow !== 24) {
  fail('avatarGameplay indexing không khớp punyCharacter8dSheet.ts');
}

const punyPrivate = path.join(privateDir, 'donor-cc0-puny-8d');
for (const file of ['character-base.png', 'mage-cyan.png', 'mage-red.png']) {
  if (!fs.existsSync(path.join(punyPrivate, file))) {
    fail(`Thiếu private-unified/donor-cc0-puny-8d/${file}`);
  }
}

if (!fs.existsSync(path.join(publicPuny, 'character-base.png'))) {
  fail('Thiếu public/assets/donor/cc0-puny-8d/character-base.png');
}

console.log(
  JSON.stringify(
    {
      ok: true,
      wardrobeAvatars: `${avatars.width}x${avatars.height}`,
      avatarGameplayProvider: gameplay.provider,
      privatePunyDir: punyPrivate,
    },
    null,
    2,
  ),
);