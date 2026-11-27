// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { buildUnifiedAtlas, starterBounds, validateAtlas } from '../../scripts/build-unified-atlas.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { requiredPrivateAtlasSources } = require('../../scripts/demo-e-source-manifest.mjs') as {
  requiredPrivateAtlasSources: () => string[];
};
import artIds from '../../src/game/art/worldArtIds.json';
import { STARTER_FURNITURE_CATALOG } from '../../src/shared/catalog';

const temporary: string[] = [];

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'olw-atlas-test-'));
  temporary.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporary.splice(0)) fs.rmSync(dir, { recursive: true });
});

it('builds the licensed V0.1 subset deterministically even when local packs are absent', () => {
  const first = sandbox();
  const second = sandbox();
  const warn = vi.fn();
  const packRoot = path.join(first, 'missing');
  const manifest = buildUnifiedAtlas({ output: first, packRoot, warn });
  buildUnifiedAtlas({ output: second, packRoot, warn });

  expect(warn).toHaveBeenCalledWith(expect.stringContaining('Thiếu pack local'));
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('dùng fallback CC0'));
  expect(manifest.entries.map((entry) => entry.id).sort()).toEqual(Object.values(artIds).flatMap(Object.values).sort());
  expect(manifest.entries.filter((entry) => entry.source.license === 'CC-BY-4.0').map((entry) => entry.id)).toEqual(Object.values(artIds.pets));

  const files = ['CREDITS.md', 'avatars.png', 'manifest.json', 'world.png'];
  expect(fs.readdirSync(first).sort()).toEqual(files);
  for (const file of files) {
    expect(fs.readFileSync(path.join(first, file))).toEqual(fs.readFileSync(path.join(second, file)));
    expect(fs.readFileSync(path.join(first, file))).toEqual(fs.readFileSync(path.join('public/assets/unified', file)));
  }
  for (const { sku, sprite } of STARTER_FURNITURE_CATALOG) {
    expect(starterBounds[sku]).toEqual([sprite.x, sprite.y, sprite.w, sprite.h]);
  }
});

it('rejects a duplicate ID, an out-of-bounds frame and an unapproved license', () => {
  const manifest = buildUnifiedAtlas({ output: sandbox(), warn: vi.fn() });
  const entry = manifest.entries[0]!;
  expect(() => validateAtlas({ ...manifest, entries: [entry, entry] })).toThrow('Semantic ID trùng');
  expect(() => validateAtlas({ ...manifest, entries: [entry, { ...entry, id: 'overlapping' }] })).toThrow('ghi đè');
  expect(() => validateAtlas({ ...manifest, entries: [{ ...entry, rect: { ...entry.rect, x: -1 } }] })).toThrow('ngoài atlas');
  expect(() => validateAtlas({ ...manifest, entries: [{ ...entry, source: { ...entry.source, license: 'Unknown' } }] })).toThrow('Thiếu giấy phép');
});

it('lists exactly 40 demo-e sources required for the private atlas pipeline', () => {
  const list = requiredPrivateAtlasSources();
  expect(list).toHaveLength(40);
  expect(list.every((p: string) => !p.includes('..'))).toBe(true);
  expect(new Set(list).size).toBe(40);
});
