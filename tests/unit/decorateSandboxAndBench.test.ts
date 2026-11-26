import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEV_SANDBOX_DECOR_CATALOG,
  STARTER_FURNITURE_CATALOG,
  getCatalogForMap,
  getCatalogItem,
} from '../../src/shared/catalog';
import { validatePlacement } from '../../src/shared/placement';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('Checkpoint C5 & A2: DEV decoration sandbox isolation and canonical decor identity', () => {
  it('keeps the 12 starter furniture items intact and isolates DEV sandbox flowers from default catalog', () => {
    expect(STARTER_FURNITURE_CATALOG).toHaveLength(12);
    expect(DEV_SANDBOX_DECOR_CATALOG.length).toBeGreaterThanOrEqual(10);

    const normalGarden = getCatalogForMap('garden');
    expect(normalGarden.every((item) => item.devSandboxOnly !== true)).toBe(true);
    expect(normalGarden.some((item) => item.sku === 'sakura_bush_decor')).toBe(false);

    const sandboxGarden = getCatalogForMap('garden', { includeDevSandbox: true });
    expect(sandboxGarden.some((item) => item.sku === 'sakura_bush_decor')).toBe(true);
    expect(sandboxGarden.some((item) => item.sku === 'sakura_petals_decor')).toBe(true);
    expect(sandboxGarden.some((item) => item.sku === 'planter_box_decor')).toBe(true);
    expect(sandboxGarden.some((item) => item.sku === 'sunflower_cluster_decor')).toBe(true);
  });

  it('rejects DEV-only items and enforces starter stock in normal mode while unlocking unlimited placement in DEV sandbox', () => {
    const devCheckBlocked = validatePlacement({
      mapId: 'garden',
      sku: 'sakura_bush_decor',
      tileX: 6,
      tileY: 6,
      placements: [],
      devSandboxUnlimitedStock: false,
    });
    expect(devCheckBlocked.ok).toBe(false);
    if (!devCheckBlocked.ok) {
      expect(devCheckBlocked.code).toBe('FORBIDDEN');
    }

    const devCheckAllowed = validatePlacement({
      mapId: 'garden',
      sku: 'sakura_bush_decor',
      tileX: 6,
      tileY: 6,
      placements: [],
      devSandboxUnlimitedStock: true,
    });
    expect(devCheckAllowed.ok).toBe(true);

    // Sandbox must still enforce static wall / obstacle collisions
    const blockedWall = validatePlacement({
      mapId: 'garden',
      sku: 'sakura_bush_decor',
      tileX: 0,
      tileY: 0,
      placements: [],
      devSandboxUnlimitedStock: true,
    });
    expect(blockedWall.ok).toBe(false);
    if (!blockedWall.ok) {
      expect(blockedWall.code).toBe('BLOCKED_TILE');
    }

    // Unlimited stock in sandbox allows exceeding starterQuantity for flowerpots
    const manySakuraPots = [1, 2, 3].map((n) => ({
      id: `p-${n}`,
      worldId: 'w1',
      mapId: 'garden' as const,
      sku: 'flowerpot_sakura',
      layerSlot: 'object' as const,
      tileX: 2 + n,
      tileY: 5,
      widthTiles: 1,
      heightTiles: 1,
      updatedBy: 'u1',
      updatedAt: '2026-01-01T00:00:00Z',
    }));
    const stockCapNormal = validatePlacement({
      mapId: 'garden',
      sku: 'flowerpot_sakura',
      tileX: 10,
      tileY: 6,
      placements: manySakuraPots,
    });
    expect(stockCapNormal.ok).toBe(false);
    if (!stockCapNormal.ok) {
      expect(stockCapNormal.code).toBe('STOCK_EXCEEDED');
    }

    const stockCapSandbox = validatePlacement({
      mapId: 'garden',
      sku: 'flowerpot_sakura',
      tileX: 10,
      tileY: 6,
      placements: manySakuraPots,
      devSandboxUnlimitedStock: true,
    });
    expect(stockCapSandbox.ok).toBe(true);
  });

  it('preserves flowerpot_sakura pink blossom override identity', () => {
    const sakura = getCatalogItem('flowerpot_sakura');
    expect(sakura?.nameVi).toBe('Chậu hoa anh đào');
    const atlasSrc = readFileSync(join(REPO_ROOT, 'src/game/art/worldAtlas.ts'), 'utf8');
    expect(atlasSrc).toContain("SAKURA_POT_OVERRIDE_KEY = 'olw-sakura-pot-override'");
    expect(atlasSrc).toContain("sku === 'flowerpot_sakura'");
  });
});
