import Phaser from 'phaser';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { ensurePhaserAvatarTexture } from '../art/phaserAvatarTexture';
import { avatarWalkAnimKey } from '../art/avatarAtlasLayout';
import { createCompactNameTag, placeSoftShadow } from '../artDemos/demoHelpers';
import { getMapDefinition, TILE_SIZE } from '../../shared/maps';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import type { AvatarConfig, MapId } from '../../shared/types';
import { getParsedTiledWorld } from '../../shared/world/tiledMapRegistry';
import {
  createNpcRoutineState,
  stepNpcRoutine,
  type NpcRoutineState,
  type NpcWaypoint,
} from '../../shared/world/emergentWorldBehavior';
import type { ActorCollider } from '../../shared/movement/actorCollision';
import { NPC_PROFILES } from '../../shared/npc/npcDialogueRegistry';

export interface TiledWorldNpcEntity {
  id: string;
  labelVi: string;
  dialogueVi: string;
  role: string;
  tileX: number;
  tileY: number;
  texKey: string;
  body: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Container;
  emoteBadge: Phaser.GameObjects.Text;
  homeX: number;
  homeY: number;
  routine: NpcRoutineState;
  phase: number;
  lastWasNear: boolean;
  emoteUntilMs: number;
}

export interface NpcTickContext {
  playerX: number | null;
  playerY: number | null;
  playerPosture?: CouplePostureKind;
  isNight?: boolean;
  weatherKind?: string;
  activeDialogueNpcId?: string | null;
  isTileBlocked?: (tx: number, ty: number) => boolean;
  actorObstacles?: readonly ActorCollider[];
}

function npcAvatarForSpawn(id: string, role: string): AvatarConfig {
  const known = (NPC_PROFILES as Record<string, { avatarConfig: AvatarConfig } | undefined>)[id];
  if (known) return known.avatarConfig;
  if (role.includes('fish')) return NPC_PROFILES.ong_minh.avatarConfig;
  if (role.includes('bakery') || role.includes('cafe')) return NPC_PROFILES.co_lan.avatarConfig;
  if (role.includes('tool')) return NPC_PROFILES.chu_tu.avatarConfig;
  if (role.includes('forest')) return NPC_PROFILES.be_na.avatarConfig;
  return NPC_PROFILES.bac_hai.avatarConfig;
}

function buildWalkableNpcWaypoints(
  mapId: MapId,
  spawnTileX: number,
  spawnTileY: number,
  homeX: number,
  homeY: number,
): NpcWaypoint[] {
  const def = getMapDefinition(mapId);
  const waypoints: NpcWaypoint[] = [{ x: homeX, y: homeY }];
  const offsets: readonly [number, number][] = [
    [-2, 0],
    [2, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of offsets) {
    const tx = spawnTileX + dx;
    const ty = spawnTileY + dy;
    if (tx < 1 || ty < 1 || tx >= def.widthTiles - 1 || ty >= def.heightTiles - 1) continue;
    if (!def.isStaticBlocked(tx, ty)) {
      waypoints.push({ x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.85) * TILE_SIZE });
      if (waypoints.length >= 3) break;
    }
  }
  return waypoints;
}

export function spawnTiledWorldNpcs(
  scene: Phaser.Scene,
  mapId: MapId,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): TiledWorldNpcEntity[] {
  const parsed = getParsedTiledWorld(mapId);
  if (!parsed || parsed.npcSpawns.length === 0) return [];

  const npcs: TiledWorldNpcEntity[] = [];
  for (const [index, spawn] of parsed.npcSpawns.entries()) {
    const px = (spawn.tileX + 0.5) * TILE_SIZE;
    const py = (spawn.tileY + 0.85) * TILE_SIZE;
    const depth = Math.round(py);
    const shadow = placeSoftShadow(scene, px, py - 1, 14, 5, depth - 1, 0.4);
    const avatar = npcAvatarForSpawn(spawn.id, spawn.role);
    const texKey = ensurePhaserAvatarTexture(scene, avatar);
    const body = scene.add
      .sprite(px, py, texKey, getIdleFrameIndex('down'))
      .setOrigin(0.5, 0.88)
      .setDepth(depth);
    const labelText = spawn.labelVi ?? spawn.id;
    const label = createCompactNameTag(scene, px, py - 28, labelText, '#d8b46e');
    label.setDepth(9450);
    const emoteBadge = scene.add
      .text(px, py - 37, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '8px',
        color: '#ffeec2',
        backgroundColor: '#261a20cc',
        padding: { x: 3, y: 1 },
        resolution: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(9455)
      .setVisible(false);
    pushLayer(shadow);
    pushLayer(body);
    pushLayer(label);
    pushLayer(emoteBadge);

    const waypoints = buildWalkableNpcWaypoints(mapId, spawn.tileX, spawn.tileY, px, py);
    const phase = (index + 1) * 1.4;
    npcs.push({
      id: spawn.id,
      labelVi: labelText,
      dialogueVi: spawn.dialogueVi,
      role: spawn.role,
      tileX: spawn.tileX,
      tileY: spawn.tileY,
      texKey,
      body,
      shadow,
      label,
      emoteBadge,
      homeX: px,
      homeY: py,
      routine: createNpcRoutineState(px, py, waypoints, phase),
      phase,
      lastWasNear: false,
      emoteUntilMs: 0,
    });
  }
  return npcs;
}

export function tickTiledWorldNpcs(
  scene: Phaser.Scene,
  npcs: readonly TiledWorldNpcEntity[],
  timeMs: number,
  dtSec: number,
  ctx?: NpcTickContext,
): void {
  const t = timeMs / 1000;
  for (const npc of npcs) {
    stepNpcRoutine(npc.routine, {
      nowMs: timeMs,
      dtSec,
      tilePx: TILE_SIZE,
      playerX: ctx?.playerX ?? null,
      playerY: ctx?.playerY ?? null,
      playerPosture: ctx?.playerPosture ?? 'none',
      isNight: Boolean(ctx?.isNight),
      weatherKind: ctx?.weatherKind ?? 'sunny',
      talkingToPlayer: ctx?.activeDialogueNpcId === npc.id,
      isTileBlocked: ctx?.isTileBlocked,
      actorObstacles: ctx?.actorObstacles,
    });

    const nx = npc.routine.x;
    const ny = npc.routine.y;
    const bob = npc.routine.moving ? 0 : Math.sin(t * 1.6 + npc.phase) * 0.45;
    npc.body.setPosition(nx, ny + bob);
    npc.body.setDepth(Math.round(ny));
    npc.shadow.setPosition(nx, ny - 1);
    npc.shadow.setDepth(Math.round(ny) - 1);
    npc.label.setPosition(nx, ny - 28 + bob);

    if (npc.routine.moving) {
      const walkKey = avatarWalkAnimKey(npc.texKey, npc.routine.facing);
      if (scene.anims.exists(walkKey)) {
        if (!npc.body.anims.isPlaying || npc.body.anims.currentAnim?.key !== walkKey) {
          npc.body.play(walkKey, true);
        }
      } else {
        npc.body.stop();
        npc.body.setFrame(getIdleFrameIndex(npc.routine.facing));
      }
    } else {
      npc.body.stop();
      npc.body.setFrame(getIdleFrameIndex(npc.routine.facing));
    }

    const isNear = npc.routine.activity === 'interacting';
    if (isNear && !npc.lastWasNear && npc.routine.bubbleText) {
      npc.emoteUntilMs = timeMs + 2200;
      npc.emoteBadge.setText(npc.routine.bubbleText);
    }
    npc.lastWasNear = isNear;

    if (isNear && timeMs < npc.emoteUntilMs) {
      npc.emoteBadge.setPosition(nx, ny - 37 + bob).setVisible(true);
    } else {
      npc.emoteBadge.setVisible(false);
    }
  }
}

export function nearestTiledNpc(
  npcs: readonly TiledWorldNpcEntity[],
  tileX: number,
  tileY: number,
  radiusTiles = 2.6,
): TiledWorldNpcEntity | null {
  let best: TiledWorldNpcEntity | null = null;
  let bestD = radiusTiles;
  for (const npc of npcs) {
    const curTx = npc.body ? npc.body.x / TILE_SIZE : npc.tileX + 0.5;
    const curTy = npc.body ? (npc.body.y - 2) / TILE_SIZE : npc.tileY + 0.5;
    const d = Math.hypot(tileX + 0.5 - curTx, tileY + 0.5 - curTy);
    if (d <= bestD) {
      bestD = d;
      best = npc;
    }
  }
  return best;
}
