import Phaser from 'phaser';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { ensurePhaserAvatarTexture } from '../art/phaserAvatarTexture';
import { createCompactNameTag, placeSoftShadow } from '../artDemos/demoHelpers';
import { TILE_SIZE } from '../../shared/maps';
import type { AvatarConfig, MapId } from '../../shared/types';
import { getParsedTiledWorld } from '../../shared/world/tiledMapRegistry';

export interface TiledWorldNpcEntity {
  id: string;
  labelVi: string;
  dialogueVi: string;
  role: string;
  tileX: number;
  tileY: number;
  body: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Container;
  homeX: number;
  homeY: number;
  phase: number;
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
    pushLayer(shadow);
    pushLayer(body);
    pushLayer(label);
    npcs.push({
      id: spawn.id,
      labelVi: labelText,
      dialogueVi: spawn.dialogueVi,
      role: spawn.role,
      tileX: spawn.tileX,
      tileY: spawn.tileY,
      body,
      shadow,
      label,
      homeX: px,
      homeY: py,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return npcs;
}

export function tickTiledWorldNpcs(npcs: readonly TiledWorldNpcEntity[], timeMs: number): void {
  const t = timeMs / 1000;
  for (const npc of npcs) {
    const bob = Math.sin(t * 1.4 + npc.phase) * 0.6;
    const sway = Math.sin(t * 0.45 + npc.phase) * 2.5;
    const nx = npc.homeX + sway;
    const ny = npc.homeY;
    npc.body.setPosition(nx, ny + bob * 0.5);
    npc.shadow.setPosition(nx, ny - 1);
    npc.label.setPosition(nx, ny - 28 + bob * 0.5);
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
