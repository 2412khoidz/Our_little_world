import { describe, expect, it } from 'vitest';
import {
  buildFarmPlotContractExport,
  enumerateFarmPlotAnchors,
  FARM_PLOT_CONTRACT_VERSION,
  isFarmSoilTile,
  FARM_PLOT_MIN_WALKABLE_TILES,
  FARM_PLOT_REGIONS,
  FARM_WORLD_INTERACTABLES,
  VILLAGE_SHOP_PORTAL,
} from '../../src/shared/world/farmPlotContract';
import farmPlotContractJson from '../../src/shared/world/farmPlotContract.v1.json';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';
import { isTileBlockedFromParsed } from '../../src/shared/world/parseTiledWorldMap';

describe('farmPlotContract', () => {
  it('v1 JSON export matches TS contract document', () => {
    expect(farmPlotContractJson.contractVersion).toBe(FARM_PLOT_CONTRACT_VERSION);
    expect(farmPlotContractJson).toEqual(buildFarmPlotContractExport());
  });

  it('defines 184 plot anchors across main + annex', () => {
    const anchors = enumerateFarmPlotAnchors();
    expect(anchors.length).toBe(120 + 64);
    expect(FARM_PLOT_REGIONS[0]!.columns * FARM_PLOT_REGIONS[0]!.rows).toBe(120);
    expect(FARM_PLOT_REGIONS[1]!.columns * FARM_PLOT_REGIONS[1]!.rows).toBe(64);
  });

  it('farm.json interactables match TS anchor tiles', () => {
    const parsed = getParsedTiledWorld('farm')!;
    for (const def of Object.values(FARM_WORLD_INTERACTABLES)) {
      const spawn = parsed.interactableSpawns.find((s) => s.id === def.id);
      expect(spawn, def.id).toBeTruthy();
      expect(spawn!.tileX).toBe(def.tileX);
      expect(spawn!.tileY).toBe(def.tileY);
      expect(spawn!.kind).toBe(def.kind);
    }
  });

  it('≥160 plot region tiles are walkable on parsed collision', () => {
    const parsed = getParsedTiledWorld('farm')!;
    let walkable = 0;
    for (const a of enumerateFarmPlotAnchors()) {
      if (!isTileBlockedFromParsed(parsed, a.tileX, a.tileY)) walkable += 1;
    }
    expect(walkable).toBeGreaterThanOrEqual(FARM_PLOT_MIN_WALKABLE_TILES);
  });

  it('farm_annex: all 64 contract anchors walkable on Tiled collision', () => {
    const parsed = getParsedTiledWorld('farm')!;
    const annex = enumerateFarmPlotAnchors().filter((a) => a.regionId === 'farm_annex');
    expect(annex.length).toBe(64);
    for (const a of annex) {
      expect(isFarmSoilTile(a.tileX, a.tileY)).toBe(true);
      expect(isTileBlockedFromParsed(parsed, a.tileX, a.tileY)).toBe(false);
    }
  });

  it('village shop portal exists for shop door routing', () => {
    const village = getParsedTiledWorld('village')!;
    const portal = village.portals.find((p) => p.id === VILLAGE_SHOP_PORTAL.portalObjectId);
    expect(portal?.targetMapId).toBe('shop');
    expect(portal?.tileX).toBe(VILLAGE_SHOP_PORTAL.doorTileX);
    expect(portal?.tileY).toBe(VILLAGE_SHOP_PORTAL.doorTileY);
  });
});