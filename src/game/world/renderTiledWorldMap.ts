import Phaser from 'phaser';

/** Depth-ordered render stack (Collision layer omitted — logic only). */
const RENDER_STACK: { name: string; depth: number }[] = [
  { name: 'Ground', depth: 0 },
  { name: 'Paths', depth: 0.35 },
  { name: 'Water', depth: 1 },
  { name: 'Buildings', depth: 2 },
  { name: 'Vegetation', depth: 3 },
  { name: 'Decor', depth: 3.5 },
  { name: 'Walls', depth: 2.5 },
  { name: 'Foreground', depth: 4500 },
];

export function renderTiledWorldMapLayers(
  _scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  tileset: Phaser.Tilemaps.Tileset,
  pushLayer: (obj: Phaser.GameObjects.GameObject) => void,
): void {
  for (const spec of RENDER_STACK) {
    if (!tilemap.getLayer(spec.name)) continue;
    const created = tilemap.createLayer(spec.name, tileset, 0, 0);
    if (created) {
      created.setDepth(spec.depth);
      pushLayer(created);
    }
  }
}