import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { PetCareScene } from './pet/care/PetCareScene';

export function createWorldGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 400,
    height: parent.clientHeight || 600,
    backgroundColor: '#2d2226',
    pixelArt: true,
    render: {
      pixelArt: true,
      roundPixels: true,
      antialias: false,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
    scene: [BootScene, WorldScene, PetCareScene],
  };

  const game = new Phaser.Game(config);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  game.canvas.style.imageRendering = 'pixelated';
  game.canvas.dataset.cappedDpr = String(dpr);
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__OLW_DEV_GAME__ = game;
  }
  return game;
}
