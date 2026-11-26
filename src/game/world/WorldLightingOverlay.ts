import Phaser from 'phaser';
import {
  PYDEW_RAIN_DROP_TEXTURE_KEYS,
  pydewRainDropCount,
  pydewRainFallSpeedPxPerSec,
  pydewRainGroupAlpha,
} from '../../shared/donor/pydew/pydewRainPresentation';
import type { WorldClockPresentation } from '../../shared/world/worldClock';
import { phaserLightingOverlayFromPresentation } from '../../shared/world/worldClock';

type RainGfx = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

interface RainDrop {
  gfx: RainGfx;
  speed: number;
}

/**
 * Fullscreen day/night + drizzle presentation (AI Farm donor lighting → 2D overlay).
 * Rain is strictly outdoor-only; interiors (`home`, `shop*`) stay dry with softer night tint.
 */
export class WorldLightingOverlay {
  private readonly scene: Phaser.Scene;
  private tintRect: Phaser.GameObjects.Rectangle;
  private rainDrops: RainDrop[] = [];
  private rainGroup: Phaser.GameObjects.Container;
  private lastWeather: WorldClockPresentation['weather']['kind'] = 'clear';
  private lastIntensity = -1;
  private lastIndoor = false;
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

  apply(presentation: WorldClockPresentation, isIndoor = false): void {
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
    this.tintRect.setFillStyle(color, isIndoor ? alpha * 0.42 : alpha);

    const weather = isIndoor ? 'clear' : presentation.weather.kind;
    const intensity = isIndoor ? 0 : presentation.weather.intensity;
    const weatherChanged = weather !== this.lastWeather || isIndoor !== this.lastIndoor;
    const intensityBucket =
      weather === 'drizzle' ? Math.round(intensity * 4) / 4 : 0;
    const intensityChanged = intensityBucket !== this.lastIntensity;

    if (weatherChanged || (weather === 'drizzle' && intensityChanged)) {
      this.lastWeather = weather;
      this.lastIntensity = intensityBucket;
      this.lastIndoor = isIndoor;
      this.clearRain();
      if (weather === 'drizzle') {
        this.spawnRain(intensity);
      }
    } else if (weather === 'drizzle') {
      this.tickRain(intensity);
    }
  }

  private pydewRainTexturesReady(): boolean {
    return PYDEW_RAIN_DROP_TEXTURE_KEYS.every((key) => this.scene.textures.exists(key));
  }

  private spawnRain(intensity: number): void {
    const cam = this.scene.cameras.main;
    const usePydew = this.pydewRainTexturesReady();
    const count = pydewRainDropCount(intensity);

    for (let i = 0; i < count; i += 1) {
      const x = Math.random() * cam.width;
      const y = Math.random() * cam.height;
      const speed = pydewRainFallSpeedPxPerSec(intensity) * (0.75 + Math.random() * 0.45);

      if (usePydew) {
        const key =
          PYDEW_RAIN_DROP_TEXTURE_KEYS[Math.floor(Math.random() * PYDEW_RAIN_DROP_TEXTURE_KEYS.length)] ??
          PYDEW_RAIN_DROP_TEXTURE_KEYS[0];
        const img = this.scene.add
          .image(x, y, key)
          .setOrigin(0.5, 0)
          .setAlpha(0.55 + intensity * 0.35);
        this.rainGroup.add(img);
        this.rainDrops.push({ gfx: img, speed });
      } else {
        const gfx = this.scene.add
          .rectangle(x, y, 1, 4 + Math.random() * 5, 0xa8c8e8, 0.35 + intensity * 0.25)
          .setOrigin(0.5);
        this.rainGroup.add(gfx);
        this.rainDrops.push({ gfx, speed });
      }
    }
    this.rainGroup.setAlpha(pydewRainGroupAlpha(intensity));
  }

  private tickRain(intensity: number): void {
    const cam = this.scene.cameras.main;
    const dt = 1 / 30;
    for (const drop of this.rainDrops) {
      drop.gfx.y += drop.speed * dt;
      if (drop.gfx.y > cam.height + 12) {
        drop.gfx.y = -12;
        drop.gfx.x = Math.random() * cam.width;
      }
    }
    this.rainGroup.setAlpha(pydewRainGroupAlpha(intensity));
  }

  private clearRain(): void {
    for (const drop of this.rainDrops) {
      drop.gfx.destroy();
    }
    this.rainDrops = [];
    this.rainGroup.removeAll(true);
  }
}
