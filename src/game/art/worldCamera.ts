export function fitWorldZoom(
  viewportWidth: number,
  viewportHeight: number,
  mapWidth: number,
  mapHeight: number,
): number {
  const padding = Math.min(24, Math.min(viewportWidth, viewportHeight) * 0.10);
  const fit = Math.min((viewportWidth - padding) / mapWidth, (viewportHeight - padding) / mapHeight, 4);
  // Integer zoom when it fits without leaving a large gap. At small sizes quantize
  // downwards, so the last tile and its overlays always fit inside the canvas.
  return fit >= 3 ? Math.floor(fit) : Math.floor(fit * 4) / 4 || fit;
}
