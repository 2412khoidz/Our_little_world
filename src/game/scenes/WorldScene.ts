import Phaser from 'phaser';
import { DEFAULT_AVATAR_PARTNER_A } from '../../shared/avatar';
import { getCatalogItem } from '../../shared/catalog';
import { getMapDefinition, TILE_SIZE } from '../../shared/maps';
import {
  buildMovementCollisionGrid,
  findPlacementAtTile,
  validatePlacement,
} from '../../shared/placement';
import {
  MovementTxThrottle,
  RemoteAvatarFilter,
  selectLatestPresenceByUser,
  stepInterpolatedPosition,
} from '../../shared/realtime';
import { getCoupleEmoteSymbol, pickAvailableSharedSlot } from '../../shared/couple/coupleProtocol';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import type {
  AvatarConfig,
  Direction,
  FurniturePlacement,
  MapId,
  MovementPacket,
  PresencePayload,
  WorldMember,
} from '../../shared/types';
import { PetEntity } from '../entities/PetEntity';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { ensurePhaserAvatarTexture } from '../art/phaserAvatarTexture';
import { computeGameplayZoom, computeScenicBounds, fitWorldZoom } from '../art/worldCamera';
import { WORLD_ART_KEY, WORLD_PROPS_KEY, worldFurnitureFrame } from '../art/worldAtlas';
import artIds from '../art/worldArtIds.json';
import extIds from '../art/worldExtendedArtIds.json';
import {
  createAmbientMotes,
  createCompactNameTag,
  ensureLightingTextures,
  placeSoftShadow,
  placeSunbeam,
  placeWarmLight,
  updateAmbientMotes,
  type FloatingMote,
} from '../artDemos/demoHelpers';
import {
  type DecorateStatePayload,
  gameEventBus,
  type NearbyInteractable,
  type WorldSyncPayload,
} from '../eventBus';
import { findTilePath, type GridPoint } from '../systems/pathfinding';
import { EMPTY_HELD_ITEM } from '../../shared/interaction/interactionResolver';
import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import { buildMainGameInteractables } from '../../shared/interaction/mainGameInteractables';
import { HeldItemRenderer } from '../interaction/HeldItemRenderer';
import { isLivingPetLocalSimulationEnabled } from '../../shared/petLiving/mainGame/petLivingDevFlag';
import { PetLivingMainGameDriver } from '../pet/PetLivingMainGameDriver';

interface RemoteAvatarEntity {
  userId: string;
  sessionId: string;
  mapId: MapId;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Container;
  labelText: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  facing: Direction;
  anim: 'idle' | 'walk';
  posture: CouplePostureKind;
  blanket?: Phaser.GameObjects.Rectangle;
  textureKey: string;
  avatarConfig: AvatarConfig;
  nickname: string;
}

export class WorldScene extends Phaser.Scene {
  private currentMapId: MapId = 'home';
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private mapLayers: Phaser.GameObjects.GameObject[] = [];
  private furnitureAccents: Phaser.GameObjects.GameObject[] = [];
  private motes: FloatingMote[] = [];
  private moteBounds = { x: -32, y: 0, w: 352, h: 240 };

  private worldId = 'local-world';
  private localUserId = '';
  private sessionId = '';
  private members: WorldMember[] = [];
  private placements: FurniturePlacement[] = [];
  private blockedGrid: Set<string> = new Set();

  private localSprite!: Phaser.GameObjects.Sprite;
  private localShadow!: Phaser.GameObjects.Ellipse;
  private localLabel!: Phaser.GameObjects.Container;
  private localLabelText!: Phaser.GameObjects.Text;
  private localTextureKey = '';
  private localFacing: Direction = 'down';
  private localPosture: CouplePostureKind = 'none';
  private localBlanket: Phaser.GameObjects.Rectangle | null = null;
  private pathQueue: GridPoint[] = [];
  private tapMarker: Phaser.GameObjects.Graphics | null = null;
  private mailboxBadge: Phaser.GameObjects.Container | null = null;
  private mailboxUnreadCount = 0;

  private remoteEntities = new Map<string, RemoteAvatarEntity>();
  private latestPresences: PresencePayload[] = [];
  private remoteFilter = new RemoteAvatarFilter();
  private txThrottle = new MovementTxThrottle();

  private furnitureSprites = new Map<string, Phaser.GameObjects.Image>();
  private petEntity: PetEntity | null = null;
  private petSnapshot: PetSnapshot | null = null;
  private livingPetDriver: PetLivingMainGameDriver | null = null;
  private petCareMode = false;
  private livingPetSimulationActive = false;
  private studyPetMode = false;

  private decorateGridGraphics!: Phaser.GameObjects.Graphics;
  private decoratePreviewGraphics!: Phaser.GameObjects.Graphics;
  private decorateState: DecorateStatePayload = {
    active: false,
    activeSku: null,
    selectedPlacementId: null,
  };
  private hoverTile: GridPoint | null = null;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };
  private joystickVector = { vx: 0, vy: 0 };

  private lastPortalAtMs = 0;
  private lastInteractKeySent: string | null = null;
  private lastTileEmitKey = '';
  private lastDiagnosticsAtMs = 0;
  private lastLivingPetTelemetryAtMs = 0;
  private lastInteractionFrameAtMs = 0;
  private contextLost = false;
  private paused = false;
  private movementConnection: number | null = null;
  private heldItem: HeldItemState = EMPTY_HELD_ITEM;
  private heldRenderer: HeldItemRenderer | null = null;
  private localMoving = false;

  private unsubscribes: Array<() => void> = [];

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    ensureLightingTextures(this);
    this.decorateGridGraphics = this.add.graphics().setDepth(9000);
    this.decoratePreviewGraphics = this.add.graphics().setDepth(9050);
    this.tapMarker = this.add.graphics().setDepth(4);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
    }

    this.createLocalAvatar();
    this.heldRenderer = new HeldItemRenderer(this);
    this.petEntity = new PetEntity(this, () => {
      gameEventBus.emit('evt:open-pet-panel');
    });
    this.livingPetSimulationActive = isLivingPetLocalSimulationEnabled();
    if (this.livingPetSimulationActive) {
      this.livingPetDriver = new PetLivingMainGameDriver(13.5 * TILE_SIZE, 10.2 * TILE_SIZE);
      this.petEntity.setLivingDriver(this.livingPetDriver);
    }
    this.buildMap(this.currentMapId);
    this.setupPointerInput();
    this.bindEventBus();
    this.bindContextEvents();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.handleResize();
    this.syncCameraDataset();
    gameEventBus.emit('evt:scene-ready', { mapId: this.currentMapId });
  }

  private buildNameTag(x: number, y: number, nickname: string, accentHex: string): {
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Text;
  } {
    const container = createCompactNameTag(this, x, y, nickname, accentHex);
    container.setDepth(9500);
    const text = container.list[1] as Phaser.GameObjects.Text;
    return { container, text };
  }

  private updateTagText(container: Phaser.GameObjects.Container, textObj: Phaser.GameObjects.Text, nextText: string, accentHex: string): void {
    if (textObj.text === nextText) return;
    textObj.setText(nextText);
    const bg = container.list[0] as Phaser.GameObjects.Graphics;
    const w = Math.ceil(textObj.width + 6);
    const h = 9;
    bg.clear();
    bg.fillStyle(0x281e24, 0.72);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 2.5);
    bg.lineStyle(0.75, Phaser.Display.Color.HexStringToColor(accentHex).color, 0.88);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 2.5);
  }

  private createLocalAvatar(): void {
    const me = this.members.find((m) => m.userId === this.localUserId);
    const config = me?.avatarConfig ?? DEFAULT_AVATAR_PARTNER_A;
    const nickname = me?.nickname ?? 'Bạn';
    this.localTextureKey = ensurePhaserAvatarTexture(this, config);

    const def = getMapDefinition(this.currentMapId);
    const startX = (def.defaultSpawn.tileX + 0.5) * TILE_SIZE;
    const startY = (def.defaultSpawn.tileY + 1) * TILE_SIZE;

    this.localShadow = this.add
      .ellipse(startX, startY - 1, 11, 4.5, 0x22151c, 0.34)
      .setDepth(startY - 1);
    this.localSprite = this.add
      .sprite(startX, startY, this.localTextureKey, getIdleFrameIndex(this.localFacing))
      .setOrigin(0.5, 1)
      .setDepth(startY);

    const tag = this.buildNameTag(startX, startY - 25, nickname, '#8bc4d9');
    this.localLabel = tag.container;
    this.localLabelText = tag.text;
  }

  private refreshLocalAvatarAppearance(): void {
    const me = this.members.find((m) => m.userId === this.localUserId);
    if (!me) return;
    this.localTextureKey = ensurePhaserAvatarTexture(this, me.avatarConfig);
    this.localSprite.stop();
    this.localSprite.setTexture(
      this.localTextureKey,
      getIdleFrameIndex(this.localFacing),
    );
    this.updateTagText(this.localLabel, this.localLabelText, me.nickname, '#8bc4d9');
  }

  private buildMap(mapId: MapId, spawnTile?: { tileX: number; tileY: number }): void {
    this.currentMapId = mapId;
    this.clearLocalPosture(true);
    this.pathQueue = [];
    this.tapMarker?.clear();
    this.mailboxBadge?.destroy();
    this.mailboxBadge = null;

    for (const layer of this.mapLayers) {
      layer.destroy();
    }
    this.mapLayers = [];
    for (const mote of this.motes) {
      mote.sprite.destroy();
    }
    this.motes = [];
    this.tilemap?.destroy();
    this.tilemap = null;

    const def = getMapDefinition(mapId);
    const worldW = def.widthTiles * TILE_SIZE;
    const worldH = def.heightTiles * TILE_SIZE;
    this.buildScenicSurround(mapId, worldW, worldH);

    const art = this.textures.exists(WORLD_ART_KEY) ? this.textures.get(WORLD_ART_KEY) : null;
    const background = artIds.background[mapId];
    if (art?.has(background)) {
      this.mapLayers.push(this.add.image(0, 0, WORLD_ART_KEY, background).setOrigin(0, 0).setDepth(1));
      if (mapId === 'home') {
        this.buildHomeDemoEAccents();
      } else if (mapId === 'garden') {
        this.buildGardenDemoEAccents(art);
      }
    } else {
      this.buildStarterMap(mapId);
    }

    this.cameras.main.setBackgroundColor(mapId === 'home' ? '#a6be77' : '#a6be77');

    const spawn = spawnTile ?? def.defaultSpawn;
    const me = this.members.find((m) => m.userId === this.localUserId);
    const partnerOffsetX = !spawnTile && me?.role === 'partner' && !def.isStaticBlocked(spawn.tileX + 1, spawn.tileY) ? 1 : 0;
    const px = (spawn.tileX + partnerOffsetX + 0.5) * TILE_SIZE;
    const py = (spawn.tileY + 0.85) * TILE_SIZE;
    this.localSprite.setPosition(px, py);
    this.localShadow.setPosition(px, py - 1);
    this.localLabel.setPosition(px, py - 25);

    this.rebuildFurnitureAndCollisions();
    this.petEntity?.syncSnapshot(this.petSnapshot, mapId);
    this.reconcileRemoteVisibility();
    this.redrawDecorateOverlay();
    this.handleResize(true);
    this.syncCameraDataset();

    this.lastPortalAtMs = Date.now();
    this.emitCurrentTile(true);
    this.emitLocalMovement('idle');
    gameEventBus.emit('evt:scene-ready', { mapId });
  }

  private placeProp(frameId: string, x: number, y: number, originX = 0.5, originY = 1, depth?: number): Phaser.GameObjects.Image | null {
    const tex = this.textures.exists(WORLD_PROPS_KEY) ? this.textures.get(WORLD_PROPS_KEY) : null;
    if (!tex || !tex.has(frameId)) return null;
    const img = this.add.image(Math.round(x), Math.round(y), WORLD_PROPS_KEY, frameId).setOrigin(originX, originY);
    img.setDepth(depth ?? Math.round(y));
    this.mapLayers.push(img);
    return img;
  }

  private buildScenicSurround(mapId: MapId, worldW: number, worldH: number): void {
    const propsTex = this.textures.exists(WORLD_PROPS_KEY) ? this.textures.get(WORLD_PROPS_KEY) : null;
    if (!propsTex || !propsTex.has(extIds.props.meadow_tile)) return;

    const meadowFill = this.add.graphics().setDepth(-0.5);
    meadowFill.fillStyle(0xb8ca7d, 1);
    meadowFill.fillRect(-320, -256, worldW + 640, worldH + 512);
    this.mapLayers.push(meadowFill);

    const patchFrame = propsTex.get(extIds.props.meadow_tile);
    const patchSize = Math.max(16, patchFrame?.width || 64);
    for (let y = -192; y < worldH + 192; y += patchSize) {
      for (let x = -256; x < worldW + 256; x += patchSize) {
        const tile = this.add.image(x, y, WORLD_PROPS_KEY, extIds.props.meadow_tile).setOrigin(0, 0).setDepth(0);
        this.mapLayers.push(tile);
      }
    }
    const minTx = -14;
    const maxTx = Math.ceil(worldW / 16) + 14;
    const minTy = -12;
    const maxTy = Math.ceil(worldH / 16) + 12;
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        if (tx >= 0 && tx < worldW / 16 && ty >= 0 && ty < worldH / 16) continue;
        const h = Math.abs((tx * 73856093) ^ (ty * 19349663) ^ 4219);
        if (h % 23 === 0 && propsTex.has(extIds.props.meadow_flora)) {
          this.mapLayers.push(
            this.add.image(tx * 16, ty * 16, WORLD_PROPS_KEY, extIds.props.meadow_flora).setOrigin(0, 0).setDepth(0.5),
          );
        }
      }
    }

    const art = this.textures.exists(WORLD_ART_KEY) ? this.textures.get(WORLD_ART_KEY) : null;
    const placeOuterBlossom = (x: number, y: number) => {
      if (art?.has(artIds.scenery.blossom)) {
        this.mapLayers.push(placeSoftShadow(this, x, y - 1, 32, 10, Math.round(y) - 10, 0.48));
        this.mapLayers.push(this.add.image(x, y, WORLD_ART_KEY, artIds.scenery.blossom).setOrigin(0.5, 1).setDepth(Math.round(y)));
      }
    };

    if (mapId === 'home') {
      const shell = this.add.graphics().setDepth(0.8);
      shell.fillStyle(0x281e24, 0.85);
      shell.fillRoundedRect(-4, -4, worldW + 8, worldH + 10, 4);
      shell.lineStyle(2, 0x6b4b3e, 1);
      shell.strokeRoundedRect(-2, -2, worldW + 4, worldH + 4, 3);
      this.mapLayers.push(shell);

      // Front courtyard stoop + porch planters & red mailbox outside doorway
      const doorPad = this.add.graphics().setDepth(0.9);
      doorPad.fillStyle(0xdfba8a, 1);
      doorPad.fillRoundedRect(102, worldH, 52, 42, 6);
      doorPad.lineStyle(1, 0xbd996b, 0.85);
      doorPad.strokeRoundedRect(102, worldH, 52, 42, 6);
      this.mapLayers.push(doorPad);

      this.placeProp(extIds.props.planter_box, 88, worldH + 10, 0.5, 1, worldH + 10);
      this.placeProp(extIds.props.planter_box, 168, worldH + 10, 0.5, 1, worldH + 10);
      this.placeProp(extIds.props.mailbox_red, 162, worldH + 22, 0.5, 1, worldH + 22);

      placeOuterBlossom(-38, 64);
      placeOuterBlossom(worldW + 42, 64);
      placeOuterBlossom(-30, worldH + 34);
      placeOuterBlossom(worldW + 34, worldH + 34);
      this.placeProp(extIds.props.oak_tree, -48, 164);
      this.placeProp(extIds.props.apple_tree, worldW + 48, 152);
      this.placeProp(extIds.props.sakura_bush, 22, worldH + 18, 0.5, 1, worldH + 18);
      this.placeProp(extIds.props.sakura_bush, worldW - 22, worldH + 20, 0.5, 1, worldH + 20);
    } else {
      // Garden panoramic horizon framing outside walkable 288x224
      placeOuterBlossom(-34, 48);
      placeOuterBlossom(worldW + 36, 48);
      placeOuterBlossom(42, -16);
      placeOuterBlossom(240, -16);
      this.placeProp(extIds.props.oak_tree, 144, -20);
      this.placeProp(extIds.props.peach_tree, -52, 210);
      this.placeProp(extIds.props.apple_tree, worldW + 44, 216);
      placeOuterBlossom(worldW + 52, 92);
      this.placeProp(extIds.props.side_cottage, -58, 126);
      this.mapLayers.push(placeWarmLight(this, -58, 104, 28, 0xffd284, 0.28, 860));

      if (this.anims.exists('olw-windmill')) {
        const wm = this.add.sprite(worldW + 64, 134, WORLD_PROPS_KEY, `${extIds.sheets.windmill}:0`).setOrigin(0.5, 0.85).setDepth(134);
        wm.play('olw-windmill');
        this.mapLayers.push(wm);
      }
      if (this.anims.exists('olw-sheep')) {
        this.mapLayers.push(placeSoftShadow(this, -54, 173, 18, 6, 165, 0.45));
        const sheep = this.add.sprite(-54, 174, WORLD_PROPS_KEY, `${extIds.sheets.sheep}:0`).setOrigin(0.5, 0.84).setDepth(174);
        sheep.play('olw-sheep');
        this.mapLayers.push(sheep);
      }
      placeOuterBlossom(54, worldH + 42);
      placeOuterBlossom(236, worldH + 42);
    }
  }

  private buildHomeDemoEAccents(): void {
    // Warm sunlit window shafts
    this.mapLayers.push(placeSunbeam(this, 38, 42, 28, 42, 52, 0.08, 2));
    this.mapLayers.push(placeSunbeam(this, 178, 42, 22, 34, 48, 0.08, 2));

    // Cozy Brick Fireplace on back wall center (`x = 128, y = 47`) + animated flame + glow
    this.placeProp(extIds.props.fireplace_brick, 128, 47, 0.5, 1, 47);
    if (this.anims.exists('olw-fire')) {
      const fire = this.add
        .sprite(128, 42, WORLD_PROPS_KEY, `${extIds.sheets.fire}:0`)
        .setOrigin(0.5, 1)
        .setScale(0.75)
        .setDepth(48);
      fire.play('olw-fire');
      this.mapLayers.push(fire);
    }
    this.mapLayers.push(placeWarmLight(this, 128, 40, 40, 0xffae52, 0.26, 860));

    // Couple Photo Memory Frame mounted beside fireplace (interactive later in V0.1.5)
    this.placeProp(extIds.props.photo_frame, 154, 34, 0.5, 1, 40);

    // Fairy light subtle ambient halo
    this.mapLayers.push(placeWarmLight(this, 86, 22, 24, 0xffe49e, 0.16, 855));

    // Pet Corner bottom-right (`x = 196..232, y = 148..172`): low floor rug + food/water bowls
    this.placeProp(extIds.props.rug_coral, 218, 166, 0.5, 0.5, 2);
    this.placeProp(extIds.props.pet_bowl_food, 198, 162, 0.5, 1, 3);
    this.placeProp(extIds.props.pet_bowl_water, 210, 162, 0.5, 1, 3);

    // Kitchen & Living Cinema perimeter edge accents safely along bottom border wall (`y = 178`)
    this.placeProp(extIds.props.kitchen_fridge, 18, 176, 0.5, 1, 176);
    this.placeProp(extIds.props.kitchen_counter_fruit, 44, 176, 0.5, 1, 176);
    this.placeProp(extIds.props.tv_cinema_unit, 88, 176, 0.5, 1, 176);
  }

  private buildGardenDemoEAccents(art: Phaser.Textures.Texture): void {
    // 1. Pastel Cottage + Sakura trees matching existing static blockers
    const scenery = [
      { frame: artIds.scenery.cottage, x: 8.5 * TILE_SIZE, y: 3 * TILE_SIZE },
      { frame: artIds.scenery.blossom, x: 3 * TILE_SIZE, y: 4 * TILE_SIZE },
      { frame: artIds.scenery.blossom, x: 15 * TILE_SIZE, y: 4 * TILE_SIZE },
    ];
    for (const { frame, x, y } of scenery) {
      if (!art.has(frame)) continue;
      this.mapLayers.push(placeSoftShadow(this, x, y - 1, 40, 11, Math.round(y) - 10, 0.5));
      this.mapLayers.push(this.add.image(x, y, WORLD_ART_KEY, frame).setOrigin(0.5, 1).setDepth(Math.round(y)));
    }
    this.mapLayers.push(placeWarmLight(this, 8.5 * TILE_SIZE, 28, 30, 0xffd284, 0.25, 860));

    // Porch planters & Cozy Lands red mailbox
    this.placeProp(extIds.props.planter_box, 108, 48, 0.5, 1, 48);
    this.placeProp(extIds.props.planter_box, 164, 48, 0.5, 1, 48);
    this.placeProp(extIds.props.mailbox_red, 184, 52, 0.5, 1, 52);
    this.refreshMailboxBadge();

    // 2. Curved Autotile Pond (`tx = 5..11, ty = 9..11`, bridge spans `tx = 7..8`)
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
        const wx = (px0 + dx) * 16;
        const wy = (py0 + dy) * 16;
        if (this.anims.exists('olw-water')) {
          const water = this.add.sprite(wx, wy, WORLD_PROPS_KEY, `${extIds.sheets.water}:0`).setOrigin(0, 0).setDepth(2);
          water.play('olw-water');
          this.mapLayers.push(water);
        }
        const shore = shoreFrame(dx, dy);
        if (shore) {
          this.placeProp(shore, wx, wy, 0, 0, 3);
        }
      }
    }

    // Wooden dual bridge spanning pond cleanly on path `tx = 7..8`
    this.placeProp(extIds.props.bridge_wood, 7.5 * 16, 10.5 * 16, 0.5, 0.5, 4);
    this.placeProp(extIds.props.bridge_wood, 8.5 * 16, 10.5 * 16, 0.5, 0.5, 4);

    // Water lilies, lotus & pond wildlife
    this.placeProp(extIds.props.water_lotus, 92, 164, 0.5, 0.5, 5);
    this.placeProp(extIds.props.water_lily, 104, 176, 0.5, 0.5, 5);
    this.placeProp(extIds.props.water_reed_a, 86, 152, 0.5, 1, 152);
    this.placeProp(extIds.props.water_reed_b, 178, 184, 0.5, 1, 184);
    if (this.anims.exists('olw-frog')) {
      const frog = this.add.sprite(104, 173, WORLD_PROPS_KEY, `${extIds.sheets.frog}:0`).setOrigin(0.5, 0.8).setDepth(174);
      frog.play('olw-frog');
      this.mapLayers.push(frog);
    }
    if (this.anims.exists('olw-duck')) {
      const duck = this.add.sprite(168, 168, WORLD_PROPS_KEY, `${extIds.sheets.duck}:0`).setOrigin(0.5, 0.8).setDepth(170);
      duck.play('olw-duck');
      this.mapLayers.push(duck);
    }

    // 3. Romantic Sakura Picnic Glade (`tx = 1..4, ty = 8..10`)
    this.placeProp(extIds.props.picnic_blanket, 40, 160, 0.5, 0.5, 3);
    this.placeProp(extIds.props.picnic_basket, 26, 150, 0.5, 1, 150);
    this.placeProp(extIds.props.picnic_tart, 40, 158, 0.5, 1, 158);
    this.placeProp(extIds.props.picnic_teacup, 49, 164, 0.5, 1, 164);

    // Sakura bushes & petals framing corners
    this.placeProp(extIds.props.sakura_bush, 22, 92);
    this.placeProp(extIds.props.sakura_petals, 28, 128, 0.5, 1, 4);
    this.placeProp(extIds.props.sakura_bush, 268, 194);
    this.placeProp(extIds.props.sakura_petals, 172, 126, 0.5, 1, 4);

    // 4. Fenced Crop Garden & Beehive (`tx = 12..15, ty = 6..9`)
    this.placeProp(extIds.props.fence_3w, 216, 94, 0.5, 1, 94);
    this.placeProp(extIds.props.fence_1w, 248, 94, 0.5, 1, 94);
    for (const cx of [200, 216, 232, 248]) {
      this.placeProp(extIds.props.sunflower, cx, 110, 0.5, 1, 110);
    }
    this.placeProp(extIds.props.tomato, 200, 128, 0.5, 1, 128);
    this.placeProp(extIds.props.beetroot, 216, 128, 0.5, 1, 128);
    this.placeProp(extIds.props.corn, 232, 128, 0.5, 1, 128);
    this.placeProp(extIds.props.cabbage, 248, 128, 0.5, 1, 128);
    this.placeProp(extIds.props.cabbage, 200, 146, 0.5, 1, 146);
    this.placeProp(extIds.props.radish, 216, 146, 0.5, 1, 146);
    this.placeProp(extIds.props.beetroot, 232, 146, 0.5, 1, 146);
    this.placeProp(extIds.props.tomato, 248, 146, 0.5, 1, 146);

    this.mapLayers.push(placeSoftShadow(this, 266, 137, 20, 6, 128, 0.45));
    this.placeProp(extIds.props.beehive, 266, 138, 0.5, 1, 138);

    if (this.anims.exists('olw-chicken')) {
      this.mapLayers.push(placeSoftShadow(this, 184, 143, 11, 4, 135, 0.45));
      const ch = this.add.sprite(184, 144, WORLD_PROPS_KEY, `${extIds.sheets.chicken}:0`).setOrigin(0.5, 0.85).setDepth(144);
      ch.play('olw-chicken');
      this.mapLayers.push(ch);
    }

    // 5. Drifting cherry blossom petals
    this.moteBounds = { x: -24, y: 0, w: 336, h: 240 };
    this.motes = createAmbientMotes(this, this.moteBounds, 'petal', 14);
  }

  private buildStarterMap(mapId: MapId): void {
    const mapKey = mapId === 'home' ? 'map-home' : 'map-garden';
    const tilemap = this.make.tilemap({ key: mapKey });
    this.tilemap = tilemap;

    const tileset = tilemap.addTilesetImage('tileset-cozy', 'tileset-cozy', 16, 16, 0, 0);
    if (tileset) {
      const ground = tilemap.createLayer('Ground', tileset, 0, 0);
      const walls = tilemap.createLayer('Walls', tileset, 0, 0);
      const decor = tilemap.createLayer('Decor', tileset, 0, 0);
      if (ground) {
        ground.setDepth(0);
        this.mapLayers.push(ground);
      }
      if (walls) {
        walls.setDepth(1);
        this.mapLayers.push(walls);
      }
      if (decor) {
        decor.setDepth(4000);
        this.mapLayers.push(decor);
      }
    }
  }

  private rebuildFurnitureAndCollisions(): void {
    this.blockedGrid = buildMovementCollisionGrid(this.currentMapId, this.placements);
    for (const img of this.furnitureSprites.values()) {
      img.destroy();
    }
    this.furnitureSprites.clear();
    for (const accent of this.furnitureAccents) {
      accent.destroy();
    }
    this.furnitureAccents = [];

    const mapPlacements = this.placements.filter((p) => p.mapId === this.currentMapId);
    for (const placement of mapPlacements) {
      const item = getCatalogItem(placement.sku);
      if (!item) continue;

      const centerX = (placement.tileX + placement.widthTiles / 2) * TILE_SIZE;
      const footY = (placement.tileY + placement.heightTiles) * TILE_SIZE;
      const { key, frame } = worldFurnitureFrame(this, placement.sku);

      if (placement.layerSlot === 'object') {
        this.furnitureAccents.push(
          placeSoftShadow(
            this,
            centerX,
            footY - 2,
            placement.widthTiles * TILE_SIZE * 0.9,
            Math.max(5, placement.heightTiles * 4),
            Math.round(footY) - 6,
            0.42,
          ),
        );
      }

      const img = this.add
        .image(centerX, footY, key, frame)
        .setOrigin(0.5, 1);

      if (placement.layerSlot === 'floor') {
        img.setDepth(2);
      } else {
        img.setDepth(Math.round(footY));
      }

      // Warm lighting glow on standing lamps & garden stone lanterns
      if (placement.sku === 'lamp_floor' || placement.sku === 'lantern_garden') {
        this.furnitureAccents.push(placeWarmLight(this, centerX, footY - 22, 26, 0xffd584, 0.24, 860));
      }
      // Companion study chairs placed crisply below study desk
      if (placement.sku === 'desk_study' && this.textures.exists(WORLD_PROPS_KEY) && this.textures.get(WORLD_PROPS_KEY).has(extIds.props.study_chair)) {
        const chairL = this.add.image(centerX - 8, footY + 10, WORLD_PROPS_KEY, extIds.props.study_chair).setOrigin(0.5, 1).setDepth(Math.round(footY) + 10);
        const chairR = this.add.image(centerX + 8, footY + 10, WORLD_PROPS_KEY, extIds.props.study_chair).setOrigin(0.5, 1).setDepth(Math.round(footY) + 10);
        this.furnitureAccents.push(chairL, chairR);
      }

      this.furnitureSprites.set(placement.id, img);
    }
    this.redrawDecorateOverlay();
  }

  private setupPointerInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.decorateState.active) return;
      const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tileX = Math.floor(worldPt.x / TILE_SIZE);
      const tileY = Math.floor(worldPt.y / TILE_SIZE);
      if (!this.hoverTile || this.hoverTile.tileX !== tileX || this.hoverTile.tileY !== tileY) {
        this.hoverTile = { tileX, tileY };
        this.redrawDecoratePreview();
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || document.hidden) return;
      // Ignore slight drag gestures
      if (pointer.getDistance() > 14) return;

      const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tileX = Math.floor(worldPt.x / TILE_SIZE);
      const tileY = Math.floor(worldPt.y / TILE_SIZE);
      const mapDef = getMapDefinition(this.currentMapId);
      if (tileX < 0 || tileY < 0 || tileX >= mapDef.widthTiles || tileY >= mapDef.heightTiles) {
        return;
      }

      if (this.decorateState.active) {
        this.handleDecorateTap(tileX, tileY);
        return;
      }

      const startTile = {
        tileX: Math.floor(this.localSprite.x / TILE_SIZE),
        tileY: Math.floor((this.localSprite.y - 2) / TILE_SIZE),
      };
      const path = findTilePath(
        startTile,
        { tileX, tileY },
        mapDef.widthTiles,
        mapDef.heightTiles,
        this.blockedGrid,
      );
      if (path.length > 0) {
        this.clearLocalPosture(true);
        this.pathQueue = path;
        const finalTile = path[path.length - 1]!;
        this.drawTapMarker(finalTile.tileX, finalTile.tileY);
      }
    });
  }

  private handleDecorateTap(tileX: number, tileY: number): void {
    this.hoverTile = { tileX, tileY };
    this.redrawDecoratePreview();

    if (this.decorateState.activeSku) {
      gameEventBus.emit('evt:decorate-place', {
        mapId: this.currentMapId,
        sku: this.decorateState.activeSku,
        tileX,
        tileY,
      });
      return;
    }

    if (this.decorateState.selectedPlacementId) {
      const tappedExisting = findPlacementAtTile(
        this.currentMapId,
        tileX,
        tileY,
        this.placements,
      );
      if (tappedExisting && tappedExisting.id !== this.decorateState.selectedPlacementId) {
        gameEventBus.emit('evt:decorate-select', { placementId: tappedExisting.id });
        return;
      }
      if (tappedExisting?.id === this.decorateState.selectedPlacementId) {
        gameEventBus.emit('evt:decorate-select', { placementId: null });
        return;
      }
      gameEventBus.emit('evt:decorate-move', {
        placementId: this.decorateState.selectedPlacementId,
        tileX,
        tileY,
      });
      return;
    }

    const picked = findPlacementAtTile(this.currentMapId, tileX, tileY, this.placements);
    gameEventBus.emit('evt:decorate-select', { placementId: picked?.id ?? null });
  }

  private drawTapMarker(tileX: number, tileY: number): void {
    if (!this.tapMarker) return;
    this.tapMarker.clear();
    this.tapMarker.lineStyle(1, 0xfff8ef, 0.9);
    this.tapMarker.fillStyle(0xe8a848, 0.35);
    this.tapMarker.fillRect(tileX * TILE_SIZE + 2, tileY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    this.tapMarker.strokeRect(tileX * TILE_SIZE + 2, tileY * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  }

  private redrawDecorateOverlay(): void {
    if (!this.decorateGridGraphics) return;
    this.decorateGridGraphics.clear();
    if (!this.decorateState.active) {
      this.decoratePreviewGraphics.clear();
      return;
    }

    const def = getMapDefinition(this.currentMapId);
    this.decorateGridGraphics.lineStyle(1, 0xfff8ef, 0.25);
    for (let x = 0; x <= def.widthTiles; x += 1) {
      this.decorateGridGraphics.lineBetween(
        x * TILE_SIZE,
        0,
        x * TILE_SIZE,
        def.heightTiles * TILE_SIZE,
      );
    }
    for (let y = 0; y <= def.heightTiles; y += 1) {
      this.decorateGridGraphics.lineBetween(
        0,
        y * TILE_SIZE,
        def.widthTiles * TILE_SIZE,
        y * TILE_SIZE,
      );
    }
    this.redrawDecoratePreview();
  }

  private redrawDecoratePreview(): void {
    if (!this.decoratePreviewGraphics) return;
    this.decoratePreviewGraphics.clear();
    if (!this.decorateState.active) return;

    if (this.decorateState.selectedPlacementId) {
      const selected = this.placements.find(
        (p) => p.id === this.decorateState.selectedPlacementId && p.mapId === this.currentMapId,
      );
      if (selected) {
        this.decoratePreviewGraphics.lineStyle(2, 0xf4c158, 1);
        this.decoratePreviewGraphics.strokeRect(
          selected.tileX * TILE_SIZE,
          selected.tileY * TILE_SIZE,
          selected.widthTiles * TILE_SIZE,
          selected.heightTiles * TILE_SIZE,
        );
      }
    }

    if (!this.hoverTile) return;
    let previewSku = this.decorateState.activeSku;
    let ignoreId: string | undefined;

    if (!previewSku && this.decorateState.selectedPlacementId) {
      const selected = this.placements.find((p) => p.id === this.decorateState.selectedPlacementId);
      if (selected) {
        previewSku = selected.sku;
        ignoreId = selected.id;
      }
    }
    if (!previewSku) return;

    const item = getCatalogItem(previewSku);
    if (!item) return;

    const check = validatePlacement({
      mapId: this.currentMapId,
      sku: previewSku,
      tileX: this.hoverTile.tileX,
      tileY: this.hoverTile.tileY,
      placements: this.placements,
      ignorePlacementId: ignoreId,
    });

    const color = check.ok ? 0x6b9b76 : 0xe05b5b;
    this.decoratePreviewGraphics.fillStyle(color, 0.35);
    this.decoratePreviewGraphics.lineStyle(1.5, color, 0.95);
    this.decoratePreviewGraphics.fillRect(
      this.hoverTile.tileX * TILE_SIZE,
      this.hoverTile.tileY * TILE_SIZE,
      item.widthTiles * TILE_SIZE,
      item.heightTiles * TILE_SIZE,
    );
    this.decoratePreviewGraphics.strokeRect(
      this.hoverTile.tileX * TILE_SIZE,
      this.hoverTile.tileY * TILE_SIZE,
      item.widthTiles * TILE_SIZE,
      item.heightTiles * TILE_SIZE,
    );
  }

  private bindEventBus(): void {
    this.unsubscribes.push(
      gameEventBus.on('cmd:sync-world', (payload: WorldSyncPayload) => {
        this.worldId = payload.worldId;
        this.localUserId = payload.localUserId;
        this.sessionId = payload.sessionId;
        this.members = payload.members;
        this.placements = payload.placements;
        this.refreshLocalAvatarAppearance();
        this.rebuildFurnitureAndCollisions();
        this.syncRemoteAppearancesFromMembers();
      }),

      gameEventBus.on('cmd:set-map', ({ mapId, spawnTile }) => {
        if (mapId !== this.currentMapId) {
          this.buildMap(mapId, spawnTile);
        }
      }),

      gameEventBus.on('cmd:remote-presence', (presences) => {
        const activeSessions = new Set(presences.map((presence) => presence.sessionId));
        for (const previous of this.latestPresences) {
          if (!activeSessions.has(previous.sessionId)) this.remoteFilter.removeSession(previous.sessionId);
        }
        this.latestPresences = presences;
        this.reconcileRemotePresences(presences);
      }),

      gameEventBus.on('cmd:set-movement-connection', (connection) => {
        if (this.movementConnection === connection) return;
        this.movementConnection = connection;
        if (connection !== null) {
          this.txThrottle.reset();
          this.emitLocalMovement('idle');
        }
      }),

      gameEventBus.on('cmd:remote-movement', (packet) => {
        const accepted = this.remoteFilter.ingest(
          packet,
          this.localUserId,
          this.worldId,
          Date.now(),
        );
        if (!accepted) return;
        this.applyRemoteMovementPacket(accepted);
      }),

      gameEventBus.on('cmd:set-decorate', (state) => {
        const modeChanged = state.active !== this.decorateState.active;
        this.decorateState = state;
        if (!state.active) {
          this.hoverTile = null;
        } else {
          this.pathQueue = [];
          this.tapMarker?.clear();
        }
        this.redrawDecorateOverlay();
        if (modeChanged) {
          this.handleResize(true);
        }
      }),

      gameEventBus.on('cmd:set-joystick', (vec) => {
        this.joystickVector = vec;
      }),

      gameEventBus.on('cmd:trigger-interact', () => {
        this.triggerNearbyInteraction();
      }),

      gameEventBus.on('cmd:sync-held-item', (held) => {
        this.heldItem = held;
      }),

      gameEventBus.on('cmd:set-paused', ({ paused }) => {
        this.paused = paused;
        if (paused) {
          this.emitLocalMovement('idle');
          this.scene.pause();
        } else {
          this.scene.resume();
        }
      }),

      gameEventBus.on('cmd:sync-pet', (pet) => {
        this.petSnapshot = pet;
        this.petEntity?.syncSnapshot(pet, this.currentMapId);
      }),

      gameEventBus.on('cmd:pet-reaction', ({ action }) => {
        this.petEntity?.triggerReaction(action);
      }),

      gameEventBus.on('cmd:set-study-pet-mode', ({ active }) => {
        this.studyPetMode = active;
        this.petEntity?.setStudyMode(active);
      }),

      gameEventBus.on('cmd:pet-local-food-offer', (offer) => {
        this.livingPetDriver?.setFoodOffer(offer);
        this.petEntity?.triggerReaction('feed');
      }),

      gameEventBus.on('cmd:pet-care-mode', ({ active }) => {
        this.setPetCareMode(active);
      }),

      gameEventBus.on('cmd:pet-care-stroke', ({ zone }) => {
        if (this.petCareMode) this.petEntity?.triggerCareStroke(zone);
      }),

      gameEventBus.on('cmd:seat-at-desk', ({ seat }) => {
        if (!seat || this.currentMapId !== 'home') {
          this.clearLocalPosture(false);
          return;
        }
        const desk = this.placements.find((p) => p.mapId === 'home' && p.sku === 'desk_study');
        if (!desk) return;
        this.pathQueue = [];
        this.tapMarker?.clear();
        const seatX = (desk.tileX + (seat === 'left' ? 0.5 : 1.5)) * TILE_SIZE;
        const seatY = (desk.tileY + desk.heightTiles + 0.65) * TILE_SIZE;
        this.localSprite.setPosition(seatX, seatY);
        this.localFacing = 'up';
        this.localPosture = 'sit_study';
        this.playLocalMoveAnim(false);
        this.emitCurrentTile(true);
        this.emitLocalMovement('idle', true);
      }),

      gameEventBus.on('cmd:apply-local-posture', ({ posture, x, y, facing }) => {
        if (posture === 'none') {
          this.clearLocalPosture(false);
          return;
        }
        this.pathQueue = [];
        this.tapMarker?.clear();
        if (typeof x === 'number' && typeof y === 'number') {
          this.localSprite.setPosition(x, y);
        }
        if (facing) {
          this.localFacing = facing;
        }
        this.localPosture = posture;
        this.playLocalMoveAnim(false);
        this.emitCurrentTile(true);
        this.emitLocalMovement('idle', true);
      }),

      gameEventBus.on('cmd:cancel-local-posture', () => {
        this.clearLocalPosture(true);
        this.playLocalMoveAnim(false);
      }),

      gameEventBus.on('cmd:sync-remote-posture', ({ userId, mapId, posture, x, y, facing }) => {
        const entity = this.remoteEntities.get(userId);
        if (!entity) return;
        entity.mapId = mapId;
        entity.posture = posture;
        if (posture !== 'none') {
          entity.targetX = x;
          entity.targetY = y;
          entity.facing = facing;
          entity.sprite.setPosition(x, y);
        }
        this.syncRemoteBlanket(entity);
        this.reconcileRemoteVisibility();
      }),

      gameEventBus.on('cmd:spawn-emote', ({ userId, mapId, emote, local }) => {
        if (mapId !== this.currentMapId) return;
        const symbol = emote === 'hug_hearts' ? '💕' : getCoupleEmoteSymbol(emote);
        if (local || userId === this.localUserId) {
          this.spawnEmoteBubble(this.localSprite.x, this.localSprite.y - 30, symbol);
          return;
        }
        const remote = this.remoteEntities.get(userId);
        if (remote && remote.mapId === this.currentMapId) {
          this.spawnEmoteBubble(remote.sprite.x, remote.sprite.y - 30, symbol);
        }
      }),

      gameEventBus.on('cmd:sync-mailbox-unread', ({ unreadCount }) => {
        this.mailboxUnreadCount = Math.max(0, unreadCount);
        this.refreshMailboxBadge();
      }),
    );
  }

  private setPetCareMode(active: boolean): void {
    if (this.petCareMode === active) return;
    this.petCareMode = active;
    this.petEntity?.setCareCloseUp(active);
    const cam = this.cameras.main;
    if (active && this.petEntity) {
      this.pathQueue = [];
      const pos = this.petEntity.getWorldPosition();
      cam.pan(pos.x, pos.y - 6, 280, 'Power2');
      cam.zoomTo(Math.min(2.2, cam.zoom * 1.42), 280, 'Power2');
    } else {
      this.handleResize(true);
    }
    gameEventBus.emit('evt:pet-care-mode', { active });
  }

  private bindContextEvents(): void {
    const canvas = this.game.canvas;
    const onLost = (e: Event) => {
      e.preventDefault();
      this.contextLost = true;
    };
    const onRestored = () => {
      this.contextLost = false;
    };
    const onVisibility = () => {
      if (document.hidden) this.emitLocalMovement('idle');
    };
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    this.unsubscribes.push(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    });
  }

  private handleResize(snapFollow = false): void {
    const cam = this.cameras.main;
    if (!cam) return;
    const def = getMapDefinition(this.currentMapId);
    const width = this.scale.width || 400;
    const height = this.scale.height || 600;
    const worldW = def.widthTiles * TILE_SIZE;
    const worldH = def.heightTiles * TILE_SIZE;

    cam.setRoundPixels(true);
    if (this.decorateState.active) {
      cam.stopFollow();
      cam.removeBounds();
      cam.setZoom(fitWorldZoom(width, height, worldW, worldH));
      cam.centerOn(worldW / 2, worldH / 2);
    } else {
      const zoom = computeGameplayZoom(width, height, worldW, worldH);
      cam.setZoom(zoom);
      const scenic = computeScenicBounds(width, height, zoom, worldW, worldH, 96, 68);
      cam.setBounds(scenic.x, scenic.y, scenic.width, scenic.height);
      const fitsEntireMapHorizontally = width / zoom >= worldW;
      const fitsEntireMapVertically = height / zoom >= worldH;
      if (fitsEntireMapHorizontally && fitsEntireMapVertically) {
        cam.stopFollow();
        cam.centerOn(worldW / 2, worldH / 2);
      } else {
        cam.startFollow(this.localSprite, true, snapFollow ? 1 : 0.14, snapFollow ? 1 : 0.14);
        if (snapFollow) {
          cam.centerOn(this.localSprite.x, this.localSprite.y);
        }
      }
    }
    this.syncCameraDataset();
  }

  private syncCameraDataset(): void {
    const cam = this.cameras.main;
    const canvas = this.game?.canvas;
    if (!cam || !canvas) return;
    cam.preRender();
    canvas.dataset.mapId = this.currentMapId;
    canvas.dataset.camZoom = String(Math.round(cam.zoom * 1000) / 1000);
    canvas.dataset.camViewX = String(Math.round(cam.worldView.x * 100) / 100);
    canvas.dataset.camViewY = String(Math.round(cam.worldView.y * 100) / 100);
    canvas.dataset.camWidth = String(cam.width);
    canvas.dataset.camHeight = String(cam.height);
    if (this.localSprite) {
      canvas.dataset.playerTileX = String(Math.floor(this.localSprite.x / TILE_SIZE));
      canvas.dataset.playerTileY = String(Math.floor((this.localSprite.y - 2) / TILE_SIZE));
    }
  }

  update(time: number, deltaMs: number): void {
    if (this.paused || document.hidden) return;

    const dtSec = Math.min(deltaMs, 50) / 1000;
    const now = Date.now();
    if (this.motes.length > 0) {
      updateAmbientMotes(this.motes, this.moteBounds, dtSec, time / 1000, 'petal');
    }

    const moved = this.updateLocalMovement(dtSec);
    this.localMoving = moved;
    if (
      !this.petCareMode &&
      this.livingPetDriver &&
      this.petEntity &&
      this.petSnapshot &&
      this.currentMapId === 'home'
    ) {
      const memberIds = this.members.map((m) => m.userId);
      const caregiverPair: [string, string] = [
        memberIds[0] ?? 'partner-a',
        memberIds[1] ?? 'partner-b',
      ];
      const out = this.livingPetDriver.update({
        mapId: this.currentMapId,
        placements: this.placements,
        nowMs: now,
        dtMs: deltaMs,
        isStudying: this.studyPetMode,
        partnersSittingSofa: this.localPosture === 'sit_sofa',
        localPlayerX: this.localSprite?.x ?? null,
        localPlayerY: this.localSprite?.y ?? null,
        caregiverIds: caregiverPair,
        foodOffer: null,
      });
      this.petEntity.applyLivingLocomotion(out.loco, out.ambientBubble);
      if (import.meta.env.DEV && now - this.lastLivingPetTelemetryAtMs >= 500) {
        this.lastLivingPetTelemetryAtMs = now;
        gameEventBus.emit(
          'evt:living-pet-dev-telemetry',
          this.livingPetDriver.getDevTelemetry(
            this.currentMapId,
            this.petEntity.isOnMapVisible(),
            now,
          ),
        );
      }
    } else {
      this.petEntity?.update(dtSec);
    }
    this.updateRemoteEntities(deltaMs);
    this.checkPortalsAndNearbyInteractable();
    this.syncHeldItemPresentation(time);
    this.emitInteractionFrameIfDue(now);
    this.syncCameraDataset();
    this.emitLocalMovement(moved ? 'walk' : 'idle');

    if (now - this.lastDiagnosticsAtMs >= 500) {
      this.lastDiagnosticsAtMs = now;
      gameEventBus.emit('evt:diagnostics', {
        fps: Math.round(this.game.loop.actualFps),
        renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
        contextLost: this.contextLost,
        zoom: Math.round(this.cameras.main.zoom * 100) / 100,
        mapId: this.currentMapId,
      });
    }
  }

  private updateLocalMovement(dtSec: number): boolean {
    if (this.decorateState.active) {
      this.localSprite.stop();
      this.localSprite.setFrame(getIdleFrameIndex(this.localFacing));
      return false;
    }

    let vx = this.joystickVector.vx;
    let vy = this.joystickVector.vy;

    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

      if (
        Phaser.Input.Keyboard.JustDown(this.wasd.E) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.SPACE)
      ) {
        this.triggerNearbyInteraction();
      }
    }

    const speed = 78;
    const manualMag = Math.hypot(vx, vy);

    if (manualMag > 0.15) {
      this.clearLocalPosture(true);
      this.pathQueue = [];
      this.tapMarker?.clear();

      const nx = vx / Math.max(1, manualMag);
      const ny = vy / Math.max(1, manualMag);
      const stepX = nx * speed * dtSec;
      const stepY = ny * speed * dtSec;

      this.localFacing = this.vectorToDirection(nx, ny);
      const moved = this.tryMovePixel(stepX, stepY);
      this.playLocalMoveAnim(moved);
      this.emitCurrentTile(false);
      return moved;
    }

    if (this.pathQueue.length > 0) {
      const target = this.pathQueue[0]!;
      const tx = (target.tileX + 0.5) * TILE_SIZE;
      const ty = (target.tileY + 0.85) * TILE_SIZE;
      const dx = tx - this.localSprite.x;
      const dy = ty - this.localSprite.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 2) {
        this.localSprite.setPosition(tx, ty);
        this.pathQueue.shift();
        if (this.pathQueue.length === 0) {
          this.tapMarker?.clear();
          this.playLocalMoveAnim(false);
          this.emitCurrentTile(false);
          return false;
        }
      } else {
        const step = Math.min(speed * dtSec, dist);
        const mx = (dx / dist) * step;
        const my = (dy / dist) * step;
        this.localSprite.x += mx;
        this.localSprite.y += my;
        this.localFacing = this.vectorToDirection(dx, dy);
        this.playLocalMoveAnim(true);
        this.emitCurrentTile(false);
        return true;
      }
    }

    this.playLocalMoveAnim(false);
    return false;
  }

  private tryMovePixel(dx: number, dy: number): boolean {
    let moved = false;
    const nextX = this.localSprite.x + dx;
    if (this.canStandAtPixel(nextX, this.localSprite.y)) {
      this.localSprite.x = nextX;
      moved = true;
    }
    const nextY = this.localSprite.y + dy;
    if (this.canStandAtPixel(this.localSprite.x, nextY)) {
      this.localSprite.y = nextY;
      moved = true;
    }
    return moved;
  }

  private canStandAtPixel(px: number, py: number): boolean {
    const def = getMapDefinition(this.currentMapId);
    const halfW = 4;
    const corners = [
      { x: px - halfW, y: py - 5 },
      { x: px + halfW, y: py - 5 },
      { x: px - halfW, y: py - 1 },
      { x: px + halfW, y: py - 1 },
    ];
    for (const c of corners) {
      const tx = Math.floor(c.x / TILE_SIZE);
      const ty = Math.floor(c.y / TILE_SIZE);
      if (tx < 0 || ty < 0 || tx >= def.widthTiles || ty >= def.heightTiles) {
        return false;
      }
      if (this.blockedGrid.has(`${tx},${ty}`)) {
        return false;
      }
    }
    return true;
  }

  private playLocalMoveAnim(moving: boolean): void {
    this.localShadow.setPosition(this.localSprite.x, this.localSprite.y - 1);
    this.localSprite.setDepth(this.localSprite.y);
    this.localShadow.setDepth(this.localSprite.y - 1);
    this.localLabel.setPosition(this.localSprite.x, this.localSprite.y - 25);

    if (moving) {
      if (this.localBlanket) this.localBlanket.setVisible(false);
      const animKey = `${this.localTextureKey}:walk-${this.localFacing}`;
      if (!this.localSprite.anims.isPlaying || this.localSprite.anims.currentAnim?.key !== animKey) {
        this.localSprite.play(animKey, true);
      }
    } else if (
      this.localPosture === 'sit_study' ||
      this.localPosture === 'sit_sofa' ||
      this.localPosture === 'sit_bench'
    ) {
      if (this.localBlanket) this.localBlanket.setVisible(false);
      const sitAnim = `${this.localTextureKey}:sit-${this.localFacing}`;
      if (this.anims.exists(sitAnim)) {
        if (!this.localSprite.anims.isPlaying || this.localSprite.anims.currentAnim?.key !== sitAnim) {
          this.localSprite.play(sitAnim, true);
        }
      } else {
        this.localSprite.stop();
        this.localSprite.setFrame(getIdleFrameIndex(this.localFacing));
      }
    } else if (this.localPosture === 'lie_bed') {
      this.localSprite.stop();
      this.localSprite.setFrame(getIdleFrameIndex('down'));
      if (!this.localBlanket) {
        this.localBlanket = this.add
          .rectangle(this.localSprite.x, this.localSprite.y - 4, 13, 8, 0xf2b7c6, 0.94)
          .setStrokeStyle(0.75, 0xfff8ef, 0.9);
      }
      this.localBlanket
        .setPosition(this.localSprite.x, this.localSprite.y - 4)
        .setDepth(this.localSprite.y + 2)
        .setVisible(true);
    } else {
      if (this.localBlanket) this.localBlanket.setVisible(false);
      this.localSprite.stop();
      this.localSprite.setFrame(getIdleFrameIndex(this.localFacing));
    }
  }

  private vectorToDirection(dx: number, dy: number): Direction {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0 ? 'right' : 'left';
    }
    return dy >= 0 ? 'down' : 'up';
  }

  private findNearbyInteractable(): NearbyInteractable | null {
    const tileX = (this.localSprite.x - 8) / TILE_SIZE;
    const tileY = (this.localSprite.y - 8) / TILE_SIZE;
    const def = getMapDefinition(this.currentMapId);

    for (const portal of def.portals) {
      const dist = Math.hypot(tileX - portal.tileX, tileY - portal.tileY);
      if (dist <= portal.radiusTiles) {
        return { kind: 'portal', labelVi: portal.labelVi };
      }
    }

    if (this.currentMapId === 'home' && this.petEntity?.isNearbyTile(tileX, tileY)) {
      return {
        kind: 'pet',
        labelVi: this.petSnapshot ? `Chăm ${this.petSnapshot.name}` : 'Nhận nuôi bé mèo',
      };
    }

    if (this.currentMapId === 'home') {
      const frameDist = Math.hypot(tileX - 9.1, tileY - 2.2);
      if (frameDist <= 1.85) {
        return { kind: 'photo_frame', labelVi: 'Xem khung ảnh kỷ niệm' };
      }
    }

    if (this.currentMapId === 'garden') {
      const mailboxDist = Math.hypot(tileX - 11.0, tileY - 2.75);
      if (mailboxDist <= 1.85) {
        return {
          kind: 'mailbox',
          labelVi: this.mailboxUnreadCount > 0
            ? `Hộp thư (${this.mailboxUnreadCount} thư mới)`
            : 'Mở hộp thư kỷ niệm',
        };
      }
    }

    for (const p of this.placements) {
      if (p.mapId !== this.currentMapId) continue;
      const item = getCatalogItem(p.sku);
      if (!item) continue;
      const cx = p.tileX + (p.widthTiles - 1) / 2;
      const cy = p.tileY + (p.heightTiles - 1) / 2;
      if (Math.hypot(tileX - cx, tileY - cy) <= 1.85) {
        if (item.interactTag === 'wardrobe') {
          return { kind: 'wardrobe', labelVi: 'Thay trang phục' };
        }
        if (item.interactTag === 'study_preview') {
          return { kind: 'study_room', labelVi: 'Ngồi vào bàn học' };
        }
        if (p.sku === 'sofa_cream') {
          return { kind: 'sofa_sit', labelVi: 'Ngồi sofa cùng nhau' };
        }
        if (p.sku === 'bench_garden') {
          return { kind: 'bench_sit', labelVi: 'Ngồi ghế vườn' };
        }
        if (p.sku === 'bed_cozy') {
          return { kind: 'bed_lie', labelVi: 'Nằm nghỉ cùng nhau' };
        }
        if (item.interactTag === 'cinema_preview') {
          return { kind: 'cinema_preview', labelVi: 'Sofa Rạp phim (V0.4)' };
        }
      }
    }

    return null;
  }

  private checkPortalsAndNearbyInteractable(): void {
    const now = Date.now();
    const def = getMapDefinition(this.currentMapId);
    const tileX = Math.floor(this.localSprite.x / TILE_SIZE);
    const tileY = Math.floor((this.localSprite.y - 2) / TILE_SIZE);

    if (now - this.lastPortalAtMs > 1200) {
      for (const portal of def.portals) {
        if (tileX === portal.tileX && tileY === portal.tileY) {
          this.lastPortalAtMs = now;
          gameEventBus.emit('evt:request-map-change', {
            targetMapId: portal.targetMapId,
            spawnX: portal.targetSpawnX,
            spawnY: portal.targetSpawnY,
          });
          return;
        }
      }
    }

    const near = this.findNearbyInteractable();
    const nextKey = near ? `${near.kind}:${near.labelVi}` : null;
    if (nextKey !== this.lastInteractKeySent) {
      this.lastInteractKeySent = nextKey;
      gameEventBus.emit('evt:nearby-interactable', near);
    }
  }

  private triggerNearbyInteraction(): void {
    const near = this.findNearbyInteractable();
    if (!near) return;

    if (near.kind === 'portal') {
      const def = getMapDefinition(this.currentMapId);
      const portal = def.portals[0];
      if (portal) {
        gameEventBus.emit('evt:request-map-change', {
          targetMapId: portal.targetMapId,
          spawnX: portal.targetSpawnX,
          spawnY: portal.targetSpawnY,
        });
      }
    } else if (near.kind === 'wardrobe') {
      gameEventBus.emit('evt:open-avatar-customizer');
    } else if (near.kind === 'pet') {
      gameEventBus.emit('evt:open-pet-panel');
    } else if (near.kind === 'study_room') {
      gameEventBus.emit('evt:open-study-panel');
    } else if (near.kind === 'photo_frame') {
      gameEventBus.emit('evt:open-photo-frame');
    } else if (near.kind === 'mailbox') {
      gameEventBus.emit('evt:open-mailbox');
    } else if (
      near.kind === 'sofa_sit' ||
      near.kind === 'bench_sit' ||
      near.kind === 'bed_lie'
    ) {
      this.enterSharedPosture(near.kind);
    } else if (near.kind === 'cinema_preview') {
      gameEventBus.emit('evt:preview-notice', {
        title: 'Góc rạp phim tại nhà',
        version: 'V0.4 — Our Little Cinema',
        body: 'Trình phát phim đồng bộ qua Jellyfin/Tailscale đang được thử nghiệm riêng trong Menu → Spike 0 Lab và sẽ tích hợp vào sofa ở V0.4.',
      });
    }
  }

  private clearLocalPosture(emit: boolean): void {
    const hadPosture = this.localPosture !== 'none';
    this.localPosture = 'none';
    if (this.localBlanket) {
      this.localBlanket.setVisible(false);
    }
    if (emit && hadPosture) {
      gameEventBus.emit('evt:local-posture-changed', {
        posture: 'none',
        slotIndex: 0,
        x: this.localSprite.x,
        y: this.localSprite.y,
        facing: this.localFacing,
        mapId: this.currentMapId,
      });
    }
  }

  private enterSharedPosture(kind: 'sofa_sit' | 'bench_sit' | 'bed_lie'): void {
    const targetSku =
      kind === 'sofa_sit' ? 'sofa_cream' : kind === 'bench_sit' ? 'bench_garden' : 'bed_cozy';
    const targetPosture: CouplePostureKind =
      kind === 'sofa_sit' ? 'sit_sofa' : kind === 'bench_sit' ? 'sit_bench' : 'lie_bed';
    const item = this.placements.find(
      (p) => p.mapId === this.currentMapId && p.sku === targetSku,
    );
    if (!item) return;

    const centerX = (item.tileX + item.widthTiles / 2) * TILE_SIZE;
    const footY = (item.tileY + item.heightTiles) * TILE_SIZE;
    const slot0 =
      kind === 'bed_lie'
        ? { x: centerX - 6, y: (item.tileY + 1.35) * TILE_SIZE }
        : kind === 'bench_sit'
          ? { x: centerX - 6, y: footY + 2 }
          : { x: centerX - 8, y: footY - 2 };
    const slot1 =
      kind === 'bed_lie'
        ? { x: centerX + 6, y: slot0.y }
        : kind === 'bench_sit'
          ? { x: centerX + 6, y: footY + 2 }
          : { x: centerX + 8, y: footY - 2 };

    const occupiedSlots: number[] = [];
    for (const remote of this.remoteEntities.values()) {
      if (remote.mapId !== this.currentMapId || remote.posture !== targetPosture) continue;
      if (Math.hypot(remote.sprite.x - slot0.x, remote.sprite.y - slot0.y) < 10) {
        occupiedSlots.push(0);
      } else if (Math.hypot(remote.sprite.x - slot1.x, remote.sprite.y - slot1.y) < 10) {
        occupiedSlots.push(1);
      }
    }

    const slotIndex = pickAvailableSharedSlot(occupiedSlots, 0);
    const chosen = slotIndex === 0 ? slot0 : slot1;
    this.pathQueue = [];
    this.tapMarker?.clear();
    this.localSprite.setPosition(chosen.x, chosen.y);
    this.localFacing = 'down';
    this.localPosture = targetPosture;
    this.playLocalMoveAnim(false);
    this.emitCurrentTile(true);
    this.emitLocalMovement('idle', true);
    gameEventBus.emit('evt:local-posture-changed', {
      posture: targetPosture,
      slotIndex,
      x: chosen.x,
      y: chosen.y,
      facing: 'down',
      mapId: this.currentMapId,
    });
  }

  private spawnEmoteBubble(x: number, y: number, symbol: string): void {
    const bubble = this.add
      .text(x, y, symbol, {
        fontSize: '12px',
        backgroundColor: 'rgba(255, 248, 239, 0.92)',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(9600);
    this.tweens.add({
      targets: bubble,
      y: y - 16,
      alpha: 0,
      duration: 1400,
      ease: 'Sine.Out',
      onComplete: () => bubble.destroy(),
    });
  }

  private refreshMailboxBadge(): void {
    this.mailboxBadge?.destroy();
    this.mailboxBadge = null;
    if (this.currentMapId !== 'garden' || this.mailboxUnreadCount <= 0) return;

    const badge = this.add.container(189, 34).setDepth(75);
    const bg = this.add.circle(0, 0, 5.5, 0xe05b5b).setStrokeStyle(1, 0xfff8ef);
    const txt = this.add
      .text(0, 0, '✉', { fontSize: '8px', color: '#fff8ef' })
      .setOrigin(0.5, 0.5);
    badge.add([bg, txt]);
    this.tweens.add({
      targets: badge,
      y: 31,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.mailboxBadge = badge;
  }

  private syncRemoteBlanket(entity: RemoteAvatarEntity): void {
    if (entity.posture === 'lie_bed' && entity.mapId === this.currentMapId) {
      if (!entity.blanket) {
        entity.blanket = this.add
          .rectangle(entity.sprite.x, entity.sprite.y - 4, 13, 8, 0xb8d9ee, 0.94)
          .setStrokeStyle(0.75, 0xfff8ef, 0.9);
      }
      entity.blanket
        .setPosition(entity.sprite.x, entity.sprite.y - 4)
        .setDepth(entity.sprite.y + 2)
        .setVisible(true);
    } else if (entity.blanket) {
      entity.blanket.setVisible(false);
    }
  }

  private emitCurrentTile(force: boolean): void {
    const tileX = Math.floor(this.localSprite.x / TILE_SIZE);
    const tileY = Math.floor((this.localSprite.y - 2) / TILE_SIZE);
    const key = `${this.currentMapId}:${tileX},${tileY}:${this.localFacing}`;
    if (force || key !== this.lastTileEmitKey) {
      this.lastTileEmitKey = key;
      gameEventBus.emit('evt:local-tile-changed', {
        mapId: this.currentMapId,
        tileX,
        tileY,
        facing: this.localFacing,
      });
    }
  }

  private emitLocalMovement(anim: MovementPacket['anim'], forceIdle = false): void {
    if (this.movementConnection === null || !this.localUserId || !this.sessionId) return;
    const position = {
      x: Math.round(this.localSprite.x * 10) / 10,
      y: Math.round(this.localSprite.y * 10) / 10,
      facing: this.localFacing,
    };
    if (!this.txThrottle.shouldEmit(performance.now(), anim, this.currentMapId, position, forceIdle)) return;

    const packet: MovementPacket = {
      worldId: this.worldId,
      userId: this.localUserId,
      sessionId: this.sessionId,
      mapId: this.currentMapId,
      seq: this.txThrottle.nextSeq(),
      timestampMs: Date.now(),
      ...position,
      anim,
    };
    gameEventBus.emit('evt:local-movement', packet);
  }

  private reconcileRemotePresences(presences: PresencePayload[]): void {
    const byUser = selectLatestPresenceByUser(presences, this.localUserId);
    const activeUserIds = new Set<string>();
    for (const p of byUser.values()) {
      activeUserIds.add(p.userId);

      const member = this.members.find((m) => m.userId === p.userId);
      const avatarConfig = member?.avatarConfig ?? p.avatarConfig;
      const nickname = member?.nickname ?? p.nickname;
      const existing = this.remoteEntities.get(p.userId);
      const latest = this.remoteFilter.getLatestPacket(p.sessionId);
      const position = latest?.userId === p.userId &&
          (latest.mapId === p.mapId || latest.timestampMs > p.updatedAtMs) ? latest : {
        x: (p.tileX + 0.5) * TILE_SIZE,
        y: (p.tileY + 0.85) * TILE_SIZE,
        mapId: p.mapId,
        facing: p.facing,
        anim: 'idle' as const,
      };

      if (!existing) {
        const texKey = ensurePhaserAvatarTexture(this, avatarConfig);
        const { x: px, y: py } = position;
        const shadow = this.add.ellipse(px, py - 1, 11, 4.5, 0x22151c, 0.32);
        const sprite = this.add
          .sprite(px, py, texKey, getIdleFrameIndex(position.facing))
          .setOrigin(0.5, 1);
        const tag = this.buildNameTag(px, py - 25, nickname, '#f2a2ba');

        this.remoteEntities.set(p.userId, {
          userId: p.userId,
          sessionId: p.sessionId,
          mapId: position.mapId,
          sprite,
          shadow,
          label: tag.container,
          labelText: tag.text,
          targetX: px,
          targetY: py,
          facing: position.facing,
          anim: position.anim,
          posture: 'none',
          textureKey: texKey,
          avatarConfig,
          nickname,
        });
      } else {
        if (existing.sessionId !== p.sessionId || existing.mapId !== position.mapId) {
          existing.sessionId = p.sessionId;
          this.setRemoteTarget(existing, position, true);
        }
        existing.nickname = nickname;
        this.updateTagText(existing.label, existing.labelText, nickname, '#f2a2ba');
      }
    }

    for (const [uid, entity] of this.remoteEntities.entries()) {
      if (!activeUserIds.has(uid)) {
        entity.sprite.destroy();
        entity.shadow.destroy();
        entity.label.destroy();
        entity.blanket?.destroy();
        this.remoteEntities.delete(uid);
      }
    }

    this.reconcileRemoteVisibility();
  }

  private syncRemoteAppearancesFromMembers(): void {
    for (const entity of this.remoteEntities.values()) {
      const member = this.members.find((m) => m.userId === entity.userId);
      if (!member) continue;
      entity.avatarConfig = member.avatarConfig;
      entity.nickname = member.nickname;
      entity.textureKey = ensurePhaserAvatarTexture(this, member.avatarConfig);
      entity.sprite.stop();
      entity.sprite.setTexture(entity.textureKey, getIdleFrameIndex(entity.facing));
      this.updateTagText(entity.label, entity.labelText, member.nickname, '#f2a2ba');
    }
    if (this.latestPresences.length > 0) {
      this.reconcileRemotePresences(this.latestPresences);
    }
  }

  private applyRemoteMovementPacket(packet: MovementPacket): void {
    const entity = this.remoteEntities.get(packet.userId);
    if (!entity || entity.sessionId !== packet.sessionId) return;

    const changedMap = entity.mapId !== packet.mapId;
    this.setRemoteTarget(entity, packet, changedMap);
    if (changedMap) this.reconcileRemoteVisibility();
  }

  private setRemoteTarget(
    entity: RemoteAvatarEntity,
    position: Pick<MovementPacket, 'mapId' | 'x' | 'y' | 'facing' | 'anim'>,
    snap: boolean,
  ): void {
    entity.mapId = position.mapId;
    entity.targetX = position.x;
    entity.targetY = position.y;
    entity.facing = position.facing;
    entity.anim = position.anim;
    if (position.anim === 'walk' || snap) {
      entity.posture = 'none';
      entity.blanket?.setVisible(false);
    }
    if (snap) {
      entity.sprite.setPosition(position.x, position.y);
      entity.shadow.setPosition(position.x, position.y - 1);
      entity.label.setPosition(position.x, position.y - 25);
    }
  }

  private reconcileRemoteVisibility(): void {
    for (const entity of this.remoteEntities.values()) {
      const sameRoom = entity.mapId === this.currentMapId;
      entity.sprite.setVisible(sameRoom);
      entity.shadow.setVisible(sameRoom);
      entity.label.setVisible(sameRoom);
      this.syncRemoteBlanket(entity);
    }
  }

  private updateRemoteEntities(deltaMs: number): void {
    const now = Date.now();
    for (const entity of this.remoteEntities.values()) {
      if (entity.mapId !== this.currentMapId) continue;

      const next = stepInterpolatedPosition(
        { x: entity.sprite.x, y: entity.sprite.y },
        { x: entity.targetX, y: entity.targetY },
        deltaMs,
      );
      const moving = Math.hypot(next.x - entity.sprite.x, next.y - entity.sprite.y) > 0.05;

      entity.sprite.setPosition(next.x, next.y);
      entity.sprite.setDepth(next.y);
      entity.shadow.setPosition(next.x, next.y - 1);
      entity.shadow.setDepth(next.y - 1);
      entity.label.setPosition(next.x, next.y - 25);
      if (moving) {
        entity.posture = 'none';
        entity.blanket?.setVisible(false);
      }

      const stale = this.remoteFilter.isStale(entity.sessionId, now);
      if ((entity.anim === 'walk' || moving) && !stale) {
        const animKey = `${entity.textureKey}:walk-${entity.facing}`;
        if (!entity.sprite.anims.isPlaying || entity.sprite.anims.currentAnim?.key !== animKey) {
          entity.sprite.play(animKey, true);
        }
      } else if (
        entity.posture === 'sit_study' ||
        entity.posture === 'sit_sofa' ||
        entity.posture === 'sit_bench'
      ) {
        const sitKey = `${entity.textureKey}:sit-${entity.facing}`;
        if (this.anims.exists(sitKey)) {
          if (!entity.sprite.anims.isPlaying || entity.sprite.anims.currentAnim?.key !== sitKey) {
            entity.sprite.play(sitKey, true);
          }
        } else {
          entity.sprite.stop();
          entity.sprite.setFrame(getIdleFrameIndex(entity.facing));
        }
      } else {
        entity.sprite.stop();
        entity.sprite.setFrame(getIdleFrameIndex(entity.facing));
        if (entity.posture === 'lie_bed') {
          this.syncRemoteBlanket(entity);
        }
      }
    }
  }

  private syncHeldItemPresentation(timeMs: number): void {
    if (!this.heldRenderer || !this.localSprite) return;
    this.heldRenderer.sync(
      this.localSprite.x,
      this.localSprite.y,
      this.localSprite.depth,
      this.localFacing,
      this.localMoving,
      this.heldItem,
      timeMs,
    );
  }

  private emitInteractionFrameIfDue(nowMs: number): void {
    if (nowMs - this.lastInteractionFrameAtMs < 180) return;
    this.lastInteractionFrameAtMs = nowMs;
    if (!this.localSprite) return;

    const petPos = this.petEntity?.isOnMapVisible() ? this.petEntity.getWorldPosition() : null;

    const interactables = buildMainGameInteractables({
      mapId: this.currentMapId,
      placements: this.placements,
      petWorldPosition: petPos,
      petVisible: Boolean(petPos),
      mailboxUnread: this.mailboxUnreadCount,
      bowlPresentation: {
        foodEmpty: true,
        foodFull: false,
        waterEmpty: true,
        waterFull: false,
      },
    });

    gameEventBus.emit('evt:interaction-frame', {
      mapId: this.currentMapId,
      playerX: this.localSprite.x,
      playerY: this.localSprite.y,
      facing: this.localFacing,
      interactables,
    });
  }

  private cleanup(): void {
    this.heldRenderer?.destroy();
    this.heldRenderer = null;
    this.petEntity?.destroy();
    this.petEntity = null;
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.scale.off('resize', this.handleResize, this);
  }
}
