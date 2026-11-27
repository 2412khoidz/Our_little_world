import { describe, expect, it } from 'vitest';
import manifest from '../../public/maps/donor/harvest-duo/donor-manifest.json';
import areaGraph from '../../public/maps/donor/harvest-duo/area-graph.v1.json';
import beachRef from '../../public/maps/donor/harvest-duo/beach-layout-reference.v1.json';
import { getParsedTiledWorld } from '../../src/shared/world/tiledMapRegistry';

describe('harvest-duo donor prep', () => {
  it('manifest pins pattern-only reuse', () => {
    expect(manifest.donorId).toBe('harvest-duo');
    expect(manifest.olwReuse).toBe('patterns_only');
    expect(manifest.sliceId).toBe('area-graph-v1');
  });

  it('area graph lists beach ↔ farm warps for OLW portals', () => {
    const beachWarps = areaGraph.warps.filter((w) => w.from === 'beach' || w.to === 'beach');
    expect(beachWarps.length).toBeGreaterThanOrEqual(2);
    expect(areaGraph.olwPortalHooks).toContain('village-to-beach');
    expect(areaGraph.olwPortalHooks).toContain('beach-to-village');
  });

  it('beach layout ref matches OLW coast interactables', () => {
    const parsed = getParsedTiledWorld('beach');
    expect(parsed).not.toBeNull();
    const ids = parsed!.interactableSpawns.map((s) => s.id);
    expect(ids).toContain(beachRef.fishing.olwInteractableId);
    expect(ids).toContain(beachRef.olwLifebuoyWaypoint.interactableId);
    expect(beachRef.olwLifebuoyWaypoint.tileX).toBe(33);
  });
});