/**
 * Canonical list of Demo E source files for private atlas + minimal packaging.
 * Keep in sync with scripts/atlas-sources/demo-e-textures.json and build-private-atlas.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

const PACK_LICENSE = {
  'sprout-lands-basic': {
    author: 'Cup Nooble',
    license: 'Pending Deployment License Verification',
    note: 'Free pack — xác nhận Web/PWA vs deploy trước khi phát hành public',
  },
  'sprout-lands-sorry': {
    author: 'Cup Nooble',
    license: 'Pending Deployment License Verification',
    note: 'Sorry EA pack',
  },
  'modern-interiors-free': {
    author: 'LimeZu',
    license: 'Pending Deployment License Verification',
    note: 'Modern Interiors Free — non-commercial dev đã dùng',
  },
  'cozy-lands-basic': {
    author: 'Amo-QAQ',
    license: 'Pending Deployment License Verification',
    note: 'Cozy Lands Basic',
  },
  'sunnyside-world': {
    author: 'Daniel Diggle',
    license: 'Pending Deployment License Verification',
    note: 'Sunnyside World 2.1',
  },
  'free-pets-pack': {
    author: 'Frakassets',
    license: 'CC-BY-4.0',
    note: 'Attribution bắt buộc khi redistribute pixel gốc',
  },
};

const RIGS = ['Adam', 'Alex', 'Amelia'];
const ACTIONS = ['idle_anim', 'run', 'sit'];

export function loadDemoETexturePaths() {
  const jsonPath = path.join(root, 'scripts/atlas-sources/demo-e-textures.json');
  const map = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return Object.values(map);
}

export function loadAvatarCharacterPaths() {
  return RIGS.flatMap((rig) =>
    ACTIONS.map((action) => `modern-interiors-free/Characters_free/${rig}_${action}_16x16.png`),
  );
}

/** Required to run npm run assets:atlas:private (build-private-atlas.py). */
export function requiredPrivateAtlasSources() {
  const uniq = new Set([...loadDemoETexturePaths(), ...loadAvatarCharacterPaths()]);
  return [...uniq].sort();
}

/** Optional: improves public unified when rebuilding from local (SHA pinned in repo). */
export const optionalPublicAtlasSources = [
  'free-pets-pack/puppy-shiba/puppy-shiba_16px_top-down_outline_lit.png',
];

/** Art-upgrade paths (not required for current private atlas crop). */
export const optionalArtUpgradeSources = [
  'sprout-lands-basic/Tilesets/Bitmask references 1.png',
  'sprout-lands-basic/Tilesets/Bitmask references 2.png',
  'cozy-lands-basic/Buildings/house_01.png',
  'cozy-lands-basic/Buildings/house_02.png',
];

export function packIdForRelative(relative) {
  return relative.split('/')[0];
}

export function licenseMetaForRelative(relative) {
  const pack = packIdForRelative(relative);
  return PACK_LICENSE[pack] ?? { author: 'unknown', license: 'Unverified', note: 'Pack không có trong manifest' };
}

export function resolveExtractedRoot(cliRoot) {
  return cliRoot ? path.resolve(cliRoot) : path.join(root, 'asset-candidates/extracted');
}