import Phaser from 'phaser';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { ensurePhaserAvatarTexture } from '../art/phaserAvatarTexture';
import { createCompactNameTag, placeSoftShadow } from '../artDemos/demoHelpers';
import { TILE_SIZE } from '../../shared/maps';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import type { AvatarConfig, MapId } from '../../shared/types';
import { getParsedTiledWorld } from '../../shared/world/tiledMapRegistry';
import { evaluateNpcReaction } from '../../shared/world/emergentWorldBehavior';

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
}

const NPC_AVATAR_BY_ID: Record<string, AvatarConfig> = {
  bac_hai: {
    skinTone: 'warm',
    hairStyle: 'short',
    hairColor: 'espresso',
    outfitStyle: 'overall',
    outfitColor: 'cream',
    accessory: 'glasses',
  },
  co_lan: {
    skinTone: 'fair',
    hairStyle: 'bob',
    hairColor: 'sakura',
    outfitStyle: 'cardigan',
    outfitColor: 'rose',
    accessory: 'ribbon',
  },
  ong_minh: {
    skinTone: 'tan',
    hairStyle: 'short',
    hairColor: 'chestnut',
    outfitStyle: 'sweater',
    outfitColor: 'sky',
    accessory: 'none',
  },
  chu_tu: {
    skinTone: 'tan',
    hairStyle: 'short',
    hairColor: 'espresso',
    outfitStyle: 'overall',
    outfitColor: 'sky',
    accessory: 'glasses',
  },
  be_na: {
    skinTone: 'fair',
    hairStyle: 'long',
    hairColor: 'honey',
    outfitStyle: 'cardigan',
    outfitColor: 'sage',
    accessory: 'ribbon',
  },
};

function npcAvatarForSpawn(id: string, role: string): AvatarConfig {
  if (NPC_AVATAR_BY_ID[id]) return NPC_AVATAR_BY_ID[id]!;
  if (role.includes('fish')) return NPC_AVATAR_BY_ID.ong_minh!;
  if (role.includes('bakery') || role.includes('cafe')) return NPC_AVATAR_BY_ID.co_lan!;
  if (role.includes('tool')) return NPC_AVATAR_BY_ID.chu_tu!;
  if (role.includes('forest')) return NPC_AVATAR_BY_ID.be_na!;
  return NPC_AVATAR_BY_ID.bac_hai!;
}

export function spawnTiledWorldNpcs(
  scene: Phaser.Scene,
  mapId: MapId,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): TiledWorldNpcEntity[] {
  const parsed = getParsedTiledWorld(mapId);
  if (!parsed || parsed.npcSpawns.length === 0) return [];

  const npcs: TiledWorldNpcEntity[] = [];
  for (const spawn of parsed.npcSpawns) {
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
      phase: Math.random() * Math.PI * 2,
      lastWasNear: false,
      emoteUntilMs: 0,
    });
  }
  return npcs;
}

export function tickTiledWorldNpcs(
  npcs: readonly TiledWorldNpcEntity[],
  timeMs: number,
  ctx?: NpcTickContext,
): void {
  const t = timeMs / 1000;
  for (const npc of npcs) {
    const reaction = evaluateNpcReaction({
      npcX: npc.homeX,
      npcY: npc.homeY,
      playerX: ctx?.playerX ?? null,
      playerY: ctx?.playerY ?? null,
      playerPosture: ctx?.playerPosture ?? 'none',
      isNight: Boolean(ctx?.isNight),
      weatherKind: ctx?.weatherKind ?? 'sunny',
    });
    const bob = Math.sin(t * 1.4 + npc.phase) * 0.6 * reaction.swayScale;
    const sway = Math.sin(t * 0.45 + npc.phase) * 2.5 * reaction.swayScale;
    const nx = npc.homeX + sway;
    const ny = npc.homeY;
    npc.body.setPosition(nx, ny + bob * 0.5);
    npc.body.setFrame(getIdleFrameIndex(reaction.facing));
    npc.shadow.setPosition(nx, ny - 1);
    npc.label.setPosition(nx, ny - 28 + bob * 0.5);

    const isNear = reaction.state === 'interacting';
    if (isNear && !npc.lastWasNear && reaction.bubbleText) {
      npc.emoteUntilMs = timeMs + 2200;
      npc.emoteBadge.setText(reaction.bubbleText);
    }
    npc.lastWasNear = isNear;

    if (isNear && timeMs < npc.emoteUntilMs) {
      npc.emoteBadge.setPosition(nx, ny - 37 + bob * 0.5).setVisible(true);
    } else {
      npc.emoteBadge.setVisible(false);
    }
  }
}

export function nearestTiledNpc(
  npcs: readonly TiledWorldNpcEntity[],
  tileX: number,
  tileY: number,
  radiusTiles = 2.4,
): TiledWorldNpcEntity | null {
  let best: TiledWorldNpcEntity | null = null;
  let bestD = radiusTiles;
  for (const npc of npcs) {
    const d = Math.hypot(tileX - npc.tileX, tileY - npc.tileY);
    if (d <= bestD) {
      bestD = d;
      best = npc;
    }
  }
  return best;
}
