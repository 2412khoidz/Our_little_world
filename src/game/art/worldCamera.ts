function sanitizeDim(v: number, fallback: number): number {
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function fitWorldZoom(
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
): number {
  const vw = sanitizeDim(viewportWidth, 400);
  const vh = sanitizeDim(viewportHeight, 600);
  const mw = sanitizeDim(mapWidth, 256);
  const mh = sanitizeDim(mapHeight, 224);
  const padding = Math.min(24, Math.min(vw, vh) * 0.1);
  const fit = Math.max(0.25, Math.min((vw - padding) / mw, (vh - padding) / mh, 4));
  return fit >= 3 ? Math.floor(fit) : Math.floor(fit * 4) / 4 || fit;
}

/**
 * Computes crisp pixel-art gameplay zoom so mobile portrait (430x932), mobile landscape
 * (844x390), and desktop (1280x720+) show large readable avatars and furniture while keeping
 * nearby room context visible around the followed player.
 */
export function computeGameplayZoom(
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
  tilePx = 16,
): number {
  const vw = sanitizeDim(viewportWidth, 400);
  const vh = sanitizeDim(viewportHeight, 600);
  const mw = sanitizeDim(mapWidth, 256);
  const mh = sanitizeDim(mapHeight, 224);
  const tPx = sanitizeDim(tilePx, 16);

  if (tPx >= 64) {
    // 64px-tile PyDew farm: normalize zoom so 1 tile renders crisp & proportional to 16px zones
    const shortSide = Math.min(vw, vh);
    return shortSide < 500 ? 0.75 : 1;
  }

  const shortSide = Math.min(vw, vh);
  const isPortrait = vw / Math.max(vh, 1) < 0.85;
  const isShortLandscape = vh < 460 && vw > vh;

  if (isPortrait) {
    // 430x932 mobile portrait: 2.0x exact integer scaling shows ~215px wide cleanly
    const targetSpanX = Math.max(195, Math.min(220, vw * 0.5));
    const raw = vw / targetSpanX;
    return Math.max(2, Math.min(2.75, Math.floor(raw * 4) / 4));
  }

  if (isShortLandscape) {
    // 844x390 mobile landscape: balance cozy vertical view & wide framing (~2.0x - 2.25x)
    const raw = Math.min(vh / 136, 2.5);
    return Math.max(1.75, Math.min(2.5, Math.floor(raw * 4) / 4));
  }

  // Desktop / tablet: comfortable zoom where entire cozy room or lush garden fills screen
  const fit = Math.min((vw - 24) / mw, (vh - 24) / mh);
  if (shortSide >= 640) {
    return Math.max(2.5, Math.min(3.5, Math.floor(Math.max(fit * 1.15, 2.75) * 4) / 4));
  }
  return Math.max(2, Math.min(3, Math.floor(Math.max(fit, 2) * 4) / 4));
}

export interface ScenicCameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Keeps the camera inside the lush exterior meadow surround while avoiding flat black voids
 * when zoomed in on portrait/landscape or fitted on desktop.
 */
export function computeScenicBounds(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  mapWidth: number,
  mapHeight: number,
  scenicMarginX = 96,
  scenicMarginY = 72,
): ScenicCameraBounds {
  const vw = sanitizeDim(viewportWidth, 400);
  const vh = sanitizeDim(viewportHeight, 600);
  const mw = sanitizeDim(mapWidth, 256);
  const mh = sanitizeDim(mapHeight, 224);
  const safeZoom = Math.max(0.25, Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
  const mx = Number.isFinite(scenicMarginX) ? scenicMarginX : 96;
  const my = Number.isFinite(scenicMarginY) ? scenicMarginY : 72;

  const viewWorldW = vw / safeZoom;
  const viewWorldH = vh / safeZoom;
  const totalW = mw + mx * 2;
  const totalH = mh + my * 2;

  const width = Math.max(totalW, viewWorldW);
  const height = Math.max(totalH, viewWorldH);
  const x = (mw - width) / 2;
  const y = (mh - height) / 2;
  return { x, y, width, height };
}
