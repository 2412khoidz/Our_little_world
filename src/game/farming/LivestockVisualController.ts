/**
 * Phaser world presentation for shared cooperative livestock.
 * Reads `ProjectedLivestockAnimal[]` — does not touch Quýt's `PetEntity`.
 */
import Phaser from 'phaser';
import type { ProjectedLivestockAnimal } from '../../shared/farming/livestock';
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

type AnimalSpriteEntry = {
  sprite: Phaser.GameObjects.Image;
  badge?: Phaser.GameObjects.Text;
  speciesId: ProjectedLivestockAnimal['def']['speciesId'];
  cacheKey: string;
};

export class LivestockVisualController {
  private readonly sprites = new Map<string, AnimalSpriteEntry>();
  private animPhase = 0;
  private animTimerMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pushObject: (obj: Phaser.GameObjects.GameObject) => void,
    private readonly slotTiles: ReadonlyArray<readonly [number, number]> = DEFAULT_LIVESTOCK_TILES,
    private readonly tilePixelSize: number = TILE_SIZE,
  ) {}

  destroy(): void {
    for (const e of this.sprites.values()) {
      e.sprite.destroy();
      e.badge?.destroy();
    }
    this.sprites.clear();
  }

  step(deltaMs: number): void {
    this.animTimerMs += deltaMs;
    if (this.animTimerMs < 650) return;
    this.animTimerMs = 0;
    this.animPhase = (this.animPhase + 1) % 4;
    const frame: 0 | 1 | 2 = this.animPhase === 1 ? 1 : this.animPhase === 3 ? 2 : 0;
    for (const entry of this.sprites.values()) {
      const key = livestockTextureKey(entry.speciesId, frame);
      if (this.scene.textures.exists(key)) {
        entry.sprite.setTexture(key);
      }
    }
  }

  sync(animals: readonly ProjectedLivestockAnimal[]): void {
    const active = new Set<string>();
    animals.forEach((item, index) => {
      const tile = this.slotTiles[index];
      if (!tile) return;
      active.add(item.animal.animalId);
      const cacheKey = `${item.animal.speciesId}:${item.status}:${index}`;
      const existing = this.sprites.get(item.animal.animalId);
      if (existing?.cacheKey === cacheKey) return;

      existing?.sprite.destroy();
      existing?.badge?.destroy();

      ensureLivestockTextures(this.scene, item.def.speciesId);
      const tileUnit = this.tilePixelSize / 16;
      const x = tile[0] * this.tilePixelSize + this.tilePixelSize / 2;
      const y = tile[1] * this.tilePixelSize + this.tilePixelSize / 2;
      const sprite = this.scene.add
        .image(x, y, livestockTextureKey(item.def.speciesId, 0))
        .setDepth(Math.round(y + this.tilePixelSize * 0.5))
        .setScale(computeLivestockDisplayScale(this.tilePixelSize));
      this.pushObject(sprite);

      const badgeOffsetY = Math.round(this.tilePixelSize * 0.9);
      let badge: Phaser.GameObjects.Text | undefined;
      if (item.status === 'ready') {
        badge = this.scene.add
          .text(x, y - badgeOffsetY, '✨', { fontSize: `${Math.round(9 * tileUnit)}px` })
          .setOrigin(0.5)
          .setDepth(Math.round(y + this.tilePixelSize * 0.5 + 1));
        this.pushObject(badge);
      } else if (item.status === 'hungry') {
        badge = this.scene.add
          .text(x, y - badgeOffsetY, '🌾', { fontSize: `${Math.round(9 * tileUnit)}px` })
          .setOrigin(0.5)
          .setDepth(Math.round(y + this.tilePixelSize * 0.5 + 1));
        this.pushObject(badge);
      }

      this.sprites.set(item.animal.animalId, {
        sprite,
        badge,
        speciesId: item.def.speciesId,
        cacheKey,
      });
    });

    for (const id of [...this.sprites.keys()]) {
      if (!active.has(id)) {
        const entry = this.sprites.get(id);
        entry?.sprite.destroy();
        entry?.badge?.destroy();
        this.sprites.delete(id);
      }
    }
  }
}
