import type { MapId } from '../types';
import type { InteractableDomainKind } from '../interaction/interactionTypes';
import { parseDonorWorkshopFocus } from '../donor/donorWorkshopFocus';
import {
  canStepTileElevation,
  parseTileElevationGrid,
  type TileElevationGrid,
} from './tileElevation';

export interface TiledObjectProperty {
  name: string;
  type: string;
  value: string | number | boolean;
}

export interface TiledMapObject {
  id: number;
  name: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledObjectProperty[];
}

export interface TiledLayer {
  id: number;
  name: string;
  type: string;
  data?: number[];
  width?: number;
  height?: number;
  objects?: TiledMapObject[];
  visible?: boolean;
}

export interface TiledWorldMapJson {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  properties?: TiledObjectProperty[];
}

export interface ParsedTiledPortal {
  id: string;
  labelVi: string;
  tileX: number;
  tileY: number;
  radiusTiles: number;
  targetMapId: MapId;
  targetSpawnX: number;
  targetSpawnY: number;
}

export interface ParsedTiledWorldMap {
  mapId: string;
  widthTiles: number;
  heightTiles: number;
  /** Single source for movement blocking (Collision layer + fallback blocking layers). */
  blockedTiles: Set<string>;
  /** Optional discrete tile elevation levels + stair/ladder transition mask. */
  elevationGrid: TileElevationGrid | null;
  portals: ParsedTiledPortal[];
  npcSpawns: {
    id: string;
    tileX: number;
    tileY: number;
    role: string;
    labelVi: string;
    dialogueVi: string;
  }[];
  interactableSpawns: {
    id: string;
    kind: InteractableDomainKind;
    tileX: number;
    tileY: number;
    labelVi: string;
    anchorId?: string;
    maxRadiusPx?: number;
    fishingSpotId?: string;
    donorPlayableFromJson?: boolean;
    workshopFocus?: ReturnType<typeof parseDonorWorkshopFocus>;
  }[];
}

function propMap(obj: TiledMapObject): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const p of obj.properties ?? []) {
    out[p.name] = p.value;
  }
  return out;
}

/**
 * BrowserQuest/Kaetram pattern: Collision tile layer (gid>0) is the movement authority;
 * render reads the same Tiled JSON (no separate hand-tuned rects).
 */
export function parseTiledWorldMap(json: TiledWorldMapJson): ParsedTiledWorldMap {
  const w = json.width;
  const h = json.height;
  const blocked = new Set<string>();

  const collisionLayer = json.layers.find((l) => l.type === 'tilelayer' && l.name.toLowerCase() === 'collision');
  if (collisionLayer?.data) {
    for (let i = 0; i < collisionLayer.data.length; i += 1) {
      if ((collisionLayer.data[i] ?? 0) > 0) {
        blocked.add(`${i % w},${Math.floor(i / w)}`);
      }
    }
  }

  const portals: ParsedTiledPortal[] = [];
  const npcSpawns: ParsedTiledWorldMap['npcSpawns'] = [];
  const interactableSpawns: ParsedTiledWorldMap['interactableSpawns'] = [];

  for (const layer of json.layers) {
    if (layer.type !== 'objectgroup' || !layer.objects) continue;
    const lname = layer.name.toLowerCase();
    for (const obj of layer.objects) {
      const tileX = Math.floor(obj.x / json.tilewidth);
      const tileY = Math.floor(obj.y / json.tileheight);
      if (lname === 'portals' || obj.type === 'portal') {
        const props = propMap(obj);
        const target = String(props.targetMapId ?? 'garden') as MapId;
        portals.push({
          id: obj.name,
          labelVi: String(props.labelVi ?? 'Đi tiếp'),
          tileX,
          tileY,
          radiusTiles: 2.25,
          targetMapId: target,
          targetSpawnX: Number(props.spawnX ?? tileX),
          targetSpawnY: Number(props.spawnY ?? tileY),
        });
        blocked.delete(`${tileX},${tileY}`);
        blocked.delete(`${tileX},${tileY + 1}`);
      }
      if (lname === 'npcspawns' || obj.type === 'npc') {
        const props = propMap(obj);
        npcSpawns.push({
          id: obj.name,
          tileX,
          tileY,
          role: String(props.role ?? 'idle'),
          labelVi: String(props.labelVi ?? obj.name),
          dialogueVi: String(props.dialogueVi ?? 'Xin chào!'),
        });
      }
      if (lname === 'interactables' || obj.type === 'interactable') {
        const props = propMap(obj);
        const kind = String(props.kind ?? 'bench') as InteractableDomainKind;
        interactableSpawns.push({
          id: obj.name,
          kind,
          tileX,
          tileY,
          labelVi: String(props.labelVi ?? obj.name),
          anchorId: props.anchorId ? String(props.anchorId) : undefined,
          maxRadiusPx: props.maxRadiusPx !== undefined ? Number(props.maxRadiusPx) : undefined,
          fishingSpotId: props.fishingSpotId ? String(props.fishingSpotId) : undefined,
          donorPlayableFromJson: props.donorPlayable === true ? true : undefined,
          workshopFocus: parseDonorWorkshopFocus(props.workshopFocus),
        });
      }
    }
  }

  const elevationGrid = parseTileElevationGrid(json);

  const mapIdProp = json.properties?.find((p) => p.name === 'mapId')?.value;
  return {
    mapId: String(mapIdProp ?? 'village'),
    widthTiles: w,
    heightTiles: h,
    blockedTiles: blocked,
    elevationGrid,
    portals,
    npcSpawns,
    interactableSpawns,
  };
}

export function isTileBlockedFromParsed(parsed: ParsedTiledWorldMap, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= parsed.widthTiles || tileY >= parsed.heightTiles) {
    return true;
  }
  return parsed.blockedTiles.has(`${tileX},${tileY}`);
}

export function canStepElevationFromParsed(
  parsed: ParsedTiledWorldMap,
  fromTileX: number,
  fromTileY: number,
  toTileX: number,
  toTileY: number,
): boolean {
  return canStepTileElevation(parsed.elevationGrid, fromTileX, fromTileY, toTileX, toTileY);
}