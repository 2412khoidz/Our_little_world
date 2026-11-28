import { PhysicalDropVisuals } from '../interaction/PhysicalDropVisuals';
import Phaser from 'phaser';
import { avatarConfigsEqual, DEFAULT_AVATAR_PARTNER_A } from '../../shared/avatar';
import { getCatalogItem } from '../../shared/catalog';
import { getMapDefinition, getMapTilePixelSize } from '../../shared/maps';
import { getArrivalFacingForPortal } from '../../shared/world/worldGraph';
import { MapDebugOverlay } from '../dev/mapDebugOverlay';
import { renderOutdoorWorld } from '../world/outdoorRenderer';
import { renderTiledWorldMapLayers } from '../world/renderTiledWorldMap';
import {
  getDonorCabacosTilesets,
  isDonorCabacosMap,
  isDonorCabacosMapFromCache,
  renderDonorCabacosMapLayers,
  renderDonorCabacosImageInteriorFromMap,
  renderDonorCabacosShopInterior,
  isDonorCabacosImageShop,
} from '../world/renderDonorCabacosMap';
import {
  getDonorPydewTilesets,
  isDonorPydewValleyMap,
  isDonorPydewValleyMapFromCache,
  renderDonorPydewMapLayers,
} from '../world/renderDonorPydewMap';
import {
  getDonorTuxemonTilesets,
  isDonorTuxemonMap,
  renderDonorTuxemonMapLayers,
} from '../world/renderDonorTuxemonMap';
import {
  getDonorSproutTilesets,
  isDonorSproutMap,
  renderDonorSproutMapLayers,
} from '../world/renderDonorSproutMap';
import {
  nearestTiledNpc,
  spawnTiledWorldNpcs,
  tickTiledWorldNpcs,
  type TiledWorldNpcEntity,
} from '../world/tiledWorldNpcs';
import {
  applyTiledZoneAccents,
  type AmbientChickenHandle,
  type AmbientCrabHandle,
  type AmbientDuckHandle,
  type AmbientSheepHandle,
  type AmbientSnailHandle,
} from '../world/tiledZoneAccents';
import {
  spawnAmbientDonorAnimal,
  syncAmbientChickenVisual,
  syncAmbientDuckVisual,
  syncAmbientSheepVisual,
} from '../farming/ambientAnimalVisualAdapter';
import {
  createChickenActorState,
  createDuckActorState,
  createSnailActorState,
  stepEmergentChicken,
  stepEmergentCrab,
  stepEmergentDuck,
  stepEmergentSheep,
  stepEmergentSnail,
} from '../../shared/world/emergentWorldBehavior';
import { isTiledWorldMapId, TILED_MAP_PHASER_KEYS } from '../../shared/world/tiledMapRegistry';
import { buildTiledWorldInteractableTargets } from '../../shared/world/tiledWorldInteractables';
import {
  buildMovementCollisionGrid,
  findPlacementAtTile,
  validatePlacement,
} from '../../shared/placement';
import {
  isBlockedByActorColliders,
  NPC_ACTOR_RADIUS_PX,
  PLAYER_ACTOR_RADIUS_PX,
  type ActorCollider,
} from '../../shared/movement/actorCollision';
import { isDecorateMapId } from '../../shared/decorate/decorateInteriorPolicy';
import { decorateGhostAnchorFromFootprint } from '../../shared/decorate/decorateGhostAnchor';
import { footprintForCatalog } from '../../shared/decorate/decoratePlacementLoop';
import {
  MovementTxThrottle,
  RemoteAvatarFilter,
  selectLatestPresenceByUser,
} from '../../shared/realtime';
import { RemoteMotionInterpolator } from '../../shared/netcode/interpolation';
import { getCoupleEmoteSymbol, pickAvailableSharedSlot } from '../../shared/couple/coupleProtocol';
import {
  computeHoldHandsCompanionTarget,
  evaluateHoldHandsTether,
} from '../../shared/couple/couplePairLocomotion';
import { HUG_APPROACH_MS } from '../../shared/couple/coupleStateMachine';
import { type CouplePostureKind } from '../../shared/couple/coupleTypes';
import { CoupleAnimationRenderer } from '../avatar/coupleAnimationRenderer';
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
import {
  avatarIdleFrame,
  ensurePhaserAvatarTexture,
  playDonorToolUseAnim,
} from '../art/phaserAvatarTexture';
import { computeGameplayZoom, computeScenicBounds, fitWorldZoom } from '../art/worldCamera';
import { USE_PRIVATE_ART } from '../art/atlasProfile';
import {
  SNAIL_SHEET_KEY,
  WORLD_ART_KEY,
  WORLD_PROPS_KEY,
  applyWorldFurnitureDisplaySize,
  worldFurnitureFrame,
} from '../art/worldAtlas';
import { facingTowardPoint, isFarmPlotPixelAdjacent } from '../../shared/farming/farmAdjacency';
import { resolveSharedPostureSeat } from '../../shared/interaction/furnitureSeatAnchors';
import { isPrivateAtlasReady } from '../world/privateArtCapability';
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
import {
  buildDiscoverabilityMarkerSpecs,
  spawnDiscoverabilityMarkers,
} from '../world/discoverabilityMarkers';
import type { InteractableTarget } from '../../shared/interaction/interactionTypes';
import { isDonorEconomyUiEnabled } from '../../shared/donor/donorEconomyUiFlag';
import { HeldItemRenderer } from '../interaction/HeldItemRenderer';
import {
  DonorPydewToolController,
  toolKindFromItemSku,
  type DonorToolKind,
} from '../interaction/donorPydewToolController';
import { playToolActionSfx } from '../interaction/toolActionAudio';
import { gameAudio } from '../audio/gameAudioManager';
import { resolveFootstepSurface } from '../../shared/audio/surfaceFootsteps';
import { farmPlotIndexForTile } from '../../shared/farming/farmPlotIndex';
import { FarmPlotVisualController } from '../farming/FarmPlotVisualController';
import { OrchardVisualController } from '../farming/OrchardVisualController';
import { DEFAULT_ORCHARD_SLOT_TILES } from '../../shared/farming/farmEntityTiles';
import { LivestockVisualController } from '../farming/LivestockVisualController';
import { FarmActionEffects, WorkshopMachineVisuals } from '../farming/RanchActionVisuals';
import { RanchFishingVisuals } from '../farming/RanchFishingVisuals';
import { harvestDropAnimation, RANCH_ACTIONS_ATLAS, RANCH_FISHING_ATLAS } from '../../shared/art/ranchActionAtlas';
import { confirmedDeepFarmEffects, confirmedPlotEffects, type PlotEffect } from '../../shared/farming/confirmedFarmVisualEffects';
import { farmPlotTileForIndex } from '../../shared/farming/farmPlotIndex';
import { FARM_WORLD_INTERACTABLES } from '../../shared/world/farmPlotContract';
import type { DeepFarmSnapshot } from '../../shared/farming/deepFarmState';

function preferDemoEHomeGarden(
  scene: Phaser.Scene,
  mapId: MapId,
  backgroundFrame: string,
): boolean {
  if (mapId !== 'home' && mapId !== 'garden') return false;
  if (!USE_PRIVATE_ART || !isPrivateAtlasReady(scene)) return false;
  const art = scene.textures.exists(WORLD_ART_KEY) ? scene.textures.get(WORLD_ART_KEY) : null;
  return art?.has(backgroundFrame) ?? false;
}
import { WorldLightingOverlay } from '../world/WorldLightingOverlay';
import type { WorldClockPresentation } from '../../shared/world/worldClock';
import { isLivingPetLocalSimulationEnabled } from '../../shared/petLiving/mainGame/petLivingDevFlag';
import { FOLLOW_CAT_MAPS, PetLivingMainGameDriver } from '../pet/PetLivingMainGameDriver';
import { enterPetCareRuntime, exitPetCareRuntime } from '../pet/care/PetCareRuntime';
import { getPersistedPetCareV2State } from '../pet/care/petCareBridgeState';
import { setPetCareModeActive } from '../../shared/petLiving/petCare/petCareModeFlag';
import { playAvatarPostureAnim, resetAvatarSpriteOrigin } from '../avatar/avatarPostureVisual';
import { HOME_STORAGE_ANCHOR, MAIN_GAME_WORLD_ANCHORS } from '../../shared/interaction/mainGameWorldAnchors';
import {
  cardinalFromFacing8,
  resolveFacing8,
  type Facing8,
} from '../../shared/movement/facing8';
import type { EnvInteractionHook } from '../../shared/world/envInteractionHooks';
import {
  DEFAULT_HOME_BOWL_PRESENTATION,
  fillHomeFoodBowl,
  pourHomeWaterBowl,
  type HomeBowlPresentation,
} from '../../shared/interaction/homeBowlPresentation';

interface RemoteAvatarEntity {
  userId: string;
  sessionId: string;
  mapId: MapId;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Container;
  labelText: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  facing: Direction;
  facing8?: Facing8;
  anim: 'idle' | 'walk';
  posture: CouplePostureKind;
  phaseStartedAtMs?: number;
  anchorX?: number;
  anchorY?: number;
  blanket?: Phaser.GameObjects.Container;
  textureKey: string;
  avatarConfig: AvatarConfig;
  nickname: string;
  interpolator: RemoteMotionInterpolator;
  heldItem: HeldItemState;
  heldRenderer: HeldItemRenderer;
}

function heldItemFromWire(raw: {
  heldItemSku?: string | null;
  heldItemKind?: HeldItemState['itemKind'];
  heldIconId?: HeldItemState['iconId'];
  heldPropsIconId?: string | null;
}): HeldItemState {
  if (!raw.heldItemKind || raw.heldItemKind === 'none') {
    return EMPTY_HELD_ITEM;
  }
  return {
    slotIndex: null,
    itemSku: raw.heldItemSku ?? null,
    itemKind: raw.heldItemKind,
    iconId: raw.heldIconId ?? null,
    propsIconId: raw.heldPropsIconId ?? null,
    labelVi: '',
    waterFillLevel: 100,
    quality: 'normal',
    temporaryActionState: 'none',
  };
}

export class WorldScene extends Phaser.Scene {
  private tilePx(): number {
    return getMapTilePixelSize(this.currentMapId);
  }

  private physicalDrops: PhysicalDropVisuals | null = null;
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
  private localShadow!: Phaser.GameObjects.Image;
  private localLabel!: Phaser.GameObjects.Container;
  private localLabelText!: Phaser.GameObjects.Text;
  private localTextureKey = '';
  private localFacing: Direction = 'down';
  private localFacing8: Facing8 = 'down';
  private localPosture: CouplePostureKind = 'none';
  private localBlanket: Phaser.GameObjects.Container | null = null;
  private localRestAura: Phaser.GameObjects.Text | null = null;
  private coupleAffectionIcon: Phaser.GameObjects.Text | null = null;
  private lastRunDustAtMs = 0;
  private pathQueue: GridPoint[] = [];
  private tapMarker: Phaser.GameObjects.Graphics | null = null;
  private mailboxBadge: Phaser.GameObjects.Container | null = null;
  private mailboxUnreadCount = 0;
  private homeDoorGfx: Phaser.GameObjects.Graphics | null = null;
  private homeBowls: HomeBowlPresentation = { ...DEFAULT_HOME_BOWL_PRESENTATION };

  private remoteEntities = new Map<string, RemoteAvatarEntity>();
  private latestPresences: PresencePayload[] = [];
  private remoteFilter = new RemoteAvatarFilter();
  private txThrottle = new MovementTxThrottle(100);
  private networkJitterMs = 0;
  private lastEmittedMoveAtMs = 0;
  private lastEmittedMoveX = 0;
  private lastEmittedMoveY = 0;

  private furnitureSprites = new Map<string, Phaser.GameObjects.Image>();
  private petEntity: PetEntity | null = null;
  private petSnapshot: PetSnapshot | null = null;
  private livingPetDriver: PetLivingMainGameDriver | null = null;
  private petCareMode = false;
  private livingPetSimulationActive = false;
  private studyPetMode = false;

  private decorateGridGraphics!: Phaser.GameObjects.Graphics;
  private decoratePreviewGraphics!: Phaser.GameObjects.Graphics;
  private decoratePreviewGhost: Phaser.GameObjects.Image | null = null;
  private decorateState: DecorateStatePayload = {
    active: false,
    activeSku: null,
    selectedPlacementId: null,
    previewRotated: false,
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
    SHIFT: Phaser.Input.Keyboard.Key;
  };
  private joystickVector = { vx: 0, vy: 0 };

  private lastPortalAtMs = 0;
  private arrivedAtTile: { tileX: number; tileY: number } | null = null;
  private ambientMoteKind: 'petal' | 'firefly' = 'petal';
  private buildingMap = false;
  private tiledNpcs: TiledWorldNpcEntity[] = [];
  private activeDialogueNpcId: string | null = null;
  private ambientChickens: AmbientChickenHandle[] = [];
  private ambientDucks: AmbientDuckHandle[] = [];
  private ambientSheep: AmbientSheepHandle[] = [];
  private ambientCrabs: AmbientCrabHandle[] = [];
  private ambientSnails: AmbientSnailHandle[] = [];
  private lastInteractKeySent: string | null = null;
  private lastTileEmitKey = '';
  private lastDiagnosticsAtMs = 0;
  private lastLivingPetTelemetryAtMs = 0;
  private lastInteractionFrameAtMs = 0;
  private contextLost = false;
  private paused = false;
  private physicalHomeStorage = false;
  private homeHasDemoE = false;
  private storageCabinet: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | null = null;
  private renderSuspended = false;
  private mapDebugOverlay: MapDebugOverlay | null = null;
  private movementConnection: number | null = null;
  private heldItem: HeldItemState = EMPTY_HELD_ITEM;
  private lastHeldToolAction: HeldItemState['temporaryActionState'] = 'none';
  private heldRenderer: HeldItemRenderer | null = null;
  private coupleAnimationRenderer: CoupleAnimationRenderer | null = null;
  private coupleWalkFollowGraceUntilMs = 0;
  private couplePhaseStartedAtMs = 0;
  private coupleReleaseStartedAtMs: number | null = null;
  private coupleApproachTarget: { x: number; y: number; facing: Direction } | null = null;
  private pendingTapAction: {
    kind:
      | 'pet_care'
      | 'sofa_sit'
      | 'bed_lie'
      | 'bench_sit'
      | 'study_room'
      | 'wardrobe'
      | 'mailbox'
      | 'photo_frame';
    targetX: number;
    targetY: number;
    reachPx: number;
  } | null = null;
  private readonly donorToolController = new DonorPydewToolController();
  private localMoving = false;
  private prePosturePos: { x: number; y: number } | null = null;
  private ranchEffects: FarmActionEffects | null = null;
  private workshopMachines: WorkshopMachineVisuals | null = null;
  private ranchFishing: RanchFishingVisuals | null = null;
  private deepFarmReceivedAt = 0;
  private farmPlotVisual: FarmPlotVisualController | null = null;
  private orchardVisual: OrchardVisualController | null = null;
  private livestockVisual: LivestockVisualController | null = null;
  private farmHoverGraphics: Phaser.GameObjects.Graphics | null = null;
  private hoveredFarmPlotId: number | null = null;
  private hoveredFarmTile: GridPoint | null = null;
  private farmVisualRevision: { worldId: string; version: number; nowMs: number } | null = null;
  private farmPlotsCache: readonly import('../../shared/farming/farmSnapshotTypes').FarmPlotView[] = [];
  private deepFarmCache: DeepFarmSnapshot | null = null;
  private worldLighting: WorldLightingOverlay | null = null;
  private worldClockPresentation: WorldClockPresentation | null = null;

  private unsubscribes: Array<() => void> = [];

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    ensureLightingTextures(this);
    this.decorateGridGraphics = this.add.graphics().setDepth(9000);
    this.decoratePreviewGraphics = this.add.graphics().setDepth(9050);
    this.tapMarker = this.add.graphics().setDepth(4);
    this.farmHoverGraphics = this.add.graphics().setDepth(4.2);

    this.input.once('pointerdown', () => {
      void gameAudio.unlock();
      void gameAudio.preloadDomain('world');
      void gameAudio.preloadDomain('ui');
      void gameAudio.preloadDomain('pet');
    });
    this.input.keyboard?.once('keydown', () => {
      void gameAudio.unlock();
      void gameAudio.preloadDomain('world');
      void gameAudio.preloadDomain('ui');
      void gameAudio.preloadDomain('pet');
    });

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        E: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        SHIFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      };
      const keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      keyEsc.on('down', () => {
        if (this.localPosture !== 'none') {
          this.clearLocalPosture(true);
          this.playLocalMoveAnim(false);
        }
      });
    }

    this.createLocalAvatar();
    this.heldRenderer = new HeldItemRenderer(this);
    this.coupleAnimationRenderer = new CoupleAnimationRenderer(this);
    this.petEntity = new PetEntity(this);
    // Canonical collision-safe 2D pet locomotion is ALWAYS active on all URLs (dev & production).
    this.livingPetDriver = new PetLivingMainGameDriver(13.5 * this.tilePx(), 10.2 * this.tilePx());
    this.petEntity.setLivingDriver(this.livingPetDriver);
    // Keep DEV-only local telemetry / food offer authority flag strictly isolated.
    this.livingPetSimulationActive = isLivingPetLocalSimulationEnabled();
    if (import.meta.env.DEV) {
      this.mapDebugOverlay = new MapDebugOverlay(this);
      if (this.input.keyboard) {
        const keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        keyC.on('down', () => {
          const on = this.mapDebugOverlay?.toggle() ?? false;
          if (on) {
            this.mapDebugOverlay?.redraw(this.currentMapId, this.blockedGrid);
          }
        });
      }
    }

    this.worldLighting = new WorldLightingOverlay(this);
    this.buildMap(this.currentMapId);
    this.setupPointerInput();
    this.bindEventBus();
    this.bindContextEvents();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.handleResize();
    this.syncCameraDataset();
    this.game.canvas.dataset.renderSuspended = '0';
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

  private avatarScale(): number {
    return this.tilePx() >= 64 ? 2 : 1;
  }

  private isIndoorMap(mapId: MapId = this.currentMapId): boolean {
    return mapId === 'home' || mapId === 'shop' || mapId.startsWith('shop_');
  }

  private mapBackgroundColor(mapId: MapId): string {
    if (this.isIndoorMap(mapId)) return '#1d151c';
    if (mapId === 'beach') return '#2d82b5';
    if (mapId === 'forest') return '#254834';
    return '#689b4f';
  }

  private nameTagOffsetY(posture: CouplePostureKind): number {
    const base = posture === 'lie_bed' ? 21 : posture.startsWith('sit_') ? 25 : 28;
    return Math.round(base * this.avatarScale());
  }

  private buildCozyQuilt(x: number, y: number, fillHex: number): Phaser.GameObjects.Container {
    const s = this.avatarScale();
    // Tucked waist-to-feet blanket so both face and hair remain clearly visible on the pillow
    const quilt = this.add.rectangle(0, 0, 14, 8.5, fillHex, 0.98).setStrokeStyle(0.85, 0xfff8ef, 0.95);
    const fold = this.add.rectangle(0, -3.4, 13.4, 2.2, 0xfff6eb, 0.98);
    const seam = this.add.rectangle(0, 1.1, 12, 0.75, 0xffffff, 0.42);
    const container = this.add.container(x, y, [quilt, fold, seam]);
    container.setScale(s);
    return container;
  }

  private triggerDonorToolSwing(kind: DonorToolKind, forceRestart = false, impactFx = true): void {
    if (!this.localSprite) return;
    const triggered = this.donorToolController.trigger(
      kind,
      this.localFacing,
      this.localSprite.x,
      this.localSprite.y,
      this.tilePx(),
      (state) => {
        playToolActionSfx(kind);
        if (impactFx) this.spawnDonorToolHitParticles(kind, state.targetWorldX, state.targetWorldY);
      },
      forceRestart,
    );
    if (triggered) {
      const animAction = kind === 'axe' ? 'tool' : kind === 'rod' ? 'fish' : kind;
      playDonorToolUseAnim(this, this.localSprite, this.localTextureKey, this.localFacing, animAction);
      if (kind === 'plant' || kind === 'harvest') {
        const baseScale = this.avatarScale();
        this.tweens.add({
          targets: this.localSprite,
          scaleY: baseScale * 0.91,
          scaleX: baseScale * 1.07,
          duration: 95,
          yoyo: true,
          ease: 'Sine.Out',
          onComplete: () => {
            if (this.localSprite) {
              this.localSprite.setScale(this.avatarScale());
            }
          },
        });
      }
    } else if (forceRestart) {
      playToolActionSfx(kind);
    }
  }

  private spawnDonorToolHitParticles(kind: DonorToolKind, wx: number, wy: number): void {
    const s = this.avatarScale();
    if (kind === 'plant') {
      const seedColors = [0xfbbf24, 0xfde68a, 0xd97706];
      const startX = this.localSprite ? this.localSprite.x : wx;
      const startY = this.localSprite ? this.localSprite.y - 6 * s : wy - 6 * s;
      for (let i = 0; i < 7; i += 1) {
        const seedDot = this.add.circle(startX, startY, 1.3 * s, seedColors[i % seedColors.length]!, 0.95);
        seedDot.setDepth(wy + 32);
        this.tweens.add({
          targets: seedDot,
          x: wx + (Math.random() - 0.5) * 9 * s,
          y: wy + (Math.random() - 0.5) * 6 * s,
          duration: 210 + (i % 3) * 28,
          ease: 'Quad.Out',
          onComplete: () => {
            this.tweens.add({
              targets: seedDot,
              alpha: 0,
              duration: 100,
              onComplete: () => seedDot.destroy(),
            });
          },
        });
      }
      for (let i = 0; i < 3; i += 1) {
        const puff = this.add.circle(wx + (i - 1) * 3 * s, wy + 1 * s, 1.5 * s, 0xd6b588, 0.55);
        puff.setDepth(wy + 29);
        this.tweens.add({
          targets: puff,
          y: puff.y - 4 * s,
          alpha: 0,
          duration: 220,
          onComplete: () => puff.destroy(),
        });
      }
      return;
    }

    if (kind === 'harvest') {
      const harvestColors = [0x4ade80, 0xfef08a, 0xfbbf24, 0xfb7185];
      for (let i = 0; i < 9; i += 1) {
        const spark = this.add.circle(
          wx + (Math.random() - 0.5) * 6 * s,
          wy + (Math.random() - 0.5) * 4 * s,
          (i % 2 === 0 ? 1.7 : 1.2) * s,
          harvestColors[i % harvestColors.length]!,
          0.95,
        );
        spark.setDepth(wy + 34);
        this.tweens.add({
          targets: spark,
          x: spark.x + (Math.random() - 0.5) * 14 * s,
          y: spark.y - (5 + Math.random() * 8) * s,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.Out',
          onComplete: () => spark.destroy(),
        });
      }
      return;
    }

    const color =
      kind === 'water'
        ? 0x6fd3ff
        : kind === 'axe'
          ? 0xd9a066
          : 0x9c6b43;
    for (let i = 0; i < 4; i += 1) {
      const p = this.add.circle(
        wx + (Math.random() - 0.5) * 6 * s,
        wy + (Math.random() - 0.5) * 4 * s,
        1.4 * s,
        color,
        0.9,
      );
      p.setDepth(wy + 30);
      this.tweens.add({
        targets: p,
        x: p.x + (Math.random() - 0.5) * 10 * s,
        y: p.y - (3 + Math.random() * 6) * s,
        alpha: 0,
        duration: 260,
        ease: 'Sine.Out',
        onComplete: () => p.destroy(),
      });
    }
  }

  private spawnRunDust(x: number, y: number): void {
    const s = this.avatarScale();
    const puff = this.add.circle(x + (Math.random() - 0.5) * 4 * s, y - 1 * s, 1.5 * s, 0xf6ead7, 0.65);
    puff.setDepth(y - 2);
    this.tweens.add({
      targets: puff,
      y: puff.y - 4 * s,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 280,
      ease: 'Sine.Out',
      onComplete: () => puff.destroy(),
    });
  }

  private updateTagText(container: Phaser.GameObjects.Container, textObj: Phaser.GameObjects.Text, nextText: string, accentHex: string): void {
    if (textObj.text === nextText) return;
    textObj.setText(nextText);
    const bg = container.list[0] as Phaser.GameObjects.Graphics;
    const w = Math.ceil(textObj.width + 7);
    const h = 9.5;
    bg.clear();
    bg.fillStyle(0x261a20, 0.8);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 3);
    bg.lineStyle(0.8, Phaser.Display.Color.HexStringToColor(accentHex).color, 0.92);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3);
  }

  private createLocalAvatar(): void {
    const me = this.members.find((m) => m.userId === this.localUserId);
    const config = me?.avatarConfig ?? DEFAULT_AVATAR_PARTNER_A;
    const nickname = me?.nickname ?? 'Bạn';
    this.localTextureKey = ensurePhaserAvatarTexture(this, config);

    const def = getMapDefinition(this.currentMapId);
    const startX = (def.defaultSpawn.tileX + 0.5) * this.tilePx();
    const startY = (def.defaultSpawn.tileY + 1) * this.tilePx();
    const s = this.avatarScale();

    this.localShadow = placeSoftShadow(this, startX, startY - 1, 14 * s, 5 * s, startY - 1, 0.44);
    this.localSprite = this.add
      .sprite(startX, startY, this.localTextureKey, avatarIdleFrame(this.localTextureKey, this.localFacing))
      .setScale(s)
      .setOrigin(0.5, 0.88)
      .setDepth(startY);

    const tag = this.buildNameTag(startX, startY - this.nameTagOffsetY('none'), nickname, '#8bc4d9');
    tag.container.setScale(s);
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
      avatarIdleFrame(this.localTextureKey, this.localFacing),
    );
    this.localSprite.setScale(this.avatarScale());
    this.updateTagText(this.localLabel, this.localLabelText, me.nickname, '#8bc4d9');
    this.playLocalMoveAnim(this.localMoving, false);
  }

  private buildMap(mapId: MapId, spawnTile?: { tileX: number; tileY: number }, portalId?: string): void {
    this.buildingMap = true;
    this.currentMapId = mapId;
    const arrivalFacing = getArrivalFacingForPortal(portalId);
    if (arrivalFacing) {
      this.localFacing = arrivalFacing;
    }
    gameAudio.setZoneMusic(mapId);
    if (mapId === 'farm') void gameAudio.preloadDomain('farming');
    if (this.petSnapshot && FOLLOW_CAT_MAPS.has(mapId)) void gameAudio.preloadDomain('pet');
    this.clearLocalPosture(true);
    this.prePosturePos = null;
    this.pendingTapAction = null;
    this.pathQueue = [];
    this.hoveredFarmPlotId = null;
    this.hoveredFarmTile = null;
    this.farmHoverGraphics?.clear();
    this.tapMarker?.clear();
    this.mailboxBadge?.destroy();
    this.mailboxBadge = null;

    this.physicalDrops?.clear();
    this.destroyRanchVisuals();
    for (const layer of this.mapLayers) {
      layer.destroy();
    }
    this.mapLayers = [];
    for (const mote of this.motes) {
      mote.sprite.destroy();
    }
    this.motes = [];
    for (const npc of this.tiledNpcs) {
      npc.shadow.destroy();
      npc.body.destroy();
      npc.label.destroy();
      npc.emoteBadge.destroy();
    }
    this.tiledNpcs = [];
    this.ambientChickens = [];
    this.ambientDucks = [];
    this.ambientSheep = [];
    this.ambientCrabs = [];
    this.ambientSnails = [];
    this.ambientMoteKind = mapId === 'beach' || mapId === 'forest' ? 'firefly' : 'petal';
    this.tilemap?.destroy();
    this.tilemap = null;
    this.farmPlotVisual?.destroy();
    this.farmPlotVisual = null;
    this.orchardVisual?.destroy();
    this.orchardVisual = null;
    this.livestockVisual?.destroy();
    this.livestockVisual = null;

    const def = getMapDefinition(mapId);
    const worldW = def.widthTiles * this.tilePx();
    const worldH = def.heightTiles * this.tilePx();
    this.buildScenicSurround(mapId, worldW, worldH);

    const art = this.textures.exists(WORLD_ART_KEY) ? this.textures.get(WORLD_ART_KEY) : null;
    const background =
      artIds.background[mapId === 'outdoor' ? 'garden' : (mapId as keyof typeof artIds.background)];
    const demoEHomeGarden = preferDemoEHomeGarden(this, mapId, background);

    this.homeHasDemoE = mapId === 'home' && demoEHomeGarden;
    this.storageCabinet = null;
    if (demoEHomeGarden && art?.has(background)) {
      this.mapLayers.push(this.add.image(0, 0, WORLD_ART_KEY, background).setOrigin(0, 0).setDepth(1));
      if (mapId === 'home') {
        this.buildHomeDemoEAccents();
      } else if (mapId === 'garden') {
        this.buildGardenDemoEAccents(art);
      }
    } else if (isTiledWorldMapId(mapId)) {
      if (mapId === 'shop' && this.isDonorCabacosShop() && !this.isDonorCabacosShopTiled() && !this.isDonorCabacosShopImage()) {
        renderDonorCabacosShopInterior(this, (obj) => this.mapLayers.push(obj));
        const mapKey = TILED_MAP_PHASER_KEYS[mapId];
        if (this.cache.tilemap.exists(mapKey)) {
          this.tilemap = this.make.tilemap({ key: mapKey });
        }
      } else {
        this.buildTiledWorldMap(mapId);
      }
      this.tiledNpcs = spawnTiledWorldNpcs(this, mapId, (obj) => this.mapLayers.push(obj));
      const accents = applyTiledZoneAccents(
        mapId,
        worldW,
        worldH,
        this.placeProp.bind(this),
        (obj) => this.mapLayers.push(obj),
        this,
      );
      this.ambientChickens = accents.chickens ?? [];
      this.ambientDucks = accents.ducks ?? [];
      this.ambientSheep = accents.sheep ?? [];
      this.ambientCrabs = accents.crabs ?? [];
      this.ambientSnails = accents.snails ?? [];
      if (accents.motes.length > 0 && accents.moteBounds) {
        this.motes = accents.motes;
        this.moteBounds = accents.moteBounds;
      }
      if (mapId === 'farm' && this.tilemap) {
        const farmTilePx = getMapTilePixelSize('farm');
        this.ranchEffects = new FarmActionEffects(this);
        this.farmPlotVisual = new FarmPlotVisualController(
          this,
          this.tilemap,
          'tileset-cozy',
          (obj) => this.mapLayers.push(obj),
          farmTilePx,
        );
        if (this.farmPlotsCache.length > 0) {
          this.farmPlotVisual.sync(this.farmPlotsCache);
        }
        this.orchardVisual = new OrchardVisualController(
          this,
          (obj) => this.mapLayers.push(obj),
          undefined,
          farmTilePx,
        );
        this.livestockVisual = new LivestockVisualController(
          this,
          (obj) => this.mapLayers.push(obj),
          undefined,
          farmTilePx,
        );
        if (this.deepFarmCache) {
          this.orchardVisual.sync(this.deepFarmCache.orchardViews, this.deepFarmCache.calendar.season);
          this.livestockVisual.sync(this.deepFarmCache.projectedLivestock);
        }
      }
    } else if (mapId === 'outdoor') {
      const outdoor = renderOutdoorWorld(this, (obj) => this.mapLayers.push(obj), this.placeProp.bind(this));
      this.moteBounds = outdoor.moteBounds;
      this.motes = outdoor.motes;
    } else {
      this.buildStarterMap(mapId);
    }

    this.cameras.main.setBackgroundColor(this.mapBackgroundColor(mapId));

    const spawn = spawnTile ?? def.defaultSpawn;
    const me = this.members.find((m) => m.userId === this.localUserId);
    const partnerOffsetX = !spawnTile && me?.role === 'partner' && !def.isStaticBlocked(spawn.tileX + 1, spawn.tileY) ? 1 : 0;
    this.arrivedAtTile = { tileX: spawn.tileX + partnerOffsetX, tileY: spawn.tileY };
    const px = (spawn.tileX + partnerOffsetX + 0.5) * this.tilePx();
    const py = (spawn.tileY + 0.85) * this.tilePx();
    const s = this.avatarScale();
    this.tweens.killTweensOf(this.localSprite);
    this.localSprite.setRotation(0);
    this.localSprite.setOrigin(0.5, 0.88);
    this.localSprite.setScale(s);
    this.localSprite.setPosition(px, py);
    this.localShadow.setDisplaySize(14 * s, 5 * s);
    this.localShadow.setPosition(px, py - 1);
    this.localLabel.setScale(s);
    this.localLabel.setPosition(px, py - this.nameTagOffsetY('none'));
    this.playLocalMoveAnim(false, false);
    this.coupleAffectionIcon?.setVisible(false);
    for (const remote of this.remoteEntities.values()) {
      remote.sprite.setScale(s);
      remote.shadow.setDisplaySize(14 * s, 5 * s);
      remote.label.setScale(s);
      remote.blanket?.setScale(s);
    }

    this.rebuildFurnitureAndCollisions();
    this.petEntity?.syncSnapshot(this.petSnapshot, mapId);
    if (this.petSnapshot && FOLLOW_CAT_MAPS.has(mapId)) {
      const petPos = this.findSafePetSpawnPx(spawn.tileX + partnerOffsetX, spawn.tileY, px, py);
      this.petEntity?.teleportNear(petPos.x, petPos.y, mapId);
    } else if (!this.petSnapshot && mapId === 'home') {
      const petPos = this.findSafePetSpawnPx(13, 10, 13.5 * this.tilePx(), 10.2 * this.tilePx());
      this.petEntity?.teleportNear(petPos.x, petPos.y, mapId);
    }
    this.reconcileRemoteVisibility();
    this.redrawDecorateOverlay();
    this.handleResize(true);
    this.cameras?.main?.fadeIn(160, 26, 20, 24);
    this.syncCameraDataset();
    this.syncStorageCabinet();
    this.refreshDiscoverabilityMarkers();
    const targets = this.collectSceneInteractableTargets();
    const mill = targets.find((target) => target.id === 'farm_barn_mill');
    if (mapId === 'farm' && (mill || this.deepFarmCache)) this.syncWorkshopMachines();
    if (targets.some((target) => target.kind === 'fishing_spot' && target.donorPlayable) &&
        this.textures.exists(RANCH_FISHING_ATLAS)) {
      this.ranchFishing = new RanchFishingVisuals(this, targets, this.tilePx());
    }

    this.lastPortalAtMs = Date.now();
    this.buildingMap = false;
    this.emitCurrentTile(true);
    this.emitLocalMovement('idle', true);
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

  /**
   * Overscroll sky haze only — no cottages, animals, or trees outside collision bounds.
   * Explorable landmarks live on Tiled zone maps (village/farm) or inside map accents.
   */
  private buildScenicSurround(mapId: MapId, worldW: number, worldH: number): void {
    if (mapId === 'outdoor' || isTiledWorldMapId(mapId)) return;

    const pad = 20;
    const haze = this.add.graphics().setDepth(-2);
    haze.fillStyle(0x9ec87a, 0.18);
    haze.fillRect(-pad, -pad, worldW + pad * 2, worldH + pad * 2);
    this.mapLayers.push(haze);

    const sky = this.add.graphics().setDepth(-1);
    sky.fillGradientStyle(0xd4ecf8, 0xd4ecf8, 0xb8dba0, 0xb8dba0, 0.55);
    sky.fillRect(-pad, -48, worldW + pad * 2, 48);
    this.mapLayers.push(sky);

    if (mapId === 'home') {
      const shell = this.add.graphics().setDepth(0.8);
      shell.fillStyle(0x281e24, 0.85);
      shell.fillRoundedRect(-4, -4, worldW + 8, worldH + 10, 4);
      shell.lineStyle(2, 0x6b4b3e, 1);
      shell.strokeRoundedRect(-2, -2, worldW + 4, worldH + 4, 3);
      this.mapLayers.push(shell);

      const doorPad = this.add.graphics().setDepth(0.9);
      doorPad.fillStyle(0xdfba8a, 1);
      doorPad.fillRoundedRect(102, worldH, 52, 42, 6);
      doorPad.lineStyle(1, 0xbd996b, 0.85);
      doorPad.strokeRoundedRect(102, worldH, 52, 42, 6);
      this.mapLayers.push(doorPad);
      this.homeDoorGfx = doorPad;
    } else {
      this.homeDoorGfx = null;
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
    this.placeProp(extIds.props.kitchen_fridge, HOME_STORAGE_ANCHOR.x, HOME_STORAGE_ANCHOR.y);
    this.placeProp(extIds.props.kitchen_counter_fruit, 44, 176, 0.5, 1, 176);
    this.placeProp(extIds.props.tv_cinema_unit, 88, 176, 0.5, 1, 176);
  }

  private syncStorageCabinet(): void {
    const shouldDraw = this.physicalHomeStorage && this.currentMapId === 'home' && !this.homeHasDemoE;
    if (!shouldDraw && this.storageCabinet) {
      const cabinet = this.storageCabinet;
      this.mapLayers = this.mapLayers.filter((layer) => layer !== cabinet);
      cabinet.destroy();
      this.storageCabinet = null;
    }
    if (!shouldDraw || this.storageCabinet) return;
    const { x, y } = HOME_STORAGE_ANCHOR;
    this.storageCabinet = this.placeProp(extIds.props.kitchen_fridge, x, y);
    if (this.storageCabinet) return;

    const cabinet = this.add.graphics().setDepth(y);
    cabinet.fillStyle(0x553a32).fillRect(x - 8, y - 17, 16, 17);
    cabinet.fillStyle(0xa76b43).fillRect(x - 7, y - 15, 14, 12);
    cabinet.fillStyle(0xd4a56e).fillRect(x - 7, y - 15, 14, 3);
    cabinet.fillStyle(0x75503a).fillRect(x - 7, y - 8, 14, 2);
    cabinet.fillStyle(0xffdb91).fillRect(x - 2, y - 7, 4, 2);
    this.mapLayers.push(cabinet);
    this.storageCabinet = cabinet;
  }

  private buildGardenDemoEAccents(art: Phaser.Textures.Texture): void {
    // 1. Pastel Cottage + Sakura trees matching existing static blockers
    const scenery = [
      { frame: artIds.scenery.cottage, x: 8.5 * this.tilePx(), y: 3 * this.tilePx() },
      { frame: artIds.scenery.blossom, x: 3 * this.tilePx(), y: 4 * this.tilePx() },
      { frame: artIds.scenery.blossom, x: 15 * this.tilePx(), y: 4 * this.tilePx() },
    ];
    for (const { frame, x, y } of scenery) {
      if (!art.has(frame)) continue;
      this.mapLayers.push(placeSoftShadow(this, x, y - 1, 40, 11, Math.round(y) - 10, 0.5));
      this.mapLayers.push(this.add.image(x, y, WORLD_ART_KEY, frame).setOrigin(0.5, 1).setDepth(Math.round(y)));
    }
    this.mapLayers.push(placeWarmLight(this, 8.5 * this.tilePx(), 28, 30, 0xffd284, 0.25, 860));

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
    const duckConfigs = [
      { id: 'garden_pond_duck_0', x: 168, y: 168, bounds: { minX: 146, maxX: 174, minY: 154, maxY: 174 }, phase: 1.1 },
      { id: 'garden_pond_duck_1', x: 96, y: 160, bounds: { minX: 86, maxX: 108, minY: 150, maxY: 170 }, phase: 3.4 },
    ];
    for (const dc of duckConfigs) {
      const duckState = createDuckActorState(dc.id, dc.x, dc.y, dc.bounds, dc.phase);
      const spawned = spawnAmbientDonorAnimal(this, {
        kind: 'duck',
        x: dc.x,
        y: dc.y,
        depth: dc.y + 2,
        facing: duckState.facing,
        waterMode: true,
        legacyFrame: `${extIds.sheets.duck}:0`,
        legacyAnimKey: 'olw-duck',
      });
      if (!spawned) continue;
      this.mapLayers.push(spawned.sprite);
      this.ambientDucks.push({
        sprite: spawned.sprite,
        lastRippleAtMs: 0,
        state: duckState,
        usesDonorAtlas: spawned.usesDonorAtlas,
        currentAnimKey: spawned.currentAnimKey,
      });
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

    const chickSpecs = [
      { id: 'garden_chicken_0', x: 184, y: 144, phase: 0.9 },
      { id: 'garden_chicken_1', x: 48, y: 108, phase: 2.7 },
    ];
    for (const cs of chickSpecs) {
      const chState = createChickenActorState(cs.id, cs.x, cs.y, cs.phase);
      const spawned = spawnAmbientDonorAnimal(this, {
        kind: 'chicken',
        x: cs.x,
        y: cs.y,
        depth: cs.y,
        facing: chState.facing,
        legacyFrame: `${extIds.sheets.chicken}:0`,
        legacyAnimKey: 'olw-chicken',
      });
      if (!spawned) continue;
      const chShadow = placeSoftShadow(this, cs.x, cs.y - 1, 11, 4, cs.y - 9, 0.45);
      this.mapLayers.push(chShadow);
      this.mapLayers.push(spawned.sprite);
      this.ambientChickens.push({
        sprite: spawned.sprite,
        shadow: chShadow,
        state: chState,
        usesDonorAtlas: spawned.usesDonorAtlas,
        currentAnimKey: spawned.currentAnimKey,
      });
    }

    if (this.textures.exists(SNAIL_SHEET_KEY) && this.anims.exists('olw-snail')) {
      const snailSpecs: readonly { id: string; x: number; y: number; axis: 'x' | 'y'; span: number; phase: number }[] = [
        { id: 'garden_snail_0', x: 92, y: 134, axis: 'x', span: 16, phase: 0.6 },
        { id: 'garden_snail_1', x: 206, y: 174, axis: 'y', span: 14, phase: 2.1 },
      ];
      for (const sn of snailSpecs) {
        const snShadow = placeSoftShadow(this, sn.x, sn.y - 1, 8, 3, Math.round(sn.y) - 1, 0.36);
        const snSprite = this.add.sprite(sn.x, sn.y, SNAIL_SHEET_KEY, 0).setOrigin(0.5, 0.85).setDepth(Math.round(sn.y));
        snSprite.play('olw-snail');
        this.mapLayers.push(snShadow, snSprite);
        this.ambientSnails.push({
          sprite: snSprite,
          shadow: snShadow,
          state: createSnailActorState(sn.id, sn.x, sn.y, sn.axis, sn.span, sn.phase),
        });
      }
    }

    // 5. Drifting cherry blossom petals (within walkable garden bounds)
    const gardenDef = getMapDefinition('garden');
    const gW = gardenDef.widthTiles * this.tilePx();
    const gH = gardenDef.heightTiles * this.tilePx();
    this.moteBounds = { x: 8, y: 8, w: gW - 16, h: gH - 16 };
    this.motes = createAmbientMotes(this, this.moteBounds, 'petal', 14);
  }

  private isDonorCabacosShop(): boolean {
    const raw = this.cache.tilemap.get('map-shop')?.data as { properties?: { name?: string; value?: string }[] } | undefined;
    const donor = raw?.properties?.find((p) => p.name === 'olwDonor')?.value;
    return donor === 'cabacos';
  }

  private isDonorCabacosShopTiled(): boolean {
    const raw = this.cache.tilemap.get('map-shop')?.data as { properties?: { name?: string; value?: string }[] } | undefined;
    const mode = raw?.properties?.find((p) => p.name === 'olwShopRender')?.value;
    return mode === 'tiled';
  }

  private isDonorCabacosShopImage(): boolean {
    const raw = this.cache.tilemap.get('map-shop')?.data as { properties?: { name?: string; value?: string }[] } | undefined;
    return raw?.properties?.find((p) => p.name === 'olwShopRender')?.value === 'image';
  }

  private buildTiledWorldMap(mapId: MapId): void {
    if (!isTiledWorldMapId(mapId)) return;
    const mapKey = TILED_MAP_PHASER_KEYS[mapId];
    if (!this.cache.tilemap.exists(mapKey)) return;
    const tilemap = this.make.tilemap({ key: mapKey });
    this.tilemap = tilemap;

    const donorPydew =
      isDonorPydewValleyMap(tilemap) || isDonorPydewValleyMapFromCache(this, mapKey);
    if (donorPydew) {
      const tilesets = getDonorPydewTilesets(tilemap);
      if (tilesets.length > 0) {
        renderDonorPydewMapLayers(this, tilemap, tilesets, (obj) => this.mapLayers.push(obj));
        if (import.meta.env.DEV) {
          console.info('[PyDew] donor render', {
            mapId,
            tilesetNames: tilesets.map((t) => t.name),
            layerCount: this.mapLayers.length,
          });
        }
      } else if (import.meta.env.DEV) {
        console.error('[PyDew] Donor map missing tileset textures', tilemap.tilesets.map((t) => t.name));
      }
      return;
    }

    if (isDonorCabacosImageShop(tilemap)) {
      renderDonorCabacosImageInteriorFromMap(this, tilemap, (obj) => this.mapLayers.push(obj));
      return;
    }

    const donorCabacos =
      isDonorCabacosMap(tilemap) || isDonorCabacosMapFromCache(this, mapKey);
    if (donorCabacos) {
      const tilesets = getDonorCabacosTilesets(tilemap);
      if (tilesets.length > 0) {
        renderDonorCabacosMapLayers(this, tilemap, tilesets, (obj) => this.mapLayers.push(obj));
        if (import.meta.env.DEV) {
          console.info('[Cabacos] donor render', {
            mapId,
            tilesetNames: tilesets.map((t) => t.name),
            layerCount: this.mapLayers.length,
          });
        }
      } else if (import.meta.env.DEV) {
        console.error(
          '[Cabacos] Donor map detected but no tilesets bound; check BootScene donor textures.',
          tilemap.tilesets.map((t) => t.name),
        );
      }
      return;
    }

    if (isDonorSproutMap(tilemap)) {
      const tilesets = getDonorSproutTilesets(tilemap);
      if (tilesets.length > 0) {
        renderDonorSproutMapLayers(this, tilemap, tilesets, (obj) => this.mapLayers.push(obj));
        if (import.meta.env.DEV) {
          console.info('[Sprout] donor render', {
            mapId,
            tilesetNames: tilesets.map((t) => t.name),
            layerCount: this.mapLayers.length,
          });
        }
      } else if (import.meta.env.DEV) {
        console.error('[Sprout] Donor map missing tileset textures', tilemap.tilesets.map((t) => t.name));
      }
      return;
    }

    if (isDonorTuxemonMap(tilemap)) {
      const tilesets = getDonorTuxemonTilesets(tilemap);
      if (tilesets.length > 0) {
        renderDonorTuxemonMapLayers(this, tilemap, tilesets, (obj) => this.mapLayers.push(obj));
        if (import.meta.env.DEV) {
          console.info('[Tuxemon] donor render', {
            mapId,
            tilesetNames: tilesets.map((t) => t.name),
            layerCount: this.mapLayers.length,
          });
        }
      } else if (import.meta.env.DEV) {
        console.error(
          '[Tuxemon] Donor map detected but no tilesets bound; run vendor-donor-tuxemon-forest + BootScene textures.',
          tilemap.tilesets.map((t) => t.name),
        );
      }
      return;
    }

    const tileset = tilemap.addTilesetImage('tileset-cozy', 'tileset-cozy', 16, 16, 0, 0);
    if (tileset) {
      renderTiledWorldMapLayers(this, tilemap, tileset, (obj) => this.mapLayers.push(obj));
    }
  }

  private buildStarterMap(mapId: MapId): void {
    const mapKey =
      mapId === 'home' ? 'map-home' : mapId === 'outdoor' ? 'map-meadow' : 'map-garden';
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

  private refreshBlockedGrid(): void {
    const blocked = buildMovementCollisionGrid(this.currentMapId, this.placements);
    if (this.currentMapId === 'farm' && this.deepFarmCache) {
      for (const view of this.deepFarmCache.orchardViews) {
        if (!view.tree || !view.stage) continue;
        const tile = DEFAULT_ORCHARD_SLOT_TILES[view.slotIndex];
        if (tile) {
          blocked.add(`${tile[0]},${tile[1]}`);
        }
      }
    }
    this.blockedGrid = blocked;
    this.mapDebugOverlay?.redraw(this.currentMapId, this.blockedGrid);
  }

  private rebuildFurnitureAndCollisions(): void {
    this.refreshBlockedGrid();
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

      const centerX = (placement.tileX + placement.widthTiles / 2) * this.tilePx();
      const footY = (placement.tileY + placement.heightTiles) * this.tilePx();
      const { key, frame } = worldFurnitureFrame(this, placement.sku);

      if (placement.layerSlot === 'object') {
        this.furnitureAccents.push(
          placeSoftShadow(
            this,
            centerX,
            footY - 2,
            placement.widthTiles * this.tilePx() * 0.9,
            Math.max(5, placement.heightTiles * 4),
            Math.round(footY) - 6,
            0.42,
          ),
        );
      }

      const img = frame !== undefined
        ? this.add.image(centerX, footY, key, frame).setOrigin(0.5, 1)
        : this.add.image(centerX, footY, key).setOrigin(0.5, 1);
      applyWorldFurnitureDisplaySize(img, placement.sku, placement.widthTiles, placement.heightTiles, this.tilePx());

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

  private findSafePetSpawnPx(
    anchorTileX: number,
    anchorTileY: number,
    fallbackX: number,
    fallbackY: number,
  ): { x: number; y: number } {
    const def = getMapDefinition(this.currentMapId);
    const preferredOffsets = [
      [-1, 0],
      [1, 0],
      [0, 1],
      [0, -1],
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-2, 0],
      [2, 0],
      [0, 2],
      [0, -2],
    ] as const;
    for (const [dx, dy] of preferredOffsets) {
      const tx = anchorTileX + dx;
      const ty = anchorTileY + dy;
      if (tx >= 0 && ty >= 0 && tx < def.widthTiles && ty < def.heightTiles && !this.blockedGrid.has(`${tx},${ty}`)) {
        return { x: (tx + 0.5) * this.tilePx(), y: (ty + 0.85) * this.tilePx() };
      }
    }
    return this.findNearestWalkableNearPx(fallbackX, fallbackY);
  }

  private findNearestWalkableNearPx(px: number, py: number): { x: number; y: number } {
    if (this.canStandAtPixel(px, py)) return { x: px, y: py };
    const tPx = this.tilePx();
    const baseTx = Math.floor(px / tPx);
    const baseTy = Math.floor((py - 2) / tPx);
    for (let radius = 0; radius <= 3; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const candX = (baseTx + dx + 0.5) * tPx;
          const candY = (baseTy + dy + 0.85) * tPx;
          if (this.canStandAtPixel(candX, candY)) {
            return { x: candX, y: candY };
          }
        }
      }
    }
    return { x: px, y: py };
  }

  private capturePrePostureAnchor(): void {
    if (this.localPosture !== 'none' || !this.localSprite) return;
    if (this.canStandAtPixel(this.localSprite.x, this.localSprite.y)) {
      this.prePosturePos = { x: this.localSprite.x, y: this.localSprite.y };
    }
  }

  private resolveClickFarmAction(
    plotId: number,
  ): { action: 'till' | 'plant' | 'water' | 'harvest'; seedSku?: string | null } | null {
    const plot = this.farmPlotsCache.find((p) => p.plotId === plotId);
    if (!plot) return null;
    if (plot.soil === 'planted' && plot.ready) {
      return { action: 'harvest' };
    }
    if (this.heldItem.itemSku === 'tool_hoe' && plot.soil === 'empty') {
      return { action: 'till' };
    }
    if (this.heldItem.itemSku?.startsWith('seed_') && plot.soil === 'tilled') {
      return { action: 'plant', seedSku: this.heldItem.itemSku };
    }
    if (
      (this.heldItem.itemKind === 'water_pitcher' || this.heldItem.itemSku === 'tool_watering_can') &&
      plot.soil === 'planted' &&
      !plot.ready
    ) {
      return { action: 'water' };
    }
    return null;
  }

  private redrawFarmHoverHighlight(tileX: number | null, tileY: number | null): void {
    if (!this.farmHoverGraphics) return;
    this.farmHoverGraphics.clear();
    if (
      this.currentMapId !== 'farm' ||
      this.decorateState.active ||
      tileX === null ||
      tileY === null ||
      !this.localSprite
    ) {
      this.hoveredFarmPlotId = null;
      return;
    }
    const plotId = farmPlotIndexForTile(tileX, tileY);
    if (plotId === null) {
      this.hoveredFarmPlotId = null;
      return;
    }
    const tPx = this.tilePx();
    if (!isFarmPlotPixelAdjacent(this.localSprite.x, this.localSprite.y - 2, tileX, tileY, tPx)) {
      this.hoveredFarmPlotId = null;
      return;
    }
    const action = this.resolveClickFarmAction(plotId);
    if (!action) {
      this.hoveredFarmPlotId = null;
      return;
    }
    this.hoveredFarmPlotId = plotId;
    const x = tileX * tPx;
    const y = tileY * tPx;
    this.farmHoverGraphics.fillStyle(0xf9df7b, 0.24);
    this.farmHoverGraphics.fillRect(x, y, tPx, tPx);
    this.farmHoverGraphics.lineStyle(1.3, 0xf7cf52, 0.95);
    this.farmHoverGraphics.strokeRect(x + 0.5, y + 0.5, tPx - 1, tPx - 1);
  }

  private setupPointerInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (!Number.isFinite(worldPt.x) || !Number.isFinite(worldPt.y)) return;
      const tileX = Math.floor(worldPt.x / this.tilePx());
      const tileY = Math.floor(worldPt.y / this.tilePx());
      if (!this.decorateState.active) {
        if (this.currentMapId === 'farm') {
          this.hoveredFarmTile = { tileX, tileY };
          this.redrawFarmHoverHighlight(tileX, tileY);
        } else {
          this.hoveredFarmTile = null;
          if (this.hoveredFarmPlotId !== null) {
            this.redrawFarmHoverHighlight(null, null);
          }
        }
        return;
      }
      this.hoveredFarmTile = null;
      if (!this.hoverTile || this.hoverTile.tileX !== tileX || this.hoverTile.tileY !== tileY) {
        this.hoverTile = { tileX, tileY };
        this.redrawDecoratePreview();
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      void gameAudio.unlock();
      if (this.paused || this.renderSuspended || document.hidden) return;
      // Ignore slight drag gestures
      if (pointer.getDistance() > 14) return;

      const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (!Number.isFinite(worldPt.x) || !Number.isFinite(worldPt.y)) return;
      const tPx = this.tilePx();
      const tileX = Math.floor(worldPt.x / tPx);
      const tileY = Math.floor(worldPt.y / tPx);
      const mapDef = getMapDefinition(this.currentMapId);
      if (tileX < 0 || tileY < 0 || tileX >= mapDef.widthTiles || tileY >= mapDef.heightTiles) {
        return;
      }

      if (this.decorateState.active) {
        this.pendingTapAction = null;
        this.handleDecorateTap(tileX, tileY);
        return;
      }

      this.pendingTapAction = null;

      if (this.tiledNpcs.length > 0 && this.localSprite) {
        const tappedNpc = this.tiledNpcs.find(
          (npc) => Math.hypot(worldPt.x - npc.body.x, worldPt.y - (npc.body.y - 8)) <= 16,
        );
        if (tappedNpc) {
          const distToPlayer = Math.hypot(
            tappedNpc.body.x - this.localSprite.x,
            tappedNpc.body.y - this.localSprite.y,
          );
          if (distToPlayer <= 68) {
            this.clearTemporaryStaticPosture();
            this.pathQueue = [];
            this.tapMarker?.clear();
            this.localFacing = facingTowardPoint(
              this.localSprite.x,
              this.localSprite.y,
              tappedNpc.body.x,
              tappedNpc.body.y,
              this.localFacing,
            );
            this.playLocalMoveAnim(false, false);
            this.openDialogueWithNpc(tappedNpc);
            return;
          }
        }
      }

      if (this.tryHandleDirectInteractiveTap(worldPt.x, worldPt.y)) {
        return;
      }

      if (this.currentMapId === 'farm') {
        const plotId = farmPlotIndexForTile(tileX, tileY);
        const farmAction = plotId !== null ? this.resolveClickFarmAction(plotId) : null;
        if (plotId !== null && farmAction) {
          const tPx = this.tilePx();
          const plotCenterX = (tileX + 0.5) * tPx;
          const plotCenterY = (tileY + 0.5) * tPx;
          if (isFarmPlotPixelAdjacent(this.localSprite.x, this.localSprite.y - 2, tileX, tileY, tPx)) {
            this.clearTemporaryStaticPosture();
            this.pathQueue = [];
            this.tapMarker?.clear();
            this.localFacing = facingTowardPoint(
              this.localSprite.x,
              this.localSprite.y - 2,
              plotCenterX,
              plotCenterY,
              this.localFacing,
            );
            this.localFacing8 = this.localFacing;
            this.playLocalMoveAnim(false, false);
            gameEventBus.emit('evt:farm-plot-click-request', {
              plotId,
              action: farmAction.action,
              seedSku: farmAction.seedSku,
            });
            return;
          }
          // Non-adjacent click: walk toward nearest reachable tile only, NEVER auto-farm on arrival.
          const startTile = {
            tileX: Math.floor(this.localSprite.x / tPx),
            tileY: Math.floor((this.localSprite.y - 2) / tPx),
          };
          const candidates = [
            { tileX, tileY: tileY + 1 },
            { tileX: tileX - 1, tileY },
            { tileX: tileX + 1, tileY },
            { tileX, tileY: tileY - 1 },
            { tileX, tileY },
          ];
          for (const cand of candidates) {
            if (cand.tileX < 0 || cand.tileY < 0 || cand.tileX >= mapDef.widthTiles || cand.tileY >= mapDef.heightTiles) {
              continue;
            }
            if (this.blockedGrid.has(`${cand.tileX},${cand.tileY}`)) continue;
            const path = findTilePath(
              startTile,
              cand,
              mapDef.widthTiles,
              mapDef.heightTiles,
              this.blockedGrid,
              mapDef.canStepElevation,
            );
            if (path.length > 0) {
              this.clearTemporaryStaticPosture();
              this.pathQueue = path;
              const destTile = path[path.length - 1]!;
              this.drawTapMarker(destTile.tileX, destTile.tileY);
              return;
            }
          }
        }
      }

      const startTile = {
        tileX: Math.floor(this.localSprite.x / this.tilePx()),
        tileY: Math.floor((this.localSprite.y - 2) / this.tilePx()),
      };
      const path = findTilePath(
        startTile,
        { tileX, tileY },
        mapDef.widthTiles,
        mapDef.heightTiles,
        this.blockedGrid,
        mapDef.canStepElevation,
      );
      if (path.length > 0) {
        this.clearTemporaryStaticPosture();
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
      if (!isDecorateMapId(this.currentMapId)) return;
      gameEventBus.emit('evt:decorate-place', {
        mapId: this.currentMapId,
        sku: this.decorateState.activeSku,
        tileX,
        tileY,
        rotated: this.decorateState.previewRotated,
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
    this.tapMarker.fillRect(tileX * this.tilePx() + 2, tileY * this.tilePx() + 2, this.tilePx() - 4, this.tilePx() - 4);
    this.tapMarker.strokeRect(tileX * this.tilePx() + 2, tileY * this.tilePx() + 2, this.tilePx() - 4, this.tilePx() - 4);
  }

  private redrawDecorateOverlay(): void {
    if (!this.decorateGridGraphics) return;
    this.decorateGridGraphics.clear();
    if (!this.decorateState.active || !isDecorateMapId(this.currentMapId)) {
      this.decoratePreviewGraphics.clear();
      this.hideDecoratePreviewGhost();
      return;
    }

    const def = getMapDefinition(this.currentMapId);
    this.decorateGridGraphics.lineStyle(1, 0xfff8ef, 0.25);
    for (let x = 0; x <= def.widthTiles; x += 1) {
      this.decorateGridGraphics.lineBetween(
        x * this.tilePx(),
        0,
        x * this.tilePx(),
        def.heightTiles * this.tilePx(),
      );
    }
    for (let y = 0; y <= def.heightTiles; y += 1) {
      this.decorateGridGraphics.lineBetween(
        0,
        y * this.tilePx(),
        def.widthTiles * this.tilePx(),
        y * this.tilePx(),
      );
    }
    this.redrawDecoratePreview();
  }

  private hideDecoratePreviewGhost(): void {
    if (this.decoratePreviewGhost) {
      this.decoratePreviewGhost.setVisible(false);
    }
  }

  private redrawDecoratePreview(): void {
    if (!this.decoratePreviewGraphics) return;
    this.decoratePreviewGraphics.clear();
    if (!this.decorateState.active || !isDecorateMapId(this.currentMapId)) {
      this.hideDecoratePreviewGhost();
      return;
    }

    if (this.decorateState.selectedPlacementId) {
      const selected = this.placements.find(
        (p) => p.id === this.decorateState.selectedPlacementId && p.mapId === this.currentMapId,
      );
      if (selected) {
        this.decoratePreviewGraphics.lineStyle(2, 0xf4c158, 1);
        this.decoratePreviewGraphics.strokeRect(
          selected.tileX * this.tilePx(),
          selected.tileY * this.tilePx(),
          selected.widthTiles * this.tilePx(),
          selected.heightTiles * this.tilePx(),
        );
      }
    }

    if (!this.hoverTile) {
      this.hideDecoratePreviewGhost();
      return;
    }
    let previewSku = this.decorateState.activeSku;
    let ignoreId: string | undefined;

    if (!previewSku && this.decorateState.selectedPlacementId) {
      const selected = this.placements.find((p) => p.id === this.decorateState.selectedPlacementId);
      if (selected) {
        previewSku = selected.sku;
        ignoreId = selected.id;
      }
    }
    if (!previewSku) {
      this.hideDecoratePreviewGhost();
      return;
    }

    const item = getCatalogItem(previewSku);
    if (!item) {
      this.hideDecoratePreviewGhost();
      return;
    }

    const selectedPlacement = ignoreId
      ? this.placements.find((p) => p.id === ignoreId)
      : undefined;
    const rotated =
      this.decorateState.activeSku != null
        ? this.decorateState.previewRotated
        : selectedPlacement != null &&
          (selectedPlacement.widthTiles !== item.widthTiles ||
            selectedPlacement.heightTiles !== item.heightTiles);
    const footprint = footprintForCatalog(item, rotated);

    const check = validatePlacement({
      mapId: this.currentMapId,
      sku: previewSku,
      tileX: this.hoverTile.tileX,
      tileY: this.hoverTile.tileY,
      placements: this.placements,
      ignorePlacementId: ignoreId,
      footprintWidth: footprint.widthTiles,
      footprintHeight: footprint.heightTiles,
      devSandboxUnlimitedStock: Boolean(import.meta.env.DEV && this.decorateState.devSandbox),
    });

    const color = check.ok ? 0x6b9b76 : 0xe05b5b;
    this.decoratePreviewGraphics.fillStyle(color, 0.35);
    this.decoratePreviewGraphics.lineStyle(1.5, color, 0.95);
    this.decoratePreviewGraphics.fillRect(
      this.hoverTile.tileX * this.tilePx(),
      this.hoverTile.tileY * this.tilePx(),
      footprint.widthTiles * this.tilePx(),
      footprint.heightTiles * this.tilePx(),
    );
    this.decoratePreviewGraphics.strokeRect(
      this.hoverTile.tileX * this.tilePx(),
      this.hoverTile.tileY * this.tilePx(),
      footprint.widthTiles * this.tilePx(),
      footprint.heightTiles * this.tilePx(),
    );

    const { key, frame } = worldFurnitureFrame(this, previewSku);
    if (!this.textures.exists(key)) {
      this.hideDecoratePreviewGhost();
      return;
    }

    const anchor = decorateGhostAnchorFromFootprint({
      tileX: this.hoverTile.tileX,
      tileY: this.hoverTile.tileY,
      widthTiles: footprint.widthTiles,
      heightTiles: footprint.heightTiles,
      tilePx: this.tilePx(),
      layerSlot: item.layerSlot,
    });

    if (!this.decoratePreviewGhost) {
      this.decoratePreviewGhost = frame !== undefined
        ? this.add.image(anchor.centerX, anchor.footY, key, frame).setOrigin(0.5, 1).setDepth(9045)
        : this.add.image(anchor.centerX, anchor.footY, key).setOrigin(0.5, 1).setDepth(9045);
    } else {
      if (frame !== undefined) {
        this.decoratePreviewGhost.setTexture(key, frame);
      } else {
        this.decoratePreviewGhost.setTexture(key);
      }
      this.decoratePreviewGhost.setPosition(anchor.centerX, anchor.footY);
      this.decoratePreviewGhost.setVisible(true);
    }
    applyWorldFurnitureDisplaySize(
      this.decoratePreviewGhost,
      previewSku,
      footprint.widthTiles,
      footprint.heightTiles,
      this.tilePx(),
    );
    this.decoratePreviewGhost.setDepth(9045);
    this.decoratePreviewGhost.setAlpha(check.ok ? 0.62 : 0.48);
    this.decoratePreviewGhost.setTint(check.ok ? 0xffffff : 0xffb0b0);
  }

  private bindEventBus(): void {
    if (import.meta.env.DEV) {
      this.unsubscribes.push(gameEventBus.on('cmd:sync-physical-drops', ({ mapId, drops }) => {
        if (mapId !== this.currentMapId) return;
        this.physicalDrops ??= new PhysicalDropVisuals(this);
        this.physicalDrops.sync(drops);
      }));
    }

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

      gameEventBus.on('cmd:set-map', ({ mapId, spawnTile, portalId }) => {
        if (mapId !== this.currentMapId || spawnTile) {
          this.buildMap(mapId, spawnTile, portalId);
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
          this.emitLocalMovement('idle', true);
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

      gameEventBus.on('evt:decorate-rotate-preview', ({ rotated }) => {
        this.decorateState = { ...this.decorateState, previewRotated: rotated };
        this.redrawDecoratePreview();
      }),

      gameEventBus.on('cmd:set-joystick', (vec) => {
        this.joystickVector = vec;
      }),

      gameEventBus.on('cmd:trigger-interact', () => {
        this.triggerNearbyInteraction();
      }),

      gameEventBus.on('cmd:interact-npc', () => {
        this.interactNearestNpc();
      }),

      gameEventBus.on('evt:request-couple-posture', ({ kind, targetId }) => {
        if (kind === 'bench_sit' && targetId && this.tryEnterAnchorBench(targetId)) {
          return;
        }
        this.enterSharedPosture(kind);
      }),

      gameEventBus.on('cmd:env-transition', (hook) => {
        this.playEnvTransition(hook);
      }),

      gameEventBus.on('cmd:apply-home-bowl', ({ kind }) => {
        if (this.currentMapId !== 'home') return;
        if (kind === 'food') this.homeBowls = fillHomeFoodBowl(this.homeBowls);
        else if (kind === 'water') this.homeBowls = pourHomeWaterBowl(this.homeBowls);
        this.syncHomeBowlPresentation();
      }),

      gameEventBus.on('cmd:sync-partner-home-bowl', (state) => {
        this.homeBowls = { ...state };
        this.syncHomeBowlPresentation();
      }),

      gameEventBus.on('cmd:play-partner-env-transition', ({ userId, mapId, kind, hookId }) => {
        if (mapId !== this.currentMapId) return;
        const entity = this.remoteEntities.get(userId);
        if (!entity) return;
        this.applyEnvTransitionFx(entity.sprite, {
          kind,
          hookId,
          fromMapId: mapId,
          toMapId: mapId,
        }, true);
      }),

      gameEventBus.on('cmd:pet-field-animal', ({ targetId }) => {
        if (!this.localSprite || !this.ranchEffects) return;
        const target = this.collectFieldAnimalTargets().find((entry) => entry.id === targetId);
        if (!target || Math.hypot(target.x - this.localSprite.x, target.y - this.localSprite.y) > target.maxRadiusPx) return;
        const scale = this.tilePx() / 16;
        this.ranchEffects.play('fx_pet', target.x, target.y - 15 * scale, Math.round(target.y) + 1, scale);
      }),
      gameEventBus.on('cmd:sync-held-item', (held) => {
        this.heldItem = held;
        if (this.currentMapId === 'farm' && this.hoveredFarmTile) {
          this.redrawFarmHoverHighlight(this.hoveredFarmTile.tileX, this.hoveredFarmTile.tileY);
        }
        if (this.localSprite) {
          this.emitLocalPositionSync();
          this.emitLocalMovement(this.localMoving ? 'walk' : 'idle', true);
        }
      }),

      gameEventBus.on('cmd:set-network-metrics', ({ jitterMs }) => {
        this.networkJitterMs =
          typeof jitterMs === 'number' && Number.isFinite(jitterMs) ? Math.max(0, jitterMs) : 0;
      }),

      gameEventBus.on('cmd:sync-farm', ({ worldId, version, serverNowMs, plots, highlightPlotId, highlightAction }) => {
        const previous = this.farmVisualRevision;
        const sameWorld = previous?.worldId === worldId;
        if (sameWorld && (previous.version > version || (previous.version === version && previous.nowMs > serverNowMs))) return;
        const advanced = sameWorld && previous.version + 1 === version;
        const acknowledged: { action: PlotEffect; plotId: number } | null = highlightPlotId != null && (highlightAction === 'till' || highlightAction === 'plant' ||
          highlightAction === 'water' || highlightAction === 'harvest')
          ? { action: highlightAction, plotId: highlightPlotId } : null;
        const effects = advanced ? confirmedPlotEffects(this.farmPlotsCache, plots)
          : acknowledged && (!sameWorld || previous.version < version) ? [acknowledged] : [];
        // Sprinkler projection can already show one water charge. Keep the
        // confirmed manual splash when that projection masks the increment.
        if (advanced && acknowledged?.action === 'water' && effects.length === 0) effects.push(acknowledged);

        this.farmVisualRevision = { worldId, version, nowMs: serverNowMs };
        this.farmPlotsCache = plots;
        if (this.currentMapId !== 'farm') return;
        const tillPop = acknowledged?.action === 'till' && effects.some((effect) => effect.plotId === highlightPlotId);
        this.farmPlotVisual?.sync(plots, tillPop ? highlightPlotId : undefined);
        if (this.hoveredFarmTile) this.redrawFarmHoverHighlight(this.hoveredFarmTile.tileX, this.hoveredFarmTile.tileY);
        const tileSize = this.tilePx();
        for (const effect of effects) {
          const tile = farmPlotTileForIndex(effect.plotId);
          if (!tile) continue;
          const x = (tile.tileX + 0.5) * tileSize;
          const y = (tile.tileY + 0.5) * tileSize;
          this.ranchEffects?.play(`fx_${effect.action}`, x, y, 3.57, tileSize / 16);
        }
        if (acknowledged && effects.length) {
          this.triggerDonorToolSwing(acknowledged.action === 'till' ? 'hoe' : acknowledged.action, true, false);
        }
      }),

      gameEventBus.on('cmd:sync-deep-farm', (deep) => {
        const previous = this.deepFarmCache;
        if (previous?.worldId === deep.worldId && (
          previous.version > deep.version || (previous.version === deep.version && previous.serverNowMs > deep.serverNowMs)
        )) return;
        this.deepFarmCache = deep;
        this.deepFarmReceivedAt = performance.now();
        if (this.currentMapId === 'farm') {
          this.orchardVisual?.sync(deep.orchardViews, deep.calendar.season);
          this.livestockVisual?.sync(deep.projectedLivestock);
          this.syncWorkshopMachines();
          for (const effect of confirmedDeepFarmEffects(previous, deep)) {
            const anchor = effect.kind === 'tree'
              ? this.orchardVisual?.playHarvestShake(effect.slotIndex)
              : this.livestockVisual?.getEffectAnchor(effect.animalId);
            if (!anchor) continue;
            const animation = effect.kind === 'tree' ? harvestDropAnimation(effect.treeId) : 'fx_pet';
            this.ranchEffects?.play(animation, anchor.x, anchor.y, anchor.depth, anchor.scale);
          }
          this.refreshBlockedGrid();
        }
      }),

      gameEventBus.on('cmd:enable-physical-home-storage', (enabled) => {
        this.physicalHomeStorage = enabled;
        if (!this.buildingMap) this.syncStorageCabinet();
      }),

      gameEventBus.on('cmd:fishing-visual', (cue) => {
        if (this.ranchFishing?.sync(this.localUserId, cue, this.localSprite) && cue.phase === 'casting') {
          playDonorToolUseAnim(this, this.localSprite, this.localTextureKey, this.localFacing, 'fish');
        }
      }),
      gameEventBus.on('evt:donor-fishing-sync', (session) => {
        if (session.anglerUserId === this.localUserId) return;
        const remote = this.remoteEntities.get(session.anglerUserId);
        if (remote?.mapId !== this.currentMapId) return;
        if (this.ranchFishing?.sync(session.anglerUserId, { ...session, reelProgress: session.progressPermille / 1000 }, remote.sprite, true) && session.phase === 'casting') {
          playDonorToolUseAnim(this, remote.sprite, remote.textureKey, remote.facing, 'fish');
        }
      }),

      gameEventBus.on('cmd:set-paused', ({ paused, keepAnimating }) => {
        this.paused = paused;
        if (this.petCareMode) return;
        if (paused) this.emitLocalMovement('idle');
        if (paused && !keepAnimating) {
          if (this.scene.isActive()) this.scene.pause();
        } else if (!this.renderSuspended) {
          if (this.scene.isPaused()) this.scene.resume();
        }
      }),

      gameEventBus.on('cmd:set-render-suspended', ({ suspended }) => {
        this.renderSuspended = suspended;
        if (suspended) {
          this.emitLocalMovement('idle');
          this.pathQueue = [];
          this.joystickVector = { vx: 0, vy: 0 };
          this.input.enabled = false;
          if (this.input.keyboard) {
            this.input.keyboard.resetKeys();
            this.input.keyboard.enabled = false;
          }
          this.game.sound?.pauseAll?.();
          if (this.scene.isActive()) {
            this.scene.pause();
          }
          if (this.game.loop.running) {
            this.game.loop.sleep();
          }
          this.game.canvas.dataset.renderSuspended = '1';
        } else {
          this.game.canvas.dataset.renderSuspended = '0';
          if (!this.game.loop.running) {
            this.game.loop.wake();
          }
          this.game.sound?.resumeAll?.();
          this.input.enabled = true;
          if (this.input.keyboard) {
            this.input.keyboard.resetKeys();
            this.input.keyboard.enabled = true;
          }
          if (!this.paused && !this.petCareMode && this.scene.isPaused()) {
            this.scene.resume();
          }
          this.handleResize(true);
        }
      }),

      gameEventBus.on('cmd:sync-pet', (pet) => {
        this.petSnapshot = pet;
        this.petEntity?.syncSnapshot(pet, this.currentMapId);
      }),

      gameEventBus.on('cmd:pet-reaction', ({ action }) => {
        this.petEntity?.triggerReaction(action);
        gameAudio.playNaturalCatMeow(action === 'feed' ? 'hungry_food' : 'happy', { force: true });
      }),

      gameEventBus.on('cmd:set-study-pet-mode', ({ active }) => {
        this.studyPetMode = active;
        this.petEntity?.setStudyMode(active);
      }),
      gameEventBus.on('cmd:set-active-npc-dialogue', ({ npcId }) => {
        this.activeDialogueNpcId = npcId;
      }),

      gameEventBus.on('cmd:pet-local-food-offer', (offer) => {
        this.livingPetDriver?.setFoodOffer(offer);
        this.petEntity?.triggerReaction('feed');
      }),

      gameEventBus.on('cmd:pet-care-mode', ({ active }) => {
        this.setPetCareMode(active);
      }),


      gameEventBus.on('cmd:seat-at-desk', ({ seat }) => {
        if (!seat || this.currentMapId !== 'home') {
          this.clearLocalPosture(false);
          return;
        }
        const desk = this.placements.find((p) => p.mapId === 'home' && p.sku === 'desk_study');
        if (!desk) return;
        this.capturePrePostureAnchor();
        this.pathQueue = [];
        this.tapMarker?.clear();
        const seatX = (desk.tileX + (seat === 'left' ? 0.5 : 1.5)) * this.tilePx();
        const seatY = (desk.tileY + desk.heightTiles + 0.65) * this.tilePx();
        this.localSprite.setPosition(seatX, seatY);
        this.localFacing = 'up';
        this.localPosture = 'sit_study';
        this.playLocalMoveAnim(false);
        this.emitCurrentTile(true);
        this.emitLocalMovement('idle', true);
        this.emitLocalPostureChanged(0);
      }),

      gameEventBus.on(
        'cmd:apply-local-posture',
        ({ posture, x, y, facing, phaseStartedAtMs, anchorX, anchorY }) => {
          if (posture === 'none') {
            this.clearLocalPosture(false);
            this.playLocalMoveAnim(false);
            return;
          }
          this.capturePrePostureAnchor();
          this.pathQueue = [];
          this.tapMarker?.clear();
          this.couplePhaseStartedAtMs = phaseStartedAtMs ?? Date.now();
          this.coupleReleaseStartedAtMs = null;
          this.coupleApproachTarget = null;
          const targetFacing = facing ?? this.localFacing;
          const s = this.avatarScale();
          const isPairedP0 = posture === 'hug' || posture === 'hold_hands';
          if (typeof x === 'number' && typeof y === 'number') {
            let scaledX = x;
            const scaledY = typeof anchorY === 'number' && isPairedP0 ? anchorY : y;
            if (isPairedP0 && typeof anchorX === 'number') {
              const sideSign = x < anchorX ? -1 : 1;
              const halfPx = posture === 'hug' ? 6.6 * s : 7.6 * s;
              scaledX = anchorX + sideSign * halfPx;
            }
            const safe = isPairedP0
              ? this.canStandAtPixel(scaledX, scaledY)
                ? { x: scaledX, y: scaledY }
                : this.findNearestWalkableNearPx(scaledX, scaledY)
              : { x: scaledX, y: scaledY };
            const dist = Math.hypot(safe.x - this.localSprite.x, safe.y - this.localSprite.y);
            if (isPairedP0 && dist > 1.5 && dist <= 48 * s) {
              this.coupleApproachTarget = { x: safe.x, y: safe.y, facing: targetFacing };
            } else {
              this.localSprite.setPosition(safe.x, safe.y);
              this.localFacing = targetFacing;
              this.localFacing8 = targetFacing;
            }
          } else if (facing) {
            this.localFacing = facing;
            this.localFacing8 = facing;
          }
          this.localPosture = posture;
          if (isPairedP0) {
            this.coupleWalkFollowGraceUntilMs = Date.now() + 1800;
          }
          this.playLocalMoveAnim(Boolean(this.coupleApproachTarget));
          this.emitCurrentTile(true);
          this.emitLocalMovement(this.coupleApproachTarget ? 'walk' : 'idle', true);
          this.emitLocalPostureChanged(0);
        },
      ),

      gameEventBus.on('cmd:cancel-local-posture', () => {
        this.clearLocalPosture(true);
        this.playLocalMoveAnim(false);
      }),

      gameEventBus.on(
        'cmd:sync-remote-posture',
        ({ userId, mapId, posture, x, y, facing, phaseStartedAtMs, anchorX, anchorY }) => {
          const entity = this.remoteEntities.get(userId);
          if (!entity) return;
          if (
            posture === 'none' &&
            (this.localPosture === 'hug' || this.localPosture === 'hold_hands') &&
            entity.mapId === this.currentMapId &&
            Date.now() > this.coupleWalkFollowGraceUntilMs
          ) {
            this.clearLocalPosture(true);
            this.playLocalMoveAnim(false);
          }
          entity.mapId = mapId;
          entity.posture = posture;
          entity.phaseStartedAtMs = phaseStartedAtMs ?? Date.now();
          entity.anchorX = anchorX;
          entity.anchorY = anchorY;
          const s = this.avatarScale();
          if (posture !== 'none') {
            const isPairedP0 = posture === 'hug' || posture === 'hold_hands';
            let scaledX = x;
            const scaledY = typeof anchorY === 'number' && isPairedP0 ? anchorY : y;
            if (isPairedP0 && typeof anchorX === 'number') {
              const sideSign = x < anchorX ? -1 : 1;
              const halfPx = posture === 'hug' ? 6.6 * s : 7.6 * s;
              scaledX = anchorX + sideSign * halfPx;
            }
            const dist = Math.hypot(scaledX - entity.sprite.x, scaledY - entity.sprite.y);
            entity.targetX = scaledX;
            entity.targetY = scaledY;
            entity.facing = facing;
            entity.facing8 = facing;
            if (!isPairedP0 || dist <= 1.5 || dist > 48 * s) {
              entity.sprite.setPosition(scaledX, scaledY);
            }
          }
          const stillApproaching =
            (posture === 'hug' || posture === 'hold_hands') &&
            Math.hypot(entity.targetX - entity.sprite.x, entity.targetY - entity.sprite.y) > 1.5;
          playAvatarPostureAnim(
            this,
            entity.sprite,
            entity.textureKey,
            stillApproaching ? (posture === 'hold_hands' ? 'hold_hands' : 'none') : entity.posture,
            entity.facing8 ?? entity.facing,
            stillApproaching,
          );
          this.syncRemoteBlanket(entity);
          this.syncRemoteRestAura(entity);
          this.reconcileRemoteVisibility();
        },
      ),

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

      gameEventBus.on('cmd:sync-world-clock', (payload) => {
        this.worldClockPresentation = payload;
        const cam = this.cameras.main;
        const playerScreenPos =
          this.localSprite && cam.width > 0 && cam.height > 0
            ? {
                x: cam.width * 0.5 + (this.localSprite.x - cam.worldView.centerX) * cam.zoom,
                y: cam.height * 0.5 + (this.localSprite.y - 10 - cam.worldView.centerY) * cam.zoom,
              }
            : null;
        this.worldLighting?.apply(payload, this.isIndoorMap(), playerScreenPos);
      }),
    );

    const devVqgHooks =
      import.meta.env.DEV ||
      (typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('vqg-capture') === '1');
    if (devVqgHooks && typeof globalThis !== 'undefined') {
      const globalDev = globalThis as {
        __olwDevEnterPosture?: (kind: 'sofa_sit' | 'bench_sit' | 'bed_lie') => void;
        __olwDevSetFacing8?: (f8: Facing8) => void;
      };
      globalDev.__olwDevEnterPosture = (kind) => {
        this.enterSharedPosture(kind);
      };
      globalDev.__olwDevSetFacing8 = (f8) => {
        this.localFacing8 = f8;
        this.localFacing = cardinalFromFacing8(f8);
        this.game.canvas.dataset.localFacing8 = f8;
        this.playLocalMoveAnim(true);
      };
      (globalThis as { __olwDevEnvTransition?: (hookId: string, kind?: EnvInteractionHook['kind']) => void }).__olwDevEnvTransition =
        (hookId, kind = 'door') => {
          this.playEnvTransition({
            kind,
            hookId,
            fromMapId: this.currentMapId,
            toMapId: this.currentMapId,
          });
        };
      (globalThis as { __olwDevApplyHomeBowl?: (kind: 'food' | 'water') => void }).__olwDevApplyHomeBowl = (kind) => {
        gameEventBus.emit('cmd:apply-home-bowl', { kind });
      };
      (globalThis as { __olwDevTravelPortal?: (portalId: string) => void }).__olwDevTravelPortal = (portalId) => {
        const def = getMapDefinition(this.currentMapId);
        const portal = def.portals.find((p) => p.id === portalId);
        if (!portal) return;
        gameEventBus.emit('evt:request-map-change', {
          targetMapId: portal.targetMapId,
          spawnX: portal.targetSpawnX,
          spawnY: portal.targetSpawnY,
          portalId: portal.id,
        });
      };
    }
  }

  private setPetCareMode(active: boolean): void {
    if (this.petCareMode === active) return;
    this.petCareMode = active;
    setPetCareModeActive(active);
    gameAudio.setPetCareMusicActive(active);

    if (active) {
      this.pathQueue = [];
      this.cameras.main.stopFollow();
      if (this.petEntity) {
        this.petEntity.setCareCloseUp(false);
        this.petEntity.setVisible(false);
      }
      this.scene.setVisible(false);
      if (this.scene.isActive()) this.scene.pause();
      const visual = this.petEntity?.getVisualIdentity() ?? {
        variant: 'ginger-tabby' as const,
        accessory: 'ribbon_rose' as const,
        name: this.petSnapshot?.name ?? 'Quýt',
      };
      enterPetCareRuntime(this.game, {
        variant: visual.variant,
        accessory: visual.accessory,
        petName: visual.name,
        traitId: this.livingPetDriver?.getTraitPresetId(),
        petSnapshot: this.petSnapshot,
      });
    } else {
      exitPetCareRuntime(this.game);
      const savedCare = getPersistedPetCareV2State();
      if (savedCare) {
        this.livingPetDriver?.syncCareNeeds(savedCare.needs);
      }
      this.scene.setVisible(true);
      if (!this.paused && !this.renderSuspended) {
        this.scene.resume();
      }
      if (this.petEntity && (this.petSnapshot ? FOLLOW_CAT_MAPS.has(this.currentMapId) : this.currentMapId === 'home')) {
        this.petEntity.setCareCloseUp(false);
        this.petEntity.setVisible(true);
      }
      this.handleResize(true);
    }
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
    if (this.petCareMode) return;
    const def = getMapDefinition(this.currentMapId);
    const width = Math.max(1, this.scale.width || 400);
    const height = Math.max(1, this.scale.height || 600);
    const worldW = def.widthTiles * this.tilePx();
    const worldH = def.heightTiles * this.tilePx();

    cam.setRoundPixels(true);
    if (this.decorateState.active) {
      cam.stopFollow();
      cam.removeBounds();
      cam.setZoom(fitWorldZoom(width, height, worldW, worldH));
      cam.centerOn(worldW / 2, worldH / 2);
    } else {
      const zoom = computeGameplayZoom(width, height, worldW, worldH, this.tilePx());
      cam.setZoom(zoom);
      const largeWorld =
        this.currentMapId === 'outdoor' || isTiledWorldMapId(this.currentMapId);
      const wideTiledOutdoor =
        this.currentMapId === 'village' ||
        this.currentMapId === 'farm' ||
        this.currentMapId === 'forest' ||
        this.currentMapId === 'beach';
      const marginX = wideTiledOutdoor ? 0 : largeWorld ? 4 : 8;
      const marginY = wideTiledOutdoor ? 0 : largeWorld ? 4 : 8;
      const scenic = computeScenicBounds(width, height, zoom, worldW, worldH, marginX, marginY);
      cam.setBounds(scenic.x, scenic.y, scenic.width, scenic.height);
      const fitsEntireMapHorizontally = width / zoom >= worldW;
      const fitsEntireMapVertically = height / zoom >= worldH;
      const forceFollow = largeWorld;
      if (!forceFollow && fitsEntireMapHorizontally && fitsEntireMapVertically) {
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
      canvas.dataset.playerTileX = String(Math.floor(this.localSprite.x / this.tilePx()));
      canvas.dataset.playerTileY = String(Math.floor((this.localSprite.y - 2) / this.tilePx()));
    }
    if (import.meta.env.DEV) {
      canvas.dataset.petDriverMode = this.livingPetDriver ? 'canonical' : 'none';
      if (this.petEntity?.isOnMapVisible()) {
        const loco = this.petEntity.getLocomotionState();
        canvas.dataset.petX = String(Math.round(loco.x * 10) / 10);
        canvas.dataset.petY = String(Math.round(loco.y * 10) / 10);
        canvas.dataset.petFacing = loco.facing;
        canvas.dataset.petAnim = loco.animState;
      } else {
        delete canvas.dataset.petX;
        delete canvas.dataset.petY;
        delete canvas.dataset.petFacing;
        delete canvas.dataset.petAnim;
      }
    }
  }

  update(time: number, deltaMs: number): void {
    if (this.renderSuspended || document.hidden) return;
    this.ranchFishing?.update();
    this.physicalDrops?.update(time);
    if (this.paused) return;

    const dtSec = Math.min(deltaMs, 50) / 1000;
    const now = Date.now();
    if (this.motes.length > 0) {
      updateAmbientMotes(this.motes, this.moteBounds, dtSec, time / 1000, this.ambientMoteKind);
    }

    this.donorToolController.update(deltaMs);
    const moved = this.updateLocalMovement(dtSec);
    this.localMoving = moved;
    this.updatePendingTapAction();
    const isNight = Boolean(this.worldClockPresentation?.lighting.night);
    const weatherKind = this.worldClockPresentation?.weather.kind ?? 'sunny';
    const mapDef = getMapDefinition(this.currentMapId);
    const tPx = this.tilePx();
    const isBlockedTile = (tx: number, ty: number) =>
      tx < 0 ||
      ty < 0 ||
      tx >= mapDef.widthTiles ||
      ty >= mapDef.heightTiles ||
      this.blockedGrid.has(`${tx},${ty}`);

    let nearestChickenDistPx = Infinity;
    const running = Boolean(this.wasd?.SHIFT.isDown);
    const toolSwinging = this.donorToolController.isMovementLocked();

    const catPos = this.petEntity?.isOnMapVisible() ? this.petEntity.getWorldPosition() : null;
    if (this.ambientChickens.length > 0) {
      for (const ch of this.ambientChickens) {
        stepEmergentChicken(ch.state, {
          nowMs: now,
          dtSec,
          tilePx: tPx,
          playerX: this.localSprite?.x ?? null,
          playerY: this.localSprite?.y ?? null,
          catX: catPos?.x ?? null,
          catY: catPos?.y ?? null,
          playerRunning: moved && running,
          toolSwinging,
          heldItemSku: this.heldItem.itemSku,
          isNight,
          weatherKind,
          isTileBlocked: isBlockedTile,
        });
        syncAmbientChickenVisual(this, ch);
        if (this.petEntity) {
          const petPos = this.petEntity.getWorldPosition();
          nearestChickenDistPx = Math.min(nearestChickenDistPx, Math.hypot(petPos.x - ch.state.x, petPos.y - ch.state.y));
        }
      }
    }

    if (this.ambientDucks.length > 0) {
      for (const dk of this.ambientDucks) {
        stepEmergentDuck(dk.state, {
          nowMs: now,
          dtSec,
          playerX: this.localSprite?.x ?? null,
          playerY: this.localSprite?.y ?? null,
          playerRunning: moved && running,
          isNight,
        });
        syncAmbientDuckVisual(this, dk);
        if (dk.state.ripplePulse && now - dk.lastRippleAtMs >= 880) {
          dk.lastRippleAtMs = now;
          const ripple = this.add
            .ellipse(dk.state.x, dk.state.y + 1, 7, 3.5, 0xd8f5ff, 0)
            .setStrokeStyle(0.9, 0xe8fbff, 0.58)
            .setDepth(3.4);
          this.tweens.add({
            targets: ripple,
            scaleX: 1.9,
            scaleY: 1.7,
            alpha: 0,
            duration: 520,
            ease: 'Sine.Out',
            onComplete: () => ripple.destroy(),
          });
        }
      }
    }

    if (this.ambientSheep.length > 0) {
      for (const sp of this.ambientSheep) {
        stepEmergentSheep(sp.state, {
          nowMs: now,
          dtSec,
          tilePx: tPx,
          playerX: this.localSprite?.x ?? null,
          playerY: this.localSprite?.y ?? null,
          playerRunning: moved && running,
          toolSwinging,
          heldItemSku: this.heldItem.itemSku,
          isNight,
          weatherKind,
          isTileBlocked: isBlockedTile,
          isForbiddenTile:
            this.currentMapId === 'farm'
              ? (tx, ty) => farmPlotIndexForTile(tx, ty) !== null
              : undefined,
        });
        syncAmbientSheepVisual(this, sp);
      }
    }

    if (this.ambientCrabs.length > 0) {
      for (const cr of this.ambientCrabs) {
        stepEmergentCrab(cr.state, {
          nowMs: now,
          dtSec,
          tilePx: tPx,
          playerX: this.localSprite?.x ?? null,
          playerY: this.localSprite?.y ?? null,
          playerRunning: moved && running,
          toolSwinging,
          heldItemSku: this.heldItem.itemSku,
          isNight,
          weatherKind,
          isTileBlocked: isBlockedTile,
        });
        cr.sprite
          .setPosition(cr.state.x, cr.state.y)
          .setFlipX(cr.state.facing === 'left')
          .setDepth(Math.round(cr.state.y));
        cr.sprite.anims.timeScale = cr.state.animRateScale;
        cr.shadow.setPosition(cr.state.x, cr.state.y - 1);
      }
    }

    if (this.ambientSnails.length > 0) {
      for (const sn of this.ambientSnails) {
        stepEmergentSnail(sn.state, {
          nowMs: now,
          dtSec,
          tilePx: tPx,
          playerX: this.localSprite?.x ?? null,
          playerY: this.localSprite?.y ?? null,
          playerRunning: moved && running,
          toolSwinging,
          heldItemSku: this.heldItem.itemSku,
          isNight,
          weatherKind,
          isTileBlocked: isBlockedTile,
        });
        sn.sprite
          .setPosition(sn.state.x, sn.state.y)
          .setFlipX(sn.state.facing === 'left')
          .setDepth(Math.round(sn.state.y));
        sn.sprite.anims.timeScale = sn.state.animRateScale;
        sn.shadow.setPosition(sn.state.x, sn.state.y - 1);
      }
    }

    if (
      !this.petCareMode &&
      this.livingPetDriver &&
      this.petEntity &&
      this.petSnapshot &&
      FOLLOW_CAT_MAPS.has(this.currentMapId)
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
        tilePx: tPx,
        isTileBlocked: isBlockedTile,
        canStepTile: mapDef.canStepElevation,
        playerPosture: this.localPosture,
        isNight,
        weatherKind,
        playerFarmingActive:
          this.currentMapId === 'farm' &&
          (this.donorToolController.isMovementLocked() ||
            this.heldItem.itemSku === 'tool_hoe' ||
            Boolean(this.heldItem.itemSku?.startsWith('seed_'))),
        nearestChickenDistPx,
      });
      this.petEntity.applyLivingLocomotion(out.loco, out.ambientBubble);
      if (
        !isNight &&
        this.localPosture === 'none' &&
        this.localSprite &&
        this.petEntity.isOnMapVisible()
      ) {
        const petPos = this.petEntity.getWorldPosition();
        if (Math.hypot(petPos.x - this.localSprite.x, petPos.y - this.localSprite.y) <= 42) {
          gameAudio.playNaturalCatMeow('ambient', { isSleeping: isNight });
        }
      }
      if (
        import.meta.env.DEV &&
        this.livingPetSimulationActive &&
        now - this.lastLivingPetTelemetryAtMs >= 500
      ) {
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
    this.updateRemoteEntities(time, deltaMs);
    const approachMoved = !moved ? this.updateCoupleApproach(dtSec) : false;
    const companionMoved =
      !moved && !approachMoved ? this.updateHoldHandsCompanion(dtSec) : false;
    const totalMoved = moved || approachMoved || companionMoved;
    this.localMoving = totalMoved;
    this.updateCoupleAnimationOverlay(now, totalMoved);
    const npcActorObstacles: ActorCollider[] = [];
    if (this.localSprite) {
      npcActorObstacles.push({
        id: 'local-player',
        x: this.localSprite.x,
        y: this.localSprite.y,
        radiusPx: PLAYER_ACTOR_RADIUS_PX,
        kind: 'player',
      });
    }
    tickTiledWorldNpcs(this, this.tiledNpcs, now, dtSec, {
      playerX: this.localSprite?.x ?? null,
      playerY: this.localSprite?.y ?? null,
      playerPosture: this.localPosture,
      isNight,
      weatherKind,
      activeDialogueNpcId: this.activeDialogueNpcId,
      partnerInSameRoom: Array.from(this.remoteEntities.values()).some(
        (remote) => remote.mapId === this.currentMapId,
      ),
      isTileBlocked: isBlockedTile,
      canStepTile: mapDef.canStepElevation,
      actorObstacles: npcActorObstacles,
    });
    if (this.currentMapId === 'farm') {
      this.livestockVisual?.step(deltaMs);
    }
    this.checkPortalsAndNearbyInteractable();
    this.syncHeldItemPresentation(time);
    this.emitInteractionFrameIfDue(now);
    if (this.worldClockPresentation && this.worldLighting) {
      const cam = this.cameras.main;
      const playerScreenPos =
        this.localSprite && cam.width > 0 && cam.height > 0
          ? {
              x: cam.width * 0.5 + (this.localSprite.x - cam.worldView.centerX) * cam.zoom,
              y: cam.height * 0.5 + (this.localSprite.y - 10 - cam.worldView.centerY) * cam.zoom,
            }
          : null;
      this.worldLighting.apply(this.worldClockPresentation, this.isIndoorMap(), playerScreenPos);
    }
    this.syncCameraDataset();
    this.emitLocalMovement(this.localMoving ? 'walk' : 'idle');

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
      this.pendingTapAction = null;
      this.localSprite.stop();
      this.localSprite.setFrame(avatarIdleFrame(this.localTextureKey, this.localFacing));
      return false;
    }

    if (this.donorToolController.isMovementLocked()) {
      this.pendingTapAction = null;
      this.pathQueue = [];
      this.tapMarker?.clear();
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

    const running = Boolean(this.wasd?.SHIFT.isDown);
    const speed = 78 * (running ? 1.45 : 1) * (this.tilePx() >= 64 ? 2.5 : 1);
    const manualMag = Math.hypot(vx, vy);

    if (manualMag > 0.15) {
      this.pendingTapAction = null;
      this.coupleApproachTarget = null;
      this.clearTemporaryStaticPosture();
      this.pathQueue = [];
      this.tapMarker?.clear();

      const nx = vx / Math.max(1, manualMag);
      const ny = vy / Math.max(1, manualMag);
      const stepX = nx * speed * dtSec;
      const stepY = ny * speed * dtSec;

      this.localFacing = this.vectorToDirection(nx, ny);
      this.localFacing8 = resolveFacing8(nx, ny, this.localFacing);
      if (this.localPosture === 'hold_hands') {
        const partner = Array.from(this.remoteEntities.values()).find(
          (e) => e.mapId === this.currentMapId && e.posture === 'hold_hands',
        );
        if (partner && Date.now() - this.couplePhaseStartedAtMs > 500) {
          const tether = evaluateHoldHandsTether({
            nextLeaderX: this.localSprite.x + stepX,
            nextLeaderY: this.localSprite.y + stepY,
            curLeaderX: this.localSprite.x,
            curLeaderY: this.localSprite.y,
            followerX: partner.sprite.x,
            followerY: partner.sprite.y,
            scale: this.avatarScale(),
          });
          if (tether.shouldBreakHold) {
            this.clearLocalPosture(true);
          } else if (!tether.allowLeaderStep) {
            this.playLocalMoveAnim(false, false);
            return false;
          }
        }
      }
      const moved = this.tryMovePixel(stepX, stepY);
      this.playLocalMoveAnim(moved, running);
      if (moved) {
        const footTx = Math.floor(this.localSprite.x / this.tilePx());
        const footTy = Math.floor((this.localSprite.y - 2) / this.tilePx());
        const surface = resolveFootstepSurface({
          mapId: this.currentMapId,
          tileX: footTx,
          tileY: footTy,
          isFarmPlotTile: this.currentMapId === 'farm' && farmPlotIndexForTile(footTx, footTy) !== null,
        });
        gameAudio.playFootstepForSurface(surface, { running });
      }
      if (moved && running && this.time.now - this.lastRunDustAtMs > 170) {
        this.lastRunDustAtMs = this.time.now;
        this.spawnRunDust(this.localSprite.x, this.localSprite.y);
      }
      this.emitCurrentTile(false);
      return moved;
    }

    if (this.pathQueue.length > 0) {
      const target = this.pathQueue[0]!;
      const tx = (target.tileX + 0.5) * this.tilePx();
      const ty = (target.tileY + 0.85) * this.tilePx();
      const dx = tx - this.localSprite.x;
      const dy = ty - this.localSprite.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 2) {
        this.localSprite.setPosition(tx, ty);
        this.pathQueue.shift();
        if (this.pathQueue.length === 0) {
          this.tapMarker?.clear();
          this.playLocalMoveAnim(false, false);
          this.emitCurrentTile(false);
          return false;
        }
      } else {
        const step = Math.min(speed * dtSec, dist);
        const mx = (dx / dist) * step;
        const my = (dy / dist) * step;
        if (this.localPosture === 'hold_hands') {
          const partner = Array.from(this.remoteEntities.values()).find(
            (e) => e.mapId === this.currentMapId && e.posture === 'hold_hands',
          );
          if (partner && Date.now() - this.couplePhaseStartedAtMs > 500) {
            const tether = evaluateHoldHandsTether({
              nextLeaderX: this.localSprite.x + mx,
              nextLeaderY: this.localSprite.y + my,
              curLeaderX: this.localSprite.x,
              curLeaderY: this.localSprite.y,
              followerX: partner.sprite.x,
              followerY: partner.sprite.y,
              scale: this.avatarScale(),
            });
            if (tether.shouldBreakHold) {
              this.clearLocalPosture(true);
            } else if (!tether.allowLeaderStep) {
              this.localFacing = this.vectorToDirection(dx, dy);
              this.localFacing8 = resolveFacing8(dx, dy, this.localFacing);
              this.playLocalMoveAnim(false, false);
              return false;
            }
          }
        }
        const stepOk = this.tryMovePixel(mx, my);
        if (!stepOk) {
          this.pathQueue = [];
          this.tapMarker?.clear();
          this.playLocalMoveAnim(false, false);
          this.emitCurrentTile(false);
          return false;
        }
        this.localFacing = this.vectorToDirection(dx, dy);
        this.localFacing8 = resolveFacing8(dx, dy, this.localFacing);
        this.playLocalMoveAnim(true, running);
        const footTx = Math.floor(this.localSprite.x / this.tilePx());
        const footTy = Math.floor((this.localSprite.y - 2) / this.tilePx());
        const surface = resolveFootstepSurface({
          mapId: this.currentMapId,
          tileX: footTx,
          tileY: footTy,
          isFarmPlotTile: this.currentMapId === 'farm' && farmPlotIndexForTile(footTx, footTy) !== null,
        });
        gameAudio.playFootstepForSurface(surface, { running });
        this.emitCurrentTile(false);
        return true;
      }
    }

    this.playLocalMoveAnim(false, false);
    return false;
  }

  private tryMovePixel(dx: number, dy: number): boolean {
    const maxStepPx = 2;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStepPx));
    const stepX = dx / steps;
    const stepY = dy / steps;
    let movedAny = false;

    for (let i = 0; i < steps; i += 1) {
      const curX = this.localSprite.x;
      const curY = this.localSprite.y;
      const canX = stepX !== 0 && this.canStandAtPixel(curX + stepX, curY, curX, curY);
      const canY = stepY !== 0 && this.canStandAtPixel(curX, curY + stepY, curX, curY);

      if (stepX !== 0 && stepY !== 0) {
        if (
          canX &&
          canY &&
          this.canStandAtPixel(curX + stepX, curY + stepY, curX, curY)
        ) {
          this.localSprite.setPosition(curX + stepX, curY + stepY);
          movedAny = true;
          continue;
        }
        if (canX) {
          this.localSprite.x = curX + stepX;
          movedAny = true;
          continue;
        }
        if (canY) {
          this.localSprite.y = curY + stepY;
          movedAny = true;
          continue;
        }
        break;
      }

      if (canX) {
        this.localSprite.x = curX + stepX;
        movedAny = true;
      } else if (canY) {
        this.localSprite.y = curY + stepY;
        movedAny = true;
      } else {
        break;
      }
    }

    return movedAny;
  }

  private canStandAtPixel(px: number, py: number, fromPx?: number, fromPy?: number): boolean {
    const def = getMapDefinition(this.currentMapId);
    const tPx = this.tilePx();
    const halfW = 4;
    const corners = [
      { x: px - halfW, y: py - 5 },
      { x: px + halfW, y: py - 5 },
      { x: px - halfW, y: py - 1 },
      { x: px + halfW, y: py - 1 },
    ];
    const refX = fromPx ?? this.localSprite?.x;
    const refY = fromPy ?? this.localSprite?.y;
    const fromTx = refX !== undefined ? Math.floor(refX / tPx) : null;
    const fromTy = refY !== undefined ? Math.floor((refY - 2) / tPx) : null;

    if (fromTx !== null && fromTy !== null && def.canStepElevation) {
      const footTx = Math.floor(px / tPx);
      const footTy = Math.floor((py - 2) / tPx);
      if (!def.canStepElevation(fromTx, fromTy, footTx, footTy)) {
        return false;
      }
    }

    for (const c of corners) {
      const tx = Math.floor(c.x / tPx);
      const ty = Math.floor(c.y / tPx);
      if (tx < 0 || ty < 0 || tx >= def.widthTiles || ty >= def.heightTiles) {
        return false;
      }
      if (this.blockedGrid.has(`${tx},${ty}`)) {
        return false;
      }
      if (fromTx !== null && fromTy !== null && def.canStepElevation) {
        if (!def.canStepElevation(fromTx, fromTy, tx, ty)) {
          return false;
        }
      }
    }
    if (this.localSprite) {
      const actorObstacles: ActorCollider[] = [];
      for (const npc of this.tiledNpcs) {
        actorObstacles.push({
          id: npc.id,
          x: npc.body.x,
          y: npc.body.y,
          radiusPx: NPC_ACTOR_RADIUS_PX,
          kind: 'npc',
        });
      }
      if (
        actorObstacles.length > 0 &&
        isBlockedByActorColliders(
          px,
          py,
          this.localSprite.x,
          this.localSprite.y,
          PLAYER_ACTOR_RADIUS_PX,
          actorObstacles,
        )
      ) {
        return false;
      }
    }
    return true;
  }

  private playLocalMoveAnim(moving: boolean, running = false): void {
    const s = this.avatarScale();
    const preserveHoldHands = this.localPosture === 'hold_hands';
    const activePosture: CouplePostureKind = moving && !preserveHoldHands ? 'none' : this.localPosture;
    const isLying = activePosture === 'lie_bed';
    const isSitting = activePosture.startsWith('sit_');
    const depthBoost = activePosture === 'lie_bed' ? 42 : activePosture === 'sit_sofa' ? 42 : activePosture === 'sit_bench' ? 28 : 0;
    this.localShadow.setPosition(this.localSprite.x, this.localSprite.y - 1 * s);
    this.localShadow.setDisplaySize((isSitting ? 12 : 14) * s, 5 * s);
    this.localShadow.setVisible(!isLying);
    this.localSprite.setDepth(this.localSprite.y + depthBoost);
    this.localShadow.setDepth(this.localSprite.y - 1);
    this.localLabel.setPosition(this.localSprite.x, this.localSprite.y - this.nameTagOffsetY(activePosture));
    this.game.canvas.dataset.localPosture = this.localPosture;

    if (moving) {
      if (this.localBlanket) this.localBlanket.setVisible(false);
      this.syncLocalRestAura(false);
      if (!preserveHoldHands) {
        this.coupleAffectionIcon?.setVisible(false);
      } else {
        this.syncCoupleAffectionVisual();
      }
      playAvatarPostureAnim(
        this,
        this.localSprite,
        this.localTextureKey,
        preserveHoldHands ? 'hold_hands' : 'none',
        this.localFacing8,
        true,
        running,
      );
      return;
    }

    playAvatarPostureAnim(
      this,
      this.localSprite,
      this.localTextureKey,
      this.localPosture,
      this.localFacing8,
      false,
      false,
    );

    if (this.localPosture === 'lie_bed') {
      if (!this.localBlanket) {
        this.localBlanket = this.buildCozyQuilt(this.localSprite.x, this.localSprite.y + 1.2 * s, 0xf2b7c6);
      }
      this.localBlanket
        .setPosition(this.localSprite.x, this.localSprite.y + 1.2 * s)
        .setDepth(this.localSprite.y + 44)
        .setScale(s)
        .setVisible(true);
      this.syncLocalRestAura(true, 'zzz…');
    } else {
      if (this.localBlanket) this.localBlanket.setVisible(false);
      const resting =
        this.localPosture === 'sit_sofa' ||
        this.localPosture === 'sit_bench' ||
        this.localPosture === 'sit_study';
      this.syncLocalRestAura(resting, resting ? '♨' : null);
    }

    this.syncCoupleAffectionVisual();

    if (this.localPosture === 'none') {
      resetAvatarSpriteOrigin(this.localSprite);
    }
  }

  private syncCoupleAffectionVisual(): void {
    const partner = Array.from(this.remoteEntities.values()).find(
      (e) => e.mapId === this.currentMapId,
    );
    const sameRoomSittingOrCuddling =
      partner &&
      (this.localPosture === 'sit_sofa' ||
        this.localPosture === 'sit_bench' ||
        this.localPosture === 'lie_bed') &&
      partner.posture === this.localPosture;

    if (!sameRoomSittingOrCuddling || !partner) {
      this.coupleAffectionIcon?.setVisible(false);
      return;
    }

    const icon = '♥';
    const midX = (this.localSprite.x + partner.sprite.x) / 2;
    const midY = Math.min(this.localSprite.y, partner.sprite.y) - 36 * this.avatarScale();
    if (!this.coupleAffectionIcon) {
      this.coupleAffectionIcon = this.add
        .text(midX, midY, icon, { fontSize: '9px', color: '#ff8da6', resolution: 4 })
        .setOrigin(0.5, 1)
        .setDepth(12_050);
    }
    this.coupleAffectionIcon
      .setText(icon)
      .setPosition(midX, midY + Math.sin(this.time.now / 260) * 1.5)
      .setScale(this.avatarScale())
      .setVisible(true);
  }

  private syncLocalRestAura(visible: boolean, label: string | null = '♨'): void {
    if (!visible || !label) {
      this.localRestAura?.setVisible(false);
      return;
    }
    if (!this.localRestAura) {
      this.localRestAura = this.add
        .text(0, 0, label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '7px',
          fontStyle: 'bold',
          color: '#ffe8c7',
          backgroundColor: '#261a20cc',
          padding: { x: 3, y: 1 },
          resolution: 4,
        })
        .setOrigin(0.5, 1)
        .setDepth(12_000);
    }
    const s = this.avatarScale();
    this.localRestAura
      .setText(label)
      .setScale(s)
      .setPosition(this.localSprite.x, this.localSprite.y - 34 * s)
      .setDepth(this.localSprite.y + 30)
      .setVisible(true);
  }

  private syncRemoteRestAura(entity: RemoteAvatarEntity): void {
    const resting =
      entity.posture === 'lie_bed' ||
      entity.posture === 'sit_sofa' ||
      entity.posture === 'sit_bench' ||
      entity.posture === 'sit_study';
    if (!resting || entity.mapId !== this.currentMapId) return;
    void entity;
  }

  private emitLocalPostureChanged(slotIndex: number): void {
    gameEventBus.emit('evt:local-posture-changed', {
      posture: this.localPosture,
      slotIndex,
      x: this.localSprite.x,
      y: this.localSprite.y,
      facing: this.localFacing,
      mapId: this.currentMapId,
    });
  }

  private tryEnterAnchorBench(targetId: string): boolean {
    if (
      targetId === 'cabacos_plaza_well' ||
      targetId === 'cabacos_interior_town_hall_counter' ||
      targetId === 'beach_gull_bay_sign' ||
      targetId === 'beach_lifebuoy_post'
    ) {
      return false;
    }
    let slot0: { x: number; y: number } | null = null;
    let slot1: { x: number; y: number } | null = null;

    if (this.currentMapId === 'outdoor') {
      const anchors = MAIN_GAME_WORLD_ANCHORS.outdoor;
      const slots: Record<string, { x: number; y: number; slot1?: { x: number; y: number } }> = {
        outdoor_picnic: {
          x: anchors.picnicPx.x - 6,
          y: anchors.picnicPx.y,
          slot1: { x: anchors.picnicPx.x + 6, y: anchors.picnicPx.y },
        },
        outdoor_sunset: {
          x: anchors.sunsetBenchPx.x - 6,
          y: anchors.sunsetBenchPx.y,
          slot1: { x: anchors.sunsetBenchPx.x + 6, y: anchors.sunsetBenchPx.y },
        },
      };
      const anchor = slots[targetId];
      if (anchor) {
        slot0 = { x: anchor.x, y: anchor.y };
        slot1 = anchor.slot1 ?? { x: anchor.x + 12, y: anchor.y };
      }
    }

    if (!slot0 || !slot1) {
      const targets = buildTiledWorldInteractableTargets(this.currentMapId, isDonorEconomyUiEnabled());
      const bench = targets.find((t) => t.id === targetId && t.kind === 'bench');
      if (!bench) return false;
      slot0 = { x: bench.x - 7, y: bench.y };
      slot1 = { x: bench.x + 7, y: bench.y };
    }

    const occupiedSlots: number[] = [];
    for (const remote of this.remoteEntities.values()) {
      if (remote.mapId !== this.currentMapId || remote.posture !== 'sit_bench') continue;
      if (Math.hypot(remote.sprite.x - slot0.x, remote.sprite.y - slot0.y) < 12) occupiedSlots.push(0);
      else if (Math.hypot(remote.sprite.x - slot1.x, remote.sprite.y - slot1.y) < 12) occupiedSlots.push(1);
    }
    const slotIndex = pickAvailableSharedSlot(occupiedSlots, 0);
    const chosen = slotIndex === 0 ? slot0 : slot1;

    this.capturePrePostureAnchor();
    this.pathQueue = [];
    this.tapMarker?.clear();
    this.localSprite.setPosition(chosen.x, chosen.y);
    this.localFacing = 'down';
    this.localPosture = 'sit_bench';
    this.playLocalMoveAnim(false);
    this.emitCurrentTile(true);
    this.emitLocalMovement('idle', true);
    this.emitLocalPostureChanged(slotIndex);
    return true;
  }

  private vectorToDirection(dx: number, dy: number): Direction {
    this.localFacing8 = resolveFacing8(dx, dy, this.localFacing8);
    this.localFacing = cardinalFromFacing8(this.localFacing8);
    this.game.canvas.dataset.localFacing8 = this.localFacing8;
    return this.localFacing;
  }

  private playEnvTransition(hook: EnvInteractionHook): void {
    if (!this.localSprite) return;
    this.applyEnvTransitionFx(this.localSprite, hook);
  }

  private applyEnvTransitionFx(
    sprite: Phaser.GameObjects.Sprite,
    hook: EnvInteractionHook,
    mirrorPartner = false,
  ): void {
    // Do NOT animate sprite.y / scaleY during transitions — map switches rebuild the scene cleanly via camera fade.
    if (mirrorPartner) {
      this.tweens.add({
        targets: sprite,
        alpha: 0.45,
        duration: 140,
        yoyo: true,
        ease: 'Sine.Out',
        onComplete: () => {
          if (sprite.scene) sprite.setAlpha(1);
        },
      });
      return;
    }

    this.game.canvas.dataset.envTransitionHook = hook.hookId;
    this.game.canvas.dataset.envTransitionKind = hook.kind;
    if (hook.kind === 'door' && this.homeDoorGfx && hook.hookId.includes('garden_door')) {
      this.tweens.add({
        targets: this.homeDoorGfx,
        scaleX: 0.78,
        duration: 130,
        yoyo: true,
        ease: 'Sine.Out',
      });
    }
  }

  private findNearbyInteractable(): NearbyInteractable | null {
    const tileX = this.localSprite.x / this.tilePx() - 0.5;
    const tileY = (this.localSprite.y - 2) / this.tilePx() - 0.5;
    const def = getMapDefinition(this.currentMapId);

    const tileXi = Math.floor(this.localSprite.x / this.tilePx());
    const tileYi = Math.floor((this.localSprite.y - 2) / this.tilePx());
    const npc = nearestTiledNpc(this.tiledNpcs, tileXi, tileYi);
    if (npc) {
      return { kind: 'npc_talk', labelVi: `Trò chuyện · ${npc.labelVi}` };
    }

    for (const portal of def.portals) {
      if (portal.targetMapId === this.currentMapId) continue;
      const dist = Math.hypot(tileX - portal.tileX, tileY - portal.tileY);
      if (dist <= portal.radiusTiles) {
        return { kind: 'portal', labelVi: portal.labelVi };
      }
    }

    if (FOLLOW_CAT_MAPS.has(this.currentMapId) && this.petEntity?.isNearbyTile(tileX, tileY)) {
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
      const cx = p.tileX + p.widthTiles / 2;
      const cy = p.tileY + p.heightTiles / 2;
      const reachTiles = p.sku === 'bed_cozy' ? 2.6 : 2.35;
      if (Math.hypot(tileX - cx, tileY - cy) <= reachTiles) {
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
    const tileX = Math.floor(this.localSprite.x / this.tilePx());
    const tileY = Math.floor((this.localSprite.y - 2) / this.tilePx());

    if (this.buildingMap || now - this.lastPortalAtMs < 1400) return;

    const movedFromArrival =
      !this.arrivedAtTile ||
      Math.hypot(tileX - this.arrivedAtTile.tileX, tileY - this.arrivedAtTile.tileY) >= 1.4;

    if (movedFromArrival) {
      for (const portal of def.portals) {
        if (portal.targetMapId === this.currentMapId) continue;
        const dist = Math.hypot(tileX - portal.tileX, tileY - portal.tileY);
        if (dist <= 0.95) {
          this.lastPortalAtMs = now;
          gameAudio.playSfx('door', { volumeScale: 0.72 });
          gameEventBus.emit('evt:request-map-change', {
            targetMapId: portal.targetMapId,
            spawnX: portal.targetSpawnX,
            spawnY: portal.targetSpawnY,
            portalId: portal.id,
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
      const tileX = Math.floor((this.localSprite.x - 8) / this.tilePx());
      const tileY = Math.floor((this.localSprite.y - 8) / this.tilePx());
      const portal =
        def.portals.find((p) => p.labelVi === near.labelVi) ??
        def.portals.find((p) => {
          const dist = Math.hypot(tileX - p.tileX, tileY - p.tileY);
          return dist <= p.radiusTiles + 0.5;
        });
      if (portal) {
        gameAudio.playSfx('door', { volumeScale: 0.72 });
        gameEventBus.emit('evt:request-map-change', {
          targetMapId: portal.targetMapId,
          spawnX: portal.targetSpawnX,
          spawnY: portal.targetSpawnY,
          portalId: portal.id,
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
    } else if (near.kind === 'npc_talk') {
      this.interactNearestNpc();
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

  private openDialogueWithNpc(npc: TiledWorldNpcEntity): void {
    gameAudio.playSfx('ui_select', { volumeScale: 0.55 });
    gameEventBus.emit('evt:open-npc-dialogue', {
      npcId: npc.id,
      mapId: this.currentMapId,
      labelVi: npc.labelVi,
      role: npc.role,
      fallbackDialogueVi: npc.dialogueVi,
    });
  }

  private interactNearestNpc(): boolean {
    if (!this.localSprite) return false;
    const tileX = Math.floor(this.localSprite.x / this.tilePx());
    const tileY = Math.floor((this.localSprite.y - 2) / this.tilePx());
    const npc = nearestTiledNpc(this.tiledNpcs, tileX, tileY);
    if (!npc) return false;
    this.openDialogueWithNpc(npc);
    return true;
  }

  private clearTemporaryStaticPosture(): void {
    if (this.localPosture === 'hold_hands') return;
    this.clearLocalPosture(true);
  }

  private updateCoupleApproach(dtSec: number): boolean {
    const target = this.coupleApproachTarget;
    if (!target || !this.localSprite) return false;
    if (this.localPosture !== 'hug' && this.localPosture !== 'hold_hands') {
      this.coupleApproachTarget = null;
      return false;
    }
    const dx = target.x - this.localSprite.x;
    const dy = target.y - this.localSprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1.5) {
      if (this.canStandAtPixel(target.x, target.y)) {
        this.localSprite.setPosition(target.x, target.y);
      }
      this.localFacing = target.facing;
      this.localFacing8 = target.facing;
      this.coupleApproachTarget = null;
      this.playLocalMoveAnim(false, false);
      this.emitCurrentTile(true);
      this.emitLocalMovement('idle', true);
      return false;
    }
    const speed = 78 * (this.tilePx() >= 64 ? 2.5 : 1);
    const step = Math.min(speed * dtSec, dist);
    const mx = (dx / dist) * step;
    const my = (dy / dist) * step;
    const moved = this.tryMovePixel(mx, my);
    if (!moved) {
      this.localFacing = target.facing;
      this.localFacing8 = target.facing;
      this.coupleApproachTarget = null;
      this.playLocalMoveAnim(false, false);
      return false;
    }
    this.localFacing = this.vectorToDirection(dx, dy);
    this.localFacing8 = resolveFacing8(dx, dy, this.localFacing);
    this.playLocalMoveAnim(true, false);
    this.emitCurrentTile(false);
    return true;
  }

  private updateHoldHandsCompanion(dtSec: number): boolean {
    if (
      this.localPosture !== 'hold_hands' ||
      !this.localSprite ||
      this.decorateState.active ||
      this.donorToolController.isMovementLocked() ||
      this.pathQueue.length > 0
    ) {
      return false;
    }
    const partner = Array.from(this.remoteEntities.values()).find(
      (e) => e.mapId === this.currentMapId,
    );
    const pastGrace = Date.now() > this.coupleWalkFollowGraceUntilMs;
    if (!partner || (pastGrace && partner.posture !== 'hold_hands')) {
      if (pastGrace) {
        this.clearLocalPosture(true);
        this.playLocalMoveAnim(false);
      }
      return false;
    }
    const s = this.avatarScale();
    const dist = Math.hypot(partner.sprite.x - this.localSprite.x, partner.sprite.y - this.localSprite.y);
    if (dist > 136 * s) {
      this.clearLocalPosture(true);
      this.playLocalMoveAnim(false);
      return false;
    }

    const partnerWalking =
      partner.anim === 'walk' ||
      Math.hypot(partner.targetX - partner.sprite.x, partner.targetY - partner.sprite.y) > 0.5;
    if (!partnerWalking && dist <= 18 * s) {
      if (this.localFacing !== partner.facing) {
        this.localFacing = partner.facing;
        this.localFacing8 = partner.facing8 ?? partner.facing;
        this.playLocalMoveAnim(false, false);
      }
      return false;
    }

    const preferLeft = this.localSprite.x <= partner.sprite.x;
    const target = computeHoldHandsCompanionTarget({
      leaderX: partner.sprite.x,
      leaderY: partner.sprite.y,
      leaderFacing: partner.facing,
      followerX: this.localSprite.x,
      followerY: this.localSprite.y,
      preferLeft,
      scale: s,
      canStand: (cx, cy) => this.canStandAtPixel(cx, cy),
    });

    const dx = target.x - this.localSprite.x;
    const dy = target.y - this.localSprite.y;
    const gDist = Math.hypot(dx, dy);
    if (gDist <= 2) {
      if (!partnerWalking && this.localFacing !== partner.facing) {
        this.localFacing = partner.facing;
        this.localFacing8 = partner.facing8 ?? partner.facing;
        this.playLocalMoveAnim(false, false);
      }
      return false;
    }

    const baseSpeed = 78 * (this.tilePx() >= 64 ? 2.5 : 1);
    const catchupMult = gDist > 8 * s ? 1.28 : 1.04;
    const step = Math.min(baseSpeed * catchupMult * dtSec, gDist);
    const mx = (dx / gDist) * step;
    const my = (dy / gDist) * step;
    const moved = this.tryMovePixel(mx, my);
    if (moved) {
      this.localFacing = partnerWalking || gDist > 6 * s ? this.vectorToDirection(dx, dy) : partner.facing;
      this.localFacing8 = resolveFacing8(dx, dy, this.localFacing);
      this.playLocalMoveAnim(true, false);
      this.emitCurrentTile(false);
    }
    return moved;
  }

  private updateCoupleAnimationOverlay(timeMs: number, localMoving: boolean): void {
    if (!this.coupleAnimationRenderer || !this.localSprite) return;
    const partner = Array.from(this.remoteEntities.values()).find(
      (e) => e.mapId === this.currentMapId,
    );
    const localMember = this.members.find((m) => m.userId === this.localUserId);
    const partnerMember = partner ? this.members.find((m) => m.userId === partner.userId) : undefined;
    const partnerMoving = partner
      ? partner.anim === 'walk' ||
        Math.hypot(partner.targetX - partner.sprite.x, partner.targetY - partner.sprite.y) > 0.5
      : false;
    this.coupleAnimationRenderer.update({
      localX: this.localSprite.x,
      localY: this.localSprite.y,
      localFacing: this.localFacing,
      localMoving,
      localPosture: this.localPosture,
      localAvatar: localMember?.avatarConfig ?? null,
      partnerX: partner?.sprite.x ?? 0,
      partnerY: partner?.sprite.y ?? 0,
      partnerFacing: partner?.facing ?? 'down',
      partnerMoving,
      partnerPosture: partner?.posture ?? 'none',
      partnerAvatar: partnerMember?.avatarConfig ?? partner?.avatarConfig ?? null,
      phaseStartedAtMs: this.couplePhaseStartedAtMs,
      releaseStartedAtMs: this.coupleReleaseStartedAtMs,
      releasing: Boolean(this.coupleReleaseStartedAtMs),
      sameRoom: Boolean(partner && partner.mapId === this.currentMapId),
      scale: this.avatarScale(),
      timeMs,
    });
    const phase = this.coupleAnimationRenderer.lastRenderedPhase;
    if (phase === 'none') {
      delete this.game.canvas.dataset.couplePhase;
      delete this.game.canvas.dataset.coupleHandGap;
    } else {
      this.game.canvas.dataset.couplePhase = phase;
      this.game.canvas.dataset.coupleHandGap = String(
        Math.round(this.coupleAnimationRenderer.lastHandGapPx * 100) / 100,
      );
    }
  }

  private clearLocalPosture(emit: boolean): void {
    const hadPosture = this.localPosture !== 'none';
    this.localPosture = 'none';
    this.couplePhaseStartedAtMs = 0;
    this.coupleReleaseStartedAtMs = null;
    this.coupleApproachTarget = null;
    if (this.localBlanket) {
      this.localBlanket.setVisible(false);
    }
    if (hadPosture && this.localSprite) {
      resetAvatarSpriteOrigin(this.localSprite);
      this.localSprite.setRotation(0);
      if (this.localTextureKey && this.localSprite.texture?.key !== this.localTextureKey && this.textures.exists(this.localTextureKey)) {
        this.localSprite.stop();
        this.localSprite.setTexture(this.localTextureKey, avatarIdleFrame(this.localTextureKey, this.localFacing));
      }
      if (!this.canStandAtPixel(this.localSprite.x, this.localSprite.y)) {
        const safe =
          this.prePosturePos && this.canStandAtPixel(this.prePosturePos.x, this.prePosturePos.y)
            ? this.prePosturePos
            : this.findNearestWalkableNearPx(this.localSprite.x, this.localSprite.y);
        this.localSprite.setPosition(safe.x, safe.y);
      }
      this.prePosturePos = null;
      this.syncLocalRestAura(false);
      this.coupleAffectionIcon?.setVisible(false);
      this.game.canvas.dataset.localPosture = 'none';
      delete this.game.canvas.dataset.couplePhase;
      delete this.game.canvas.dataset.coupleHandGap;
    }
    if (emit && hadPosture) {
      this.emitLocalMovement('idle', true);
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

    const slot0 = resolveSharedPostureSeat(kind, item, 0, this.tilePx());
    const slot1 = resolveSharedPostureSeat(kind, item, 1, this.tilePx());

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
    this.capturePrePostureAnchor();
    this.pathQueue = [];
    this.tapMarker?.clear();
    this.tweens.killTweensOf(this.localSprite);
    this.localSprite.setRotation(0);
    this.localSprite.setPosition(chosen.x, chosen.y);
    this.localSprite.setVisible(true);
    this.localFacing = chosen.facing;
    this.localPosture = targetPosture;
    this.playLocalMoveAnim(false);
    this.emitCurrentTile(true);
    this.emitLocalMovement('idle', true);
    this.emitLocalPostureChanged(slotIndex);
  }

  private spawnEmoteBubble(x: number, y: number, symbol: string): void {
    const texBySymbol: Record<string, string> = {
      '❤️': 'olw-emote-heart',
      '💕': 'olw-emote-hearts',
      '👋': 'olw-emote-thumbs',
      '😴': 'olw-emote-sleep',
      '✨': 'olw-emote-star',
      '💭': 'olw-emote-cat',
    };
    const texKey = texBySymbol[symbol];
    if (texKey && this.textures.exists(texKey)) {
      const icon = this.add.image(x, y, texKey).setScale(0.56).setOrigin(0.5, 1).setDepth(9600);
      this.tweens.add({
        targets: icon,
        y: y - 18,
        alpha: 0,
        scale: 0.72,
        duration: 1400,
        ease: 'Sine.Out',
        onComplete: () => icon.destroy(),
      });
      if ((symbol === '❤️' || symbol === '💕' || symbol === '✨') && this.textures.exists('olw-emote-star')) {
        for (const [dx, dy] of [[-10, -4], [10, -6]] as const) {
          const spark = this.add.image(x + dx, y + dy, 'olw-emote-star').setScale(0.28).setDepth(9599);
          this.tweens.add({
            targets: spark,
            x: x + dx * 1.6,
            y: y + dy - 16,
            alpha: 0,
            duration: 1050,
            ease: 'Sine.Out',
            onComplete: () => spark.destroy(),
          });
        }
      }
      return;
    }

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
    const s = this.avatarScale();
    if (entity.posture === 'lie_bed' && entity.mapId === this.currentMapId) {
      if (!entity.blanket) {
        entity.blanket = this.buildCozyQuilt(entity.sprite.x, entity.sprite.y + 1.2 * s, 0xb8d9ee);
      }
      entity.blanket
        .setPosition(entity.sprite.x, entity.sprite.y + 1.2 * s)
        .setDepth(entity.sprite.y + 44)
        .setScale(s)
        .setVisible(true);
    } else if (entity.blanket) {
      entity.blanket.setVisible(false);
    }
  }

  private emitCurrentTile(force: boolean): void {
    const tileX = Math.floor(this.localSprite.x / this.tilePx());
    const tileY = Math.floor((this.localSprite.y - 2) / this.tilePx());
    const key = `${this.currentMapId}:${tileX},${tileY}:${this.localFacing}`;
    if (force || key !== this.lastTileEmitKey) {
      this.lastTileEmitKey = key;
      if (this.currentMapId === 'farm' && this.hoveredFarmTile) {
        this.redrawFarmHoverHighlight(this.hoveredFarmTile.tileX, this.hoveredFarmTile.tileY);
      }
      gameEventBus.emit('evt:local-tile-changed', {
        mapId: this.currentMapId,
        tileX,
        tileY,
        facing: this.localFacing,
      });
      this.emitLocalPositionSync();
    }
  }

  private emitLocalPositionSync(): void {
    if (!this.localSprite) return;
    const tPx = this.tilePx();
    gameEventBus.emit('evt:local-position-sync', {
      mapId: this.currentMapId,
      x: Math.round(this.localSprite.x * 10) / 10,
      y: Math.round(this.localSprite.y * 10) / 10,
      tileX: Math.floor(this.localSprite.x / tPx),
      tileY: Math.floor((this.localSprite.y - 2) / tPx),
      facing: this.localFacing,
      posture: this.localPosture,
      heldItem: this.heldItem,
    });
  }

  private emitRemoteRenderStatus(): void {
    let visibleOnMap = false;
    let firstRemoteMap: MapId | null = null;
    for (const remote of this.remoteEntities.values()) {
      if (firstRemoteMap === null) firstRemoteMap = remote.mapId;
      if (remote.mapId === this.currentMapId && remote.sprite.visible) {
        visibleOnMap = true;
      }
    }
    gameEventBus.emit('evt:remote-render-status', {
      remoteCount: this.remoteEntities.size,
      remoteVisibleOnCurrentMap: visibleOnMap,
      remoteMapId: firstRemoteMap,
    });
  }

  private emitLocalMovement(anim: MovementPacket['anim'], forceIdle = false): void {
    if (this.movementConnection === null || !this.localUserId || !this.sessionId) return;
    const nowMono = performance.now();
    const position = {
      x: Math.round(this.localSprite.x * 10) / 10,
      y: Math.round(this.localSprite.y * 10) / 10,
      facing: this.localFacing,
    };
    if (!this.txThrottle.shouldEmit(nowMono, anim, this.currentMapId, position, forceIdle)) return;

    let vx = 0;
    let vy = 0;
    if (anim === 'walk' && this.lastEmittedMoveAtMs > 0) {
      const dtSec = (nowMono - this.lastEmittedMoveAtMs) / 1000;
      if (dtSec >= 0.02 && dtSec <= 0.6) {
        vx = Math.round(((position.x - this.lastEmittedMoveX) / dtSec) * 10) / 10;
        vy = Math.round(((position.y - this.lastEmittedMoveY) / dtSec) * 10) / 10;
      }
    }
    this.lastEmittedMoveAtMs = nowMono;
    this.lastEmittedMoveX = position.x;
    this.lastEmittedMoveY = position.y;

    const packet: MovementPacket = {
      worldId: this.worldId,
      userId: this.localUserId,
      sessionId: this.sessionId,
      mapId: this.currentMapId,
      seq: this.txThrottle.nextSeq(),
      timestampMs: Date.now(),
      ...position,
      vx,
      vy,
      ...(anim === 'walk' ? { facing8: this.localFacing8 } : {}),
      anim,
      posture: this.localPosture,
      heldItemSku: this.heldItem.itemSku,
      heldItemKind: this.heldItem.itemKind,
      heldIconId: this.heldItem.iconId,
      heldPropsIconId: this.heldItem.propsIconId ?? null,
    };
    gameEventBus.emit('evt:local-movement', packet);
    this.emitLocalPositionSync();
  }

  private ensureRemoteEntity(
    userId: string,
    sessionId: string,
    position: Pick<
      MovementPacket,
      'mapId' | 'x' | 'y' | 'facing' | 'facing8' | 'anim' | 'posture' | 'heldItemSku' | 'heldItemKind' | 'heldIconId' | 'heldPropsIconId'
    >,
    fallbackNickname?: string,
    fallbackAvatarConfig?: AvatarConfig,
  ): RemoteAvatarEntity {
    const existing = this.remoteEntities.get(userId);
    const member = this.members.find((m) => m.userId === userId);
    const presence = this.latestPresences.find((p) => p.userId === userId);
    const avatarConfig =
      member?.avatarConfig ?? presence?.avatarConfig ?? fallbackAvatarConfig ?? DEFAULT_AVATAR_PARTNER_A;
    const nickname = member?.nickname ?? presence?.nickname ?? fallbackNickname ?? 'Người thương';
    if (existing) return existing;

    const texKey = ensurePhaserAvatarTexture(this, avatarConfig);
    const { x: px, y: py } = position;
    const s = this.avatarScale();
    const shadow = placeSoftShadow(this, px, py - 1 * s, 14 * s, 5 * s, py - 1, 0.42);
    const sprite = this.add
      .sprite(px, py, texKey, avatarIdleFrame(texKey, position.facing))
      .setScale(s)
      .setOrigin(0.5, 0.88);
    const tag = this.buildNameTag(px, py - this.nameTagOffsetY('none'), nickname, '#f2a2ba');
    tag.container.setScale(s);
    const heldRenderer = new HeldItemRenderer(this);
    const interpolator = new RemoteMotionInterpolator(px, py, position.mapId, performance.now());

    const created: RemoteAvatarEntity = {
      userId,
      sessionId,
      mapId: position.mapId,
      sprite,
      shadow,
      label: tag.container,
      labelText: tag.text,
      targetX: px,
      targetY: py,
      facing: position.facing,
      facing8: position.facing8,
      anim: position.anim,
      posture: position.posture ?? presence?.posture ?? 'none',
      textureKey: texKey,
      avatarConfig,
      nickname,
      interpolator,
      heldItem: heldItemFromWire(position.heldItemKind ? position : (presence ?? {})),
      heldRenderer,
    };
    this.remoteEntities.set(userId, created);
    return created;
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
      const fallbackPos = {
        x: typeof p.x === 'number' && Number.isFinite(p.x) ? p.x : (p.tileX + 0.5) * this.tilePx(),
        y: typeof p.y === 'number' && Number.isFinite(p.y) ? p.y : (p.tileY + 0.85) * this.tilePx(),
        mapId: p.mapId,
        facing: p.facing,
        anim: 'idle' as const,
        posture: p.posture,
        heldItemSku: p.heldItemSku,
        heldItemKind: p.heldItemKind,
        heldIconId: p.heldIconId,
        heldPropsIconId: p.heldPropsIconId,
      };
      const position = latest?.userId === p.userId && latest.mapId === p.mapId ? latest : fallbackPos;

      if (!existing) {
        this.ensureRemoteEntity(p.userId, p.sessionId, position, nickname, avatarConfig);
      } else {
        const sessionChanged = existing.sessionId !== p.sessionId;
        const mapChanged = existing.mapId !== position.mapId;
        if (p.heldItemKind !== undefined) {
          existing.heldItem = heldItemFromWire(p);
        }
        if (sessionChanged || mapChanged) {
          existing.sessionId = p.sessionId;
          this.setRemoteTarget(existing, position, true);
        } else if (
          !latest &&
          typeof p.x === 'number' &&
          typeof p.y === 'number' &&
          Math.hypot(p.x - existing.targetX, p.y - existing.targetY) > 24
        ) {
          this.setRemoteTarget(existing, position, false);
        } else if (p.posture && existing.anim === 'idle' && existing.posture === 'none') {
          existing.posture = p.posture;
        }
        if (!avatarConfigsEqual(existing.avatarConfig, avatarConfig)) {
          existing.avatarConfig = avatarConfig;
          existing.textureKey = ensurePhaserAvatarTexture(this, avatarConfig);
          existing.sprite.stop();
          existing.sprite.setTexture(existing.textureKey, avatarIdleFrame(existing.textureKey, existing.facing));
        }
        existing.sprite.setScale(this.avatarScale());
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
        entity.heldRenderer.destroy();
        this.remoteEntities.delete(uid);
      }
    }

    this.reconcileRemoteVisibility();
  }

  private syncRemoteAppearancesFromMembers(): void {
    const s = this.avatarScale();
    for (const entity of this.remoteEntities.values()) {
      const member = this.members.find((m) => m.userId === entity.userId);
      if (!member) continue;
      entity.avatarConfig = member.avatarConfig;
      entity.nickname = member.nickname;
      entity.textureKey = ensurePhaserAvatarTexture(this, member.avatarConfig);
      entity.sprite.stop();
      entity.sprite.setTexture(entity.textureKey, avatarIdleFrame(entity.textureKey, entity.facing));
      entity.sprite.setScale(s);
      playAvatarPostureAnim(
        this,
        entity.sprite,
        entity.textureKey,
        entity.posture,
        entity.facing8 ?? entity.facing,
        entity.anim === 'walk',
      );
      this.updateTagText(entity.label, entity.labelText, member.nickname, '#f2a2ba');
    }
    if (this.latestPresences.length > 0) {
      this.reconcileRemotePresences(this.latestPresences);
    }
  }

  private applyRemoteMovementPacket(packet: MovementPacket): void {
    let entity = this.remoteEntities.get(packet.userId);
    let created = false;
    if (!entity) {
      entity = this.ensureRemoteEntity(packet.userId, packet.sessionId, packet);
      created = true;
    } else if (entity.sessionId !== packet.sessionId) {
      entity.sessionId = packet.sessionId;
    }

    const changedMap = created || entity.mapId !== packet.mapId;
    this.setRemoteTarget(entity, packet, changedMap || Boolean(packet.isSnapshotReplay && created));
    if (changedMap) this.reconcileRemoteVisibility();
  }

  private setRemoteTarget(
    entity: RemoteAvatarEntity,
    position: Pick<
      MovementPacket,
      'mapId' | 'x' | 'y' | 'vx' | 'vy' | 'seq' | 'facing' | 'facing8' | 'anim' | 'posture' | 'heldItemSku' | 'heldItemKind' | 'heldIconId' | 'heldPropsIconId'
    > | Pick<MovementPacket, 'mapId' | 'x' | 'y' | 'facing' | 'facing8' | 'anim'>,
    snap: boolean,
  ): void {
    entity.mapId = position.mapId;
    entity.targetX = position.x;
    entity.targetY = position.y;
    entity.facing = position.facing;
    entity.anim = position.anim;
    if ('facing8' in position && position.facing8) {
      entity.facing8 = position.facing8;
    } else if (position.anim === 'walk') {
      const dx = position.x - entity.sprite.x;
      const dy = position.y - entity.sprite.y;
      entity.facing8 = resolveFacing8(dx, dy, entity.facing8 ?? entity.facing);
    }
    if ('heldItemKind' in position && position.heldItemKind !== undefined) {
      entity.heldItem = heldItemFromWire(position);
    }

    const mapDef = getMapDefinition(position.mapId);
    const tPx = getMapTilePixelSize(position.mapId);
    entity.interpolator.pushSample(
      {
        x: position.x,
        y: position.y,
        vx: 'vx' in position ? position.vx : undefined,
        vy: 'vy' in position ? position.vy : undefined,
        anim: position.anim,
        mapId: position.mapId,
        seq: 'seq' in position && typeof position.seq === 'number' ? position.seq : 0,
        receivedAtMonoMs: performance.now(),
      },
      { maxW: mapDef.widthTiles * tPx, maxH: mapDef.heightTiles * tPx },
      snap,
    );

    const hugApproaching =
      entity.posture === 'hug' &&
      Date.now() - (entity.phaseStartedAtMs ?? 0) <= HUG_APPROACH_MS + 220;
    if (
      snap ||
      (position.anim === 'walk' && entity.posture !== 'hold_hands' && !hugApproaching)
    ) {
      entity.posture =
        position.anim === 'idle' && 'posture' in position && position.posture
          ? position.posture
          : 'none';
      if (entity.posture !== 'lie_bed') entity.blanket?.setVisible(false);
    } else if ('posture' in position && position.posture && position.anim === 'idle') {
      entity.posture = position.posture;
    }
    if (snap) {
      const s = this.avatarScale();
      entity.sprite.setPosition(position.x, position.y);
      entity.shadow.setPosition(position.x, position.y - 1 * s);
      entity.label.setPosition(position.x, position.y - this.nameTagOffsetY(entity.posture));
    }
  }

  private reconcileRemoteVisibility(): void {
    const s = this.avatarScale();
    for (const entity of this.remoteEntities.values()) {
      const sameRoom = entity.mapId === this.currentMapId;
      entity.sprite.setVisible(sameRoom);
      entity.shadow.setVisible(sameRoom && entity.posture !== 'lie_bed');
      entity.label.setVisible(sameRoom);
      if (!sameRoom) {
        entity.heldRenderer.sync(0, 0, 0, 'down', false, EMPTY_HELD_ITEM, 0, s, null);
      }
      this.syncRemoteBlanket(entity);
    }
    this.emitRemoteRenderStatus();
  }

  private updateRemoteEntities(timeMs: number, deltaMs: number): void {
    const now = Date.now();
    const nowMono = performance.now();
    const s = this.avatarScale();
    for (const entity of this.remoteEntities.values()) {
      if (entity.mapId !== this.currentMapId) continue;

      const mapDef = getMapDefinition(entity.mapId);
      const tPx = getMapTilePixelSize(entity.mapId);
      const next = entity.interpolator.step(nowMono, deltaMs, this.networkJitterMs, {
        maxW: mapDef.widthTiles * tPx,
        maxH: mapDef.heightTiles * tPx,
      });
      const moving = next.moving;
      const stale = this.remoteFilter.isStale(entity.sessionId, now);
      const remoteMoving = (entity.anim === 'walk' || moving) && !stale;
      const hugApproaching =
        entity.posture === 'hug' &&
        now - (entity.phaseStartedAtMs ?? 0) <= HUG_APPROACH_MS + 220;
      if (moving && entity.posture !== 'hold_hands' && !hugApproaching) {
        entity.posture = 'none';
        entity.blanket?.setVisible(false);
      }
      const activePosture: CouplePostureKind =
        remoteMoving && entity.posture !== 'hold_hands' ? 'none' : entity.posture;
      const depthBoost = activePosture === 'lie_bed' ? 42 : activePosture === 'sit_sofa' ? 42 : activePosture === 'sit_bench' ? 28 : 0;
      entity.sprite.setPosition(next.x, next.y);
      entity.sprite.setDepth(next.y + depthBoost);
      entity.shadow.setPosition(next.x, next.y - 1 * s);
      entity.shadow.setDepth(next.y - 1);
      entity.shadow.setDisplaySize((activePosture.startsWith('sit_') ? 12 : 14) * s, 5 * s);
      entity.shadow.setVisible(activePosture !== 'lie_bed');
      entity.label.setPosition(next.x, next.y - this.nameTagOffsetY(activePosture));
      playAvatarPostureAnim(
        this,
        entity.sprite,
        entity.textureKey,
        activePosture,
        entity.facing8 ?? entity.facing,
        remoteMoving,
      );
      entity.heldRenderer.sync(
        next.x,
        next.y,
        entity.sprite.depth,
        entity.facing,
        remoteMoving,
        entity.heldItem,
        timeMs,
        s,
        null,
      );
      if (entity.posture === 'lie_bed' && !remoteMoving) {
        this.syncRemoteBlanket(entity);
      } else if (entity.blanket) {
        entity.blanket.setVisible(false);
      }
    }
    this.syncCoupleAffectionVisual();
  }

  private syncHomeBowlPresentation(): void {
    this.game.canvas.dataset.homeFoodBowl = this.homeBowls.foodFull ? 'full' : 'empty';
    this.game.canvas.dataset.homeWaterBowl = this.homeBowls.waterFull ? 'full' : 'empty';
    gameEventBus.emit('evt:local-home-bowl-changed', { ...this.homeBowls });
  }

  private syncHeldItemPresentation(timeMs: number): void {
    if (!this.heldRenderer || !this.localSprite) return;
    if (
      this.heldItem.itemKind === 'tool' &&
      this.heldItem.temporaryActionState !== 'none' &&
      this.heldItem.temporaryActionState !== this.lastHeldToolAction
    ) {
      const toolKind = toolKindFromItemSku(this.heldItem.itemSku, this.heldItem.temporaryActionState);
      if (toolKind) {
        this.triggerDonorToolSwing(toolKind);
      } else {
        playDonorToolUseAnim(this, this.localSprite, this.localTextureKey, this.localFacing);
      }
    }
    this.lastHeldToolAction = this.heldItem.temporaryActionState;
    this.heldRenderer.sync(
      this.localSprite.x,
      this.localSprite.y,
      this.localSprite.depth,
      this.localFacing,
      this.localMoving,
      this.heldItem,
      timeMs,
      this.avatarScale(),
      this.donorToolController.getState(),
    );
  }

  private collectFieldAnimalTargets(): InteractableTarget[] {
    const maxRadiusPx = this.tilePx() * 1.5;
    const target = ({ state, sprite }: AmbientChickenHandle | AmbientDuckHandle | AmbientSheepHandle, labelVi: string): InteractableTarget => ({
      id: `field-livestock:${state.id}`,
      kind: 'ambient_livestock',
      labelVi,
      x: sprite.x,
      y: sprite.y,
      maxRadiusPx,
    });
    return [
      ...this.ambientChickens.map((animal) => target(animal, 'Gà')),
      ...this.ambientDucks.map((animal) => target(animal, 'Vịt')),
      ...this.ambientSheep.map((animal) => target(animal, 'Cừu')),
    ];
  }

  private collectSceneInteractableTargets(): InteractableTarget[] {
    const petPos = this.petEntity?.isOnMapVisible() ? this.petEntity.getWorldPosition() : null;
    const interactables = buildMainGameInteractables({
      mapId: this.currentMapId,
      placements: this.placements,
      petWorldPosition: petPos,
      petVisible: Boolean(petPos),
      mailboxUnread: this.mailboxUnreadCount,
      bowlPresentation: { ...this.homeBowls },
      donorEconomyDev: isDonorEconomyUiEnabled(),
      physicalHomeStorage: this.physicalHomeStorage,
    });
    for (const npc of this.tiledNpcs) {
      interactables.push({
        id: `npc:${npc.id}`,
        kind: 'shop_npc',
        labelVi: `Trò chuyện · ${npc.labelVi}`,
        x: npc.body.x,
        y: npc.body.y,
        maxRadiusPx: 44,
      });
    }
    const economyPlayable = isDonorEconomyUiEnabled();
    interactables.push(...buildTiledWorldInteractableTargets(this.currentMapId, economyPlayable));
    if (this.currentMapId === 'farm') {
      interactables.push(
        ...(this.orchardVisual?.interactionTargets() ?? []),
        ...(this.livestockVisual?.interactionTargets() ?? []),
        ...this.collectFieldAnimalTargets(),
        ...(this.workshopMachines?.interactionTargets() ?? []),
      );
    }
    return interactables;
  }

  private refreshDiscoverabilityMarkers(): void {
    const interactables = this.collectSceneInteractableTargets();
    const specs = buildDiscoverabilityMarkerSpecs(this.currentMapId, interactables);
    for (const obj of spawnDiscoverabilityMarkers(this, specs)) {
      this.mapLayers.push(obj);
    }
  }

  private emitInteractionFrameIfDue(nowMs: number): void {
    if (nowMs - this.lastInteractionFrameAtMs < 180) return;
    this.lastInteractionFrameAtMs = nowMs;
    if (!this.localSprite) return;

    const interactables = this.collectSceneInteractableTargets();

    gameEventBus.emit('evt:interaction-frame', {
      mapId: this.currentMapId,
      playerX: this.localSprite.x,
      playerY: this.localSprite.y,
      facing: this.localFacing,
      interactables,
      economyPlayable: isDonorEconomyUiEnabled(),
    });
  }

  private walkTowardAndTriggerAction(action: NonNullable<WorldScene['pendingTapAction']>): void {
    if (!this.localSprite) return;
    const tPx = this.tilePx();
    const mapDef = getMapDefinition(this.currentMapId);
    const startTile = {
      tileX: Math.floor(this.localSprite.x / tPx),
      tileY: Math.floor((this.localSprite.y - 2) / tPx),
    };
    const centerTileX = Math.floor(action.targetX / tPx);
    const centerTileY = Math.floor(action.targetY / tPx);
    const candidates: GridPoint[] = [];
    for (let radius = 0; radius <= 2; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const cx = centerTileX + dx;
          const cy = centerTileY + dy;
          if (cx < 0 || cy < 0 || cx >= mapDef.widthTiles || cy >= mapDef.heightTiles) continue;
          if (this.blockedGrid.has(`${cx},${cy}`)) continue;
          candidates.push({ tileX: cx, tileY: cy });
        }
      }
    }
    candidates.sort(
      (a, b) =>
        Math.hypot((a.tileX + 0.5) * tPx - this.localSprite.x, (a.tileY + 0.85) * tPx - this.localSprite.y) -
        Math.hypot((b.tileX + 0.5) * tPx - this.localSprite.x, (b.tileY + 0.85) * tPx - this.localSprite.y),
    );
    for (const cand of candidates) {
      const path = findTilePath(
        startTile,
        cand,
        mapDef.widthTiles,
        mapDef.heightTiles,
        this.blockedGrid,
        mapDef.canStepElevation,
      );
      if (path.length > 0) {
        this.clearTemporaryStaticPosture();
        this.pathQueue = path;
        const lastTile = path[path.length - 1]!;
        this.drawTapMarker(lastTile.tileX, lastTile.tileY);
        this.pendingTapAction = action;
        return;
      }
    }
  }

  private tryHandleDirectInteractiveTap(worldX: number, worldY: number): boolean {
    if (!this.localSprite) return false;
    const tPx = this.tilePx();

    for (const p of this.placements) {
      if (p.mapId !== this.currentMapId) continue;
      const item = getCatalogItem(p.sku);
      if (!item) continue;
      let kind: NonNullable<WorldScene['pendingTapAction']>['kind'] | null = null;
      if (p.sku === 'sofa_cream') kind = 'sofa_sit';
      else if (p.sku === 'bed_cozy') kind = 'bed_lie';
      else if (p.sku === 'bench_garden') kind = 'bench_sit';
      else if (item.interactTag === 'study_preview' || p.sku === 'desk_study') kind = 'study_room';
      else if (item.interactTag === 'wardrobe') kind = 'wardrobe';
      if (!kind) continue;

      const left = p.tileX * tPx - 6;
      const right = (p.tileX + p.widthTiles) * tPx + 6;
      const top = p.tileY * tPx - 10;
      const bottom = (p.tileY + p.heightTiles) * tPx + 6;
      if (worldX < left || worldX > right || worldY < top || worldY > bottom) continue;

      const cx = (p.tileX + p.widthTiles / 2) * tPx;
      const cy = (p.tileY + p.heightTiles / 2) * tPx;
      const reachPx = kind === 'bed_lie' ? 74 : 66;
      const action: NonNullable<WorldScene['pendingTapAction']> = { kind, targetX: cx, targetY: cy, reachPx };
      if (Math.hypot(cx - this.localSprite.x, cy - this.localSprite.y) <= reachPx) {
        this.executeTapActionNow(action);
      } else {
        this.walkTowardAndTriggerAction(action);
      }
      return true;
    }

    if (this.currentMapId === 'home') {
      const framePt = MAIN_GAME_WORLD_ANCHORS.home.photoFramePx;
      if (Math.hypot(worldX - framePt.x, worldY - framePt.y) <= 22) {
        const action: NonNullable<WorldScene['pendingTapAction']> = {
          kind: 'photo_frame',
          targetX: framePt.x,
          targetY: framePt.y,
          reachPx: 64,
        };
        if (Math.hypot(framePt.x - this.localSprite.x, framePt.y - this.localSprite.y) <= action.reachPx) {
          this.executeTapActionNow(action);
        } else {
          this.walkTowardAndTriggerAction(action);
        }
        return true;
      }
    }

    if (this.currentMapId === 'garden') {
      const mailPt = MAIN_GAME_WORLD_ANCHORS.garden.mailboxPx;
      if (Math.hypot(worldX - mailPt.x, worldY - mailPt.y) <= 22) {
        const action: NonNullable<WorldScene['pendingTapAction']> = {
          kind: 'mailbox',
          targetX: mailPt.x,
          targetY: mailPt.y,
          reachPx: 64,
        };
        if (Math.hypot(mailPt.x - this.localSprite.x, mailPt.y - this.localSprite.y) <= action.reachPx) {
          this.executeTapActionNow(action);
        } else {
          this.walkTowardAndTriggerAction(action);
        }
        return true;
      }
    }

    return false;
  }

  private executeTapActionNow(action: NonNullable<WorldScene['pendingTapAction']>): void {
    this.pendingTapAction = null;
    this.pathQueue = [];
    this.tapMarker?.clear();
    if (action.kind === 'pet_care') {
      if (this.petSnapshot) gameEventBus.emit('cmd:pet-care-mode', { active: true });
      else gameEventBus.emit('evt:open-pet-panel');
      return;
    }
    if (action.kind === 'sofa_sit' || action.kind === 'bed_lie' || action.kind === 'bench_sit') {
      this.enterSharedPosture(action.kind);
      return;
    }
    if (action.kind === 'study_room') {
      gameEventBus.emit('cmd:seat-at-desk', { seat: 'left' });
      gameEventBus.emit('evt:open-study-panel');
      return;
    }
    if (action.kind === 'wardrobe') {
      gameEventBus.emit('evt:open-avatar-customizer');
      return;
    }
    if (action.kind === 'mailbox') {
      gameEventBus.emit('evt:open-mailbox');
      return;
    }
    if (action.kind === 'photo_frame') {
      gameEventBus.emit('evt:open-photo-frame');
    }
  }

  private updatePendingTapAction(): void {
    const action = this.pendingTapAction;
    if (!action || !this.localSprite) return;
    const dist = Math.hypot(action.targetX - this.localSprite.x, action.targetY - this.localSprite.y);
    if (dist <= action.reachPx) {
      this.executeTapActionNow(action);
      return;
    }
    if (this.pathQueue.length === 0) {
      if (dist <= action.reachPx + 14) {
        this.executeTapActionNow(action);
      } else {
        this.pendingTapAction = null;
      }
    }
  }

  private syncWorkshopMachines(): void {
    if (!this.textures.exists(RANCH_ACTIONS_ATLAS)) return;
    if (!this.workshopMachines) {
      const anchor = FARM_WORLD_INTERACTABLES.barn_mill;
      const tile = this.tilePx();
      this.workshopMachines = new WorkshopMachineVisuals(this, (anchor.tileX + 0.5) * tile, (anchor.tileY + 0.5) * tile, tile);
    }
    const deep = this.deepFarmCache;
    if (deep) this.workshopMachines.sync(deep.workshops, deep.serverNowMs + performance.now() - this.deepFarmReceivedAt);
  }

  private destroyRanchVisuals(): void {
    this.workshopMachines?.destroy();
    this.workshopMachines = null;
    this.ranchEffects?.destroy();
    this.ranchEffects = null;
    this.ranchFishing?.destroy();
    this.ranchFishing = null;
  }

  private cleanup(): void {
    this.physicalDrops?.clear();
    this.destroyRanchVisuals();
    this.farmPlotVisual?.destroy();
    this.orchardVisual?.destroy();
    this.livestockVisual?.destroy();
    this.farmPlotVisual = null;
    this.orchardVisual = null;
    this.livestockVisual = null;
    this.renderSuspended = false;
    this.coupleAffectionIcon?.destroy();
    this.coupleAffectionIcon = null;
    this.coupleAnimationRenderer?.destroy();
    this.coupleAnimationRenderer = null;
    this.farmHoverGraphics?.destroy();
    this.farmHoverGraphics = null;
    this.mapDebugOverlay?.destroy();
    this.mapDebugOverlay = null;
    this.worldLighting?.destroy();
    this.worldLighting = null;
    this.worldClockPresentation = null;
    this.heldRenderer?.destroy();
    this.heldRenderer = null;
    for (const remote of this.remoteEntities.values()) {
      remote.heldRenderer.destroy();
      remote.sprite.destroy();
      remote.shadow.destroy();
      remote.label.destroy();
      remote.blanket?.destroy();
    }
    this.remoteEntities.clear();
    this.petEntity?.destroy();
    this.petEntity = null;
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.scale.off('resize', this.handleResize, this);
  }
}

