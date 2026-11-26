import * as THREE from 'three';
import type { CatRegion } from '../../../donors/nintendogs-cat-v2/catActor';
import type { PetCareTailMode } from '../../../shared/petLiving/petCare/petCareTypes';
import type { CatAccessoryId, CatCoatVariantId } from '../../../shared/petLiving/petVisualTypes';

export type CatLodLevel = 'lod0' | 'lod1';
export type CatModelKind = 'vuena-glb' | 'procedural';

export interface PawSwipeOverlayState {
  side: 'L' | 'R';
  /** Normalized progress 0..1 across anticipation -> swipe strike -> follow-through. */
  progress: number;
  active: boolean;
}

export interface HugKickOverlayState {
  active: boolean;
  /** Elapsed phase in seconds for front-paw hug & hind-leg bunny kick. */
  phase: number;
}

export interface LookTarget {
  point: THREE.Vector3 | null;
  weight: number;
}

export interface IPetCareRig {
  pose: string;
  poseRate: number;
  setPose: (name: string, rate?: number) => void;
  tailMode: PetCareTailMode;
  wagAmp: number;
  wagFreq: number;
  tailRaise: number;
  happy: number;
  mouthOpen: number;
  jawHold: number;
  tongueOut: number;
  eyesClosed: number;
  earPerk: number;
  headTilt: number;
  look: LookTarget;
  overlay: Record<string, [number, number, number]>;
  rootLift: number;
  rootRoll: number;
  speed: number;
  turnRate: number;
  activeClip?: string;
  pawSwipe?: PawSwipeOverlayState;
  hugKick?: HugKickOverlayState;
}

export interface TaggedCircle {
  x: number;
  z: number;
  r: number;
  tag?: string;
}

export interface BoundsRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MoveOpts {
  speed?: number;
  arrive?: number;
  onArrive?: () => void;
  faceAfter?: THREE.Vector3 | null;
}

export interface CatHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  region: CatRegion;
  distance: number;
  bone: THREE.Object3D;
}

export interface CatModelDebugInfo {
  modelKind: CatModelKind;
  lod: CatLodLevel;
  activeClip: string;
  clipNames: string[];
  triangles: number;
}

export interface IPetCareCatActor {
  readonly group: THREE.Group;
  readonly rig: IPetCareRig;
  readonly position: THREE.Vector3;
  heading: number;
  speed: number;
  maxSpeed: number;
  bounds: BoundsRect | null;
  obstacles: TaggedCircle[];
  floorY: number;
  ignoreObstacleTag: string | null;
  readonly jump: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    dur: number;
    h: number;
    onLand?: () => void;
  } | null;
  readonly moving: boolean;
  readonly size: number;

  place: (x: number, z: number, heading?: number) => void;
  goTo: (p: THREE.Vector3, opts?: MoveOpts) => void;
  stop: () => void;
  face: (p: THREE.Vector3 | null) => void;
  headingTo: (p: THREE.Vector3) => number;
  distanceTo: (p: THREE.Vector3) => number;
  jumpTo: (to: THREE.Vector3, height: number, dur: number, onLand?: () => void) => void;
  randomPoint: (radius?: number, around?: THREE.Vector3) => THREE.Vector3;
  headWorld: (out?: THREE.Vector3) => THREE.Vector3;
  frontPawWorld: (side?: 'L' | 'R', out?: THREE.Vector3) => THREE.Vector3;
  raycast: (ray: THREE.Ray) => CatHit | null;
  setAccessory: (accessory: CatAccessoryId) => void;
  setCoatVariant: (variant: CatCoatVariantId) => void;
  setLod: (lod: CatLodLevel) => void;
  setCoatAppearance: (opts: { fluff?: number; dirt?: number; comb?: number }) => void;
  getModelDebugInfo: () => CatModelDebugInfo;
  update: (dt: number) => void;
  dispose: () => void;
}
