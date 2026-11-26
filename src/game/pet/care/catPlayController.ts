// Adapted from SawyerHood/nintendogs-threejs@43d231c:src/game/play.ts
// Direct 3D pointer/touch interaction: petting by anatomical zone, 3D brush gliding,
// bell ball / yarn ball grab & flick throwing, Verlet feather cat wand waving, and bowl clicks.
import * as THREE from 'three';
import type { CatActor, CatHit, CatRegion } from '../../../donors/nintendogs-cat-v2/catActor';
import type { BowlHandle, CatWandHandle } from '../../../donors/nintendogs-cat-v2/catProps';
import type { ToyWorld, WorldToy } from '../../../donors/nintendogs-cat-v2/toyPhysics';
import type { CatBrain } from './catBrain';

export type CarePlayTool = 'hand' | 'brush' | 'wand';

interface PointerSample {
  t: number;
  x: number;
  y: number;
}

export interface CatPlayCallbacks {
  onStrokeDone?: (region: CatRegion) => void;
  onBrushStroke?: () => void;
  onToyThrown?: (toy: WorldToy) => void;
  onWandMoved?: (tip: THREE.Vector3) => void;
  onFoodBowlClicked?: () => void;
  onWaterBowlClicked?: () => void;
  onToolChange?: (tool: CarePlayTool) => void;
}

export class CatPlayController {
  tool: CarePlayTool = 'hand';
  enabled = true;

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly wandPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.44);
  private down = false;
  private downOn: 'cat' | 'floor' | 'toy' | 'none' = 'none';
  private handToy: WorldToy | null = null;
  private lastHit: CatHit | null = null;
  private lastHitT = 0;
  private samples: PointerSample[] = [];
  private strokeAccum = 0;
  private wandLastTip = new THREE.Vector3(0, 0.48, 0.35);
  private wandSpeed = 0;
  private readonly cleanup: Array<() => void> = [];

  private brushMesh: THREE.Group;
  private handRing: THREE.Mesh;

  constructor(
    private readonly domElement: HTMLElement,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly scene: THREE.Scene,
    private readonly actor: CatActor,
    private readonly brain: CatBrain,
    private readonly toyWorld: ToyWorld,
    private readonly wand: CatWandHandle,
    brushObj: THREE.Group,
    private readonly foodBowl: BowlHandle,
    private readonly waterBowl: BowlHandle,
    private readonly callbacks: CatPlayCallbacks = {},
  ) {
    this.brushMesh = brushObj;
    this.brushMesh.visible = false;
    this.scene.add(this.brushMesh);

    const ringGeo = new THREE.RingGeometry(0.055, 0.072, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#ffba75',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.handRing = new THREE.Mesh(ringGeo, ringMat);
    this.handRing.rotation.x = -Math.PI / 2;
    this.handRing.position.y = 0.006;
    this.scene.add(this.handRing);

    this.attach();
  }

  getWandLureSpeed() {
    return this.wandSpeed;
  }

  setTool(tool: CarePlayTool) {
    this.tool = tool;
    this.brushMesh.visible = tool === 'brush';
    this.wand.object.visible = tool === 'wand';
    if (tool === 'wand') {
      this.wand.setHandleWorld(this.wandLastTip);
      this.brain.noticeWand();
    } else if (tool === 'brush') {
      this.positionBrushNearCat();
    }
    this.callbacks.onToolChange?.(tool);
  }

  private positionBrushNearCat() {
    const head = this.actor.headWorld();
    this.brushMesh.position.set(head.x + 0.06, head.y + 0.06, head.z + 0.06);
  }

  private attach() {
    const onDown = (e: PointerEvent) => this.pointerDown(e);
    const onMove = (e: PointerEvent) => this.pointerMove(e);
    const onUp = () => this.pointerUp();
    this.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    this.cleanup.push(() => {
      this.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    });
  }

  private setRay(e: PointerEvent) {
    const r = this.domElement.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    this.ndc.set(((e.clientX - r.left) / w) * 2 - 1, -((e.clientY - r.top) / h) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  private hitFloor(): THREE.Vector3 | null {
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.floorPlane, p);
  }

  private hitWandPlane(): THREE.Vector3 | null {
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.wandPlane, p);
  }

  private hitToy(): WorldToy | null {
    let best: WorldToy | null = null;
    let bestDist = Infinity;
    for (const t of this.toyWorld.list) {
      if (t.inHand) continue;
      const c = t.object.getWorldPosition(new THREE.Vector3());
      const rayDist = this.raycaster.ray.distanceToPoint(c);
      const camDist = c.distanceTo(this.raycaster.ray.origin);
      if (rayDist < Math.max(0.085, t.radius * 1.9) && camDist < bestDist) {
        bestDist = camDist;
        best = t;
      }
    }
    return best;
  }

  private hitBowl(): 'food' | 'water' | null {
    const fp = this.foodBowl.pos.clone().setY(0.03);
    if (this.raycaster.ray.distanceToPoint(fp) < 0.13) return 'food';
    const wp = this.waterBowl.pos.clone().setY(0.03);
    if (this.raycaster.ray.distanceToPoint(wp) < 0.13) return 'water';
    return null;
  }

  private pointerDown(e: PointerEvent) {
    if (!this.enabled || e.button > 0) return;
    this.setRay(e);
    this.down = true;
    this.samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
    this.strokeAccum = 0;

    if (this.tool === 'wand') {
      const wp = this.hitWandPlane();
      if (wp) {
        this.moveWandTip(wp);
      }
      return;
    }

    const bowl = this.hitBowl();
    if (bowl === 'food') {
      this.callbacks.onFoodBowlClicked?.();
      this.downOn = 'none';
      return;
    }
    if (bowl === 'water') {
      this.callbacks.onWaterBowlClicked?.();
      this.downOn = 'none';
      return;
    }

    const hitCat = this.actor.raycast(this.raycaster.ray);
    if (hitCat) {
      this.downOn = 'cat';
      this.lastHit = hitCat;
      this.lastHitT = performance.now();
      if (this.tool === 'brush') {
        this.moveBrush(hitCat);
        this.brain.brushStroke(0.06);
        this.callbacks.onBrushStroke?.();
      } else {
        this.brain.setPet({ point: hitCat.point, region: hitCat.region, speed: 0.45, idle: 0 });
        this.strokeAccum += 0.25;
      }
      return;
    }

    if (this.tool === 'brush') {
      this.downOn = 'none';
      return;
    }

    const toy = this.hitToy();
    if (toy) {
      this.downOn = 'toy';
      this.handToy = toy;
      toy.inHand = true;
      toy.resting = false;
      toy.velocity.set(0, 0, 0);
      this.moveHandToy();
      return;
    }

    const fl = this.hitFloor();
    if (fl) {
      this.downOn = 'floor';
      this.moveHandRing(fl);
      this.brain.setHand(fl);
    }
  }

  private pointerMove(e: PointerEvent) {
    if (!this.enabled) return;
    this.setRay(e);
    const now = performance.now();

    if (this.tool === 'wand') {
      const wp = this.hitWandPlane();
      if (wp) {
        this.moveWandTip(wp);
      }
      return;
    }

    if (!this.down) {
      if (this.tool === 'brush') {
        const hit = this.actor.raycast(this.raycaster.ray);
        if (hit) this.moveBrush(hit);
      }
      return;
    }

    this.samples.push({ t: now, x: e.clientX, y: e.clientY });
    if (this.samples.length > 8) this.samples.shift();

    if (this.downOn === 'cat') {
      const hit = this.actor.raycast(this.raycaster.ray);
      if (hit) {
        const dtS = Math.max(0.016, (now - this.lastHitT) / 1000);
        const moveDist = this.lastHit ? hit.point.distanceTo(this.lastHit.point) : 0.02;
        const speed = moveDist / dtS;
        this.lastHit = hit;
        this.lastHitT = now;

        if (this.tool === 'brush') {
          this.moveBrush(hit);
          if (moveDist > 0.008) {
            this.brain.brushStroke(Math.min(0.08, moveDist * 0.45));
            this.callbacks.onBrushStroke?.();
          }
        } else {
          this.brain.setPet({ point: hit.point, region: hit.region, speed, idle: 0 });
          // Comb shader response
          this.actor.model.uniforms.uComb.value = THREE.MathUtils.clamp(0.65 + moveDist * 3.5, 0.3, 1.0);
          this.strokeAccum += moveDist;
          if (this.strokeAccum >= 0.09) {
            this.strokeAccum = 0;
            this.callbacks.onStrokeDone?.(hit.region);
          }
        }
      }
      return;
    }

    if (this.downOn === 'toy' && this.handToy) {
      this.moveHandToy();
      return;
    }

    if (this.downOn === 'floor') {
      const fl = this.hitFloor();
      if (fl) {
        this.moveHandRing(fl);
        this.brain.setHand(fl);
      }
    }
  }

  private pointerUp() {
    if (!this.down) return;
    this.down = false;

    if (this.downOn === 'cat' && this.tool === 'hand' && this.lastHit && this.strokeAccum >= 0.02) {
      this.callbacks.onStrokeDone?.(this.lastHit.region);
    }

    if (this.downOn === 'toy' && this.handToy) {
      const toy = this.handToy;
      this.handToy = null;
      const first = this.samples[0];
      const last = this.samples[this.samples.length - 1];
      const dtS = first && last ? Math.max(0.04, (last.t - first.t) / 1000) : 0.1;
      const dx = first && last ? (last.x - first.x) / dtS : 0;
      const dy = first && last ? (last.y - first.y) / dtS : 0;
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const speedClamp = 2.6;
      const vx = THREE.MathUtils.clamp(dx * 0.0022, -speedClamp, speedClamp);
      const vz = THREE.MathUtils.clamp(-dy * 0.0026, -speedClamp, speedClamp);
      const vel = new THREE.Vector3()
        .addScaledVector(right, vx)
        .addScaledVector(fwd, Math.max(0.5, vz));
      vel.y = 1.25 + Math.min(1.1, Math.abs(vz) * 0.5);
      this.toyWorld.throw(toy, toy.object.position, vel);
      this.brain.noticeToy(toy);
      this.callbacks.onToyThrown?.(toy);
    }

    if (this.downOn === 'floor') {
      this.brain.setHand(null);
      (this.handRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }

    this.downOn = 'none';
  }

  private moveWandTip(wp: THREE.Vector3) {
    const b = this.toyWorld.bounds;
    const clamped = new THREE.Vector3(
      THREE.MathUtils.clamp(wp.x, b.minX + 0.25, b.maxX - 0.25),
      THREE.MathUtils.clamp(0.42 + Math.sin(performance.now() * 0.006) * 0.1, 0.25, 0.72),
      THREE.MathUtils.clamp(wp.z, b.minZ + 0.25, b.maxZ - 0.1),
    );
    const dist = clamped.distanceTo(this.wandLastTip);
    this.wandSpeed = Math.min(2.5, dist * 20);
    this.wandLastTip.copy(clamped);
    this.wand.setHandleWorld(clamped);
    this.brain.noticeWand();
    this.callbacks.onWandMoved?.(clamped);
  }

  private moveBrush(hit: CatHit) {
    this.brushMesh.visible = true;
    this.brushMesh.position.copy(hit.point).addScaledVector(hit.normal, 0.025);
    this.brushMesh.lookAt(hit.point.clone().sub(hit.normal));
    this.brushMesh.rotateX(-Math.PI / 2);
  }

  private moveHandToy() {
    if (!this.handToy) return;
    const fl = this.hitFloor();
    if (!fl) return;
    const b = this.toyWorld.bounds;
    this.handToy.object.position.set(
      THREE.MathUtils.clamp(fl.x, b.minX + 0.1, b.maxX - 0.1),
      0.14,
      THREE.MathUtils.clamp(fl.z, b.minZ + 0.1, b.maxZ - 0.1),
    );
  }

  private moveHandRing(fl: THREE.Vector3) {
    const b = this.toyWorld.bounds;
    this.handRing.position.set(
      THREE.MathUtils.clamp(fl.x, b.minX + 0.12, b.maxX - 0.12),
      0.008,
      THREE.MathUtils.clamp(fl.z, b.minZ + 0.12, b.maxZ - 0.12),
    );
    (this.handRing.material as THREE.MeshBasicMaterial).opacity = 0.75;
  }

  update(dt: number) {
    if (this.brain.pet) {
      this.brain.pet.idle += dt;
      if (this.brain.pet.idle > 0.7 && !this.down) {
        this.brain.setPet(null);
      }
    }
    this.wandSpeed = Math.max(0, this.wandSpeed - dt * 2.5);
  }

  dispose() {
    for (const c of this.cleanup) c();
    this.handRing.removeFromParent();
    this.handRing.geometry.dispose();
    (this.handRing.material as THREE.Material).dispose();
  }
}
