import Phaser from 'phaser';
import type { CameraPreset } from './types';

export const ASSET_CANDIDATES_BASE = '/asset-candidates/extracted';

export interface TileFrameDef {
  name: string;
  col: number;
  row: number;
  wTiles?: number;
  hTiles?: number;
  tileSize?: number;
}

export interface PixelFrameDef {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Defines named rectangular sub-frames on an already loaded Phaser texture so
 * tiles/furniture can be placed cleanly with accurate origin/Y-sorting.
 */
export function defineTileFrames(
  scene: Phaser.Scene,
  textureKey: string,
  defs: TileFrameDef[],
  defaultTileSize = 16,
): void {
  const tex = scene.textures.get(textureKey);
  if (!tex) return;
  for (const d of defs) {
    const ts = d.tileSize ?? defaultTileSize;
    tex.add(
      d.name,
      0,
      d.col * ts,
      d.row * ts,
      (d.wTiles ?? 1) * ts,
      (d.hTiles ?? 1) * ts,
    );
  }
}

export function definePixelFrames(
  scene: Phaser.Scene,
  textureKey: string,
  defs: PixelFrameDef[],
): void {
  const tex = scene.textures.get(textureKey);
  if (!tex) return;
  for (const d of defs) {
    tex.add(d.name, 0, d.x, d.y, d.w, d.h);
  }
}

/**
 * Generates shared soft-glow and warm radial spotlight canvas textures once per scene.
 */
export function ensureLightingTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('demo-warm-glow')) {
    const size = 128;
    const canvas = scene.textures.createCanvas('demo-warm-glow', size, size);
    if (canvas) {
      const ctx = canvas.getContext();
      const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 224, 152, 0.92)');
      grad.addColorStop(0.35, 'rgba(255, 190, 108, 0.44)');
      grad.addColorStop(0.7, 'rgba(244, 146, 92, 0.14)');
      grad.addColorStop(1, 'rgba(244, 146, 92, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      canvas.refresh();
    }
  }

  if (!scene.textures.exists('demo-soft-shadow')) {
    const canvas = scene.textures.createCanvas('demo-soft-shadow', 32, 16);
    if (canvas) {
      const ctx = canvas.getContext();
      const grad = ctx.createRadialGradient(16, 8, 1, 16, 8, 15);
      grad.addColorStop(0, 'rgba(34, 21, 28, 0.48)');
      grad.addColorStop(0.65, 'rgba(34, 21, 28, 0.24)');
      grad.addColorStop(1, 'rgba(34, 21, 28, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 16);
      canvas.refresh();
    }
  }

  if (!scene.textures.exists('demo-petal')) {
    const canvas = scene.textures.createCanvas('demo-petal', 4, 4);
    if (canvas) {
      const ctx = canvas.getContext();
      ctx.fillStyle = '#ffc7db';
      ctx.fillRect(1, 0, 2, 2);
      ctx.fillRect(0, 1, 2, 2);
      canvas.refresh();
    }
  }

  if (!scene.textures.exists('demo-firefly')) {
    const canvas = scene.textures.createCanvas('demo-firefly', 4, 4);
    if (canvas) {
      const ctx = canvas.getContext();
      ctx.fillStyle = '#ffe999';
      ctx.fillRect(1, 1, 2, 2);
      canvas.refresh();
    }
  }
}

export function placeSoftShadow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  depth = 5,
  alpha = 0.8,
): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, 'demo-soft-shadow');
  img.setDisplaySize(width, height);
  img.setDepth(depth);
  img.setAlpha(alpha);
  return img;
}

export function placeWarmLight(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radiusPx: number,
  tintHex = 0xffd28a,
  alpha = 0.42,
  depth = 900,
): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, 'demo-warm-glow');
  img.setDisplaySize(radiusPx * 2, radiusPx * 2);
  img.setTint(tintHex);
  img.setAlpha(alpha);
  img.setBlendMode(Phaser.BlendModes.ADD);
  img.setDepth(depth);

  scene.tweens.add({
    targets: img,
    alpha: { from: alpha * 0.85, to: alpha * 1.12 },
    scaleX: { from: img.scaleX * 0.96, to: img.scaleX * 1.04 },
    scaleY: { from: img.scaleY * 0.96, to: img.scaleY * 1.04 },
    duration: 2100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return img;
}

/**
 * Draws a slanted warm window sunbeam trapezoid across interior floorboards.
 */
export function placeSunbeam(
  scene: Phaser.Scene,
  x: number,
  y: number,
  topW: number,
  bottomW: number,
  height: number,
  alpha = 0.14,
  depth = 18,
  tint = 0xffe4a0,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(tint, alpha);
  g.beginPath();
  g.moveTo(x - topW / 2, y);
  g.lineTo(x + topW / 2, y);
  g.lineTo(x + bottomW / 2 + 12, y + height);
  g.lineTo(x - bottomW / 2 + 6, y + height);
  g.closePath();
  g.fillPath();
  g.setBlendMode(Phaser.BlendModes.ADD);
  g.setDepth(depth);
  return g;
}

/**
 * Places a bottom-anchored prop/furniture sprite so Y-sorting stays accurate.
 */
export function placeProp(
  scene: Phaser.Scene,
  texKey: string,
  frameName: string | undefined,
  x: number,
  bottomY: number,
  depthOffset = 0,
  originX = 0.5,
): Phaser.GameObjects.Image {
  const img = scene.add.image(Math.round(x), Math.round(bottomY), texKey, frameName);
  img.setOrigin(originX, 1);
  img.setDepth(Math.round(bottomY) + depthOffset);
  return img;
}

export function createCozyNameTag(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  accentColor: string,
): Phaser.GameObjects.Container {
  const text = scene.add.text(0, 0, name, {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '7px',
    fontStyle: 'bold',
    color: '#fff7ef',
    resolution: 4,
  });
  text.setOrigin(0.5, 0.5);
  const padX = 4;
  const w = Math.ceil(text.width + padX * 2);
  const h = 10;

  const bg = scene.add.graphics();
  bg.fillStyle(0x281e24, 0.82);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 3);
  bg.lineStyle(1, Phaser.Display.Color.HexStringToColor(accentColor).color, 0.85);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3);

  const container = scene.add.container(Math.round(x), Math.round(y), [bg, text]);
  container.setDepth(1100);
  return container;
}

export interface FloatingMote {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  phase: number;
  baseAlpha: number;
}

export function createAmbientMotes(
  scene: Phaser.Scene,
  bounds: { x: number; y: number; w: number; h: number },
  kind: 'petal' | 'firefly',
  count: number,
): FloatingMote[] {
  const tex = kind === 'petal' ? 'demo-petal' : 'demo-firefly';
  const motes: FloatingMote[] = [];
  for (let i = 0; i < count; i += 1) {
    const sx = bounds.x + Math.random() * bounds.w;
    const sy = bounds.y + Math.random() * bounds.h;
    const img = scene.add.image(sx, sy, tex);
    const baseAlpha = kind === 'petal' ? 0.72 + Math.random() * 0.25 : 0.45 + Math.random() * 0.4;
    img.setAlpha(baseAlpha);
    img.setDepth(950);
    if (kind === 'firefly') {
      img.setBlendMode(Phaser.BlendModes.ADD);
    }
    motes.push({
      sprite: img,
      vx: kind === 'petal' ? -6 - Math.random() * 6 : (Math.random() - 0.5) * 8,
      vy: kind === 'petal' ? 5 + Math.random() * 6 : (Math.random() - 0.5) * 6,
      phase: Math.random() * Math.PI * 2,
      baseAlpha,
    });
  }
  return motes;
}

export function updateAmbientMotes(
  motes: FloatingMote[],
  bounds: { x: number; y: number; w: number; h: number },
  dtSec: number,
  timeSec: number,
  kind: 'petal' | 'firefly',
): void {
  for (const m of motes) {
    m.sprite.x += m.vx * dtSec + Math.sin(timeSec * 1.4 + m.phase) * 0.14;
    m.sprite.y += m.vy * dtSec + Math.cos(timeSec * 1.1 + m.phase) * 0.08;
    if (kind === 'firefly') {
      m.sprite.setAlpha(m.baseAlpha * (0.45 + 0.55 * Math.sin(timeSec * 2.5 + m.phase)));
    }
    if (m.sprite.x < bounds.x) m.sprite.x = bounds.x + bounds.w;
    if (m.sprite.x > bounds.x + bounds.w) m.sprite.x = bounds.x;
    if (m.sprite.y > bounds.y + bounds.h) m.sprite.y = bounds.y;
    if (m.sprite.y < bounds.y) m.sprite.y = bounds.y + bounds.h;
  }
}

interface FrakassetsFrameTag {
  name: string;
  from: number;
  to: number;
}

interface FrakassetsFrameEntry {
  frame: { x: number; y: number; w: number; h: number };
  duration: number;
}

interface FrakassetsMetaJson {
  meta?: { frameTags?: FrakassetsFrameTag[] };
  frames?: FrakassetsFrameEntry[];
}

export function preloadFrakassetsPet(
  scene: Phaser.Scene,
  petId: string,
  animal: string,
  style: 'outline' | 'no-outline' = 'outline',
): void {
  const base = `${ASSET_CANDIDATES_BASE}/free-pets-pack/${animal}/${animal}_16px_top-down`;
  scene.load.json(`${petId}-json`, `${base}.json`);
  scene.load.spritesheet(`${petId}-sheet`, `${base}_${style}_lit.png`, {
    frameWidth: 16,
    frameHeight: 16,
  });
}

export function createFrakassetsPetAnims(scene: Phaser.Scene, petId: string): void {
  const json = scene.cache.json.get(`${petId}-json`) as FrakassetsMetaJson | undefined;
  const tags = json?.meta?.frameTags ?? [];
  const frames = json?.frames ?? [];
  const sheetCols = 12;

  for (const tag of tags) {
    const animKey = `${petId}-${tag.name}`;
    if (scene.anims.exists(animKey)) continue;
    const animFrames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let idx = tag.from; idx <= tag.to && idx < frames.length; idx += 1) {
      const entry = frames[idx];
      if (!entry) continue;
      const fr = entry.frame;
      const sheetFrame = Math.floor(fr.y / 16) * sheetCols + Math.floor(fr.x / 16);
      animFrames.push({
        key: `${petId}-sheet`,
        frame: sheetFrame,
        duration: entry.duration || 95,
      });
    }
    if (animFrames.length > 0) {
      scene.anims.create({
        key: animKey,
        frames: animFrames,
        repeat: -1,
      });
    }
  }
}

export function createCompactNameTag(
  scene: Phaser.Scene,
  x: number,
  y: number,
  name: string,
  accentColor: string,
): Phaser.GameObjects.Container {
  const text = scene.add.text(0, 0, name, {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '6px',
    fontStyle: 'bold',
    color: '#fff8f0',
    resolution: 4,
  });
  text.setOrigin(0.5, 0.5);
  const padX = 3;
  const w = Math.ceil(text.width + padX * 2);
  const h = 9;

  const bg = scene.add.graphics();
  bg.fillStyle(0x281e24, 0.72);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 2.5);
  bg.lineStyle(0.75, Phaser.Display.Color.HexStringToColor(accentColor).color, 0.88);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 2.5);

  const container = scene.add.container(Math.round(x), Math.round(y), [bg, text]);
  container.setDepth(1100);
  return container;
}

export function enableDemoCameraPan(
  scene: Phaser.Scene,
  bounds: { x: number; y: number; w: number; h: number },
): void {
  const cam = scene.cameras.main;
  cam.setBounds(bounds.x, bounds.y, bounds.w, bounds.h);

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    dragging = true;
    lastX = pointer.x;
    lastY = pointer.y;
  });
  scene.input.on('pointerup', () => {
    dragging = false;
  });
  scene.input.on('pointerupoutside', () => {
    dragging = false;
  });
  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (!dragging || !pointer.isDown) return;
    const dx = (lastX - pointer.x) / Math.max(cam.zoom, 1);
    const dy = (lastY - pointer.y) / Math.max(cam.zoom, 1);
    cam.scrollX += dx;
    cam.scrollY += dy;
    lastX = pointer.x;
    lastY = pointer.y;
  });
}

export interface CameraTargetLayout {
  desktopOverview: { cx: number; cy: number; fitW: number; fitH: number; maxZoom?: number };
  mobileOverview: { cx: number; cy: number; fitW: number; fitH: number; maxZoom?: number };
  mobileLandscapeOverview?: { cx: number; cy: number; fitW: number; fitH: number; maxZoom?: number };
  interior: { cx: number; cy: number; fitW: number; fitH: number; maxZoom?: number };
  mobileInterior?: { cx: number; cy: number; fitW: number; fitH: number; maxZoom?: number };
  garden: { cx: number; cy: number; fitW: number; fitH: number; maxZoom?: number };
  mobileGarden?: { cx: number; cy: number; fitW: number; fitH: number; maxZoom?: number };
}

/**
 * Applies pixel-crisp responsive framing for Desktop (1280x720), Mobile Portrait
 * (430x932, 390x844), and Mobile Landscape (844x390), keeping hero zones clear of HUD pills.
 */
export function applyDemoCameraPreset(
  scene: Phaser.Scene,
  layout: CameraTargetLayout,
  preset: CameraPreset,
): void {
  const cam = scene.cameras.main;
  const w = cam.width || scene.scale.width;
  const h = cam.height || scene.scale.height;
  const isPortrait = w / Math.max(h, 1) < 0.82;
  const isShortLandscape = w / Math.max(h, 1) > 1.75 && h < 480;

  const target =
    preset === 'interior'
      ? isPortrait && layout.mobileInterior
        ? layout.mobileInterior
        : layout.interior
      : preset === 'garden'
        ? isPortrait && layout.mobileGarden
          ? layout.mobileGarden
          : layout.garden
        : isPortrait
          ? layout.mobileOverview
          : isShortLandscape && layout.mobileLandscapeOverview
            ? layout.mobileLandscapeOverview
            : layout.desktopOverview;

  const hudPadding = isShortLandscape ? 44 : preset === 'overview' ? 72 : 64;
  const usableH = Math.max(h - hudPadding, h * 0.78);
  const rawZoom = Math.min(w / target.fitW, usableH / target.fitH);
  const capped = Math.min(rawZoom, target.maxZoom ?? 4.5);
  const zoom =
    capped >= 3.88
      ? 4
      : capped >= 2.88 && capped < 3.15
        ? 3
        : capped >= 1.94 && capped < 2.12
          ? 2
          : Math.max(0.95, Number(capped.toFixed(2)));

  cam.setZoom(zoom);
  cam.centerOn(target.cx, target.cy);
}

/**
 * Marks window.__OLW_ART_DEMO_READY__ once a demo scene has drawn and rendered frames
 * so Playwright screenshot automation captures crisp fully-animated output.
 */
export function markArtDemoReadyWhenSettled(
  scene: Phaser.Scene,
  demoId: string,
  layout: CameraTargetLayout,
  initialPreset: CameraPreset,
): void {
  let activePreset: CameraPreset = initialPreset;
  applyDemoCameraPreset(scene, layout, activePreset);

  const onResize = () => {
    applyDemoCameraPreset(scene, layout, activePreset);
  };
  scene.scale.on('resize', onResize);

  const onPresetEvent = (ev: Event) => {
    const custom = ev as CustomEvent<{ preset?: CameraPreset }>;
    if (custom.detail?.preset) {
      activePreset = custom.detail.preset;
      applyDemoCameraPreset(scene, layout, activePreset);
    }
  };
  window.addEventListener('olw-art-demo-preset', onPresetEvent);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off('resize', onResize);
    window.removeEventListener('olw-art-demo-preset', onPresetEvent);
  });

  // Allow 18 animation ticks (~300ms) so tweens/animations start before flagging ready
  let ticks = 0;
  const onUpdate = () => {
    ticks += 1;
    if (ticks === 16) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      (window as unknown as Record<string, unknown>).__OLW_ART_DEMO_READY__ = {
        demoId,
        width: scene.scale.width,
        height: scene.scale.height,
        zoom: scene.cameras.main.zoom,
      };
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
}
