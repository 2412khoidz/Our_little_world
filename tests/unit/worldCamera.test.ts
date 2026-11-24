import { expect, it } from 'vitest';
import {
  computeGameplayZoom,
  computeScenicBounds,
  fitWorldZoom,
} from '../../src/game/art/worldCamera';

it.each([[1280, 600], [430, 767], [844, 275], [390, 485], [430, 230]])(
  'keeps home and garden margins inside a %s×%s canvas',
  (width, height) => {
    for (const [worldWidth, worldHeight] of [[256, 192], [288, 224]]) {
      const zoom = fitWorldZoom(width, height, worldWidth!, worldHeight!);
      expect(zoom).toBeGreaterThan(0);
      expect(zoom * worldWidth!).toBeLessThan(width);
      expect(zoom * worldHeight!).toBeLessThan(height);
    }
  },
);

it('provides crisp zoomed-in gameplay framing for mobile portrait and landscape without black voids', () => {
  const portraitZoom = computeGameplayZoom(430, 767, 256, 192);
  expect(portraitZoom).toBeGreaterThanOrEqual(2);
  expect(portraitZoom).toBeLessThanOrEqual(2.75);

  const landscapeZoom = computeGameplayZoom(844, 285, 256, 192);
  expect(landscapeZoom).toBeGreaterThanOrEqual(1.75);
  expect(landscapeZoom).toBeLessThanOrEqual(2.5);

  const desktopZoom = computeGameplayZoom(1280, 600, 256, 192);
  expect(desktopZoom).toBeGreaterThanOrEqual(2.5);

  const bounds = computeScenicBounds(430, 767, portraitZoom, 256, 192);
  expect(bounds.width).toBeGreaterThan(256);
  expect(bounds.height).toBeGreaterThan(192);
});
