/**
 * Phaser world presentation for shared cooperative livestock.
 * Uses real animated donor sprites from `FarmRanchLife` (`livestock-ranch.png`),
 * with procedural Canvas fallback (`proceduralAnimalTextures.ts`) if atlas is unavailable.
 * Reads `ProjectedLivestockAnimal[]` — does not touch Quýt's `PetEntity`.
 */
import Phaser from 'phaser';
import type {
  LivestockCycleStatus,
  LivestockSpeciesId,
  ProjectedLivestockAnimal,
} from '../../shared/farming/livestock';
import {
  FARMING_LIVESTOCK_ATLAS_KEY,
  getLivestockAtlasSpec,
  livestockAnimKey,
} from '../../shared/art/farmingSpriteAtlas';
import { TILE_SIZE } from '../../shared/maps';
import { ensureLivestockTextures, livestockTextureKey } from './proceduralAnimalTextures';

export const DEFAULT_LIVESTOCK_TILES: ReadonlyArray<readonly [number, number]> = [
  [44, 15],
  [47, 15],
  [50, 15],
  [53, 15],
  [56, 15],
  [44, 18],
  [47, 18],
  [50, 18],
  [53, 18],
  [56, 18],
  [49, 26],
  [52, 26],
  [55, 26],
  [52, 29],
];

export function computeLivestockDisplayScale(tilePixelSize = TILE_SIZE): number {
  return 0.75 * (tilePixelSize / 16);
}

const SPECIES_SCALE_BY_ID: Readonly<Record<LivestockSpeciesId, number>> = {
  chicken: 1.0,
  duck: 1.0,
  rabbit: 0.95,
  cow: 1.0,
  goat: 0.95,
  sheep: 1.0,
  bee: 0.85,
};

const SPECIES_HEAD_CLEARANCE_PX: Readonly<Record<LivestockSpeciesId, number>> = {
  chicken: 18,
  duck: 18,
  rabbit: 18,
  cow: 26,
  goat: 24,
  sheep: 24,
  bee: 28,
};

const SPECIES_SHADOW_DIMENSIONS: Readonly<Record<LivestockSpeciesId, readonly [number, number]>> = {
  chicken: [10, 4],
  duck: [10, 4],
  rabbit: [10, 4],
  cow: [18, 6],
  goat: [15, 5],
  sheep: [16, 5],
  bee: [14, 5],
};

export function computeLivestockSpeciesDisplayScale(
  speciesId: LivestockSpeciesId,
  tilePixelSize = TILE_SIZE,
): number {
  return (SPECIES_SCALE_BY_ID[speciesId] ?? 1.0) * (tilePixelSize / 16);
}

type AnimalBehaviorMode = 'idle' | 'walk' | 'eat' | 'sleep';
type FacingDir = 'down' | 'left' | 'right' | 'up';

type AtlasAnimalEntry = {
  kind: 'atlas';
  sprite: Phaser.GameObjects.Sprite;
  swarmSprite?: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  badge?: Phaser.GameObjects.Text;
  speciesId: LivestockSpeciesId;
  status: LivestockCycleStatus;
  slotIndex: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  mode: AnimalBehaviorMode;
  facing: FacingDir;
  modeTimerMs: number;
  totalTimeMs: number;
  seed: number;
  currentAnimKey: string;
};

type FallbackAnimalEntry = {
  kind: 'fallback';
  sprite: Phaser.GameObjects.Image;
  badge?: Phaser.GameObjects.Text;
  speciesId: LivestockSpeciesId;
  cacheKey: string;
};

type AnimalVisualEntry = AtlasAnimalEntry | FallbackAnimalEntry;

function hashSeed(id: string, fallbackIndex: number): number {
  let h = 2166136261 ^ fallbackIndex;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10_000;
}

function nextPseudoRand(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export class LivestockVisualController {
  private readonly sprites = new Map<string, AnimalVisualEntry>();
  private fallbackAnimPhase = 0;
  private fallbackAnimTimerMs = 0;
  private fallbackWarned = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pushObject: (obj: Phaser.GameObjects.GameObject) => void,
    private readonly slotTiles: ReadonlyArray<readonly [number, number]> = DEFAULT_LIVESTOCK_TILES,
    private readonly tilePixelSize: number = TILE_SIZE,
  ) {}

  destroy(): void {
    for (const entry of this.sprites.values()) {
      this.destroyEntry(entry);
    }
    this.sprites.clear();
  }

  private destroyEntry(entry: AnimalVisualEntry): void {
    entry.sprite.destroy();
    entry.badge?.destroy();
    if (entry.kind === 'atlas') {
      entry.swarmSprite?.destroy();
      entry.shadow.destroy();
    }
  }

  private createStatusBadge(
    x: number,
    footY: number,
    speciesId: LivestockSpeciesId,
    status: LivestockCycleStatus,
  ): Phaser.GameObjects.Text | undefined {
    if (status !== 'ready' && status !== 'hungry') return undefined;
    const tileUnit = this.tilePixelSize / 16;
    const headOffset = SPECIES_HEAD_CLEARANCE_PX[speciesId] * tileUnit;
    const badge = this.scene.add
      .text(x, footY - headOffset, status === 'ready' ? '✨' : '🌾', {
        fontSize: `${Math.round(9 * tileUnit)}px`,
      })
      .setOrigin(0.5)
      .setDepth(Math.round(footY) + 2);
    this.pushObject(badge);
    return badge;
  }

  private playAtlasAnim(entry: AtlasAnimalEntry, actName: string): void {
    const spec = getLivestockAtlasSpec(entry.speciesId);
    if (!spec || !spec.animations[actName]?.length) return;
    const key = livestockAnimKey(entry.speciesId, actName);
    if (entry.currentAnimKey === key) return;
    entry.currentAnimKey = key;
    if (this.scene.anims?.exists?.(key)) {
      entry.sprite.play(key, true);
    } else {
      const firstFrame = spec.animations[actName]?.[0];
      if (firstFrame) entry.sprite.setFrame(firstFrame);
    }
  }

  private pickNextBehavior(entry: AtlasAnimalEntry): void {
    entry.seed = nextPseudoRand(entry.seed);
    const roll = entry.seed % 100;
    const tileUnit = this.tilePixelSize / 16;
    const maxDx = 7 * tileUnit;
    const maxDy = 3.5 * tileUnit;

    if (roll < 36) {
      entry.mode = 'walk';
      entry.seed = nextPseudoRand(entry.seed);
      const rx = ((entry.seed % 201) - 100) / 100;
      entry.seed = nextPseudoRand(entry.seed);
      const ry = ((entry.seed % 201) - 100) / 100;
      entry.targetX = entry.homeX + rx * maxDx;
      entry.targetY = entry.homeY + ry * maxDy;
      const dx = entry.targetX - entry.x;
      const dy = entry.targetY - entry.y;
      if (Math.abs(dx) >= Math.abs(dy)) {
        entry.facing = dx >= 0 ? 'right' : 'left';
      } else {
        entry.facing = dy >= 0 ? 'down' : 'up';
      }
      entry.modeTimerMs = 1_200 + (entry.seed % 1_000);
      this.playAtlasAnim(entry, `walk_${entry.facing}`);
      return;
    }

    if (roll < 64 || entry.status === 'hungry') {
      entry.mode = 'eat';
      const dirs: readonly FacingDir[] = ['down', 'left', 'right'];
      entry.facing = dirs[entry.seed % dirs.length]!;
      entry.modeTimerMs = 1_600 + (entry.seed % 1_400);
      this.playAtlasAnim(entry, `eat_${entry.facing}`);
      return;
    }

    if (roll >= 88 && entry.status === 'ready') {
      entry.mode = 'sleep';
      entry.facing = entry.seed % 2 === 0 ? 'left' : 'right';
      entry.modeTimerMs = 2_400 + (entry.seed % 1_600);
      this.playAtlasAnim(entry, `sleep_${entry.facing}`);
      return;
    }

    entry.mode = 'idle';
    const dirs: readonly FacingDir[] = ['down', 'left', 'right'];
    entry.facing = dirs[entry.seed % dirs.length]!;
    entry.modeTimerMs = 1_400 + (entry.seed % 1_600);
    this.playAtlasAnim(entry, `idle_${entry.facing}`);
  }

  step(deltaMs: number): void {
    const dt = Math.min(100, Math.max(0, deltaMs));
    if (dt === 0) return;

    let hasFallback = false;
    const tileUnit = this.tilePixelSize / 16;

    for (const entry of this.sprites.values()) {
      if (entry.kind === 'fallback') {
        hasFallback = true;
        continue;
      }

      entry.totalTimeMs += dt;
      if (entry.speciesId === 'bee') {
        if (entry.swarmSprite) {
          const phase = entry.totalTimeMs * 0.0024 + entry.seed * 0.01;
          const sx = entry.homeX + Math.sin(phase) * 4.5 * tileUnit;
          const sy = entry.homeY - 22 * tileUnit + Math.sin(phase * 2) * 2.2 * tileUnit;
          entry.swarmSprite.setPosition(sx, sy);
        }
        continue;
      }

      if (entry.mode === 'walk') {
        const dx = entry.targetX - entry.x;
        const dy = entry.targetY - entry.y;
        const dist = Math.hypot(dx, dy);
        const speedPxPerMs = (11 * tileUnit) / 1_000;
        const stepDist = speedPxPerMs * dt;
        if (dist <= Math.max(0.5, stepDist)) {
          entry.x = entry.targetX;
          entry.y = entry.targetY;
          entry.mode = 'idle';
          entry.modeTimerMs = 1_100 + (entry.seed % 900);
          const idleDir = entry.facing === 'up' ? 'down' : entry.facing;
          this.playAtlasAnim(entry, `idle_${idleDir}`);
        } else {
          entry.x += (dx / dist) * stepDist;
          entry.y += (dy / dist) * stepDist;
        }
        const depthY = Math.round(entry.y);
        entry.sprite.setPosition(entry.x, entry.y).setDepth(depthY);
        entry.shadow.setPosition(entry.x, entry.y).setDepth(depthY - 1);
        if (entry.badge) {
          const headOffset = SPECIES_HEAD_CLEARANCE_PX[entry.speciesId] * tileUnit;
          entry.badge.setPosition(entry.x, entry.y - headOffset).setDepth(depthY + 2);
        }
      }

      entry.modeTimerMs -= dt;
      if (entry.modeTimerMs <= 0) {
        this.pickNextBehavior(entry);
      }
    }

    if (hasFallback) {
      this.fallbackAnimTimerMs += dt;
      if (this.fallbackAnimTimerMs < 650) return;
      this.fallbackAnimTimerMs = 0;
      this.fallbackAnimPhase = (this.fallbackAnimPhase + 1) % 4;
      const frame: 0 | 1 | 2 = this.fallbackAnimPhase === 1 ? 1 : this.fallbackAnimPhase === 3 ? 2 : 0;
      for (const entry of this.sprites.values()) {
        if (entry.kind !== 'fallback') continue;
        const key = livestockTextureKey(entry.speciesId, frame);
        if (this.scene.textures.exists(key)) {
          entry.sprite.setTexture(key);
        }
      }
    }
  }

  sync(animals: readonly ProjectedLivestockAnimal[]): void {
    const active = new Set<string>();
    const useAtlas = this.scene.textures.exists(FARMING_LIVESTOCK_ATLAS_KEY);
    const tileUnit = this.tilePixelSize / 16;
    const dataset = this.scene.game?.canvas?.dataset;
    if (dataset) {
      dataset.livestockAtlasMode =
        animals.length > 0 && !useAtlas ? 'fallback:procedural' : useAtlas ? 'donor:FarmRanchLife' : 'idle';
    }
    if (animals.length > 0 && !useAtlas && import.meta.env.DEV && !this.fallbackWarned) {
      this.fallbackWarned = true;
      console.warn(
        `[LivestockVisualController] Missing donor atlas "${FARMING_LIVESTOCK_ATLAS_KEY}" for ${animals.length} livestock entity(ies); falling back to procedural Canvas textures.`,
      );
    }

    animals.forEach((item, index) => {
      const tile = this.slotTiles[index];
      if (!tile) return;
      active.add(item.animal.animalId);
      const speciesId = item.def.speciesId;
      const atlasSpec = useAtlas ? getLivestockAtlasSpec(speciesId) : null;

      if (useAtlas && atlasSpec) {
        const existing = this.sprites.get(item.animal.animalId);
        if (
          existing?.kind === 'atlas' &&
          existing.speciesId === speciesId &&
          existing.slotIndex === index
        ) {
          if (existing.status !== item.status) {
            existing.status = item.status;
            existing.badge?.destroy();
            existing.badge = this.createStatusBadge(existing.x, existing.y, speciesId, item.status);
          }
          return;
        }
        if (existing) this.destroyEntry(existing);

        const homeX = tile[0] * this.tilePixelSize + this.tilePixelSize / 2;
        const homeY = tile[1] * this.tilePixelSize + this.tilePixelSize * 0.88;
        const scale = computeLivestockSpeciesDisplayScale(speciesId, this.tilePixelSize);
        const [shadowW, shadowH] = SPECIES_SHADOW_DIMENSIONS[speciesId];

        const shadow = this.scene.add
          .ellipse(homeX, homeY, shadowW * tileUnit, shadowH * tileUnit, 0x162414, 0.24)
          .setDepth(Math.round(homeY) - 1);
        this.pushObject(shadow);

        const initialFrame =
          speciesId === 'bee'
            ? atlasSpec.animations.hive?.[0] ?? 'bee_hive_0'
            : atlasSpec.animations.idle_down?.[0] ?? `${speciesId}_idle_down_0`;
        const sprite = this.scene.add
          .sprite(homeX, homeY, FARMING_LIVESTOCK_ATLAS_KEY, initialFrame)
          .setOrigin(0.5, 1.0)
          .setDepth(Math.round(homeY))
          .setScale(scale);
        this.pushObject(sprite);

        let swarmSprite: Phaser.GameObjects.Sprite | undefined;
        if (speciesId === 'bee') {
          const swarmFrame = atlasSpec.animations.swarm?.[0] ?? 'bee_swarm_0';
          swarmSprite = this.scene.add
            .sprite(homeX, homeY - 22 * tileUnit, FARMING_LIVESTOCK_ATLAS_KEY, swarmFrame)
            .setOrigin(0.5, 0.5)
            .setDepth(Math.round(homeY) + 1)
            .setScale(tileUnit);
          const swarmAnimKey = livestockAnimKey('bee', 'swarm');
          if (this.scene.anims?.exists?.(swarmAnimKey)) {
            swarmSprite.play(swarmAnimKey, true);
          }
          this.pushObject(swarmSprite);
        }

        const badge = this.createStatusBadge(homeX, homeY, speciesId, item.status);
        const seed = hashSeed(item.animal.animalId, index);
        const entry: AtlasAnimalEntry = {
          kind: 'atlas',
          sprite,
          swarmSprite,
          shadow,
          badge,
          speciesId,
          status: item.status,
          slotIndex: index,
          homeX,
          homeY,
          x: homeX,
          y: homeY,
          targetX: homeX,
          targetY: homeY,
          mode: 'idle',
          facing: 'down',
          modeTimerMs: 700 + (seed % 1_200),
          totalTimeMs: seed * 13,
          seed,
          currentAnimKey: '',
        };
        if (speciesId !== 'bee') {
          this.playAtlasAnim(entry, 'idle_down');
        }
        this.sprites.set(item.animal.animalId, entry);
        return;
      }

      // Procedural fallback if livestock atlas failed to load
      const cacheKey = `${speciesId}:${item.status}:${index}`;
      const existing = this.sprites.get(item.animal.animalId);
      if (existing?.kind === 'fallback' && existing.cacheKey === cacheKey) return;
      if (existing) this.destroyEntry(existing);

      ensureLivestockTextures(this.scene, speciesId);
      const x = tile[0] * this.tilePixelSize + this.tilePixelSize / 2;
      const y = tile[1] * this.tilePixelSize + this.tilePixelSize / 2;
      const sprite = this.scene.add
        .image(x, y, livestockTextureKey(speciesId, 0))
        .setDepth(Math.round(y + this.tilePixelSize * 0.5))
        .setScale(computeLivestockDisplayScale(this.tilePixelSize));
      this.pushObject(sprite);

      const badgeOffsetY = Math.round(this.tilePixelSize * 0.9);
      let badge: Phaser.GameObjects.Text | undefined;
      if (item.status === 'ready' || item.status === 'hungry') {
        badge = this.scene.add
          .text(x, y - badgeOffsetY, item.status === 'ready' ? '✨' : '🌾', {
            fontSize: `${Math.round(9 * tileUnit)}px`,
          })
          .setOrigin(0.5)
          .setDepth(Math.round(y + this.tilePixelSize * 0.5 + 1));
        this.pushObject(badge);
      }

      this.sprites.set(item.animal.animalId, {
        kind: 'fallback',
        sprite,
        badge,
        speciesId,
        cacheKey,
      });
    });

    for (const id of [...this.sprites.keys()]) {
      if (!active.has(id)) {
        const entry = this.sprites.get(id);
        if (entry) this.destroyEntry(entry);
        this.sprites.delete(id);
      }
    }
  }
}
