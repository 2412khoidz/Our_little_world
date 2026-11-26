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

const MARKER_KINDS = new Set(['shop_npc', 'crop_plot', 'fishing_spot', 'workshop_building', 'door']);

function isCabacosDonorVillage(mapId: MapId): boolean {
  if (mapId !== 'village') return false;
  const raw = getParsedTiledWorld('village');
  return raw?.interactableSpawns.some((s) => s.id.startsWith('cabacos_')) ?? false;
}

/** World-space signposts for key portals & economy spots (compact, unobtrusive over world art). */
export function buildDiscoverabilityMarkerSpecs(
  mapId: MapId,
  interactables: readonly InteractableTarget[],
): DiscoverabilityMarkerSpec[] {
  const specs: DiscoverabilityMarkerSpec[] = [];
  for (const t of interactables) {
    if (t.id.startsWith('npc:')) continue;
    if (!MARKER_KINDS.has(t.kind)) continue;
    if (t.kind === 'crop_plot') {
      const plotIdx = plotIndexFromAnchorId(t.id);
      if (plotIdx !== null && plotIdx > 0) continue;
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
    }
    specs.push({
      id: `marker-${t.id}`,
      x: t.x,
      y: t.kind === 'crop_plot' ? t.y - TILE_SIZE * 0.45 : t.y - TILE_SIZE * 0.9,
      glyph,
      tint,
    });
  }

  if (isCabacosDonorVillage(mapId)) {
    const beachPortal = interactables.find((t) => t.id === 'village-to-beach' || t.id.includes('beach'));
    if (beachPortal) {
      specs.push({
        id: 'marker-gull-bay-beach',
        x: beachPortal.x,
        y: beachPortal.y - TILE_SIZE * 1.1,
        glyph: '→ Bãi biển',
        tint: 0xd8f0ff,
      });
    }
  }

  return specs.slice(0, 18);
}

export function spawnDiscoverabilityMarkers(
  scene: Phaser.Scene,
  specs: readonly DiscoverabilityMarkerSpec[],
  depth = 4200,
): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  for (const spec of specs) {
    const isLabel = spec.glyph.length > 2;
    const w = isLabel ? Math.max(48, spec.glyph.length * 6 + 10) : 16;
    const h = 14;
    const bgAlpha = spec.glyph === '🌾' ? 0.55 : 0.72;
    const bg = scene.add
      .rectangle(spec.x, spec.y, w, h, spec.tint, bgAlpha)
      .setStrokeStyle(0.8, 0x3a2e24, 0.55)
      .setDepth(depth);
    const label = isLabel
      ? scene.add
          .text(spec.x, spec.y, spec.glyph, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '8px',
            color: '#2d2430',
            resolution: 3,
          })
          .setOrigin(0.5)
          .setDepth(depth + 1)
      : scene.add
          .text(spec.x, spec.y, spec.glyph, { fontSize: '9px', resolution: 3 })
          .setOrigin(0.5)
          .setDepth(depth + 1);
    out.push(bg, label);
  }
  return out;
}
