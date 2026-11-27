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
import {
  createAmbientMotes,
  ensureLightingTextures,
  placeSoftShadow,
  placeSunbeam,
  placeWarmLight,
  updateAmbientMotes,
  type FloatingMote,
} from '../artDemos/demoHelpers';
import { HeldItemRenderer } from '../interaction/HeldItemRenderer';
import { spawnAmbientDonorAnimal } from '../farming/ambientAnimalVisualAdapter';
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

export type SandboxInteriorMode = 'outdoor' | 'indoor';

export interface SandboxTelemetry {
  mapSize: WorldSizeOption;
  interiorMode: SandboxInteriorMode;
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
  onInteriorChange?: (mode: SandboxInteriorMode) => void;
}

export class WorldExpansionScene extends Phaser.Scene {
  private hooks: WorldExpansionSceneHooks;
  private worldSize: WorldSizeOption = 64;
  private interiorMode: SandboxInteriorMode = 'outdoor';
  private landmarks: WorldLandmark[] = [];
  private layerGroup: Phaser.GameObjects.GameObject[] = [];
  private motes: FloatingMote[] = [];
  private moteBounds = { x: 0, y: 0, w: 320, h: 240 };

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

  private doorPoint = { x: 256, y: 228 };
  private portalCooldownUntil = 0;

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

    this.buildCurrentSpace(this.worldSize, this.interiorMode);
    this.scale.on('resize', () => this.applyFollowCamera());
    this.applyFollowCamera();
  }

  updateHooks(next: WorldExpansionSceneHooks): void {
    const rebuildNeeded = next.mapSize !== this.worldSize;
    this.hooks = next;
    if (rebuildNeeded) {
      this.interiorMode = 'outdoor';
      this.buildCurrentSpace(next.mapSize, 'outdoor');
      this.applyFollowCamera();
      this.hooks.onInteriorChange?.('outdoor');
    }
    this.syncCatAppearance();
    this.syncBowls();
    this.syncDayTint();
  }

  getInteriorMode(): SandboxInteriorMode {
    return this.interiorMode;
  }

  toggleInterior(enter?: boolean): void {
    const nextMode: SandboxInteriorMode =
      typeof enter === 'boolean'
        ? enter
          ? 'indoor'
          : 'outdoor'
        : this.interiorMode === 'outdoor'
          ? 'indoor'
          : 'outdoor';
    if (nextMode === this.interiorMode) return;
    this.portalCooldownUntil = Date.now() + 900;
    this.interiorMode = nextMode;
    this.buildCurrentSpace(this.worldSize, nextMode);
    this.applyFollowCamera();
    this.hooks.onInteriorChange?.(nextMode);
  }

  setJoystick(vx: number, vy: number): void {
    this.joystickVec = { vx, vy };
  }

  teleportToLandmark(landmarkId: string): void {
    if (this.interiorMode === 'indoor') {
      this.toggleInterior(false);
    }
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
    const maxW = this.interiorMode === 'indoor' ? 236 : this.worldSize * 16 - 24;
    const maxH = this.interiorMode === 'indoor' ? 172 : this.worldSize * 16 - 24;
    const tx = Math.max(24, Math.min(maxW, this.playerSprite.x + ox));
    const ty = Math.max(36, Math.min(maxH, this.playerSprite.y + oy));
    const img = this.add.image(tx, ty, LIVING_ITEMS_ATLAS_KEY, kind).setDepth(Math.round(ty));
    this.toyMarker = { kind, img, x: tx, y: ty };
    this.triggerCatAction(
      kind === 'cardboard_box' ? 'box_peek' : 'play_pounce',
      4200,
      kind === 'cardboard_box' ? '📦✨' : '🧶!',
      tx,
      ty,
    );
    return { x: tx, y: ty };
  }

  private placeProp(
    frameId: string,
    x: number,
    y: number,
    originX = 0.5,
    originY = 1,
    depth?: number,
    shadowWidth?: number,
  ): Phaser.GameObjects.Image | null {
    const tex = this.textures.exists(WORLD_PROPS_KEY) ? this.textures.get(WORLD_PROPS_KEY) : null;
    if (!tex || !tex.has(frameId)) return null;
    if (shadowWidth) {
      this.layerGroup.push(
        placeSoftShadow(this, x, y - 2, shadowWidth, Math.max(5, Math.round(shadowWidth * 0.3)), Math.round(y) - 6, 0.42),
      );
    }
    const img = this.add.image(Math.round(x), Math.round(y), WORLD_PROPS_KEY, frameId).setOrigin(originX, originY);
    img.setDepth(depth ?? Math.round(y));
    this.layerGroup.push(img);
    return img;
  }

  private clearSpaceObjects(): void {
    for (const o of this.layerGroup) o.destroy();
    this.layerGroup = [];
    for (const m of this.motes) m.sprite.destroy();
    this.motes = [];
    for (const b of this.butterflies) b.sprite.destroy();
    this.butterflies = [];
    for (const s of this.smokePuffs) s.destroy();
    this.smokePuffs = [];
    this.toyMarker?.img.destroy();
    this.toyMarker = null;
  }

  private buildCurrentSpace(size: WorldSizeOption, mode: SandboxInteriorMode): void {
    this.worldSize = size;
    this.clearSpaceObjects();
    this.landmarks = buildExpansionLandmarks(size);

    if (mode === 'indoor') {
      this.buildIndoorSpace();
    } else {
      this.buildOutdoorSpace(size);
    }

    this.syncBowls();
    this.syncDayTint();
  }

  private buildIndoorSpace(): void {
    const worldW = 256;
    const worldH = 192;
    const art = this.textures.get(WORLD_ART_KEY);
    const propsTex = this.textures.get(WORLD_PROPS_KEY);

    this.cameras.main.setBackgroundColor('#a6be77');

    // Scenic Demo E meadow surround framing the cozy interior
    if (propsTex.has(extIds.props.meadow_tile)) {
      for (let y = -160; y < worldH + 160; y += 64) {
        for (let x = -224; x < worldW + 224; x += 64) {
          this.layerGroup.push(
            this.add.image(x, y, WORLD_PROPS_KEY, extIds.props.meadow_tile).setOrigin(0, 0).setDepth(0),
          );
        }
      }
    }
    for (const [bx, by] of [
      [-38, 64],
      [worldW + 42, 64],
      [-30, worldH + 34],
      [worldW + 34, worldH + 34],
    ] as const) {
      if (art.has(artIds.scenery.blossom)) {
        this.layerGroup.push(placeSoftShadow(this, bx, by - 1, 32, 10, by - 10, 0.48));
        this.layerGroup.push(
          this.add.image(bx, by, WORLD_ART_KEY, artIds.scenery.blossom).setOrigin(0.5, 1).setDepth(by),
        );
      }
    }
    this.placeProp(extIds.props.oak_tree, -48, 164, 0.5, 1, 164, 34);
    this.placeProp(extIds.props.apple_tree, worldW + 48, 152, 0.5, 1, 152, 34);

    // Outer cottage walnut shell + front porch mat
    const shell = this.add.graphics().setDepth(0.8);
    shell.fillStyle(0x281e24, 0.85);
    shell.fillRoundedRect(-4, -4, worldW + 8, worldH + 10, 4);
    shell.lineStyle(2, 0x6b4b3e, 1);
    shell.strokeRoundedRect(-2, -2, worldW + 4, worldH + 4, 3);
    this.layerGroup.push(shell);

    const doorPad = this.add.graphics().setDepth(0.9);
    doorPad.fillStyle(0xdfba8a, 1);
    doorPad.fillRoundedRect(102, worldH, 52, 34, 6);
    this.layerGroup.push(doorPad);
    this.placeProp(extIds.props.planter_box, 88, worldH + 10, 0.5, 1, worldH + 10);
    this.placeProp(extIds.props.planter_box, 168, worldH + 10, 0.5, 1, worldH + 10);

    // Demo E herringbone oak background
    if (art.has(artIds.background.home)) {
      this.layerGroup.push(
        this.add.image(0, 0, WORLD_ART_KEY, artIds.background.home).setOrigin(0, 0).setDepth(1),
      );
    }

    // Sunbeams, animated fireplace, warm lights, and full cozy home furniture
    this.layerGroup.push(placeSunbeam(this, 38, 42, 28, 42, 52, 0.08, 2));
    this.layerGroup.push(placeSunbeam(this, 178, 42, 22, 34, 48, 0.08, 2));
    this.placeProp(extIds.props.fireplace_brick, 128, 47, 0.5, 1, 47);
    if (this.anims.exists('olw-fire')) {
      const fire = this.add.sprite(128, 42, WORLD_PROPS_KEY, `${extIds.sheets.fire}:0`).setOrigin(0.5, 1).setScale(0.75).setDepth(48);
      fire.play('olw-fire');
      this.layerGroup.push(fire);
    }
    this.layerGroup.push(placeWarmLight(this, 128, 40, 40, 0xffae52, 0.26, 860));
    this.layerGroup.push(placeWarmLight(this, 86, 22, 24, 0xffe49e, 0.16, 855));
    this.placeProp(extIds.props.photo_frame, 154, 34, 0.5, 1, 40);

    const furnish: Array<{ frame: string; x: number; y: number; depth?: number; shadowW?: number }> = [
      { frame: artIds.furniture.bed_cozy, x: 40, y: 80, shadowW: 32 },
      { frame: artIds.furniture.wardrobe_oak, x: 70, y: 58, shadowW: 26 },
      { frame: artIds.furniture.lamp_floor, x: 88, y: 66, shadowW: 12 },
      { frame: artIds.furniture.rug_peach, x: 108, y: 124, depth: 2 },
      { frame: artIds.furniture.sofa_cream, x: 108, y: 92, shadowW: 32 },
      { frame: artIds.furniture.table_wood, x: 156, y: 112, shadowW: 34 },
      { frame: artIds.furniture.desk_study, x: 184, y: 58, shadowW: 28 },
      { frame: artIds.furniture.plant_monstera, x: 224, y: 60, shadowW: 12 },
    ];
    for (const f of furnish) {
      if (!art.has(f.frame)) continue;
      if (f.shadowW) {
        this.layerGroup.push(placeSoftShadow(this, f.x, f.y - 2, f.shadowW, 7, f.y - 6, 0.38));
      }
      this.layerGroup.push(this.add.image(f.x, f.y, WORLD_ART_KEY, f.frame).setOrigin(0.5, 1).setDepth(f.depth ?? f.y));
    }
    this.layerGroup.push(placeWarmLight(this, 88, 44, 26, 0xffd584, 0.24, 860));
    this.placeProp(extIds.props.study_chair, 176, 68, 0.5, 1, 68);
    this.placeProp(extIds.props.study_chair, 192, 68, 0.5, 1, 68);

    // Kitchen & Living TV perimeter
    this.placeProp(extIds.props.kitchen_fridge, 22, 176, 0.5, 1, 176, 16);
    this.placeProp(extIds.props.kitchen_counter_fruit, 52, 176, 0.5, 1, 176, 26);
    this.placeProp(extIds.props.tv_cinema_unit, 88, 176, 0.5, 1, 176, 28);

    // Pet Corner inside living room
    this.placeProp(extIds.props.rug_coral, 212, 164, 0.5, 0.5, 2);
    this.foodBowlImg = this.add.image(196, 162, LIVING_ITEMS_ATLAS_KEY, 'kibble_bowl_empty').setDepth(162);
    this.waterBowlImg = this.add.image(210, 162, LIVING_ITEMS_ATLAS_KEY, 'water_bowl_empty').setDepth(162);
    this.layerGroup.push(this.foodBowlImg, this.waterBowlImg);

    this.doorPoint = { x: 128, y: 184 };
    this.ensureActorObjects(128, 152, 186, 158);
    this.moteBounds = { x: 24, y: 28, w: 208, h: 140 };
    this.motes = createAmbientMotes(this, this.moteBounds, 'firefly', 10);

    this.dayTintOverlay?.destroy();
    this.dayTintOverlay = this.add.rectangle(-320, -240, 960, 720, 0xff9d5c, 0).setOrigin(0, 0).setDepth(9800);
  }

  private buildOutdoorSpace(size: WorldSizeOption): void {
    const worldPx = size * 16;
    const art = this.textures.get(WORLD_ART_KEY);
    const propsTex = this.textures.get(WORLD_PROPS_KEY);
    this.cameras.main.setBackgroundColor('#a6be77');

    // 1. Tiled Sprout Lands Meadow Texture (eliminates flat green monochrome ground!)
    const baseGrass = this.add.rectangle(0, 0, worldPx, worldPx - 14 * 16, 0xb6c97a).setOrigin(0, 0).setDepth(0);
    const sand = this.add.rectangle(0, (size - 14) * 16, worldPx, 6 * 16, 0xf2d9a2).setOrigin(0, 0).setDepth(0);
    const foam = this.add.rectangle(0, (size - 8) * 16 - 4, worldPx, 6, 0xfaf3df).setOrigin(0, 0).setDepth(1);
    const ocean = this.add.rectangle(0, (size - 8) * 16, worldPx, 8 * 16, 0x6cb8d9).setOrigin(0, 0).setDepth(0);
    this.layerGroup.push(baseGrass, sand, foam, ocean);

    if (propsTex.has(extIds.props.meadow_tile)) {
      for (let y = 0; y < (size - 14) * 16; y += 64) {
        for (let x = 0; x < worldPx; x += 64) {
          this.layerGroup.push(
            this.add.image(x, y, WORLD_PROPS_KEY, extIds.props.meadow_tile).setOrigin(0, 0).setDepth(0.2),
          );
        }
      }
    }

    // Coastal grassy shoreline blend + sparkling coastal tiles
    for (let tx = 0; tx < size; tx += 1) {
      if (propsTex.has(extIds.props.shore_s)) {
        this.layerGroup.push(
          this.add.image(tx * 16, (size - 14) * 16 - 8, WORLD_PROPS_KEY, extIds.props.shore_s).setOrigin(0, 0).setDepth(0.8),
        );
      }
      if (this.anims.exists('olw-water') && tx % 2 === 0) {
        const sea = this.add.sprite(tx * 16 + 8, (size - 7) * 16, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`).setDepth(1.2);
        sea.play('olw-water');
        this.layerGroup.push(sea);
      }
    }

    // Wildflowers & meadow tufts scattered deterministically across the meadow
    for (let ty = 2; ty < size - 15; ty += 2) {
      for (let tx = 2; tx < size - 2; tx += 2) {
        const h = Math.abs((tx * 73856093) ^ (ty * 19349663) ^ 4219);
        if (h % 9 === 0 && propsTex.has(extIds.props.meadow_flora)) {
          this.layerGroup.push(
            this.add.image(tx * 16 + 8, ty * 16 + 8, WORLD_PROPS_KEY, extIds.props.meadow_flora).setDepth(0.6),
          );
        } else if (h % 29 === 0 && propsTex.has(extIds.props.sakura_petals)) {
          this.layerGroup.push(
            this.add.image(tx * 16 + 8, ty * 16 + 8, WORLD_PROPS_KEY, extIds.props.sakura_petals).setDepth(0.6),
          );
        }
      }
    }

    // 2. Organic stepped stepping trails between Cottage and outer landmarks
    const cottageLm = this.landmarks.find((l) => l.id === 'cottage')!;
    const pondLm = this.landmarks.find((l) => l.id === 'fishing_pond')!;
    const beachLm = this.landmarks.find((l) => l.id === 'beach')!;
    const squareLm = this.landmarks.find((l) => l.id === 'square')!;

    const ox = (cottageLm.tileX - 8) * 16;
    const oy = (cottageLm.tileY - 3) * 16;

    const drawOrganicTrail = (x1: number, y1: number, x2: number, y2: number) => {
      const steps = Math.max(4, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 14));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const wob = Math.sin(t * Math.PI * 2) * 10;
        const px = x1 + (x2 - x1) * t + wob * 0.4;
        const py = y1 + (y2 - y1) * t + wob * 0.25;
        this.layerGroup.push(this.add.circle(px, py, 12, 0xc7a379, 0.9).setDepth(0.7));
        this.layerGroup.push(this.add.circle(px, py, 9.5, 0xe0c49a, 1).setDepth(0.75));
      }
    };
    for (const lm of this.landmarks) {
      if (lm.id === 'cottage' || lm.id === 'farm' || lm.id === 'picnic') continue;
      drawOrganicTrail(ox + 136, oy + 120, lm.tileX * 16 + 8, lm.tileY * 16 + 8);
    }

    // 3. Homestead Sample District — 100% Native Demo E `map.garden` + Full Courtyard Props
    if (art.has(artIds.background.garden)) {
      this.layerGroup.push(
        this.add.image(ox, oy, WORLD_ART_KEY, artIds.background.garden).setOrigin(0, 0).setDepth(1),
      );
    }

    // Cottage & Blossom flanking trees matching Demo E
    for (const { frame, x, y, sw } of [
      { frame: artIds.scenery.cottage, x: ox + 8.5 * 16, y: oy + 48, sw: 48 },
      { frame: artIds.scenery.blossom, x: ox + 48, y: oy + 64, sw: 36 },
      { frame: artIds.scenery.blossom, x: ox + 240, y: oy + 64, sw: 36 },
    ]) {
      if (!art.has(frame)) continue;
      this.layerGroup.push(placeSoftShadow(this, x, y - 1, sw, 11, Math.round(y) - 10, 0.48));
      this.layerGroup.push(this.add.image(x, y, WORLD_ART_KEY, frame).setOrigin(0.5, 1).setDepth(Math.round(y)));
    }
    this.layerGroup.push(placeWarmLight(this, ox + 136, oy + 32, 34, 0xffd284, 0.28, 860));

    // Porch planters, mailbox, glowing garden lantern & cozy chimney smoke
    this.placeProp(extIds.props.planter_box, ox + 108, oy + 48, 0.5, 1, oy + 48);
    this.placeProp(extIds.props.planter_box, ox + 164, oy + 48, 0.5, 1, oy + 48);
    this.placeProp(extIds.props.mailbox_red, ox + 184, oy + 52, 0.5, 1, oy + 52, 10);
    if (art.has(artIds.furniture.lantern_garden)) {
      this.layerGroup.push(
        this.add.image(ox + 98, oy + 92, WORLD_ART_KEY, artIds.furniture.lantern_garden).setOrigin(0.5, 1).setDepth(oy + 92),
      );
      this.layerGroup.push(placeWarmLight(this, ox + 98, oy + 72, 28, 0xffd584, 0.28, 860));
    }
    for (let i = 0; i < 4; i += 1) {
      const puff = this.add.circle(ox + 150, oy + 4 - i * 7, 3 + i * 0.5, 0xfff8ef, 0.55).setDepth(9200);
      this.smokePuffs.push(puff);
    }

    // Curved autotile Homestead Pond (`ox + 5..11, oy + 9..11`)
    const px0 = 5;
    const py0 = 9;
    const pw = 7;
    const ph = 3;
    const shoreFrame = (dx: number, dy: number): string | null => {
      if (dx === 0 && dy === 0) return extIds.props.shore_nw;
      if (dx === pw - 1 && dy === 0) return extIds.props.shore_ne;
      if (dx === 0 && dy === ph - 1) return extIds.props.shore_sw;
      if (dx === pw - 1 && dy === ph - 1) return extIds.props.shore_se;
      if (dy === 0) return extIds.props.shore_n;
      if (dy === ph - 1) return extIds.props.shore_s;
      if (dx === 0) return extIds.props.shore_w;
      if (dx === pw - 1) return extIds.props.shore_e;
      return null;
    };
    for (let dy = 0; dy < ph; dy += 1) {
      for (let dx = 0; dx < pw; dx += 1) {
        const wx = ox + (px0 + dx) * 16;
        const wy = oy + (py0 + dy) * 16;
        if (this.anims.exists('olw-water')) {
          const water = this.add.sprite(wx, wy, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`).setOrigin(0, 0).setDepth(2);
          water.play('olw-water');
          this.layerGroup.push(water);
        }
        const shore = shoreFrame(dx, dy);
        if (shore) {
          this.placeProp(shore, wx, wy, 0, 0, 3);
        }
      }
    }
    this.placeProp(extIds.props.bridge_wood, ox + 7.5 * 16, oy + 10.5 * 16, 0.5, 0.5, 4);
    this.placeProp(extIds.props.bridge_wood, ox + 8.5 * 16, oy + 10.5 * 16, 0.5, 0.5, 4);
    this.placeProp(extIds.props.water_lotus, ox + 92, oy + 164, 0.5, 0.5, 5);
    this.placeProp(extIds.props.water_lily, ox + 104, oy + 176, 0.5, 0.5, 5);
    this.placeProp(extIds.props.water_reed_a, ox + 86, oy + 152, 0.5, 1, oy + 152);
    this.placeProp(extIds.props.water_reed_b, ox + 178, oy + 184, 0.5, 1, oy + 184);
    if (this.anims.exists('olw-frog')) {
      const frog = this.add.sprite(ox + 104, oy + 173, WORLD_PROPS_KEY, `${extIds.sheets.frog}:0`).setOrigin(0.5, 0.8).setDepth(oy + 174);
      frog.play('olw-frog');
      this.layerGroup.push(frog);
    }
    const sandboxDuck = spawnAmbientDonorAnimal(this, {
      kind: 'duck',
      x: ox + 168,
      y: oy + 168,
      depth: oy + 170,
      waterMode: true,
      legacyFrame: `${extIds.sheets.duck}:0`,
      legacyAnimKey: 'olw-duck',
    });
    if (sandboxDuck) {
      this.layerGroup.push(sandboxDuck.sprite);
    }

    // Romantic Sakura Picnic Glade & Crop Garden inside Homestead
    this.placeProp(extIds.props.picnic_blanket, ox + 40, oy + 160, 0.5, 0.5, 3);
    this.placeProp(extIds.props.picnic_basket, ox + 26, oy + 150, 0.5, 1, oy + 150);
    this.placeProp(extIds.props.picnic_tart, ox + 40, oy + 158, 0.5, 1, oy + 158);
    this.placeProp(extIds.props.picnic_teacup, ox + 49, oy + 164, 0.5, 1, oy + 164);
    this.placeProp(extIds.props.sakura_bush, ox + 22, oy + 92);
    this.placeProp(extIds.props.sakura_petals, ox + 28, oy + 128, 0.5, 1, 4);
    this.placeProp(extIds.props.sakura_bush, ox + 268, oy + 194);
    this.placeProp(extIds.props.fence_3w, ox + 216, oy + 94, 0.5, 1, oy + 94);
    this.placeProp(extIds.props.fence_1w, ox + 248, oy + 94, 0.5, 1, oy + 94);
    for (const sx of [200, 216, 232, 248]) {
      this.placeProp(extIds.props.sunflower, ox + sx, oy + 110, 0.5, 1, oy + 110);
    }
    this.placeProp(extIds.props.tomato, ox + 200, oy + 128, 0.5, 1, oy + 128);
    this.placeProp(extIds.props.beetroot, ox + 216, oy + 128, 0.5, 1, oy + 128);
    this.placeProp(extIds.props.corn, ox + 232, oy + 128, 0.5, 1, oy + 128);
    this.placeProp(extIds.props.cabbage, ox + 248, oy + 128, 0.5, 1, oy + 128);
    this.placeProp(extIds.props.radish, ox + 216, oy + 146, 0.5, 1, oy + 146);
    this.placeProp(extIds.props.beehive, ox + 266, oy + 138, 0.5, 1, oy + 138, 20);
    const sandboxChicken = spawnAmbientDonorAnimal(this, {
      kind: 'chicken',
      x: ox + 184,
      y: oy + 144,
      depth: oy + 144,
      legacyFrame: `${extIds.sheets.chicken}:0`,
      legacyAnimKey: 'olw-chicken',
    });
    if (sandboxChicken) {
      this.layerGroup.push(placeSoftShadow(this, ox + 184, oy + 143, 11, 4, oy + 135, 0.45));
      this.layerGroup.push(sandboxChicken.sprite);
    }

    // Panorama Countryside Framing beside Homestead (Side Cottage, Windmill, Sheep, Trees)
    this.placeProp(extIds.props.side_cottage, ox - 56, oy + 124, 0.5, 1, oy + 124, 42);
    this.layerGroup.push(placeWarmLight(this, ox - 56, oy + 102, 28, 0xffd284, 0.25, 860));
    this.placeProp(extIds.props.oak_tree, ox + 144, oy - 22, 0.5, 1, oy - 22, 34);
    this.placeProp(extIds.props.peach_tree, ox - 50, oy + 206, 0.5, 1, oy + 206, 30);
    this.placeProp(extIds.props.apple_tree, ox + 324, oy + 208, 0.5, 1, oy + 208, 30);
    if (this.anims.exists('olw-windmill')) {
      const wm = this.add.sprite(ox + 340, oy + 126, WORLD_PROPS_KEY, `${extIds.sheets.windmill}:0`).setOrigin(0.5, 0.85).setDepth(oy + 126);
      wm.play('olw-windmill');
      this.layerGroup.push(wm);
    }
    const sandboxSheep = spawnAmbientDonorAnimal(this, {
      kind: 'sheep',
      x: ox - 52,
      y: oy + 171,
      depth: oy + 171,
      legacyFrame: `${extIds.sheets.sheep}:0`,
      legacyAnimKey: 'olw-sheep',
    });
    if (sandboxSheep) {
      this.layerGroup.push(placeSoftShadow(this, ox - 52, oy + 170, 18, 6, oy + 165, 0.45));
      this.layerGroup.push(sandboxSheep.sprite);
    }

    // Drifting cherry blossom petals in Homestead atmosphere
    this.moteBounds = { x: ox - 24, y: oy - 10, w: 336, h: 240 };
    this.motes = createAmbientMotes(this, this.moteBounds, 'petal', 16);

    // Food & Water bowls cleanly beside sunny porch
    this.foodBowlImg = this.add.image(ox + 158, oy + 76, LIVING_ITEMS_ATLAS_KEY, 'kibble_bowl_empty').setDepth(oy + 76);
    this.waterBowlImg = this.add.image(ox + 174, oy + 76, LIVING_ITEMS_ATLAS_KEY, 'water_bowl_empty').setDepth(oy + 76);
    this.layerGroup.push(this.foodBowlImg, this.waterBowlImg);

    // Outer Pond & Beach Pier + Lush Outer Biome Props
    const opx = pondLm.tileX * 16;
    const opy = pondLm.tileY * 16;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        if (this.anims.exists('olw-water')) {
          const wTile = this.add.sprite(opx + dx * 16, opy + dy * 16, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`).setDepth(2);
          wTile.play('olw-water');
          this.layerGroup.push(wTile);
        }
        const shore =
          dx === -3 && dy === -1
            ? extIds.props.shore_nw
            : dx === 3 && dy === -1
              ? extIds.props.shore_ne
              : dx === -3 && dy === 1
                ? extIds.props.shore_sw
                : dx === 3 && dy === 1
                  ? extIds.props.shore_se
                  : dy === -1
                    ? extIds.props.shore_n
                    : dy === 1
                      ? extIds.props.shore_s
                      : dx === -3
                        ? extIds.props.shore_w
                        : dx === 3
                          ? extIds.props.shore_e
                          : null;
        if (shore) this.placeProp(shore, opx + dx * 16, opy + dy * 16, 0.5, 0.5, 3);
      }
    }
    this.placeProp(extIds.props.bridge_wood, opx - 8, opy, 0.5, 0.5, 4);
    this.placeProp(extIds.props.bridge_wood, opx + 8, opy, 0.5, 0.5, 4);

    // Wooden beach pier built from tiled planks
    for (let py = (size - 13) * 16; py <= (size - 6) * 16; py += 16) {
      this.placeProp(extIds.props.bridge_wood, beachLm.tileX * 16 - 8, py, 0.5, 0.5, 3);
      this.placeProp(extIds.props.bridge_wood, beachLm.tileX * 16 + 8, py, 0.5, 0.5, 3);
    }

    for (const lm of this.landmarks) {
      if (lm.id === 'cottage') continue;
      const lx = lm.tileX * 16;
      const ly = lm.tileY * 16;
      if (lm.biome === 'forest' || lm.biome === 'secret' || lm.biome === 'meadow') {
        for (const [txOff, tyOff, frame] of [
          [-38, -22, artIds.scenery.blossom],
          [38, -18, artIds.scenery.blossom],
        ] as const) {
          if (art.has(frame)) {
            this.layerGroup.push(placeSoftShadow(this, lx + txOff, ly + tyOff - 2, 34, 10, ly + tyOff - 8, 0.44));
            this.layerGroup.push(
              this.add.image(lx + txOff, ly + tyOff, WORLD_ART_KEY, frame).setOrigin(0.5, 1).setDepth(ly + tyOff),
            );
          }
        }
        this.placeProp(extIds.props.oak_tree, lx - 6, ly - 32, 0.5, 1, ly - 32, 34);
        for (let b = 0; b < 3; b += 1) {
          const bf = this.add.rectangle(lx + b * 14 - 14, ly - 10, 3, 2, 0xffe478).setDepth(9100);
          this.butterflies.push({ sprite: bf, cx: lx + b * 14 - 14, cy: ly - 10, phase: b * 2.1 });
        }
      }
      if (lm.id === 'sunset_cliff' || lm.id === 'square') {
        if (art.has(artIds.furniture.bench_garden)) {
          this.layerGroup.push(placeSoftShadow(this, lx, ly - 2, 28, 7, ly - 6, 0.4));
          this.layerGroup.push(
            this.add.image(lx, ly, WORLD_ART_KEY, artIds.furniture.bench_garden).setOrigin(0.5, 1).setDepth(ly),
          );
        }
      }
    }
    this.placeProp(extIds.props.beehive, squareLm.tileX * 16 + 24, squareLm.tileY * 16 - 10, 0.5, 1, squareLm.tileY * 16, 18);

    this.doorPoint = { x: ox + 136, y: oy + 52 };
    this.ensureActorObjects(ox + 122, oy + 76, ox + 144, oy + 74);

    this.dayTintOverlay?.destroy();
    this.dayTintOverlay = this.add.rectangle(0, 0, worldPx, worldPx, 0xff9d5c, 0).setOrigin(0, 0).setDepth(9800);
  }

  private ensureActorObjects(px: number, py: number, cx: number, cy: number): void {
    if (!this.playerSprite) {
      this.playerShadow = this.add.ellipse(px, py - 1, 11, 4.5, 0x22151c, 0.34).setDepth(py - 1);
      this.playerSprite = this.add
        .sprite(px, py, this.playerTexKey, getIdleFrameIndex('down'))
        .setOrigin(0.5, 1)
        .setDepth(py);
      this.heldRenderer = new HeldItemRenderer(this);
    } else {
      this.playerSprite.setPosition(px, py);
    }

    ensureLivingCatSpritesheet(this, this.hooks.catVariant, this.hooks.catAccessory);
    this.catLoco = createLocomotionSnapshot(cx, cy);
    if (!this.catSprite) {
      this.catShadow = this.add.ellipse(cx, cy, 13, 5, 0x22151c, 0.34).setDepth(cy - 1);
      this.catSprite = this.add
        .sprite(cx, cy, getLivingCatTextureKey(this.hooks.catVariant, this.hooks.catAccessory), 0)
        .setOrigin(0.5, 0.85)
        .setDepth(cy);
      this.catSprite.setInteractive({ useHandCursor: true });
      this.catSprite.on('pointerup', () => this.hooks.onPetTap?.());
    } else {
      this.catSprite.setPosition(cx, cy);
    }
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
    const w = this.scale.width || 400;
    const h = this.scale.height || 600;
    if (this.interiorMode === 'indoor') {
      const zoom = Math.min(4, Math.max(2, Math.floor(Math.min(w / 280, h / 220))));
      cam.setZoom(zoom);
      cam.setRoundPixels(true);
      cam.removeBounds();
      cam.centerOn(128, 96);
      cam.stopFollow();
      return;
    }
    const worldPx = this.worldSize * 16;
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
    const maxW = this.interiorMode === 'indoor' ? 236 : this.worldSize * 16 - 16;
    const maxH = this.interiorMode === 'indoor' ? 186 : this.worldSize * 16 - 16;
    const minX = this.interiorMode === 'indoor' ? 20 : 16;
    const minY = this.interiorMode === 'indoor' ? 52 : 20;

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
      this.playerSprite.x = Math.max(minX, Math.min(maxW, this.playerSprite.x + nx * 84 * dtSec));
      this.playerSprite.y = Math.max(minY, Math.min(maxH, this.playerSprite.y + ny * 84 * dtSec));
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

    const now = Date.now();
    // Auto doorway transition if player walks directly into cottage door threshold
    if (
      now >= this.portalCooldownUntil &&
      moving &&
      Math.hypot(this.playerSprite.x - this.doorPoint.x, this.playerSprite.y - this.doorPoint.y) < 11
    ) {
      if (this.interiorMode === 'outdoor' && this.playerFacing === 'up') {
        this.toggleInterior(true);
        return;
      }
      if (this.interiorMode === 'indoor' && this.playerFacing === 'down') {
        this.toggleInterior(false);
        return;
      }
    }

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

    updateAmbientMotes(
      this.motes,
      this.moteBounds,
      dtSec,
      time / 1000,
      this.interiorMode === 'indoor' ? 'firefly' : 'petal',
    );

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
      const cottageLm = this.landmarks[0]!;
      const syBase = (cottageLm.tileY - 3) * 16 + 4;
      const sxBase = (cottageLm.tileX - 8) * 16 + 150;
      const cy = syBase - ((time / 45 + idx * 10) % 32);
      puff.setPosition(sxBase + Math.sin(time / 500 + idx) * 3, cy);
      puff.setAlpha(Math.max(0.08, 0.6 - (syBase - cy) / 50));
    });

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
        {
          id: this.interiorMode === 'indoor' ? 'cottage_exit' : 'cottage_door',
          kind: 'door',
          labelVi: this.interiorMode === 'indoor' ? 'Ra ngoài hiên' : 'Vào trong nhà',
          x: this.doorPoint.x,
          y: this.doorPoint.y,
          maxRadiusPx: 34,
        },
        {
          id: 'water_source',
          kind: 'water_source',
          labelVi: this.interiorMode === 'indoor' ? 'Vòi nước bếp' : 'Nước hồ sạch',
          x: this.interiorMode === 'indoor' ? 52 : pondLm.tileX * 16,
          y: this.interiorMode === 'indoor' ? 176 : pondLm.tileY * 16,
          maxRadiusPx: 54,
        },
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
        interiorMode: this.interiorMode,
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
