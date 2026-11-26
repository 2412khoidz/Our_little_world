import Phaser from 'phaser';
import type { Direction } from '../../shared/types';
import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import { resolveHeldItemHandTransform } from '../../shared/interaction/heldItemAnchors';
import { kilnItemIconUrlForSku } from '../../shared/art/kilnItemIcons';
import {
  cabacosHeldToolTextureKey,
  heldSeedCropSprite,
} from '../../shared/donor/cabacos-79e423d/farmHeldToolPresentation';
import { ensureLivingItemTextures, LIVING_ITEMS_ATLAS_KEY } from '../pet/petSpriteBuilder';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import type { DonorToolActionState } from './donorPydewToolController';

const KILN_HELD_PREFIX = 'olw-held-kiln-';

export class HeldItemRenderer {
  private readonly image: Phaser.GameObjects.Image;
  private readonly harvestSweepGfx: Phaser.GameObjects.Graphics;
  private boundTextureKey = LIVING_ITEMS_ATLAS_KEY;
  private boundFrameKey = '';
  private readonly requestedKilnLoads = new Set<string>();

  constructor(scene: Phaser.Scene) {
    ensureLivingItemTextures(scene);
    this.image = scene.add
      .image(0, 0, LIVING_ITEMS_ATLAS_KEY, 'food_kibble')
      .setOrigin(0.5, 0.5)
      .setScale(0.55)
      .setVisible(false);
    this.harvestSweepGfx = scene.add.graphics().setVisible(false);
  }

  private ensureKilnTextureRequested(sku: string, url: string): string {
    const texKey = `${KILN_HELD_PREFIX}${sku}`;
    const scene = this.image.scene;
    if (!scene.textures.exists(texKey) && !this.requestedKilnLoads.has(texKey)) {
      this.requestedKilnLoads.add(texKey);
      scene.load.image(texKey, url);
      scene.load.start();
    }
    return texKey;
  }

  private applyHeldVisual(held: HeldItemState): { ready: boolean; usesLargeSpriteSheet: boolean } {
    const scene = this.image.scene;
    const cabTool = held.itemSku ? cabacosHeldToolTextureKey(held.itemSku) : null;
    if (cabTool && scene.textures.exists(cabTool)) {
      if (this.boundTextureKey !== cabTool || this.boundFrameKey !== '') {
        this.image.setTexture(cabTool);
        this.boundTextureKey = cabTool;
        this.boundFrameKey = '';
      }
      return { ready: true, usesLargeSpriteSheet: false };
    }
    const seedSprite = held.itemSku?.startsWith('seed_') ? heldSeedCropSprite(held.itemSku) : null;
    if (seedSprite && scene.textures.exists(seedSprite.textureKey)) {
      if (seedSprite.kind === 'spritesheet') {
        if (this.boundTextureKey !== seedSprite.textureKey || this.boundFrameKey !== `${seedSprite.frame}`) {
          this.image.setTexture(seedSprite.textureKey, seedSprite.frame);
          this.boundTextureKey = seedSprite.textureKey;
          this.boundFrameKey = `${seedSprite.frame}`;
        }
      } else if (this.boundTextureKey !== seedSprite.textureKey || this.boundFrameKey !== '') {
        this.image.setTexture(seedSprite.textureKey);
        this.boundTextureKey = seedSprite.textureKey;
        this.boundFrameKey = '';
      }
      return { ready: true, usesLargeSpriteSheet: true };
    }
    const kilnUrl = held.itemSku ? kilnItemIconUrlForSku(held.itemSku) : null;
    if (kilnUrl && held.itemSku) {
      const texKey = this.ensureKilnTextureRequested(held.itemSku, kilnUrl);
      if (scene.textures.exists(texKey)) {
        scene.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (this.boundTextureKey !== texKey || this.boundFrameKey !== '') {
          this.image.setTexture(texKey);
          this.boundTextureKey = texKey;
          this.boundFrameKey = '';
        }
        return { ready: true, usesLargeSpriteSheet: false };
      }
    }
    const propsFrame = held.propsIconId?.trim();
    if (propsFrame && scene.textures.exists(WORLD_PROPS_KEY) && scene.textures.get(WORLD_PROPS_KEY).has(propsFrame)) {
      if (this.boundTextureKey !== WORLD_PROPS_KEY || this.boundFrameKey !== propsFrame) {
        this.image.setTexture(WORLD_PROPS_KEY, propsFrame);
        this.boundTextureKey = WORLD_PROPS_KEY;
        this.boundFrameKey = propsFrame;
      }
      return { ready: true, usesLargeSpriteSheet: false };
    }
    if (held.iconId) {
      if (this.boundTextureKey !== LIVING_ITEMS_ATLAS_KEY || this.boundFrameKey !== held.iconId) {
        this.image.setTexture(LIVING_ITEMS_ATLAS_KEY, held.iconId);
        this.boundTextureKey = LIVING_ITEMS_ATLAS_KEY;
        this.boundFrameKey = held.iconId;
      }
      return { ready: true, usesLargeSpriteSheet: false };
    }
    return { ready: false, usesLargeSpriteSheet: false };
  }

  private renderHarvestSweepArc(
    targetWorldX: number,
    targetWorldY: number,
    avatarDepth: number,
    facing: Direction,
    progress: number,
    avatarScale: number,
  ): void {
    const alpha = Math.sin(progress * Math.PI) * 0.85;
    if (alpha <= 0.05) {
      this.harvestSweepGfx.setVisible(false);
      return;
    }
    this.harvestSweepGfx.clear();
    this.harvestSweepGfx.setPosition(targetWorldX, targetWorldY);
    this.harvestSweepGfx.setDepth(avatarDepth + 6);
    const radius = 8.5 * avatarScale;
    const baseAngle =
      facing === 'left'
        ? Math.PI
        : facing === 'right'
          ? 0
          : facing === 'up'
            ? -Math.PI / 2
            : Math.PI / 2;
    const sweepStart = baseAngle - 1.05 + progress * 0.7;
    const sweepEnd = sweepStart + 1.35;
    this.harvestSweepGfx.lineStyle(2.1 * avatarScale, 0xfef08a, alpha);
    this.harvestSweepGfx.beginPath();
    this.harvestSweepGfx.arc(0, 0, radius, sweepStart, sweepEnd, false);
    this.harvestSweepGfx.strokePath();
    this.harvestSweepGfx.lineStyle(1.2 * avatarScale, 0x4ade80, alpha * 0.85);
    this.harvestSweepGfx.beginPath();
    this.harvestSweepGfx.arc(0, 0, radius * 0.72, sweepStart + 0.15, sweepEnd - 0.1, false);
    this.harvestSweepGfx.strokePath();
    this.harvestSweepGfx.setVisible(true);
  }

  sync(
    avatarX: number,
    avatarY: number,
    avatarDepth: number,
    facing: Direction,
    moving: boolean,
    held: HeldItemState,
    timeMs: number,
    avatarScale = 1,
    toolAction: DonorToolActionState | null = null,
  ): void {
    const activeToolKind = toolAction?.active ? toolAction.toolKind : null;
    if (activeToolKind === 'harvest' && toolAction) {
      this.renderHarvestSweepArc(
        toolAction.targetWorldX,
        toolAction.targetWorldY,
        avatarDepth,
        toolAction.facing,
        toolAction.progress,
        avatarScale,
      );
    } else {
      this.harvestSweepGfx.setVisible(false);
    }

    const toolHeld = held.itemKind === 'tool';
    const actionActive = Boolean(toolAction?.active) || (toolHeld && held.temporaryActionState !== 'none');

    // Preserve accepted tool visibility invariant: tools stay hidden when idling or walking.
    if (held.itemKind === 'none' || (toolHeld && !actionActive)) {
      this.image.setVisible(false);
      this.image.setRotation(0);
      this.image.setFlipX(false);
      return;
    }

    const visual = this.applyHeldVisual(held);
    if (!visual.ready) {
      this.image.setVisible(false);
      this.image.setRotation(0);
      this.image.setFlipX(false);
      return;
    }

    // Active tool swing / watering pour / seed sowing dip
    if ((toolHeld && actionActive) || (activeToolKind === 'plant' && toolAction)) {
      const p = toolAction?.active ? toolAction.progress : (Math.sin(timeMs / 95) * 0.5 + 0.5);
      const isPlant = activeToolKind === 'plant';
      const isWaterCan = toolAction?.toolKind === 'water' || held.itemSku?.includes('water');
      const useFacing = toolAction?.active ? toolAction.facing : facing;

      if (isPlant) {
        const dip = Math.sin(p * Math.PI);
        const dirX = useFacing === 'left' ? -1 : useFacing === 'right' ? 1 : 0;
        const dirY = useFacing === 'up' ? -1 : useFacing === 'down' ? 1 : 0;
        const base = resolveHeldItemHandTransform({
          facing: useFacing,
          itemKind: held.itemKind,
          itemSku: held.itemSku,
          isMoving: false,
          timeMs,
          toolSwingActive: true,
        });
        const ox = (base.offsetX + dirX * 4.5 * dip) * avatarScale;
        const oy = (base.offsetY + (dirY * 3.5 + 2.2) * dip) * avatarScale;
        this.image.setOrigin(0.5, 0.5);
        this.image.setFlipX(base.flipX);
        this.image.setScale((visual.usesLargeSpriteSheet ? 0.22 : base.scale) * avatarScale);
        this.image.setPosition(Math.round(avatarX + ox), Math.round(avatarY + oy));
        this.image.setRotation((useFacing === 'left' ? -0.42 : 0.42) * dip);
        this.image.setDepth(avatarDepth + base.depthDelta);
        this.image.setVisible(true);
        return;
      }

      this.image.setScale((isWaterCan ? 0.54 : 0.6) * avatarScale);
      this.image.setFlipX(useFacing === 'left');
      this.image.setOrigin(
        isWaterCan ? 0.5 : useFacing === 'left' ? 0.8 : 0.2,
        isWaterCan ? 0.5 : 0.85,
      );

      // Directional swing arc (wind-up -> impact strike) or watering-can tilt
      const swingCurve = p < 0.35
        ? -0.82 * (p / 0.35)
        : -0.82 + 1.75 * Math.min(1, (p - 0.35) / 0.45);
      const rot = isWaterCan
        ? (useFacing === 'left' ? -0.45 : 0.45) * Math.sin(p * Math.PI)
        : (useFacing === 'left' ? -swingCurve : swingCurve);

      let ox: number;
      let oy: number;
      let depth = avatarDepth + 3;
      if (useFacing === 'left') {
        ox = -6 * avatarScale;
        oy = -5.5 * avatarScale;
      } else if (useFacing === 'right') {
        ox = 6 * avatarScale;
        oy = -5.5 * avatarScale;
      } else if (useFacing === 'up') {
        ox = 3.5 * avatarScale;
        oy = -8 * avatarScale;
        depth = avatarDepth - 2;
      } else {
        ox = -3 * avatarScale;
        oy = -3 * avatarScale;
      }

      this.image.setPosition(Math.round(avatarX + ox), Math.round(avatarY + oy));
      this.image.setRotation(rot);
      this.image.setDepth(depth);
      this.image.setVisible(true);
      return;
    }

    // Carried non-tool items (gifts, flowers, food, fish, seeds): directional hand-anchored transform
    const hand = resolveHeldItemHandTransform({
      facing,
      itemKind: held.itemKind,
      itemSku: held.itemSku,
      isMoving: moving,
      timeMs,
      toolSwingActive: false,
    });
    if (!hand.visible) {
      this.image.setVisible(false);
      return;
    }

    const tex = this.image.texture;
    const frameW = tex?.get(this.boundFrameKey)?.realWidth ?? 16;
    const naturalScaleFit = frameW >= 40 ? 0.22 : frameW >= 24 ? 0.4 : hand.scale;
    const finalScale = (visual.usesLargeSpriteSheet ? 0.2 : naturalScaleFit) * avatarScale;

    this.image.setOrigin(0.5, 0.5);
    this.image.setFlipX(hand.flipX);
    this.image.setRotation(hand.rotation);
    this.image.setScale(finalScale);
    this.image.setPosition(
      Math.round(avatarX + hand.offsetX * avatarScale),
      Math.round(avatarY + hand.offsetY * avatarScale),
    );
    this.image.setDepth(avatarDepth + hand.depthDelta);
    this.image.setVisible(true);
  }

  destroy(): void {
    this.image.destroy();
    this.harvestSweepGfx.destroy();
  }
}
