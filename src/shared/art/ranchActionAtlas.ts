import atlas from './ranchActionAtlas.generated.json';
import type { WorkshopId, WorkshopJob } from '../farming/workshops';
import type { TidefallFishingPhase } from '../donor/tidefall-phaser/tidefallFishingFsm';

export const RANCH_ACTIONS_ATLAS = 'ranch-actions';
export const RANCH_FISHING_ATLAS = 'ranch-fishing';
const actionsAtlas = atlas[RANCH_ACTIONS_ATLAS];
const fishingAtlas = atlas[RANCH_FISHING_ATLAS];
export const RANCH_ACTIONS_URL = actionsAtlas.image;
export const RANCH_FISHING_URL = fishingAtlas.image;
export const RANCH_ACTIONS_SIZE = actionsAtlas.size;
export const RANCH_FISHING_SIZE = fishingAtlas.size;

export const farmActionAnimations = {
  fx_till: { count: 4, fps: 9 },
  fx_plant: { count: 4, fps: 9 },
  fx_water: { count: 4, fps: 10 },
  fx_harvest: { count: 4, fps: 9 },
  fx_pet: { count: 4, fps: 7 },
  fx_ready: { count: 4, fps: 3 },
} as const;

export const harvestDropTrees = [
  'apple', 'cherry', 'fig', 'lemon', 'orange', 'peach', 'pear', 'plum', 'pomegranate',
] as const;

export type OrchardDropAnimation = `fruit_${(typeof harvestDropTrees)[number]}`;
export function harvestDropAnimation(treeId: string): OrchardDropAnimation | 'fx_harvest' {
  const tree = harvestDropTrees.find((id) => id === treeId);
  return tree ? `fruit_${tree}` : 'fx_harvest';
}

export type FarmActionAnimation = keyof typeof farmActionAnimations;
export type MachinePhase = 'idle' | 'working' | 'ready';

export function machinePhase(queue: readonly Pick<WorkshopJob, 'startMs' | 'endMs'>[], nowMs: number): MachinePhase {
  if (queue.some((job) => job.endMs <= nowMs)) return 'ready';
  return queue.some((job) => job.startMs <= nowMs) ? 'working' : 'idle';
}

export const machinePhaseFrames = {
  idle: [0],
  working: [1, 2, 3, 4],
  ready: [5],
} as const;

export function machineJobProgress(job: Pick<WorkshopJob, 'startMs' | 'endMs'>, nowMs: number): number {
  if (nowMs >= job.endMs) return 1;
  return Math.max(0, (nowMs - job.startMs) / (job.endMs - job.startMs));
}

export function machineFrameKey(id: WorkshopId, frame: number): string {
  return `machine_${id}_${frame}`;
}

export function machineAtlasFrame(id: WorkshopId, phase: MachinePhase) {
  const strip = actionsAtlas.strips[`machine_${id}`];
  return { ...strip, x: strip.x + strip.w * machinePhaseFrames[phase][0] };
}

export type FishingVisualPhase = TidefallFishingPhase | 'reeling';
export type FishingStrip = 'bobber_float' | 'bobber_bite' | 'fishing_spot_bubbles';

export interface FishingVisualCue {
  spotId: import('../donor/donorFishingSpots').DonorFishingSpotId;
  phase: FishingVisualPhase;
  spriteUrl?: string;
}

export function fishingStripForPhase(phase: FishingVisualPhase): FishingStrip | null {
  switch (phase) {
    case 'idle':
    case 'landed':
      return null;
    case 'bite':
    case 'escaped':
      return 'bobber_bite';
    default:
      return 'bobber_float';
  }
}

export function ranchFishingFrame(strip: keyof typeof fishingAtlas.strips, index = 0) {
  const frame = fishingAtlas.strips[strip];
  return { ...frame, x: frame.x + frame.w * index };
}

export function fishingAtlasFrame(strip: FishingStrip, elapsedMs: number) {
  const interval = strip === 'bobber_bite' ? 90 : 140;
  return ranchFishingFrame(strip, Math.floor(elapsedMs / interval) % 4);
}

export const ranchMinnowFrame = fishingAtlas.strips.fish_minnow;
