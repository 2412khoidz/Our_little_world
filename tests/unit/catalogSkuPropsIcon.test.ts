import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listCatalogSkuPropsIconMappings,
  propsIconIdForCatalogSku,
} from '../../src/shared/art/catalogSkuPropsIcon';
import type { PropsManifest } from '../../src/shared/art/propsManifestTypes';

function readPropsManifest(relativePath: string): PropsManifest {
  const abs = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(abs, 'utf8')) as PropsManifest;
}

describe('catalogSkuPropsIcon', () => {
  it('maps farm economy SKUs to semantic props ids', () => {
    expect(propsIconIdForCatalogSku('tool_hoe')).toBe('prop.planter_box');
    expect(propsIconIdForCatalogSku('seed_tomato')).toBe('prop.tomato');
    expect(propsIconIdForCatalogSku('strawberry_jam')).toBe('prop.picnic_tart');
    expect(propsIconIdForCatalogSku('pet_kibble_basic')).toBeNull();
  });

  it('every mapped id exists in unified props-manifest rects', () => {
    const manifest = readPropsManifest('public/assets/unified/props-manifest.json');
    const ids = new Set(manifest.entries.map((e) => e.id));
    for (const { propsIconId } of listCatalogSkuPropsIconMappings()) {
      expect(ids.has(propsIconId), propsIconId).toBe(true);
    }
  });

  it('every mapped id exists in private props-manifest when atlas is on disk', () => {
    const privateManifest = path.join(process.cwd(), 'public/assets/private-unified/props-manifest.json');
    if (!fs.existsSync(privateManifest)) return;
    const manifest = readPropsManifest('public/assets/private-unified/props-manifest.json');
    const ids = new Set(manifest.entries.map((e) => e.id));
    for (const { propsIconId } of listCatalogSkuPropsIconMappings()) {
      expect(ids.has(propsIconId), propsIconId).toBe(true);
    }
  });
});