#!/usr/bin/env node
/**
 * Private-art avatar QA — wardrobe & gameplay share the unified 384×384 4-row
 * cozy human atlas (`idle`, `walk`, `sit`, `phone`) for Adam/Alex/Amelia.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const privateDir = path.join(root, 'public/assets/private-unified');

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
if (avatars.width !== 384 || avatars.height !== 384) {
  fail(`avatars.png manifest ${avatars.width}×${avatars.height} — expected 384×384 4-row cozy human atlas.`);
}

const gameplay = manifest.avatarGameplay;
if (!gameplay) fail('manifest thiếu avatarGameplay (build-private-atlas.py metadata).');
if (
  gameplay.provider !== 'limezu-modern-interiors-cozy-human-v2' ||
  gameplay.frameWidth !== 16 ||
  gameplay.frameHeight !== 32 ||
  gameplay.colsPerRow !== 24
) {
  fail('avatarGameplay indexing không khớp Cozy Human V2 16×32 4-row layout.');
}

console.log(
  JSON.stringify(
    {
      ok: true,
      unifiedAvatars: `${avatars.width}x${avatars.height}`,
      avatarGameplayProvider: gameplay.provider,
      rowIndex: gameplay.rowIndex,
      missingDonorAnimations: gameplay.missingDonorAnimations,
    },
    null,
    2,
  ),
);
