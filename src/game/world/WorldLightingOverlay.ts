import Phaser from 'phaser';
import type { WorldClockPresentation } from '../../shared/world/worldClock';
import { phaserLightingOverlayFromPresentation } from '../../shared/world/worldClock';

interface RainDrop {
  gfx: Phaser.GameObjects.Rectangle;
  speed: number;
}

/**
 * Fullscreen day/night + drizzle presentation (AI Farm donor lighting → 2D overlay).
 */
export class WorldLightingOverlay {
  private readonly scene: Phaser.Scene;
  private tintRect: Phaser.GameObjects.Rectangle;
  private rainDrops: RainDrop[] = [];
  private rainGroup: Phaser.GameObjects.Container;
  private lastWeather: WorldClockPresentation['weather']['kind'] = 'clear';
  private camWidth = 0;
  private camHeight = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.tintRect = scene.add
      .rectangle(0, 0, 800, 600, 0x18304d, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9900);
    this.rainGroup = scene.add.container(0, 0).setScrollFactor(0).setDepth(9905);
  }

  destroy(): void {
    this.clearRain();
    this.tintRect.destroy();
    this.rainGroup.destroy();
  }

  apply(presentation: WorldClockPresentation): void {
    const cam = this.scene.cameras.main;
    const w = Math.ceil(cam.width);
    const h = Math.ceil(cam.height);
    if (w !== this.camWidth || h !== this.camHeight) {
      this.camWidth = w;
      this.camHeight = h;
      this.tintRect.setSize(w, h);
      this.tintRect.setPosition(0, 0);
    }

    const { color, alpha } = phaserLightingOverlayFromPresentation(presentation);
    this.tintRect.setFillStyle(color, alpha);

    const weather = presentation.weather.kind;
    if (weather !== this.lastWeather) {
      this.lastWeather = weather;
      this.clearRain();
      if (weather === 'drizzle') {
        this.spawnRain(presentation.weather.intensity);
      }
    } else if (weather === 'drizzle') {
      this.tickRain(presentation.weather.intensity);
    }
  }

  private spawnRain(intensity: number): void {
    const cam = this.scene.cameras.main;
    const count = Math.min(48, Math.max(12, Math.floor(12 + intensity * 36)));
    for (let i = 0; i < count; i += 1) {
      const x = Math.random() * cam.width;
      const y = Math.random() * cam.height;
      const gfx = this.scene.add
        .rectangle(x, y, 1, 4 + Math.random() * 5, 0xa8c8e8, 0.35 + intensity * 0.25)
        .setOrigin(0.5);
      this.rainGroup.add(gfx);
      this.rainDrops.push({ gfx, speed: 90 + Math.random() * 120 });
    }
  }

  private tickRain(intensity: number): void {
    const cam = this.scene.cameras.main;
    const dt = 1 / 30;
    for (const drop of this.rainDrops) {
      drop.gfx.y += drop.speed * dt;
      if (drop.gfx.y > cam.height + 8) {
        drop.gfx.y = -8;
        drop.gfx.x = Math.random() * cam.width;
      }
    }
    this.rainGroup.setAlpha(0.55 + intensity * 0.35);
  }

  private clearRain(): void {
    for (const drop of this.rainDrops) {
      drop.gfx.destroy();
    }
    this.rainDrops = [];
    this.rainGroup.removeAll(true);
  }
}