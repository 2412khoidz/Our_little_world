// Live 3D Three.js Pet Care Stage hosting Quýt + sunlit couple living room + 2P synchronized care.
import * as THREE from 'three';
import { CatActor, type CatRegion } from '../../../donors/nintendogs-cat-v2/catActor';
import { CAT_BREEDS } from '../../../donors/nintendogs-cat-v2/catBreeds';
import {
  makeBellBall,
  makeCardboardBox,
  makeCatBrush,
  makeCatWand,
  makeFoodBowl,
  makeWaterBowl,
  makeYarnBall,
  type BowlHandle,
  type CatWandHandle,
} from '../../../donors/nintendogs-cat-v2/catProps';
import { buildCatLivingRoom, FollowCamera, type CatLivingRoom } from '../../../donors/nintendogs-cat-v2/catRoom';
import { ToyWorld, type WorldToy } from '../../../donors/nintendogs-cat-v2/toyPhysics';
import type { PetCareActionKind } from '../../../shared/petLiving/petCare/petCareTypes';
import type { SharedPetCarePatch, SharedPetCareSession } from '../../../shared/petLiving/petCare/sharedPetCareSession';
import type { CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';
import { gameEventBus } from '../../eventBus';
import { CatBrain } from './catBrain';
import { CatPlayController, type CarePlayTool } from './catPlayController';
import {
  getLatestSharedPetCareSession,
  getPersistedPetCareV2State,
  savePersistedPetCareV2State,
  subscribePetCareBridgeIdentity,
  type PetCareBridgeIdentity,
} from './petCareBridgeState';
import { PetCareEmoteSystem } from './petCareEffects';

export interface PetCareThreeStageOptions {
  host: HTMLElement;
  localUserId?: string;
  initialSharedSession?: SharedPetCareSession | null;
  onToolChange?: (tool: CarePlayTool) => void;
  onHint?: (msg: string) => void;
  onFoodBowlClick?: () => void;
  onPartnerCarePulse?: (msg: string) => void;
}

function breedForVariant(variant: CatCoatVariantId) {
  return CAT_BREEDS[variant] ?? CAT_BREEDS['ginger-tabby'];
}

export class PetCareThreeStage {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly followCam: FollowCamera;
  private readonly room: CatLivingRoom;
  private readonly toyWorld: ToyWorld;
  private readonly foodBowl: BowlHandle;
  private readonly waterBowl: BowlHandle;
  private readonly boxHandle: ReturnType<typeof makeCardboardBox>;
  private readonly brushHandle: ReturnType<typeof makeCatBrush>;
  private readonly wandHandle: CatWandHandle;
  private readonly emotes: PetCareEmoteSystem;
  private readonly partnerAura: THREE.Mesh;
  private readonly focusPoint = new THREE.Vector3(0, 0.16, 0.05);

  private actor!: CatActor;
  private brain!: CatBrain;
  private play!: CatPlayController;
  private yarnToy: WorldToy;
  private ballToy: WorldToy;
  private boxPlaced = true;
  private variant: CatCoatVariantId = 'ginger-tabby';
  private localUserId: string;
  private rafId = 0;
  private disposed = false;
  private lastTickMs = performance.now();
  private resizeObserver: ResizeObserver;
  private readonly unsubs: Array<() => void> = [];

  private strokeCount = 0;
  private brushCount = 0;
  private refuseCount = 0;
  private partnerSyncCount = 0;
  private lastSyncedRev = -1;
  private lastLocalPoseEmitMs = 0;
  private lastPersistSaveMs = 0;
  private lastWandPatchMs = 0;
  private partnerAuraTimer = 0;

  constructor(private readonly opts: PetCareThreeStageOptions) {
    this.localUserId = opts.localUserId || 'local-user';
    const w = Math.max(320, opts.host.clientWidth || 800);
    const h = Math.max(240, opts.host.clientHeight || 600);

    // Explicitly create WebGL2 context with alpha: false so shell-fur alphaToCoverage renders cleanly.
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-testid', 'pet-care-three-canvas');
    canvas.dataset.petCareV2 = 'three-cat';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    opts.host.appendChild(canvas);

    const contextAttrs: WebGLContextAttributes = {
      alpha: false,
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: import.meta.env.DEV,
    };
    const gl = canvas.getContext('webgl2', contextAttrs) ?? undefined;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      ...contextAttrs,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color('#f7e8d2');
    this.scene.fog = new THREE.Fog('#f7e8d2', 4.6, 8.2);

    this.room = buildCatLivingRoom();
    this.scene.add(this.room.group);

    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.05, 25);
    this.followCam = new FollowCamera(this.camera, this.room.cameraBase);
    this.unsubs.push(this.followCam.attachWheel(canvas));

    this.toyWorld = new ToyWorld(this.scene, this.room.bounds, this.room.obstacles);
    this.foodBowl = makeFoodBowl(this.room.foodBowlSpot, 0);
    this.waterBowl = makeWaterBowl(this.room.waterBowlSpot, 0.55);
    this.scene.add(this.foodBowl.object);
    this.scene.add(this.waterBowl.object);

    this.boxHandle = makeCardboardBox(this.room.boxSpot);
    this.scene.add(this.boxHandle.object);

    this.brushHandle = makeCatBrush();
    this.wandHandle = makeCatWand();
    this.wandHandle.object.visible = false;
    this.scene.add(this.wandHandle.object);

    this.yarnToy = this.toyWorld.add(makeYarnBall(), new THREE.Vector3(-0.34, 0.05, 0.28));
    this.ballToy = this.toyWorld.add(makeBellBall(), new THREE.Vector3(0.32, 0.042, 0.35));

    this.emotes = new PetCareEmoteSystem(this.scene);

    // Glowing partner hand ring aura shown when partner interacts concurrently
    const auraGeo = new THREE.RingGeometry(0.11, 0.145, 28);
    const auraMat = new THREE.MeshBasicMaterial({
      color: '#ff7fa6',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.partnerAura = new THREE.Mesh(auraGeo, auraMat);
    this.partnerAura.rotation.x = -Math.PI / 2;
    this.partnerAura.position.set(0, 0.012, 0);
    this.scene.add(this.partnerAura);

    this.initCatActor('ginger-tabby', 'ribbon_rose', 'curious_bong');
    this.hydrateFromPersistence();
    const initialShared = opts.initialSharedSession ?? getLatestSharedPetCareSession();
    if (initialShared) {
      this.applySharedSession(initialShared, false);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(opts.host);

    this.bindEvents();
    this.followCam.update(0.016, this.actor.headWorld(), true);
    this.publishDevState();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private initCatActor(variant: CatCoatVariantId, accessory: PetCareBridgeIdentity['accessory'], traitId?: string) {
    if (this.actor) {
      this.play?.dispose();
      this.actor.group.removeFromParent();
      this.actor.dispose();
    }

    this.variant = variant;
    this.actor = new CatActor(breedForVariant(variant), 0.85, accessory);
    this.actor.bounds = this.room.bounds;
    this.actor.obstacles = this.room.obstacles;
    this.actor.place(0, 0.12, 0.12);
    this.scene.add(this.actor.group);

    this.brain = new CatBrain(this.actor, {
      playerSpot: () => this.followCam.playerSpot(0, 0.78),
      cameraPos: () => this.camera.position.clone(),
      bedSpot: this.room.bedSpot,
      sunSpot: this.room.sunSpot,
      boxSpot: this.boxHandle.pos,
      boxPlaced: () => this.boxPlaced,
      wiggleBox: () => this.boxHandle.wiggle(),
      foodBowl: this.foodBowl,
      waterBowl: this.waterBowl,
      toyWorld: this.toyWorld,
      wandActive: () => this.play?.tool === 'wand',
      wandLurePos: () => this.wandHandle.sim.lurePos,
      wandLureSpeed: () => this.play?.getWandLureSpeed() ?? 0,
      impulseWand: (v) => this.wandHandle.sim.impulseLure(v),
      emote: (kind, pos) => this.emotes.spawn(kind, pos ?? this.actor.headWorld()),
      onActivityChange: (activity, reasonVi) => {
        gameEventBus.emit('evt:pet-care-autonomy-cue', {
          action: activity,
          bubbleVi: reasonVi ?? activity,
        });
        this.publishDevState();
      },
      onRefuse: () => {
        this.refuseCount += 1;
        gameEventBus.emit('evt:pet-care-refuse', { squeak: 'refuse' });
        this.opts.onHint?.('Quýt cần chút không gian riêng…');
      },
      onCoatDirtyOrFluff: () => {
        this.actor.model.uniforms.uFluff.value = this.brain.coatFluff;
      },
    });
    if (traitId) this.brain.applyPersonality(traitId);

    this.play = new CatPlayController(
      this.renderer.domElement,
      this.camera,
      this.scene,
      this.actor,
      this.brain,
      this.toyWorld,
      this.wandHandle,
      this.brushHandle.object,
      this.foodBowl,
      this.waterBowl,
      {
        onStrokeDone: (region) => this.handleLocalStrokeDone(region),
        onBrushStroke: () => this.handleLocalBrushStroke(),
        onToyThrown: (toy) => this.emitToyPatch(toy),
        onWandMoved: (tip) => {
          const now = Date.now();
          if (now - this.lastWandPatchMs > 280) {
            this.lastWandPatchMs = now;
            this.emitLocalPatch({
              kind: 'toy',
              toyKind: 'wand',
              x: tip.x,
              z: tip.z,
              actorUserId: this.localUserId,
              atMs: now,
            });
          }
        },
        onFoodBowlClicked: () => {
          if (this.opts.onFoodBowlClick) {
            this.opts.onFoodBowlClick();
          } else {
            gameEventBus.emit('cmd:pet-care-action', { kind: 'offer_food' });
          }
        },
        onWaterBowlClicked: () => {
          gameEventBus.emit('cmd:pet-care-action', { kind: 'pour_water' });
        },
        onToolChange: (t) => this.opts.onToolChange?.(t),
      },
    );
  }

  private hydrateFromPersistence() {
    const saved = getPersistedPetCareV2State();
    if (!saved) return;
    this.actor.place(saved.catX, saved.catZ, saved.heading);
    this.brain.needs = { ...saved.needs };
    this.brain.memory = saved.memory;
    this.brain.affection = saved.affection;
    this.brain.coatFluff = saved.coatFluff;
    this.actor.model.uniforms.uFluff.value = saved.coatFluff;
    this.foodBowl.setFill(saved.foodFill);
    this.waterBowl.setFill(saved.waterFill);
    this.boxPlaced = saved.boxPlaced;
    this.boxHandle.object.visible = saved.boxPlaced;
    this.boxHandle.object.position.set(saved.boxPos[0], 0, saved.boxPos[1]);
    this.yarnToy.object.position.set(saved.yarnPos[0], this.yarnToy.rest, saved.yarnPos[1]);
    this.ballToy.object.position.set(saved.ballPos[0], this.ballToy.rest, saved.ballPos[1]);
  }

  private savePersistence() {
    savePersistedPetCareV2State({
      catX: this.actor.position.x,
      catZ: this.actor.position.z,
      heading: this.actor.heading,
      activity: this.brain.activity,
      coatFluff: this.brain.coatFluff,
      foodFill: this.foodBowl.fill(),
      waterFill: this.waterBowl.fill(),
      boxPlaced: this.boxPlaced,
      boxPos: [this.boxHandle.pos.x, this.boxHandle.pos.z],
      yarnPos: [this.yarnToy.object.position.x, this.yarnToy.object.position.z],
      ballPos: [this.ballToy.object.position.x, this.ballToy.object.position.z],
      needs: { ...this.brain.needs },
      memory: this.brain.memory,
      affection: this.brain.affection,
      updatedAtMs: Date.now(),
    });
  }

  private bindEvents() {
    this.unsubs.push(
      subscribePetCareBridgeIdentity((id) => {
        if (id.variant !== this.variant) {
          this.initCatActor(id.variant, id.accessory, id.traitId);
        } else {
          this.actor.model.setAccessory(id.accessory);
          if (id.traitId) this.brain.applyPersonality(id.traitId);
        }
        this.brain.syncSnapshot(id.petSnapshot);
      }),
      gameEventBus.on('cmd:sync-pet', (pet) => {
        this.brain.syncSnapshot(pet);
      }),
      gameEventBus.on('cmd:pet-care-stroke', ({ zone }) => {
        this.brain.setPet({
          point: this.actor.headWorld(),
          region: zone === 'chin' ? 'chin' : zone === 'back' ? 'back' : 'head',
          speed: 0.75,
          idle: 0,
        });
        this.handleLocalStrokeDone(zone);
      }),
      gameEventBus.on('cmd:pet-care-action', (payload) => {
        this.handleCommandAction(payload.kind);
      }),
      gameEventBus.on('cmd:sync-shared-pet-care-session', (session) => {
        this.applySharedSession(session, true);
      }),
    );
  }

  private handleLocalStrokeDone(region: CatRegion) {
    this.strokeCount += 1;
    this.brain.recordMemory('petted');
    const normalizedZone: 'head' | 'chin' | 'back' | 'belly' =
      region === 'chin' ? 'chin' : region === 'back' || region === 'rump' ? 'back' : region === 'belly' ? 'belly' : 'head';
    // evt:pet-care-stroke-done triggers App.tsx's shared stroke patch — emit once here.
    gameEventBus.emit('evt:pet-care-stroke-done', { zone: normalizedZone });
  }

  private handleLocalBrushStroke(fromCommandButton = false) {
    this.brushCount += 1;
    if (!fromCommandButton) {
      this.emitLocalPatch({
        kind: 'brush',
        actorUserId: this.localUserId,
        atMs: Date.now(),
      });
    }
  }

  private emitToyPatch(toy: WorldToy) {
    this.emitLocalPatch({
      kind: 'toy',
      toyKind: toy.kind,
      x: toy.object.position.x,
      z: toy.object.position.z,
      vx: toy.velocity.x,
      vz: toy.velocity.z,
      actorUserId: this.localUserId,
      atMs: Date.now(),
    });
  }

  private emitLocalPatch(patch: SharedPetCarePatch) {
    gameEventBus.emit('evt:pet-care-local-patch', patch);
  }

  private handleCommandAction(kind: PetCareActionKind) {
    if (kind === 'call') {
      this.play.setTool('hand');
      this.brain.callToPlayer();
      return;
    }
    if (kind === 'observe') {
      this.play.setTool('hand');
      this.followCam.zoom = this.followCam.zoom > 1.08 ? 0.92 : 1.18;
      this.brain.observeMode();
      return;
    }
    if (kind === 'brush') {
      const nextTool = this.play.tool === 'brush' ? 'hand' : 'brush';
      this.play.setTool(nextTool);
      // Apply immediate tactile brush pass when entering brush mode so single click visibly works too
      if (nextTool === 'brush') {
        this.brain.brushStroke(0.08);
        this.handleLocalBrushStroke(true);
      }
      return;
    }
    if (kind === 'pour_water') {
      this.play.setTool('hand');
      this.waterBowl.setFill(1);
      this.brain.noticeWater();
      this.emitLocalPatch({
        kind: 'water',
        actorUserId: this.localUserId,
        atMs: Date.now(),
      });
      return;
    }
    if (kind === 'offer_food') {
      this.play.setTool('hand');
      const nextFill = Math.min(1, Math.max(0.5, this.foodBowl.fill() + 0.5));
      this.foodBowl.setFill(nextFill);
      this.brain.noticeFood();
      return;
    }
    if (kind === 'toy_yarn') {
      this.play.setTool('hand');
      const from = new THREE.Vector3(-0.35 + Math.random() * 0.25, 0.36, 0.85);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.65, -0.9 - Math.random() * 0.45);
      this.toyWorld.throw(this.yarnToy, from, vel);
      this.brain.noticeToy(this.yarnToy);
      this.emitToyPatch(this.yarnToy);
      return;
    }
    if (kind === 'toy_ball') {
      this.play.setTool('hand');
      const from = new THREE.Vector3(0.32 - Math.random() * 0.25, 0.42, 0.85);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 0.9, 0.85, -1.05 - Math.random() * 0.45);
      this.toyWorld.throw(this.ballToy, from, vel);
      this.brain.noticeToy(this.ballToy);
      this.emitToyPatch(this.ballToy);
      return;
    }
    if (kind === 'toy_wand') {
      const nextTool = this.play.tool === 'wand' ? 'hand' : 'wand';
      this.play.setTool(nextTool);
      if (nextTool === 'wand') {
        const tip = new THREE.Vector3(this.actor.position.x + 0.16, 0.45, this.actor.position.z + 0.24);
        this.wandHandle.setHandleWorld(tip);
        this.wandHandle.sim.impulseLure(new THREE.Vector3(0.14, 0.04, -0.08));
        this.brain.noticeWand();
        this.emitLocalPatch({
          kind: 'toy',
          toyKind: 'wand',
          x: tip.x,
          z: tip.z,
          actorUserId: this.localUserId,
          atMs: Date.now(),
        });
      }
      return;
    }
    if (kind === 'toy_box') {
      this.play.setTool('hand');
      this.boxPlaced = true;
      this.boxHandle.object.visible = true;
      this.boxHandle.wiggle();
      this.brain.inspectBox();
      this.emitLocalPatch({
        kind: 'toy',
        toyKind: 'box',
        x: this.boxHandle.pos.x,
        z: this.boxHandle.pos.z,
        actorUserId: this.localUserId,
        atMs: Date.now(),
      });
    }
  }

  private applySharedSession(session: SharedPetCareSession, animatePartner: boolean) {
    if (session.revision <= this.lastSyncedRev) return;
    this.lastSyncedRev = session.revision;

    const p = session.physical;
    if (p.foodBowl && typeof p.foodBowl.portions === 'number') {
      const targetFood = Math.min(1, p.foodBowl.portions / 4);
      if (Math.abs(this.foodBowl.fill() - targetFood) > 0.08) {
        this.foodBowl.setFill(targetFood);
      }
    }
    if (p.waterBowl && typeof p.waterBowl.volume === 'number') {
      const targetWater = Math.min(1, p.waterBowl.volume / 100);
      if (Math.abs(this.waterBowl.fill() - targetWater) > 0.08) {
        this.waterBowl.setFill(targetWater);
      }
    }
    if (typeof session.coatFluff === 'number') {
      this.brain.coatFluff = THREE.MathUtils.clamp(session.coatFluff, 0.45, 0.96);
      this.actor.model.uniforms.uFluff.value = this.brain.coatFluff;
    }

    const fromPartner = Boolean(
      animatePartner &&
        session.lastActorUserId &&
        session.lastActorUserId !== this.localUserId,
    );

    if (fromPartner) {
      this.partnerSyncCount += 1;
      this.partnerAuraTimer = 2.4;
      this.partnerAura.position.set(this.actor.position.x, 0.015, this.actor.position.z);
      this.emotes.spawn('heart', this.actor.headWorld());
      this.opts.onPartnerCarePulse?.('Người thương vừa chăm sóc Quýt');

      if (session.activeToy && Date.now() - session.activeToy.atMs < 4500) {
        const t = session.activeToy;
        if (t.kind === 'yarn') {
          this.toyWorld.throw(this.yarnToy, new THREE.Vector3(t.x, 0.25, t.z), new THREE.Vector3(t.vx ?? 0, 0.35, t.vz ?? -0.5));
          this.brain.noticeToy(this.yarnToy);
        } else if (t.kind === 'ball') {
          this.toyWorld.throw(this.ballToy, new THREE.Vector3(t.x, 0.25, t.z), new THREE.Vector3(t.vx ?? 0, 0.35, t.vz ?? -0.5));
          this.brain.noticeToy(this.ballToy);
        } else if (t.kind === 'box') {
          this.boxHandle.wiggle();
          this.brain.inspectBox();
        } else if (t.kind === 'wand') {
          this.wandHandle.setHandleWorld(new THREE.Vector3(t.x, 0.46, t.z));
          this.wandHandle.object.visible = true;
          this.brain.noticeWand();
        }
      }

      if ((p.waterBowl?.volume ?? 0) >= 95 && this.brain.needs.thirst < 92) {
        this.brain.noticeWater();
      } else if ((p.foodBowl?.portions ?? 0) > 0 && this.brain.needs.hunger < 92) {
        this.brain.noticeFood();
      }
    }
  }

  private handleResize() {
    if (this.disposed) return;
    const w = Math.max(240, this.opts.host.clientWidth || 800);
    const h = Math.max(180, this.opts.host.clientHeight || 600);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    const rawDt = Math.min(0.22, Math.max(0.001, (now - this.lastTickMs) / 1000));
    this.lastTickMs = now;

    // Step physics/rig in <= 0.04s sub-steps so slow software WebGL still advances at real-time speed.
    let remaining = rawDt;
    while (remaining > 1e-4) {
      const subDt = Math.min(0.04, remaining);
      remaining -= subDt;
      this.toyWorld.update(subDt);
      if (this.play.tool === 'wand') {
        this.wandHandle.update(subDt);
      }
      this.waterBowl.update?.(subDt);
      this.boxHandle.update(subDt);
      this.room.update(subDt);
      this.play.update(subDt);
      this.brain.update(subDt);
      this.actor.update(subDt);
      this.emotes.update(subDt);
    }
    const dt = rawDt;

    if (this.partnerAuraTimer > 0) {
      this.partnerAuraTimer = Math.max(0, this.partnerAuraTimer - dt);
      this.partnerAura.position.set(this.actor.position.x, 0.015, this.actor.position.z);
      const pulse = 1 + Math.sin(now * 0.01) * 0.14;
      this.partnerAura.scale.set(pulse, pulse, 1);
      (this.partnerAura.material as THREE.MeshBasicMaterial).opacity = Math.min(0.8, this.partnerAuraTimer * 0.45);
    } else {
      (this.partnerAura.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    const head = this.actor.headWorld(this.focusPoint);
    this.followCam.update(dt, head, false);
    this.renderer.render(this.scene, this.camera);

    const wallMs = Date.now();
    if (wallMs - this.lastLocalPoseEmitMs > 1800) {
      this.lastLocalPoseEmitMs = wallMs;
      this.emitLocalPatch({
        kind: 'pose',
        x: this.actor.position.x,
        z: this.actor.position.z,
        heading: this.actor.heading,
        activity: this.brain.activity,
        actorUserId: this.localUserId,
        atMs: wallMs,
      });
    }
    if (wallMs - this.lastPersistSaveMs > 320) {
      this.lastPersistSaveMs = wallMs;
      this.savePersistence();
      this.publishDevState();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private publishDevState() {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    (window as unknown as Record<string, unknown>).__OLW_PET_CARE_V2_STATE = {
      variant: this.variant,
      activity: this.brain.activity,
      pose: this.actor.rig.pose,
      activityHistory: [...this.brain.activityHistory],
      x: Number(this.actor.position.x.toFixed(3)),
      z: Number(this.actor.position.z.toFixed(3)),
      coatFluff: Number(this.brain.coatFluff.toFixed(3)),
      foodFill: Number(this.foodBowl.fill().toFixed(3)),
      waterFill: Number(this.waterBowl.fill().toFixed(3)),
      tool: this.play.tool,
      strokeCount: this.strokeCount,
      brushCount: this.brushCount,
      refuseCount: this.refuseCount,
      partnerSyncCount: this.partnerSyncCount,
      needs: { ...this.brain.needs },
      yarnPos: [Number(this.yarnToy.object.position.x.toFixed(2)), Number(this.yarnToy.object.position.z.toFixed(2))],
      ballPos: [Number(this.ballToy.object.position.x.toFixed(2)), Number(this.ballToy.object.position.z.toFixed(2))],
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.savePersistence();
    this.publishDevState();
    this.resizeObserver.disconnect();
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;

    this.play?.dispose();
    this.actor?.dispose();
    this.toyWorld.dispose();
    this.foodBowl.dispose();
    this.waterBowl.dispose();
    this.boxHandle.dispose();
    this.brushHandle.dispose();
    this.wandHandle.dispose();
    this.emotes.dispose();
    this.partnerAura.geometry.dispose();
    (this.partnerAura.material as THREE.Material).dispose();
    this.room.dispose();
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}
