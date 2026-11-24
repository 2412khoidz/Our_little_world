import { expect, it } from 'vitest';
import { fitWorldZoom } from '../../src/game/art/worldCamera';

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
