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
const LANTERN_GLOW_KEY = 'olw-lantern-glow';

interface NightStarNode {
  gfx: Phaser.GameObjects.Rectangle;
  uX: number;
  uY: number;
  baseAlpha: number;
  speed: number;
  phase: number;
}

interface NightFireflyNode {
  halo: Phaser.GameObjects.Rectangle;
  core: Phaser.GameObjects.Rectangle;
  uX: number;
  uY: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
}

function ensureLanternGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(LANTERN_GLOW_KEY)) return;
  const size = 160;
  const tex = scene.textures.createCanvas(LANTERN_GLOW_KEY, size, size);
  if (!tex) return;
  const ctx = tex.context;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0, 'rgba(255, 224, 148, 0.56)');
  grad.addColorStop(0.32, 'rgba(255, 186, 94, 0.28)');
  grad.addColorStop(0.68, 'rgba(255, 142, 68, 0.09)');
  grad.addColorStop(1, 'rgba(255, 128, 60, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

export class WorldLightingOverlay {
  private readonly scene: Phaser.Scene;
  private tintRect: Phaser.GameObjects.Rectangle;
  private skyContainer: Phaser.GameObjects.Container;
  private nightZenithRect: Phaser.GameObjects.Rectangle;
  private nightMidBandRect: Phaser.GameObjects.Rectangle;
  private duskWashRect: Phaser.GameObjects.Rectangle;
  private sunsetHorizonRect: Phaser.GameObjects.Rectangle;
  private stars: NightStarNode[] = [];
  private fireflies: NightFireflyNode[] = [];
  private lanternGlow: Phaser.GameObjects.Image | null = null;
  private rainDrops: RainDrop[] = [];
  private rainGroup: Phaser.GameObjects.Container;
  private lastWeather: WorldClockPresentation['weather']['kind'] = 'clear';
  private lastIntensity = -1;
  private lastIndoor = false;
  private camWidth = 0;
  private camHeight = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    ensureLanternGlowTexture(scene);
    this.tintRect = scene.add
      .rectangle(0, 0, 800, 600, 0x18304d, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(9900);

    // Cancel camera zoom inside skyContainer so screen-space coords [-w/2..w/2, -h/2..h/2] map 1:1 to screen pixels.
    this.skyContainer = scene.add
      .container(400, 300)
      .setScrollFactor(0)
      .setDepth(9901);

    this.nightZenithRect = scene.add
      .rectangle(0, -300, 800, 180, 0x09132e, 0)
      .setOrigin(0.5, 0);
    this.nightMidBandRect = scene.add
      .rectangle(0, -120, 800, 170, 0x162b5c, 0)
      .setOrigin(0.5, 0);
    this.duskWashRect = scene.add
      .rectangle(0, 0, 800, 600, 0xf27d52, 0)
      .setOrigin(0.5);
    this.sunsetHorizonRect = scene.add
      .rectangle(0, -300, 800, 180, 0xffa064, 0)
      .setOrigin(0.5, 0);

    this.skyContainer.add([
      this.nightZenithRect,
      this.nightMidBandRect,
      this.duskWashRect,
      this.sunsetHorizonRect,
    ]);

    // 38 deterministic pixel stars concentrated in the upper 45% of the night sky
    const starColors = [0xf8fbff, 0xd8ebff, 0xfff3c8];
    for (let i = 0; i < 38; i += 1) {
      const s1 = ((i * 73 + 19) % 101) / 101;
      const s2 = ((i * 41 + 11) % 89) / 89;
      const size = i % 5 === 0 ? 2 : 1;
      const gfx = scene.add
        .rectangle(0, 0, size, size, starColors[i % starColors.length], 0)
        .setOrigin(0.5);
      this.skyContainer.add(gfx);
      this.stars.push({
        gfx,
        uX: -0.48 + s1 * 0.96,
        uY: -0.48 + s2 * 0.43,
        baseAlpha: i % 4 === 0 ? 0.92 : 0.65,
        speed: 1.6 + (i % 7) * 0.45,
        phase: i * 0.83,
      });
    }

    // 14 drifting warm golden-green night fireflies
    for (let i = 0; i < 14; i += 1) {
      const s1 = ((i * 59 + 23) % 97) / 97;
      const s2 = ((i * 37 + 7) % 83) / 83;
      const halo = scene.add.rectangle(0, 0, 5, 5, 0xb7ff63, 0).setOrigin(0.5);
      const core = scene.add.rectangle(0, 0, 2, 2, 0xf1ff9c, 0).setOrigin(0.5);
      this.skyContainer.add([halo, core]);
      this.fireflies.push({
        halo,
        core,
        uX: -0.44 + s1 * 0.88,
        uY: -0.22 + s2 * 0.62,
        driftX: 12 + (i % 4) * 6,
        driftY: 8 + (i % 3) * 5,
        speed: 0.7 + (i % 5) * 0.22,
        phase: i * 1.17,
      });
    }

    if (scene.textures.exists(LANTERN_GLOW_KEY)) {
      this.lanternGlow = scene.add
        .image(0, 0, LANTERN_GLOW_KEY)
        .setOrigin(0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);
      this.skyContainer.add(this.lanternGlow);
    }

    this.rainGroup = scene.add.container(0, 0).setScrollFactor(0).setDepth(9905);
  }

  destroy(): void {
    this.clearRain();
    this.tintRect.destroy();
    this.skyContainer.destroy();
    this.rainGroup.destroy();
  }

  apply(
    presentation: WorldClockPresentation,
    isIndoor = false,
    playerScreenPos?: { x: number; y: number } | null,
  ): void {
    const cam = this.scene.cameras.main;
    const w = Math.ceil(cam.width);
    const h = Math.ceil(cam.height);
    if (w !== this.camWidth || h !== this.camHeight) {
      this.camWidth = w;
      this.camHeight = h;
      this.tintRect.setSize(w, h);
      this.tintRect.setPosition(0, 0);
      this.nightZenithRect.setPosition(0, -h * 0.5).setSize(w, Math.ceil(h * 0.28));
      this.nightMidBandRect.setPosition(0, -h * 0.22).setSize(w, Math.ceil(h * 0.3));
      this.duskWashRect.setPosition(0, 0).setSize(w, h);
      this.sunsetHorizonRect.setPosition(0, -h * 0.5).setSize(w, Math.ceil(h * 0.36));
    }

    this.skyContainer
      .setPosition(cam.width * 0.5, cam.height * 0.5)
      .setScale(1 / Math.max(0.25, cam.zoom));

    const { color, alpha } = phaserLightingOverlayFromPresentation(presentation);
    const night = presentation.lighting.night;
    const hour = ((presentation.hour % 24) + 24) % 24;
    const tintAlpha = isIndoor ? alpha * 0.42 : Math.min(0.54, alpha * 1.18);
    this.tintRect.setFillStyle(color, tintAlpha);

    // Sunset dusk wash (17:00-21:30 & dawn 05:00-06:45) + twilight sky bands outdoors
    let sunsetFactor = 0;
    if (!isIndoor) {
      if (hour >= 17 && hour <= 21.5) {
        sunsetFactor = Math.sin(((hour - 17) / 4.5) * Math.PI);
      } else if (hour >= 5 && hour <= 6.8) {
        sunsetFactor = Math.sin(((hour - 5) / 1.8) * Math.PI) * 0.65;
      }
    }
    this.duskWashRect.setAlpha(sunsetFactor * 0.14);
    this.sunsetHorizonRect.setAlpha(sunsetFactor * 0.22);

    const skyDarkAlpha = !isIndoor && night > 0.12 ? Math.min(0.46, night * 0.48) : 0;
    this.nightZenithRect.setAlpha(skyDarkAlpha);
    this.nightMidBandRect.setAlpha(skyDarkAlpha * 0.55);

    const nowSec = this.scene.time.now / 1000;
    const starVis = !isIndoor && night > 0.32 ? Math.min(1, (night - 0.32) / 0.35) : 0;
    for (const star of this.stars) {
      if (starVis <= 0.01) {
        star.gfx.setAlpha(0);
      } else {
        const twinkle = 0.48 + 0.52 * ((Math.sin(nowSec * star.speed + star.phase) + 1) * 0.5);
        star.gfx.setPosition(star.uX * w, star.uY * h);
        star.gfx.setAlpha(starVis * star.baseAlpha * twinkle);
      }
    }

    const fireflyVis = !isIndoor && night > 0.38 ? Math.min(1, (night - 0.38) / 0.35) : 0;
    for (const ff of this.fireflies) {
      if (fireflyVis <= 0.01) {
        ff.halo.setAlpha(0);
        ff.core.setAlpha(0);
      } else {
        const fx = ff.uX * w + Math.sin(nowSec * ff.speed + ff.phase) * ff.driftX;
        const fy = ff.uY * h + Math.cos(nowSec * ff.speed * 0.8 + ff.phase) * ff.driftY;
        const pulse = 0.32 + 0.68 * ((Math.sin(nowSec * 2.4 + ff.phase) + 1) * 0.5);
        ff.halo.setPosition(fx, fy).setAlpha(fireflyVis * 0.24 * pulse);
        ff.core.setPosition(fx, fy).setAlpha(fireflyVis * 0.85 * pulse);
      }
    }

    if (this.lanternGlow) {
      const lanternVis = night > 0.2 && playerScreenPos ? Math.min(1, (night - 0.2) / 0.45) : 0;
      if (lanternVis <= 0.01 || !playerScreenPos) {
        this.lanternGlow.setAlpha(0);
      } else {
        const flicker = 0.94 + Math.sin(nowSec * 6.5) * 0.04 + Math.sin(nowSec * 14.3) * 0.02;
        this.lanternGlow
          .setPosition(playerScreenPos.x - cam.width * 0.5, playerScreenPos.y - cam.height * 0.5)
          .setScale((isIndoor ? 1.15 : 1.45) * flicker)
          .setAlpha((isIndoor ? 0.24 : 0.42) * lanternVis);
      }
    }

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
