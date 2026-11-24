import Phaser from 'phaser';
import { DEFAULT_AVATAR_PARTNER_A } from '../../shared/avatar';
import {
  EMPTY_HELD_ITEM,
  resolveContextualActions,
} from '../../shared/interaction/interactionResolver';
import type {
  ContextualResolution,
  HeldItemState,
  InteractableTarget,
} from '../../shared/interaction/interactionTypes';
import type { CatAccessoryId, CatCoatVariantId } from '../../shared/petLiving/petVisualTypes';
import type { Direction } from '../../shared/types';
import { AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL } from '../art/atlasProfile';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { ensurePhaserAvatarTexture } from '../art/phaserAvatarTexture';
import { WORLD_ART_KEY, WORLD_PROPS_KEY, preloadWorldAtlas, registerWorldAtlas } from '../art/worldAtlas';
import artIds from '../art/worldArtIds.json';
import extIds from '../art/worldExtendedArtIds.json';
import { computeGameplayZoom } from '../art/worldCamera';
import { ensureLightingTextures, placeSoftShadow, placeWarmLight } from '../artDemos/demoHelpers';
import { HeldItemRenderer } from '../interaction/HeldItemRenderer';
import {
  createLocomotionSnapshot,
  stepPetLocomotion,
  type PetBehaviorIntent,
  type PetLocomotionSnapshot,
} from '../pet/PetAnimationController';
import {
  ensureLivingCatSpritesheet,
  ensureLivingItemTextures,
  getLivingCatAnimKey,
  getLivingCatTextureKey,
  LIVING_ITEMS_ATLAS_KEY,
} from '../pet/petSpriteBuilder';
import {
  buildExpansionLandmarks,
  estimateWalkTimeSec,
  findNearestLandmark,
  type CosmeticDayPhase,
  type WorldLandmark,
  type WorldSizeOption,
} from './worldExpansionMap';

export interface SandboxTelemetry {
  mapSize: WorldSizeOption;
  playerTileX: number;
  playerTileY: number;
  nearestLandmark: WorldLandmark;
  inLandmark: boolean;
  petMode: string;
  foodBowlPortions: number;
  waterBowlVolume: number;
  avgTravelTimeAcrossSec: number;
}

export interface WorldExpansionSceneHooks {
  mapSize: WorldSizeOption;
  dayPhase: CosmeticDayPhase;
  catVariant: CatCoatVariantId;
  catAccessory: CatAccessoryId;
  petFollowEnabled: boolean;
  strayAdopted: boolean;
  heldItem: HeldItemState;
  foodBowlPortions: number;
  waterBowlVolume: number;
  onTelemetry: (t: SandboxTelemetry) => void;
  onContextResolution: (res: ContextualResolution) => void;
  onPetTap?: () => void;
}

export class WorldExpansionScene extends Phaser.Scene {
  private hooks: WorldExpansionSceneHooks;
  private worldSize: WorldSizeOption = 64;
  private landmarks: WorldLandmark[] = [];
  private layerGroup: Phaser.GameObjects.GameObject[] = [];

  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerTexKey = '';
  private playerFacing: Direction = 'down';
  private heldRenderer: HeldItemRenderer | null = null;

  private catSprite!: Phaser.GameObjects.Sprite;
  private catShadow!: Phaser.GameObjects.Ellipse;
  private catLoco: PetLocomotionSnapshot = createLocomotionSnapshot(256, 232);
  private catIntentOverride: { intent: PetBehaviorIntent; untilMs: number; x?: number; y?: number } | null = null;
  private catBubble: Phaser.GameObjects.Text | null = null;

  private foodBowlImg!: Phaser.GameObjects.Image;
  private waterBowlImg!: Phaser.GameObjects.Image;
  private toyMarker: { kind: 'yarn_ball' | 'cardboard_box'; img: Phaser.GameObjects.Image; x: number; y: number } | null = null;
  private butterflies: Array<{ sprite: Phaser.GameObjects.Rectangle; cx: number; cy: number; phase: number }> = [];
  private smokePuffs: Phaser.GameObjects.Arc[] = [];
  private dayTintOverlay!: Phaser.GameObjects.Rectangle;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private joystickVec = { vx: 0, vy: 0 };
  private lastTelemetryAt = 0;

  constructor(hooks: WorldExpansionSceneHooks) {
    super({ key: 'WorldExpansionScene' });
    this.hooks = hooks;
    this.worldSize = hooks.mapSize;
  }

  preload(): void {
    this.load.image(AVATAR_ATLAS_KEY, AVATAR_ATLAS_URL);
    preloadWorldAtlas(this);
  }

  create(): void {
    ensureLightingTextures(this);
    registerWorldAtlas(this);
    ensureLivingItemTextures(this);
    this.playerTexKey = ensurePhaserAvatarTexture(this, DEFAULT_AVATAR_PARTNER_A);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.buildWorld(this.worldSize);
    this.scale.on('resize', () => this.applyFollowCamera());
    this.applyFollowCamera();
  }

  updateHooks(next: WorldExpansionSceneHooks): void {
    const rebuildNeeded = next.mapSize !== this.worldSize;
    this.hooks = next;
    if (rebuildNeeded) {
      this.buildWorld(next.mapSize);
      this.applyFollowCamera();
    }
    this.syncCatAppearance();
    this.syncBowls();
    this.syncDayTint();
  }

  setJoystick(vx: number, vy: number): void {
    this.joystickVec = { vx, vy };
  }

  teleportToLandmark(landmarkId: string): void {
    const lm = this.landmarks.find((l) => l.id === landmarkId);
    if (!lm || !this.playerSprite) return;
    this.playerSprite.setPosition(lm.tileX * 16 + 8, lm.tileY * 16 + 16);
    if (this.hooks.petFollowEnabled && this.catSprite) {
      this.catLoco = { ...this.catLoco, x: this.playerSprite.x + 20, y: this.playerSprite.y + 8 };
      this.catSprite.setPosition(this.catLoco.x, this.catLoco.y);
    }
  }

  triggerCatAction(intent: PetBehaviorIntent, durationMs = 2600, bubbleText?: string, atX?: number, atY?: number): void {
    this.catIntentOverride = {
      intent,
      untilMs: Date.now() + durationMs,
      x: atX,
      y: atY,
    };
    if (bubbleText) {
      this.spawnCatBubble(bubbleText);
    }
  }

  spawnToyOnGround(kind: 'yarn_ball' | 'cardboard_box'): { x: number; y: number } {
    this.toyMarker?.img.destroy();
    const ox = this.playerFacing === 'left' ? -22 : this.playerFacing === 'right' ? 22 : 0;
    const oy = this.playerFacing === 'up' ? -20 : 18;
    const tx = Math.max(24, Math.min(this.worldSize * 16 - 24, this.playerSprite.x + ox));
    const ty = Math.max(24, Math.min(this.worldSize * 16 - 24, this.playerSprite.y + oy));
    const img = this.add.image(tx, ty, LIVING_ITEMS_ATLAS_KEY, kind).setDepth(Math.round(ty));
    this.toyMarker = { kind, img, x: tx, y: ty };
    this.triggerCatAction(kind === 'cardboard_box' ? 'box_peek' : 'play_pounce', 4200, kind === 'cardboard_box' ? '📦✨' : '🧶!', tx, ty);
    return { x: tx, y: ty };
  }

  private buildWorld(size: WorldSizeOption): void {
    this.worldSize = size;
    for (const o of this.layerGroup) o.destroy();
    this.layerGroup = [];
    for (const b of this.butterflies) b.sprite.destroy();
    this.butterflies = [];
    for (const s of this.smokePuffs) s.destroy();
    this.smokePuffs = [];
    this.toyMarker?.img.destroy();
    this.toyMarker = null;

    this.landmarks = buildExpansionLandmarks(size);
    const worldPx = size * 16;

    // 1. Cozy meadow & southern golden beach bands
    const grass = this.add.rectangle(0, 0, worldPx, worldPx - 14 * 16, 0xa8cf7c).setOrigin(0, 0).setDepth(0);
    const sand = this.add.rectangle(0, (size - 14) * 16, worldPx, 6 * 16, 0xf2d9a2).setOrigin(0, 0).setDepth(0);
    const ocean = this.add.rectangle(0, (size - 8) * 16, worldPx, 8 * 16, 0x6cb8d9).setOrigin(0, 0).setDepth(0);
    this.layerGroup.push(grass, sand, ocean);

    // Subtle meadow flower & tuft grid
    const art = this.textures.get(WORLD_ART_KEY);
    const propsTex = this.textures.get(WORLD_PROPS_KEY);
    for (let ty = 2; ty < size - 14; ty += 3) {
      for (let tx = 2; tx < size - 2; tx += 3) {
        if ((tx * 17 + ty * 31) % 5 === 0 && propsTex.has(extIds.props.meadow_flora)) {
          this.layerGroup.push(
            this.add.image(tx * 16 + 8, ty * 16 + 8, WORLD_PROPS_KEY, extIds.props.meadow_flora).setDepth(1),
          );
        }
      }
    }

    // 2. Dirt footpaths connecting landmarks smoothly
    const cottageLm = this.landmarks.find((l) => l.id === 'cottage')!;
    const pondLm = this.landmarks.find((l) => l.id === 'fishing_pond')!;
    const beachLm = this.landmarks.find((l) => l.id === 'beach')!;
    const squareLm = this.landmarks.find((l) => l.id === 'square')!;

    const drawPath = (x1: number, y1: number, x2: number, y2: number, w = 26) => {
      const rx1 = Math.min(x1, x2);
      const rw = Math.abs(x2 - x1) + w;
      const ry2 = Math.min(y1, y2);
      const rh = Math.abs(y2 - y1) + w;
      const horizEdge = this.add.rectangle(rx1 - 2, y1 - w / 2 - 2, rw + 4, w + 4, 0xc7a379).setOrigin(0, 0).setDepth(1);
      const vertEdge = this.add.rectangle(x2 - w / 2 - 2, ry2 - 2, w + 4, rh + 4, 0xc7a379).setOrigin(0, 0).setDepth(1);
      const horiz = this.add.rectangle(rx1, y1 - w / 2, rw, w, 0xdec099).setOrigin(0, 0).setDepth(1);
      const vert = this.add.rectangle(x2 - w / 2, ry2, w, rh, 0xdec099).setOrigin(0, 0).setDepth(1);
      this.layerGroup.push(horizEdge, vertEdge, horiz, vert);
    };

    for (const lm of this.landmarks) {
      drawPath(cottageLm.tileX * 16 + 8, cottageLm.tileY * 16 + 8, lm.tileX * 16 + 8, lm.tileY * 16 + 8, 22);
    }

    // 3. Landmark props using 100% approved Demo E atlas
    const cx = cottageLm.tileX * 16;
    const cy = cottageLm.tileY * 16;
    if (art.has(artIds.scenery.cottage)) {
      this.layerGroup.push(placeSoftShadow(this, cx, cy - 8, 52, 14, cy - 12, 0.45));
      this.layerGroup.push(this.add.image(cx, cy - 6, WORLD_ART_KEY, artIds.scenery.cottage).setOrigin(0.5, 1).setDepth(cy - 6));
    }
    this.layerGroup.push(this.add.image(cx + 38, cy - 4, WORLD_PROPS_KEY, extIds.props.mailbox_red).setOrigin(0.5, 1).setDepth(cy - 4));
    this.layerGroup.push(placeWarmLight(this, cx, cy - 28, 36, 0xffd284, 0.25, 860));

    // Cozy cottage yard foliage & garden border
    const yardProps: Array<{ key: string; x: number; y: number; shadowW?: number }> = [
      { key: extIds.props.peach_tree, x: cx - 58, y: cy - 4, shadowW: 34 },
      { key: extIds.props.apple_tree, x: cx + 66, y: cy - 2, shadowW: 34 },
      { key: extIds.props.sakura_bush, x: cx - 34, y: cy - 2 },
      { key: extIds.props.planter_box, x: cx + 50, y: cy + 4 },
      { key: extIds.props.fence_3w, x: cx - 64, y: cy + 36 },
      { key: extIds.props.fence_3w, x: cx + 66, y: cy + 36 },
      { key: extIds.props.sunflower, x: cx - 46, y: cy + 44 },
      { key: extIds.props.sunflower, x: cx + 50, y: cy + 44 },
      { key: extIds.props.beehive, x: cx + 80, y: cy + 28 },
    ];
    for (const yp of yardProps) {
      if (!propsTex.has(yp.key)) continue;
      if (yp.shadowW) {
        this.layerGroup.push(placeSoftShadow(this, yp.x, yp.y - 2, yp.shadowW, 10, yp.y - 4, 0.35));
      }
      this.layerGroup.push(this.add.image(yp.x, yp.y, WORLD_PROPS_KEY, yp.key).setOrigin(0.5, 1).setDepth(yp.y));
    }

    // Chimney smoke particles
    for (let i = 0; i < 4; i += 1) {
      const puff = this.add.circle(cx + 14, cy - 48 - i * 8, 3 + i * 0.6, 0xfff8ef, 0.55).setDepth(9200);
      this.smokePuffs.push(puff);
    }

    // Food & Water bowls on sunny porch right side
    this.foodBowlImg = this.add.image(cx + 32, cy + 16, LIVING_ITEMS_ATLAS_KEY, 'kibble_bowl_empty').setDepth(cy + 16);
    this.waterBowlImg = this.add.image(cx + 50, cy + 16, LIVING_ITEMS_ATLAS_KEY, 'water_bowl_empty').setDepth(cy + 16);
    this.layerGroup.push(this.foodBowlImg, this.waterBowlImg);

    // Fishing pond + wooden bridge + duck & frog
    const px = pondLm.tileX * 16;
    const py = pondLm.tileY * 16;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        if (this.anims.exists('olw-water')) {
          const wTile = this.add.sprite(px + dx * 16, py + dy * 16, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`).setDepth(2);
          wTile.play('olw-water');
          this.layerGroup.push(wTile);
        }
      }
    }
    this.layerGroup.push(this.add.image(px, py, WORLD_PROPS_KEY, extIds.props.bridge_wood).setDepth(4));
    if (this.anims.exists('olw-duck')) {
      const dk = this.add.sprite(px + 28, py, WORLD_PROPS_KEY, `${extIds.sheets.duck}:0`).setDepth(py + 4);
      dk.play('olw-duck');
      this.layerGroup.push(dk);
    }

    // Wooden pier into beach
    this.layerGroup.push(
      this.add.rectangle(beachLm.tileX * 16, (size - 10) * 16, 26, 72, 0xa87549).setStrokeStyle(1, 0x5d3b23).setDepth(3),
    );

    // Scatter sakura trees, oak trees, crops, picnic & benches around landmarks
    for (const lm of this.landmarks) {
      const lx = lm.tileX * 16;
      const ly = lm.tileY * 16;
      if (lm.biome === 'forest' || lm.biome === 'secret' || lm.biome === 'meadow') {
        for (const [ox, oy, frame] of [
          [-34, -22, artIds.scenery.blossom],
          [36, -18, artIds.scenery.blossom],
        ] as const) {
          if (art.has(frame)) {
            this.layerGroup.push(this.add.image(lx + ox, ly + oy, WORLD_ART_KEY, frame).setOrigin(0.5, 1).setDepth(ly + oy));
          }
        }
        // Orchard / Secret nook butterflies
        for (let b = 0; b < 3; b += 1) {
          const bf = this.add.rectangle(lx + b * 14 - 14, ly - 10, 3, 2, 0xffe478).setDepth(9100);
          this.butterflies.push({ sprite: bf, cx: lx + b * 14 - 14, cy: ly - 10, phase: b * 2.1 });
        }
      }
      if (lm.id === 'farm') {
        for (let i = 0; i < 4; i += 1) {
          this.layerGroup.push(
            this.add.image(lx - 24 + i * 16, ly + 8, WORLD_PROPS_KEY, i % 2 === 0 ? extIds.props.sunflower : extIds.props.tomato).setDepth(ly + 8),
          );
        }
      }
      if (lm.id === 'picnic') {
        this.layerGroup.push(this.add.image(lx, ly, WORLD_PROPS_KEY, extIds.props.picnic_blanket).setDepth(3));
        this.layerGroup.push(this.add.image(lx - 6, ly - 4, WORLD_PROPS_KEY, extIds.props.picnic_tart).setDepth(ly));
      }
      if (lm.id === 'sunset_cliff' || lm.id === 'square') {
        this.layerGroup.push(this.add.image(lx, ly, WORLD_ART_KEY, artIds.furniture.bench_garden).setDepth(ly));
      }
    }
    this.layerGroup.push(this.add.image(squareLm.tileX * 16 + 24, squareLm.tileY * 16 - 10, WORLD_PROPS_KEY, extIds.props.beehive).setDepth(squareLm.tileY * 16));

    // 4. Player Avatar
    const startX = cx;
    const startY = cy + 28;
    if (!this.playerSprite) {
      this.playerShadow = this.add.ellipse(startX, startY - 1, 11, 4.5, 0x22151c, 0.34).setDepth(startY - 1);
      this.playerSprite = this.add.sprite(startX, startY, this.playerTexKey, getIdleFrameIndex('down')).setOrigin(0.5, 1).setDepth(startY);
      this.heldRenderer = new HeldItemRenderer(this);
    } else {
      this.playerSprite.setPosition(startX, startY);
    }

    // 5. Handcrafted 24x24 Living Cat
    ensureLivingCatSpritesheet(this, this.hooks.catVariant, this.hooks.catAccessory);
    this.catLoco = createLocomotionSnapshot(startX + 22, startY - 6);
    if (!this.catSprite) {
      this.catShadow = this.add.ellipse(this.catLoco.x, this.catLoco.y, 13, 5, 0x22151c, 0.34).setDepth(this.catLoco.y - 1);
      this.catSprite = this.add.sprite(this.catLoco.x, this.catLoco.y, getLivingCatTextureKey(this.hooks.catVariant, this.hooks.catAccessory), 0).setOrigin(0.5, 0.85).setDepth(this.catLoco.y);
      this.catSprite.setInteractive({ useHandCursor: true });
      this.catSprite.on('pointerup', () => this.hooks.onPetTap?.());
    } else {
      this.catSprite.setPosition(this.catLoco.x, this.catLoco.y);
    }

    // 6. Cosmetic Day/Sunset/Twilight Overlay fixed to camera
    this.dayTintOverlay?.destroy();
    this.dayTintOverlay = this.add.rectangle(0, 0, worldPx, worldPx, 0xff9d5c, 0).setOrigin(0, 0).setDepth(9800);
    this.syncBowls();
    this.syncDayTint();
  }

  private syncCatAppearance(): void {
    if (!this.catSprite) return;
    ensureLivingCatSpritesheet(this, this.hooks.catVariant, this.hooks.catAccessory);
    const key = getLivingCatTextureKey(this.hooks.catVariant, this.hooks.catAccessory);
    if (this.catSprite.texture.key !== key) {
      this.catSprite.setTexture(key, 0);
    }
  }

  private syncBowls(): void {
    if (this.foodBowlImg) {
      this.foodBowlImg.setFrame(this.hooks.foodBowlPortions > 0 ? 'kibble_bowl_full' : 'kibble_bowl_empty');
    }
    if (this.waterBowlImg) {
      this.waterBowlImg.setFrame(this.hooks.waterBowlVolume > 15 ? 'water_bowl_full' : 'water_bowl_empty');
    }
  }

  private syncDayTint(): void {
    if (!this.dayTintOverlay) return;
    if (this.hooks.dayPhase === 'sunset') {
      this.dayTintOverlay.setFillStyle(0xff8e53, 0.16);
    } else if (this.hooks.dayPhase === 'twilight') {
      this.dayTintOverlay.setFillStyle(0x28346e, 0.24);
    } else {
      this.dayTintOverlay.setFillStyle(0x000000, 0);
    }
  }

  private applyFollowCamera(): void {
    const cam = this.cameras.main;
    if (!cam || !this.playerSprite) return;
    const worldPx = this.worldSize * 16;
    const w = this.scale.width || 400;
    const h = this.scale.height || 600;
    const zoom = computeGameplayZoom(w, h, 320, 240);
    cam.setZoom(zoom);
    cam.setRoundPixels(true);
    cam.setBounds(0, 0, worldPx, worldPx);
    cam.startFollow(this.playerSprite, true, 0.14, 0.14);
  }

  private spawnCatBubble(text: string): void {
    this.catBubble?.destroy();
    this.catBubble = this.add
      .text(this.catSprite.x, this.catSprite.y - 24, text, {
        fontSize: '8px',
        backgroundColor: '#fff8efee',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(9600);
    this.tweens.add({
      targets: this.catBubble,
      y: this.catSprite.y - 38,
      alpha: 0,
      duration: 1400,
      onComplete: () => {
        this.catBubble?.destroy();
        this.catBubble = null;
      },
    });
  }

  update(time: number, deltaMs: number): void {
    if (!this.playerSprite) return;
    const dtSec = Math.min(deltaMs, 50) / 1000;
    const worldPx = this.worldSize * 16;

    // Movement input
    let vx = this.joystickVec.vx;
    let vy = this.joystickVec.vy;
    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;
    }

    const mag = Math.hypot(vx, vy);
    const moving = mag > 0.15;
    if (moving) {
      const nx = vx / Math.max(1, mag);
      const ny = vy / Math.max(1, mag);
      this.playerFacing =
        Math.abs(nx) > Math.abs(ny) ? (nx >= 0 ? 'right' : 'left') : ny >= 0 ? 'down' : 'up';
      this.playerSprite.x = Math.max(16, Math.min(worldPx - 16, this.playerSprite.x + nx * 84 * dtSec));
      this.playerSprite.y = Math.max(20, Math.min(worldPx - 16, this.playerSprite.y + ny * 84 * dtSec));
      const walkKey = `${this.playerTexKey}:walk-${this.playerFacing}`;
      if (!this.playerSprite.anims.isPlaying || this.playerSprite.anims.currentAnim?.key !== walkKey) {
        this.playerSprite.play(walkKey, true);
      }
    } else {
      this.playerSprite.stop();
      this.playerSprite.setFrame(getIdleFrameIndex(this.playerFacing));
    }

    this.playerSprite.setDepth(this.playerSprite.y);
    this.playerShadow.setPosition(this.playerSprite.x, this.playerSprite.y - 1).setDepth(this.playerSprite.y - 1);
    this.heldRenderer?.sync(
      this.playerSprite.x,
      this.playerSprite.y,
      this.playerSprite.depth,
      this.playerFacing,
      moving,
      this.hooks.heldItem ?? EMPTY_HELD_ITEM,
      time,
    );

    // Voluntary Cat Companion & Autonomous Behavior
    const now = Date.now();
    let catIntent: PetBehaviorIntent = 'idle';
    let targetX = this.catLoco.x;
    let targetY = this.catLoco.y;

    if (this.catIntentOverride && now < this.catIntentOverride.untilMs) {
      catIntent = this.catIntentOverride.intent;
      if (typeof this.catIntentOverride.x === 'number' && typeof this.catIntentOverride.y === 'number') {
        const dToy = Math.hypot(this.catIntentOverride.x - this.catLoco.x, this.catIntentOverride.y - this.catLoco.y);
        if (dToy > 14) {
          catIntent = 'run';
          targetX = this.catIntentOverride.x;
          targetY = this.catIntentOverride.y;
        }
      }
    } else if (!this.hooks.strayAdopted) {
      catIntent = Math.floor(now / 6000) % 2 === 0 ? 'sleep' : 'idle';
    } else if (this.hooks.petFollowEnabled) {
      const distPlayer = Math.hypot(this.playerSprite.x - this.catLoco.x, this.playerSprite.y - this.catLoco.y);
      if (distPlayer > 220) {
        // Recovery policy if stranded far away
        this.catLoco = { ...this.catLoco, x: this.playerSprite.x - 18, y: this.playerSprite.y + 8 };
      } else if (distPlayer > 44) {
        catIntent = distPlayer > 88 ? 'run' : 'move';
        targetX = this.playerSprite.x - 16;
        targetY = this.playerSprite.y + 6;
      } else {
        catIntent = Math.floor(now / 8000) % 3 === 1 ? 'sniff' : 'sit';
      }
    } else {
      catIntent = Math.floor(now / 10000) % 3 === 2 ? 'sleep' : 'idle';
    }

    this.catLoco = stepPetLocomotion(this.catLoco, {
      intent: catIntent,
      targetX,
      targetY,
      dtSec,
      nowMs: now,
    });
    this.catSprite.setPosition(Math.round(this.catLoco.x), Math.round(this.catLoco.y)).setDepth(Math.round(this.catLoco.y));
    this.catShadow.setPosition(this.catSprite.x, this.catSprite.y).setDepth(this.catSprite.depth - 1);
    const catAnimKey = getLivingCatAnimKey(this.hooks.catVariant, this.hooks.catAccessory, this.catLoco.animState);
    if (this.anims.exists(catAnimKey) && this.catSprite.anims.currentAnim?.key !== catAnimKey) {
      this.catSprite.play(catAnimKey, true);
    }

    // Viewport-culled butterfly & smoke animation
    const view = this.cameras.main.worldView;
    for (const bf of this.butterflies) {
      if (bf.cx < view.x - 32 || bf.cx > view.right + 32 || bf.cy < view.y - 32 || bf.cy > view.bottom + 32) {
        bf.sprite.setVisible(false);
        continue;
      }
      bf.sprite.setVisible(true);
      bf.sprite.setPosition(
        bf.cx + Math.cos(time / 650 + bf.phase) * 14,
        bf.cy + Math.sin(time / 480 + bf.phase) * 7,
      );
    }
    this.smokePuffs.forEach((puff, idx) => {
      const cy = this.landmarks[0]!.tileY * 16 - 46 - ((time / 45 + idx * 10) % 32);
      puff.setPosition(this.landmarks[0]!.tileX * 16 + 14 + Math.sin(time / 500 + idx) * 3, cy);
      puff.setAlpha(Math.max(0.08, 0.6 - (this.landmarks[0]!.tileY * 16 - 46 - cy) / 50));
    });

    // Resolve contextual interactions & emit throttled telemetry
    if (now - this.lastTelemetryAt >= 200) {
      this.lastTelemetryAt = now;
      const tileX = Math.floor(this.playerSprite.x / 16);
      const tileY = Math.floor(this.playerSprite.y / 16);
      const nearest = findNearestLandmark(tileX, tileY, this.landmarks);
      const pondLm = this.landmarks.find((l) => l.id === 'fishing_pond')!;
      const beachLm = this.landmarks.find((l) => l.id === 'beach')!;

      const interactables: InteractableTarget[] = [
        { id: 'cat', kind: 'pet', labelVi: 'Bé mèo', x: this.catSprite.x, y: this.catSprite.y, maxRadiusPx: 38 },
        { id: 'food_bowl', kind: 'food_bowl', labelVi: 'Bát ăn', x: this.foodBowlImg.x, y: this.foodBowlImg.y, maxRadiusPx: 34, empty: this.hooks.foodBowlPortions === 0, full: this.hooks.foodBowlPortions >= 2 },
        { id: 'water_bowl', kind: 'water_bowl', labelVi: 'Bát nước', x: this.waterBowlImg.x, y: this.waterBowlImg.y, maxRadiusPx: 34, empty: this.hooks.waterBowlVolume <= 5, full: this.hooks.waterBowlVolume >= 100 },
        { id: 'water_source', kind: 'water_source', labelVi: 'Nước hồ sạch', x: pondLm.tileX * 16, y: pondLm.tileY * 16, maxRadiusPx: 54 },
      ];

      this.hooks.onContextResolution(
        resolveContextualActions({
          playerX: this.playerSprite.x,
          playerY: this.playerSprite.y,
          facing: this.playerFacing,
          heldItem: this.hooks.heldItem,
          interactables,
        }),
      );

      this.hooks.onTelemetry({
        mapSize: this.worldSize,
        playerTileX: tileX,
        playerTileY: tileY,
        nearestLandmark: nearest.landmark,
        inLandmark: nearest.inside,
        petMode: this.catLoco.animState,
        foodBowlPortions: this.hooks.foodBowlPortions,
        waterBowlVolume: this.hooks.waterBowlVolume,
        avgTravelTimeAcrossSec: estimateWalkTimeSec(this.landmarks[0]!, beachLm),
      });
    }
  }
}
