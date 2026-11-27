import Phaser from 'phaser';
import {
  farmActionAnimations, harvestDropTrees, machineFrameKey, machinePhase, machinePhaseFrames,
  RANCH_ACTIONS_ATLAS, type FarmActionAnimation, type MachinePhase, type OrchardDropAnimation,
} from '../../shared/art/ranchActionAtlas';
import { WORKSHOP_DEFS, type WorkshopId, type WorkshopsWorldState } from '../../shared/farming/workshops';

export function registerRanchActions(scene: Phaser.Scene): void {
  for (const [key, { count, fps }] of Object.entries({
    ...farmActionAnimations,
    ...Object.fromEntries(harvestDropTrees.map((tree) => [`fruit_${tree}`, { count: 2, fps: 6 }])),
  })) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: Array.from({ length: count }, (_, i) => ({ key: RANCH_ACTIONS_ATLAS, frame: `${key}_${i}` })),
      frameRate: fps,
      repeat: key === 'fx_ready' ? -1 : 0,
      repeatDelay: key === 'fx_ready' ? 850 : 0,
    });
  }
  for (const { id } of WORKSHOP_DEFS) {
    const key = `machine_${id}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: machinePhaseFrames.working.map((index) => ({ key: RANCH_ACTIONS_ATLAS, frame: machineFrameKey(id, index) })),
      frameRate: 6,
      repeat: -1,
    });
  }
}

export class FarmActionEffects {
  private readonly active = new Set<Phaser.GameObjects.Sprite>();

  constructor(private readonly scene: Phaser.Scene) {}

  play(key: Exclude<FarmActionAnimation, 'fx_ready'> | OrchardDropAnimation, x: number, y: number, depth: number, scale: number): void {
    if (this.active.size >= 16 || !this.scene.anims.exists(key)) return;
    const sprite = this.scene.add.sprite(Math.round(x), Math.round(y), RANCH_ACTIONS_ATLAS, `${key}_0`)
      .setScale(scale).setDepth(depth);
    this.active.add(sprite);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.active.delete(sprite);
      sprite.destroy();
    });
    sprite.play(key);
  }

  destroy(): void {
    for (const sprite of this.active) sprite.destroy();
    this.active.clear();
  }
}

export class WorkshopMachineVisuals {
  private readonly machines = new Map<WorkshopId, { sprite: Phaser.GameObjects.Sprite; phase: MachinePhase }>();
  private transitionTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(scene: Phaser.Scene, x: number, y: number, tileSize: number) {
    for (const [index, { id }] of WORKSHOP_DEFS.entries()) {
      const baseX = x + (index * 1.18 - 2.1) * tileSize;
      const baseY = y - 2.35 * tileSize;
      const sprite = scene.add.sprite(Math.round(baseX), Math.round(baseY), RANCH_ACTIONS_ATLAS, machineFrameKey(id, 0))
        .setOrigin(0.5, 1).setScale(tileSize / 16).setDepth(Math.round(baseY));
      this.machines.set(id, { sprite, phase: 'idle' });
    }
  }

  sync(workshops: WorkshopsWorldState, serverNowMs: number): void {
    clearTimeout(this.transitionTimer);
    let next = Infinity;
    for (const [id, entry] of this.machines) {
      const queue = workshops.stations[id]?.queue ?? [];
      const phase = machinePhase(queue, serverNowMs);
      if (phase !== entry.phase) {
        entry.phase = phase;
        if (phase === 'working') entry.sprite.play(`machine_${id}`);
        else entry.sprite.stop().setFrame(machineFrameKey(id, machinePhaseFrames[phase][0]));
      }
      for (const job of queue) {
        if (job.startMs > serverNowMs) next = Math.min(next, job.startMs);
        if (job.endMs > serverNowMs) next = Math.min(next, job.endMs);
      }
    }
    if (!Number.isFinite(next)) return;
    const observedAt = performance.now();
    this.transitionTimer = setTimeout(
      () => this.sync(workshops, serverNowMs + performance.now() - observedAt),
      Math.max(1, next - serverNowMs),
    );
  }

  destroy(): void {
    clearTimeout(this.transitionTimer);
    for (const { sprite } of this.machines.values()) sprite.destroy();
    this.machines.clear();
  }
}
