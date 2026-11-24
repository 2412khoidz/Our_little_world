import Phaser from 'phaser';
import { DemoAScene } from './DemoAScene';
import { DemoBScene } from './DemoBScene';
import { DemoCScene } from './DemoCScene';
import { DemoDScene } from './DemoDScene';
import { DemoEScene } from './DemoEScene';
import { ART_DEMO_METADATA, type ArtDemoId, type CameraPreset } from './types';

function makeScene(demoId: ArtDemoId, initialPreset: CameraPreset): Phaser.Scene {
  switch (demoId) {
    case 'A':
      return new DemoAScene(initialPreset);
    case 'B':
      return new DemoBScene(initialPreset);
    case 'C':
      return new DemoCScene(initialPreset);
    case 'D':
      return new DemoDScene(initialPreset);
    case 'E':
      return new DemoEScene(initialPreset);
  }
}

export function createArtDemoGame(
  parent: HTMLElement,
  demoId: ArtDemoId,
  initialPreset: CameraPreset = 'overview',
): Phaser.Game {
  const meta = ART_DEMO_METADATA[demoId];
  (window as unknown as Record<string, unknown>).__OLW_ART_DEMO_READY__ = false;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 1280,
    height: parent.clientHeight || 720,
    backgroundColor: meta.backdropHex,
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
    scene: [makeScene(demoId, initialPreset)],
  });

  game.canvas.style.imageRendering = 'pixelated';
  return game;
}
