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
import type {
  AvatarConfig,
  Direction,
  FurniturePlacement,
  MapId,
  MovementPacket,
  PresencePayload,
  WorldMember,
} from '../../shared/types';
import { getIdleFrameIndex } from '../art/avatarSpriteBuilder';
import { ensurePhaserAvatarTexture } from '../art/phaserAvatarTexture';
import {
  type DecorateStatePayload,
  gameEventBus,
  type NearbyInteractable,
  type WorldSyncPayload,
} from '../eventBus';
import { findTilePath, type GridPoint } from '../systems/pathfinding';

interface RemoteAvatarEntity {
  userId: string;
  sessionId: string;
  mapId: MapId;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  facing: Direction;
  anim: 'idle' | 'walk';
  textureKey: string;
  avatarConfig: AvatarConfig;
  nickname: string;
}

export class WorldScene extends Phaser.Scene {
  private currentMapId: MapId = 'home';
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private mapLayers: Array<Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer> = [];

  private worldId = 'local-world';
  private localUserId = '';
  private sessionId = '';
  private members: WorldMember[] = [];
  private placements: FurniturePlacement[] = [];
  private blockedGrid: Set<string> = new Set();

  private localSprite!: Phaser.GameObjects.Sprite;
  private localShadow!: Phaser.GameObjects.Ellipse;
  private localLabel!: Phaser.GameObjects.Text;
  private localTextureKey = '';
  private localFacing: Direction = 'down';
  private localMoving = false;
  private pathQueue: GridPoint[] = [];
  private tapMarker: Phaser.GameObjects.Graphics | null = null;

  private remoteEntities = new Map<string, RemoteAvatarEntity>();
  private latestPresences: PresencePayload[] = [];
  private remoteFilter = new RemoteAvatarFilter();
  private txThrottle = new MovementTxThrottle();

  private furnitureSprites = new Map<string, Phaser.GameObjects.Image>();

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
  private contextLost = false;
  private paused = false;

  private unsubscribes: Array<() => void> = [];

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
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
    this.buildMap(this.currentMapId);
    this.setupPointerInput();
    this.bindEventBus();
    this.bindContextEvents();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.handleResize();
    gameEventBus.emit('evt:scene-ready', { mapId: this.currentMapId });
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
      .ellipse(startX, startY - 1, 10, 4, 0x2b1d19, 0.28)
      .setDepth(startY - 1);
    this.localSprite = this.add
      .sprite(startX, startY, this.localTextureKey, getIdleFrameIndex(this.localFacing))
      .setOrigin(0.5, 1)
      .setDepth(startY);
    this.localLabel = this.add
      .text(startX, startY - 27, nickname, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '9px',
        color: '#fff8ef',
        backgroundColor: '#3d2a24cc',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(2)
      .setDepth(9500);
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
    this.localLabel.setText(me.nickname);
  }

  private buildMap(mapId: MapId, spawnTile?: { tileX: number; tileY: number }): void {
    this.currentMapId = mapId;
    this.pathQueue = [];
    this.tapMarker?.clear();
    this.txThrottle.reset();

    for (const layer of this.mapLayers) {
      layer.destroy();
    }
    this.mapLayers = [];
    this.tilemap?.destroy();
    this.tilemap = null;

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
        decor.setDepth(4000); // Canopy tops / wall details overlay cleanly
        this.mapLayers.push(decor);
      }
    }

    const def = getMapDefinition(mapId);
    const spawn = spawnTile ?? def.defaultSpawn;
    const px = (spawn.tileX + 0.5) * TILE_SIZE;
    const py = (spawn.tileY + 0.85) * TILE_SIZE;
    this.localSprite.setPosition(px, py);
    this.localShadow.setPosition(px, py - 1);
    this.localLabel.setPosition(px, py - 27);

    this.rebuildFurnitureAndCollisions();
    this.reconcileRemoteVisibility();
    this.redrawDecorateOverlay();
    this.handleResize();
    this.cameras.main.centerOn(px, py);
    this.cameras.main.startFollow(this.localSprite, true, 0.16, 0.16);

    this.lastPortalAtMs = Date.now();
    this.emitCurrentTile(true);
    this.emitLocalMovement('idle', true);
    gameEventBus.emit('evt:scene-ready', { mapId });
  }

  private rebuildFurnitureAndCollisions(): void {
    this.blockedGrid = buildMovementCollisionGrid(this.currentMapId, this.placements);
    for (const img of this.furnitureSprites.values()) {
      img.destroy();
    }
    this.furnitureSprites.clear();

    const mapPlacements = this.placements.filter((p) => p.mapId === this.currentMapId);
    for (const placement of mapPlacements) {
      const item = getCatalogItem(placement.sku);
      if (!item) continue;

      const anchorX = placement.tileX * TILE_SIZE;
      const footY = (placement.tileY + placement.heightTiles) * TILE_SIZE;
      const img = this.add
        .image(anchorX, footY, 'furniture-cozy', placement.sku)
        .setOrigin(0, 1);

      if (placement.layerSlot === 'floor') {
        img.setDepth(2);
      } else {
        img.setDepth(footY);
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
      if (this.paused) return;
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

    // Selected placement outline
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

    // Hover / target footprint preview
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
        this.latestPresences = presences;
        this.reconcileRemotePresences(presences);
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
        this.decorateState = state;
        if (!state.active) {
          this.hoverTile = null;
        } else {
          this.pathQueue = [];
          this.tapMarker?.clear();
        }
        this.redrawDecorateOverlay();
      }),

      gameEventBus.on('cmd:set-joystick', (vec) => {
        this.joystickVector = vec;
      }),

      gameEventBus.on('cmd:trigger-interact', () => {
        this.triggerNearbyInteraction();
      }),

      gameEventBus.on('cmd:set-paused', ({ paused }) => {
        this.paused = paused;
        if (paused) {
          this.scene.pause();
        } else {
          this.scene.resume();
        }
      }),
    );
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
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    this.unsubscribes.push(() => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    });
  }

  private handleResize(): void {
    const cam = this.cameras.main;
    if (!cam) return;
    const def = getMapDefinition(this.currentMapId);
    const width = this.scale.width || 400;
    const height = this.scale.height || 600;
    const worldW = def.widthTiles * TILE_SIZE;
    const worldH = def.heightTiles * TILE_SIZE;

    // Choose crisp integer pixel zoom tailored for iPhone portrait and Windows landscape
    let zoom = 2;
    if (width >= 900 && height >= 420) {
      zoom = 3;
    } else if (width <= 520) {
      zoom = Math.max(2, Math.min(3, Math.floor((width * 0.95) / (worldW * 0.72))));
    }
    if (worldW * 4 <= width && worldH * 4 <= height && width >= 1100) {
      zoom = 4;
    }

    cam.setZoom(zoom);
    cam.setRoundPixels(true);
    const viewW = width / zoom;
    const viewH = height / zoom;
    const boundsX = viewW > worldW ? -(viewW - worldW) / 2 : 0;
    const boundsY = viewH > worldH ? -(viewH - worldH) / 2 : 0;
    const boundsW = Math.max(worldW, viewW);
    const boundsH = Math.max(worldH, viewH);
    cam.setBounds(boundsX, boundsY, boundsW, boundsH);
    if (this.localSprite) {
      cam.centerOn(this.localSprite.x, this.localSprite.y);
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.paused) return;

    const dtSec = Math.min(deltaMs, 50) / 1000;
    const moved = this.updateLocalMovement(dtSec);
    this.updateRemoteEntities(deltaMs);
    this.checkNearbyInteractables();

    if (moved) {
      this.emitCurrentTile(false);
      this.emitLocalMovement('walk', false);
    } else {
      this.emitLocalMovement('idle', false);
    }

    const now = Date.now();
    if (now - this.lastDiagnosticsAtMs >= 1000) {
      this.lastDiagnosticsAtMs = now;
      gameEventBus.emit('evt:diagnostics', {
        fps: Math.round(this.game.loop.actualFps),
        renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
        contextLost: this.contextLost,
        zoom: this.cameras.main.zoom,
        mapId: this.currentMapId,
      });
    }
  }

  private updateLocalMovement(dtSec: number): boolean {
    if (this.decorateState.active) {
      this.stopLocalWalkAnim();
      return false;
    }

    let vx = this.joystickVector.vx;
    let vy = this.joystickVector.vy;

    if (this.cursors?.left.isDown || this.wasd?.A.isDown) vx -= 1;
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) vx += 1;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) vy -= 1;
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) vy += 1;

    // Manual directional input cancels tap-to-move queue
    if (Math.hypot(vx, vy) > 0.15) {
      this.pathQueue = [];
      this.tapMarker?.clear();
    } else if (this.pathQueue.length > 0) {
      const targetTile = this.pathQueue[0]!;
      const tx = (targetTile.tileX + 0.5) * TILE_SIZE;
      const ty = (targetTile.tileY + 0.85) * TILE_SIZE;
      const dx = tx - this.localSprite.x;
      const dy = ty - this.localSprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 1.8) {
        this.localSprite.setPosition(tx, ty);
        this.pathQueue.shift();
        if (this.pathQueue.length === 0) {
          this.tapMarker?.clear();
        }
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    if (
      this.wasd &&
      (Phaser.Input.Keyboard.JustDown(this.wasd.E) ||
        Phaser.Input.Keyboard.JustDown(this.wasd.SPACE))
    ) {
      this.triggerNearbyInteraction();
    }

    const mag = Math.hypot(vx, vy);
    if (mag < 0.08) {
      this.stopLocalWalkAnim();
      return false;
    }

    const speedPx = 68;
    const stepX = (vx / Math.max(1, mag)) * speedPx * dtSec;
    const stepY = (vy / Math.max(1, mag)) * speedPx * dtSec;

    if (Math.abs(vx) > Math.abs(vy)) {
      this.localFacing = vx < 0 ? 'left' : 'right';
    } else {
      this.localFacing = vy < 0 ? 'up' : 'down';
    }

    let movedAny = false;
    if (stepX !== 0 && !this.collidesAt(this.localSprite.x + stepX, this.localSprite.y)) {
      this.localSprite.x += stepX;
      movedAny = true;
    }
    if (stepY !== 0 && !this.collidesAt(this.localSprite.x, this.localSprite.y + stepY)) {
      this.localSprite.y += stepY;
      movedAny = true;
    }

    this.localShadow.setPosition(this.localSprite.x, this.localSprite.y - 1);
    this.localShadow.setDepth(this.localSprite.y - 1);
    this.localSprite.setDepth(this.localSprite.y);
    this.localLabel.setPosition(this.localSprite.x, this.localSprite.y - 27);

    if (movedAny) {
      this.localMoving = true;
      const animKey = `${this.localTextureKey}:walk-${this.localFacing}`;
      if (this.localSprite.anims.currentAnim?.key !== animKey) {
        this.localSprite.play(animKey, true);
      }
      this.checkStepOnPortal();
    } else {
      this.stopLocalWalkAnim();
      this.pathQueue = [];
      this.tapMarker?.clear();
    }

    return movedAny;
  }

  private stopLocalWalkAnim(): void {
    if (this.localMoving) {
      this.localMoving = false;
      this.localSprite.stop();
      this.localSprite.setFrame(getIdleFrameIndex(this.localFacing));
    }
  }

  private collidesAt(footX: number, footY: number): boolean {
    const def = getMapDefinition(this.currentMapId);
    const halfW = 4.5;
    const footBoxTop = footY - 5;
    const footBoxBottom = footY - 1;
    const corners: Array<[number, number]> = [
      [footX - halfW, footBoxTop],
      [footX + halfW, footBoxTop],
      [footX - halfW, footBoxBottom],
      [footX + halfW, footBoxBottom],
    ];

    for (const [cx, cy] of corners) {
      const tx = Math.floor(cx / TILE_SIZE);
      const ty = Math.floor(cy / TILE_SIZE);
      if (tx < 0 || ty < 0 || tx >= def.widthTiles || ty >= def.heightTiles) {
        return true;
      }
      if (this.blockedGrid.has(`${tx},${ty}`)) {
        return true;
      }
    }
    return false;
  }

  private checkStepOnPortal(): void {
    const now = Date.now();
    if (now - this.lastPortalAtMs < 1100) return;

    const tx = Math.floor(this.localSprite.x / TILE_SIZE);
    const ty = Math.floor((this.localSprite.y - 2) / TILE_SIZE);
    const def = getMapDefinition(this.currentMapId);

    for (const portal of def.portals) {
      const dist = Math.hypot(tx - portal.tileX, ty - portal.tileY);
      if (dist <= 0.9) {
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

  private findNearbyInteractable(): NearbyInteractable | null {
    const tileX = this.localSprite.x / TILE_SIZE;
    const tileY = (this.localSprite.y - 2) / TILE_SIZE;
    const def = getMapDefinition(this.currentMapId);

    for (const portal of def.portals) {
      if (Math.hypot(tileX - (portal.tileX + 0.5), tileY - (portal.tileY + 0.5)) <= portal.radiusTiles) {
        return { kind: 'portal', labelVi: portal.labelVi };
      }
    }

    for (const placement of this.placements) {
      if (placement.mapId !== this.currentMapId) continue;
      const item = getCatalogItem(placement.sku);
      if (!item?.interactTag) continue;
      const cx = placement.tileX + placement.widthTiles / 2;
      const cy = placement.tileY + placement.heightTiles / 2;
      if (Math.hypot(tileX - cx, tileY - cy) <= 1.8) {
        if (item.interactTag === 'wardrobe') {
          return { kind: 'wardrobe', labelVi: 'Mở tủ đồ (Đổi ngoại hình)' };
        }
        if (item.interactTag === 'study_preview') {
          return { kind: 'study_preview', labelVi: 'Xem bàn học (V0.3)' };
        }
        if (item.interactTag === 'cinema_preview') {
          return { kind: 'cinema_preview', labelVi: 'Xem góc phim (V0.4)' };
        }
      }
    }

    return null;
  }

  private checkNearbyInteractables(): void {
    const near = this.findNearbyInteractable();
    const key = near ? `${near.kind}:${near.labelVi}` : 'none';
    if (key !== this.lastInteractKeySent) {
      this.lastInteractKeySent = key;
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
    } else if (near.kind === 'study_preview') {
      gameEventBus.emit('evt:preview-notice', {
        title: 'Phòng học yên tĩnh',
        version: 'V0.3 — Our Daily Life',
        body: 'Tính năng hẹn giờ Pomodoro chung không camera sẽ được mở khóa ở phiên bản V0.3.',
      });
    } else if (near.kind === 'cinema_preview') {
      gameEventBus.emit('evt:preview-notice', {
        title: 'Góc rạp phim tại nhà',
        version: 'V0.4 — Our Little Cinema',
        body: 'Trình phát phim đồng bộ qua Jellyfin/Tailscale đang được thử nghiệm riêng trong Menu → Spike 0 Lab và sẽ tích hợp vào sofa ở V0.4.',
      });
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

  private emitLocalMovement(anim: 'idle' | 'walk', force: boolean): void {
    if (!this.localUserId || !this.sessionId) return;
    const now = Date.now();
    if (!force && !this.txThrottle.shouldEmit(now, anim, this.currentMapId)) {
      return;
    }
    const packet: MovementPacket = {
      worldId: this.worldId,
      userId: this.localUserId,
      sessionId: this.sessionId,
      mapId: this.currentMapId,
      seq: this.txThrottle.nextSeq(),
      timestampMs: now,
      x: Math.round(this.localSprite.x * 10) / 10,
      y: Math.round(this.localSprite.y * 10) / 10,
      facing: this.localFacing,
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

      if (!existing) {
        const texKey = ensurePhaserAvatarTexture(this, avatarConfig);
        const px = (p.tileX + 0.5) * TILE_SIZE;
        const py = (p.tileY + 0.85) * TILE_SIZE;
        const shadow = this.add.ellipse(px, py - 1, 10, 4, 0x2b1d19, 0.25);
        const sprite = this.add
          .sprite(px, py, texKey, getIdleFrameIndex(p.facing))
          .setOrigin(0.5, 1);
        const label = this.add
          .text(px, py - 27, nickname, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '9px',
            color: '#fff8ef',
            backgroundColor: '#5c4138cc',
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5, 1)
          .setResolution(2)
          .setDepth(9500);

        this.remoteEntities.set(p.userId, {
          userId: p.userId,
          sessionId: p.sessionId,
          mapId: p.mapId,
          sprite,
          shadow,
          label,
          targetX: px,
          targetY: py,
          facing: p.facing,
          anim: 'idle',
          textureKey: texKey,
          avatarConfig,
          nickname,
        });
      } else {
        existing.sessionId = p.sessionId;
        existing.mapId = p.mapId;
        existing.nickname = nickname;
        existing.label.setText(nickname);
      }
    }

    for (const [uid, entity] of this.remoteEntities.entries()) {
      if (!activeUserIds.has(uid)) {
        this.remoteFilter.removeSession(entity.sessionId);
        entity.sprite.destroy();
        entity.shadow.destroy();
        entity.label.destroy();
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
      entity.label.setText(member.nickname);
    }
    if (this.latestPresences.length > 0) {
      this.reconcileRemotePresences(this.latestPresences);
    }
  }

  private applyRemoteMovementPacket(packet: MovementPacket): void {
    let entity = this.remoteEntities.get(packet.userId);
    if (!entity) {
      const member = this.members.find((m) => m.userId === packet.userId);
      const avatarConfig = member?.avatarConfig ?? DEFAULT_AVATAR_PARTNER_A;
      const nickname = member?.nickname ?? 'Người thương';
      const texKey = ensurePhaserAvatarTexture(this, avatarConfig);
      const shadow = this.add.ellipse(packet.x, packet.y - 1, 10, 4, 0x2b1d19, 0.25);
      const sprite = this.add
        .sprite(packet.x, packet.y, texKey, getIdleFrameIndex(packet.facing))
        .setOrigin(0.5, 1);
      const label = this.add
        .text(packet.x, packet.y - 27, nickname, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '9px',
          color: '#fff8ef',
          backgroundColor: '#5c4138cc',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setResolution(2)
        .setDepth(9500);

      entity = {
        userId: packet.userId,
        sessionId: packet.sessionId,
        mapId: packet.mapId,
        sprite,
        shadow,
        label,
        targetX: packet.x,
        targetY: packet.y,
        facing: packet.facing,
        anim: packet.anim,
        textureKey: texKey,
        avatarConfig,
        nickname,
      };
      this.remoteEntities.set(packet.userId, entity);
    }

    const changedMap = entity.mapId !== packet.mapId;
    entity.sessionId = packet.sessionId;
    entity.mapId = packet.mapId;
    entity.targetX = packet.x;
    entity.targetY = packet.y;
    entity.facing = packet.facing;
    entity.anim = packet.anim;
    if (changedMap) {
      entity.sprite.setPosition(packet.x, packet.y);
      entity.shadow.setPosition(packet.x, packet.y - 1);
      entity.label.setPosition(packet.x, packet.y - 27);
      this.reconcileRemoteVisibility();
    }
  }

  private reconcileRemoteVisibility(): void {
    for (const entity of this.remoteEntities.values()) {
      const sameRoom = entity.mapId === this.currentMapId;
      entity.sprite.setVisible(sameRoom);
      entity.shadow.setVisible(sameRoom);
      entity.label.setVisible(sameRoom);
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
      entity.label.setPosition(next.x, next.y - 27);

      const stale = this.remoteFilter.isStale(entity.sessionId, now);
      if ((entity.anim === 'walk' || moving) && !stale) {
        const animKey = `${entity.textureKey}:walk-${entity.facing}`;
        if (entity.sprite.anims.currentAnim?.key !== animKey) {
          entity.sprite.play(animKey, true);
        }
      } else {
        entity.sprite.stop();
        entity.sprite.setFrame(getIdleFrameIndex(entity.facing));
      }
    }
  }

  private cleanup(): void {
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    this.scale.off('resize', this.handleResize, this);
  }
}
