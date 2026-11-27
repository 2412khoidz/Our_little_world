import Phaser from 'phaser';
import {
  fishingStripForPhase, RANCH_FISHING_ATLAS, type FishingVisualCue,
} from '../../shared/art/ranchActionAtlas';
import { resolveDonorFishingSpotId } from '../../shared/interaction/economyInteractablePolicy';
import type { InteractableTarget } from '../../shared/interaction/interactionTypes';
import { CANONICAL_FISH_CATALOG } from '../../shared/donor/fishing/canonicalFishRegistry';

const WATER_OFFSETS: Readonly<Record<string, readonly [number, number]>> = {
  farm_pond_fishing: [0.5, -2],
  forest_canvas_stream: [1, 1],
  beach_pier_fishing: [4, -2],
  beach_cove_fishing: [2, 1],
  outdoor_fishing: [0, 1.5],
  outdoor_stream: [1.5, 0],
};
const ROD_KEY = 'donor-cabacos-rod';
const RESULT_MS = 900;

export function registerRanchFishing(scene: Phaser.Scene): void {
  for (const key of ['bobber_float', 'bobber_bite', 'fishing_spot_bubbles'] as const) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: [0, 1, 2, 3].map((frame) => ({ key: RANCH_FISHING_ATLAS, frame: `${key}_${frame}` })),
      frameRate: key === 'bobber_bite' ? 11 : 7,
      repeat: -1,
      repeatDelay: key === 'fishing_spot_bubbles' ? 350 : 0,
    });
  }
}

type Spot = { target: InteractableTarget; waterX: number; waterY: number; bubbles: Phaser.GameObjects.Sprite };
type Angler = {
  avatar: Phaser.GameObjects.Sprite;
  spot: Spot;
  cue: FishingVisualCue;
  startedAt: number;
  expiresAt: number;
  rod: Phaser.GameObjects.Image;
  bobber: Phaser.GameObjects.Sprite;
  line: Phaser.GameObjects.Graphics;
  fish: Phaser.GameObjects.Image | null;
};

export class RanchFishingVisuals {
  private readonly spots: Spot[];
  private readonly anglers = new Map<string, Angler>();
  private readonly requestedFish = new Set<string>();

  constructor(private readonly scene: Phaser.Scene, targets: readonly InteractableTarget[], private readonly tileSize: number) {
    this.spots = targets.filter((target) => target.kind === 'fishing_spot' && target.donorPlayable).map((target) => {
      const [dx, dy] = WATER_OFFSETS[target.id] ?? [0, 0];
      const waterX = Math.round(target.x + dx * tileSize);
      const waterY = Math.round(target.y + dy * tileSize);
      const bubbles = scene.add.sprite(waterX, waterY, RANCH_FISHING_ATLAS, 'fishing_spot_bubbles_0')
        .setScale(tileSize / 16).setDepth(3.5).play('fishing_spot_bubbles');
      return { target, waterX, waterY, bubbles };
    });
  }

  sync(
    userId: string, cue: FishingVisualCue, avatar: Phaser.GameObjects.Sprite | undefined, finishBeforeIdle = false,
  ): boolean {
    if (cue.phase === 'idle' || !avatar) {
      const previous = this.anglers.get(userId)?.cue.phase;
      if (avatar && finishBeforeIdle && (previous === 'landed' || previous === 'escaped')) return false;
      this.clear(userId);
      return false;
    }
    let entry = this.anglers.get(userId);
    if (entry && (entry.avatar !== avatar || entry.cue.spotId !== cue.spotId)) {
      this.clear(userId);
      entry = undefined;
    }
    const now = performance.now();
    if (entry?.cue.phase === cue.phase) {
      if (cue.phase !== 'landed' && cue.phase !== 'escaped') entry.expiresAt = now + 25_000;
      return false;
    }
    if (!entry) {
      if (cue.phase === 'landed' || cue.phase === 'escaped') return false;
      const nearby = this.spots.filter(({ target }) => resolveDonorFishingSpotId(target) === cue.spotId)
        .map((spot) => ({ spot, distance: Math.hypot(spot.target.x - avatar.x, spot.target.y - avatar.y) }))
        .filter(({ spot, distance }) => distance <= spot.target.maxRadiusPx + this.tileSize * 1.5)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!nearby) return false;
      entry = {
        avatar,
        spot: nearby.spot,
        cue,
        startedAt: now,
        expiresAt: now + 25_000,
        rod: this.scene.add.image(0, 0, ROD_KEY).setOrigin(0.25, 0.75),
        bobber: this.scene.add.sprite(0, 0, RANCH_FISHING_ATLAS, 'bobber_float_0'),
        line: this.scene.add.graphics(),
        fish: null,
      };
      entry.bobber.setScale(this.tileSize / 16);
      this.anglers.set(userId, entry);
    }
    entry.cue = cue;
    entry.startedAt = now;
    const terminal = cue.phase === 'landed' || cue.phase === 'escaped';
    entry.expiresAt = now + (terminal ? RESULT_MS : 25_000);
    const strip = fishingStripForPhase(cue.phase);
    if (strip) entry.bobber.play(strip, true);
    entry.bobber.setVisible(Boolean(strip));
    this.update();
    return true;
  }

  private showCatch(userId: string, entry: Angler, spriteUrl?: string): void {
    const spec = CANONICAL_FISH_CATALOG.find((fish) => fish.spriteUrl === spriteUrl);
    if (!spec) return;
    if (spec.sku === 'fish_minnow') {
      entry.fish = this.scene.add.image(0, 0, RANCH_FISHING_ATLAS, 'fish_minnow_0');
      return;
    }
    const key = `ranch-catch-${spec.sku}`;
    const display = () => {
      if (this.anglers.get(userId) !== entry || entry.cue.phase !== 'landed' || entry.fish) return;
      const image = this.scene.add.image(0, 0, key);
      this.scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      image.setDisplaySize(18 * this.tileSize / 16, 18 * this.tileSize / 16 * image.height / image.width);
      entry.fish = image;
    };
    if (this.scene.textures.exists(key)) display();
    else {
      if (!this.requestedFish.has(key)) {
        this.requestedFish.add(key);
        this.scene.load.image(key, spec.spriteUrl);
        this.scene.load.start();
      }
    }
  }

  update(): void {
    if (this.anglers.size === 0) return;
    const now = performance.now();
    for (const [id, entry] of this.anglers) {
      const { avatar, spot, cue, rod, bobber, line } = entry;
      if (!avatar.scene || !avatar.visible || now >= entry.expiresAt) {
        this.clear(id);
        continue;
      }
      const scale = this.tileSize / 16;
      const age = now - entry.startedAt;
      const sign = spot.waterX >= avatar.x ? 1 : -1;
      const casting = cue.phase === 'casting';
      const reeling = cue.phase === 'minigame' || cue.phase === 'reeling';
      const cast = casting ? Math.min(1, age / 260) : 1;
      const pull = reeling ? (1 + Math.sin(age / 70)) * 0.045 : 0;
      const handX = Math.round(avatar.x + sign * 4 * scale);
      const handY = Math.round(avatar.y - 10 * scale);
      const tilt = casting ? (1 - cast) * 1.2 : pull;
      rod.setDepth(avatar.depth + 1).setScale(0.75 * scale).setFlipX(sign < 0).setOrigin(sign < 0 ? 0.75 : 0.25, 0.75)
        .setPosition(handX, handY).setRotation(-sign * tilt);
      const tipX = handX + Math.round(10 * scale * sign * Math.cos(tilt));
      const tipY = handY - Math.round((9 + 5 * Math.sin(tilt)) * scale);
      const x = Math.round(tipX + (spot.waterX - tipX) * (cast - pull));
      const y = Math.round(tipY + (spot.waterY - tipY) * (cast - pull) - Math.sin(cast * Math.PI) * 16 * scale);
      bobber.setPosition(x, y).setDepth(avatar.depth + 2);
      line.clear().setDepth(avatar.depth + 1);
      if (cue.phase !== 'landed') {
        line.lineStyle(1, 0xe8e4b6, 0.84).lineBetween(tipX, tipY, x, y);
      }
      if (cue.phase === 'landed' && !entry.fish) this.showCatch(id, entry, cue.spriteUrl);
      if (entry.fish) {
        const lift = 24 + Math.sin(Math.min(age / 380, 1) * Math.PI / 2) * 19;
        entry.fish.setPosition(Math.round(avatar.x + sign * 15 * scale), Math.round(avatar.y - lift * scale))
          .setDepth(avatar.depth + 4).setAlpha(Math.min(1, (RESULT_MS - age) / 180));
      }
    }
    for (const spot of this.spots) {
      spot.bubbles.setVisible(!Array.from(this.anglers.values()).some((entry) => entry.spot === spot));
    }
  }

  private clear(id: string): void {
    const entry = this.anglers.get(id);
    if (!entry) return;
    entry.rod.destroy();
    entry.bobber.destroy();
    entry.line.destroy();
    entry.fish?.destroy();
    entry.spot.bubbles.setVisible(true);
    this.anglers.delete(id);
  }

  destroy(): void {
    for (const id of this.anglers.keys()) this.clear(id);
    for (const spot of this.spots) spot.bubbles.destroy();
  }
}
