import Phaser from 'phaser';
import { plotIndexFromAnchorId } from '../../shared/farming/farmPlotIndex';
import { TILE_SIZE } from '../../shared/maps';
import type { MapId } from '../../shared/types';
import type { InteractableTarget } from '../../shared/interaction/interactionTypes';
import { getParsedTiledWorld } from '../../shared/world/tiledMapRegistry';

export interface DiscoverabilityMarkerSpec {
  id: string;
  x: number;
  y: number;
  glyph: string;
  tint: number;
}

const MARKER_KINDS = new Set(['shop_npc', 'crop_plot', 'fishing_spot', 'workshop_building', 'door', 'water_source']);

function isCabacosDonorVillage(mapId: MapId): boolean {
  if (mapId !== 'village') return false;
  const raw = getParsedTiledWorld('village');
  return raw?.interactableSpawns.some((s) => s.id.startsWith('cabacos_')) ?? false;
}

/** World-space signposts for C1 economy / shop discoverability (not Dev-only HUD). */
export function buildDiscoverabilityMarkerSpecs(
  mapId: MapId,
  interactables: readonly InteractableTarget[],
): DiscoverabilityMarkerSpec[] {
  const specs: DiscoverabilityMarkerSpec[] = [];
  for (const t of interactables) {
    if (!MARKER_KINDS.has(t.kind)) continue;
    if (t.kind === 'crop_plot') {
      const plotIdx = plotIndexFromAnchorId(t.id);
      if (plotIdx !== null && plotIdx > 4) continue;
    }
    let glyph = '●';
    let tint = 0xfff4e0;
    if (t.kind === 'shop_npc') {
      glyph = '🏪';
      tint = 0xffe8b8;
    } else if (t.kind === 'crop_plot') {
      glyph = '🌾';
      tint = 0xc8e6a0;
    } else if (t.kind === 'fishing_spot') {
      glyph = '🎣';
      tint = 0xb8ddf8;
    } else if (t.kind === 'workshop_building') {
      glyph = '⚙';
      tint = 0xe0d0ff;
    } else if (t.kind === 'door') {
      glyph = '🚪';
      tint = 0xffdcc8;
    } else if (t.kind === 'water_source') {
      glyph = '💧';
      tint = 0xa8e8ff;
    }
    specs.push({
      id: `marker-${t.id}`,
      x: t.x,
      y: t.y - TILE_SIZE * 0.85,
      glyph,
      tint,
    });
  }

  if (isCabacosDonorVillage(mapId)) {
    specs.push({
      id: 'marker-cabacos-sign',
      x: 42 * TILE_SIZE + 8,
      y: 28 * TILE_SIZE,
      glyph: 'Cabacos',
      tint: 0xfff8ef,
    });
  }

  const capped = specs.slice(0, 32);
  return capped;
}

export function spawnDiscoverabilityMarkers(
  scene: Phaser.Scene,
  specs: readonly DiscoverabilityMarkerSpec[],
  depth = 4200,
): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  for (const spec of specs) {
    const bg = scene.add
      .rectangle(spec.x, spec.y, spec.glyph.length > 2 ? 52 : 22, 22, spec.tint, 0.78)
      .setStrokeStyle(1, 0x3a2e24, 0.55)
      .setDepth(depth);
    const label =
      spec.glyph.length > 2
        ? scene.add
            .text(spec.x, spec.y, spec.glyph, {
              fontFamily: 'system-ui, sans-serif',
              fontSize: '11px',
              color: '#2d2430',
            })
            .setOrigin(0.5)
            .setDepth(depth + 1)
        : scene.add
            .text(spec.x, spec.y, spec.glyph, { fontSize: '14px' })
            .setOrigin(0.5)
            .setDepth(depth + 1);
    out.push(bg, label);
  }
  return out;
}