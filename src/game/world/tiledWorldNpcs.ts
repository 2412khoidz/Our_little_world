import Phaser from 'phaser';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { ensurePhaserAvatarTexture } from '../art/phaserAvatarTexture';
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
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  homeX: number;
  homeY: number;
  phase: number;
}

const NPC_AVATAR_BY_ID: Record<string, AvatarConfig> = {
  bac_hai: {
    skinTone: 'warm',
    hairStyle: 'short',
    hairColor: 'chestnut',
    outfitStyle: 'overall',
    outfitColor: 'cream',
    accessory: 'none',
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
    hairColor: 'espresso',
    outfitStyle: 'sweater',
    outfitColor: 'sky',
    accessory: 'glasses',
  },
};

function npcAvatarForSpawn(id: string, role: string): AvatarConfig {
  if (NPC_AVATAR_BY_ID[id]) return NPC_AVATAR_BY_ID[id]!;
  return role === 'market_preview'
    ? NPC_AVATAR_BY_ID.bac_hai!
    : {
        skinTone: 'warm',
        hairStyle: 'bob',
        hairColor: 'honey',
        outfitStyle: 'sweater',
        outfitColor: 'sage',
        accessory: 'none',
      };
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
    const shadow = scene.add.ellipse(px, py + 2, 16, 6, 0x2a3350, 0.22);
    shadow.setDepth(depth - 1);
    const avatar = npcAvatarForSpawn(spawn.id, spawn.role);
    const texKey = ensurePhaserAvatarTexture(scene, avatar);
    const body = scene.add
      .sprite(px, py, texKey, getIdleFrameIndex('down'))
      .setOrigin(0.5, 1)
      .setDepth(depth);
    const labelText = spawn.labelVi ?? spawn.id;
    const label = scene.add
      .text(px, py - 30, labelText, {
        fontFamily: 'Nunito, sans-serif',
        fontSize: '10px',
        color: '#2a3350',
        backgroundColor: '#fff8e8ee',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(depth + 1);
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
    const dx = Math.sin(t * 0.35 + npc.phase) * 6;
    const dy = Math.cos(t * 0.28 + npc.phase) * 2;
    const nx = npc.homeX + dx;
    const ny = npc.homeY + dy;
    npc.body.setPosition(nx, ny);
    npc.shadow.setPosition(nx, ny + 5);
    npc.label.setPosition(nx, ny - 30);
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