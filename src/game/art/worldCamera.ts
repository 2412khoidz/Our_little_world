export function fitWorldZoom(
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
): number {
  const padding = Math.min(24, Math.min(viewportWidth, viewportHeight) * 0.1);
  const fit = Math.min((viewportWidth - padding) / mapWidth, (viewportHeight - padding) / mapHeight, 4);
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
  if (tilePx >= 64) {
    // 64px-tile PyDew farm: normalize zoom so 1 tile renders crisp & proportional to 16px zones
    const shortSide = Math.min(viewportWidth, viewportHeight);
    return shortSide < 500 ? 0.75 : 1;
  }

  const shortSide = Math.min(viewportWidth, viewportHeight);
  const isPortrait = viewportWidth / Math.max(viewportHeight, 1) < 0.85;
  const isShortLandscape = viewportHeight < 460 && viewportWidth > viewportHeight;

  if (isPortrait) {
    // 430x932 mobile portrait: 2.0x exact integer scaling shows ~215px wide cleanly
    const targetSpanX = Math.max(195, Math.min(220, viewportWidth * 0.5));
    const raw = viewportWidth / targetSpanX;
    return Math.max(2, Math.min(2.75, Math.floor(raw * 4) / 4));
  }

  if (isShortLandscape) {
    // 844x390 mobile landscape: balance cozy vertical view & wide framing (~2.0x - 2.25x)
    const raw = Math.min(viewportHeight / 136, 2.5);
    return Math.max(1.75, Math.min(2.5, Math.floor(raw * 4) / 4));
  }

  // Desktop / tablet: comfortable zoom where entire cozy room or lush garden fills screen
  const fit = Math.min((viewportWidth - 24) / mapWidth, (viewportHeight - 24) / mapHeight);
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
  const viewWorldW = viewportWidth / Math.max(zoom, 0.5);
  const viewWorldH = viewportHeight / Math.max(zoom, 0.5);
  const totalW = mapWidth + scenicMarginX * 2;
  const totalH = mapHeight + scenicMarginY * 2;

  const width = Math.max(totalW, viewWorldW);
  const height = Math.max(totalH, viewWorldH);
  const x = (mapWidth - width) / 2;
  const y = (mapHeight - height) / 2;
  return { x, y, width, height };
}
