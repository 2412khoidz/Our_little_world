import Phaser from 'phaser';
import { plotIndexFromAnchorId } from '../../shared/farming/farmPlotIndex';
import { getMapDefinition, getMapTilePixelSize, TILE_SIZE } from '../../shared/maps';
import type { MapId } from '../../shared/types';
import type { InteractableTarget } from '../../shared/interaction/interactionTypes';
import { portalCenterPx } from '../../shared/interaction/mainGameWorldAnchors';
import { getParsedTiledWorld } from '../../shared/world/tiledMapRegistry';
import {
  getCanonicalPortalEdge,
  getPortalShortLabelVi,
  type PortalDirection,
} from '../../shared/world/worldGraph';

export interface DiscoverabilityMarkerSpec {
  id: string;
  x: number;
  y: number;
  glyph: string;
  tint: number;
  portalMeta?: {
    direction: PortalDirection;
    thresholdX: number;
    thresholdY: number;
    isInterior: boolean;
  };
}

const MARKER_KINDS = new Set(['shop_npc', 'crop_plot', 'fishing_spot', 'workshop_building', 'door']);

function isCabacosDonorVillage(mapId: MapId): boolean {
  if (mapId !== 'village') return false;
  const raw = getParsedTiledWorld('village');
  return raw?.interactableSpawns.some((s) => s.id.startsWith('cabacos_')) ?? false;
}

function clampLabelPosition(
  mapId: MapId,
  x: number,
  y: number,
): { x: number; y: number } {
  const def = getMapDefinition(mapId);
  const tPx = getMapTilePixelSize(mapId);
  const w = def.widthTiles * tPx;
  const h = def.heightTiles * tPx;
  const marginX = Math.min(34, Math.max(12, w * 0.14));
  const marginY = Math.min(18, Math.max(10, h * 0.08));
  return {
    x: Math.max(marginX, Math.min(w - marginX, x)),
    y: Math.max(marginY, Math.min(h - marginY, y)),
  };
}

function portalLabelOffset(dir: PortalDirection, tilePx: number): { dx: number; dy: number } {
  switch (dir) {
    case 'north':
      return { dx: 0, dy: tilePx * 0.9 };
    case 'south':
      return { dx: 0, dy: -tilePx * 0.95 };
    case 'east':
      return { dx: -tilePx * 0.9, dy: -tilePx * 0.85 };
    case 'west':
      return { dx: tilePx * 1.15, dy: -tilePx * 0.85 };
    case 'inside':
      return { dx: 0, dy: -tilePx * 0.95 };
    case 'outside':
      return { dx: 0, dy: -tilePx * 0.9 };
  }
}

/**
 * World-space signposts & TeaMobi-style directional portal beacons generated directly
 * from the canonical map portal registry and contextual interactables.
 */
export function buildDiscoverabilityMarkerSpecs(
  mapId: MapId,
  interactables: readonly InteractableTarget[],
): DiscoverabilityMarkerSpec[] {
  const specs: DiscoverabilityMarkerSpec[] = [];
  const def = getMapDefinition(mapId);
  const tPx = getMapTilePixelSize(mapId);
  const seenPortalIds = new Set<string>();

  for (const portal of def.portals) {
    if (portal.targetMapId === mapId) continue;
    seenPortalIds.add(portal.id);
    const center = portalCenterPx(mapId, portal);
    const edge = getCanonicalPortalEdge(portal.id);
    const direction: PortalDirection = edge?.direction ?? 'inside';
    const offset = portalLabelOffset(direction, tPx);
    const pos = clampLabelPosition(mapId, center.x + offset.dx, center.y + offset.dy);
    const isBeachPortal = portal.id === 'village-to-beach';
    const isInterior = direction === 'inside' || direction === 'outside';

    specs.push({
      id: isBeachPortal ? 'marker-gull-bay-beach' : `marker-portal-${portal.id}`,
      x: pos.x,
      y: pos.y,
      glyph: getPortalShortLabelVi(portal.id, portal.labelVi),
      tint: isInterior ? 0xffe4b8 : 0xdcf4ff,
      portalMeta: {
        direction,
        thresholdX: center.x,
        thresholdY: center.y,
        isInterior,
      },
    });
  }

  const hintSpecs: DiscoverabilityMarkerSpec[] = [];
  for (const t of interactables) {
    if (t.id.startsWith('npc:')) continue;
    if (seenPortalIds.has(t.id)) continue;
    if (t.id === 'village-to-beach' && isCabacosDonorVillage(mapId)) {
      if (!specs.some((s) => s.id === 'marker-gull-bay-beach')) {
        specs.push({
          id: 'marker-gull-bay-beach',
          x: t.x,
          y: t.y - TILE_SIZE * 1.1,
          glyph: '→ Bãi biển',
          tint: 0xdcf4ff,
          portalMeta: {
            direction: 'east',
            thresholdX: t.x,
            thresholdY: t.y,
            isInterior: false,
          },
        });
      }
      continue;
    }
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
    hintSpecs.push({
      id: `marker-${t.id}`,
      x: t.x,
      y: t.kind === 'crop_plot' ? t.y - TILE_SIZE * 0.45 : t.y - TILE_SIZE * 0.9,
      glyph,
      tint,
    });
  }

  return [...specs, ...hintSpecs.slice(0, 14)];
}

export function spawnDiscoverabilityMarkers(
  scene: Phaser.Scene,
  specs: readonly DiscoverabilityMarkerSpec[],
  depth = 4200,
): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  for (const spec of specs) {
    if (spec.portalMeta) {
      const shimmerColor = spec.portalMeta.isInterior ? 0xffd27d : 0x8de3ff;
      const halo = scene.add
        .ellipse(spec.portalMeta.thresholdX, spec.portalMeta.thresholdY, 16, 8, shimmerColor, 0.24)
        .setStrokeStyle(0.9, 0xfff8e6, 0.52)
        .setDepth(4.5);
      const core = scene.add
        .ellipse(spec.portalMeta.thresholdX, spec.portalMeta.thresholdY, 8, 4, 0xffffff, 0.34)
        .setDepth(4.6);
      scene.tweens.add({
        targets: [halo, core],
        alpha: { from: 0.2, to: 0.56 },
        scaleX: { from: 0.94, to: 1.08 },
        scaleY: { from: 0.94, to: 1.08 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });

      const w = Math.max(46, Math.min(92, spec.glyph.length * 5.2 + 10));
      const h = 13;
      const bg = scene.add
        .rectangle(spec.x, spec.y, w, h, 0x2b1c12, 0.84)
        .setStrokeStyle(0.9, spec.tint, 0.88)
        .setDepth(depth);
      const label = scene.add
        .text(spec.x, spec.y, spec.glyph, {
          fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
          fontSize: '7.5px',
          fontStyle: 'bold',
          color: '#fff6e0',
          resolution: 3,
        })
        .setOrigin(0.5)
        .setDepth(depth + 1);
      scene.tweens.add({
        targets: [bg, label],
        y: spec.y - 2,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      out.push(halo, core, bg, label);
      continue;
    }

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
