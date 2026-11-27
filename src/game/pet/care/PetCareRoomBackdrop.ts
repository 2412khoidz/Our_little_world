import Phaser from 'phaser';

/** Cozy in-home care nook — procedural pixel-friendly layers behind the Frakassets cat. */
export class PetCareRoomBackdrop {
  private readonly root: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const cx = width / 2;
    const cy = height / 2 - 8;
    this.root = scene.add.container(cx, cy).setScrollFactor(0).setDepth(5);

    const wall = scene.add.rectangle(0, -height * 0.06, width + 24, height * 0.92, 0x2a1f28, 1);
  const wainscot = scene.add.rectangle(0, height * 0.22, width + 20, height * 0.34, 0x3d2d38, 1);
    const floor = scene.add.rectangle(0, height * 0.38, width + 28, height * 0.42, 0x4a3540, 1);

    const windowGlow = scene.add
      .ellipse(width * 0.22, -height * 0.24, 92, 72, 0xffe4b8, 0.14)
      .setStrokeStyle(3, 0xc9a882, 0.35);
    const windowFrame = scene.add.rectangle(width * 0.22, -height * 0.24, 78, 58, 0x000000, 0).setStrokeStyle(3, 0x8b6f52, 0.5);

    const rug = scene.add.ellipse(0, height * 0.28, Math.min(width * 0.72, 280), 58, 0x8b5c6e, 0.55);
    const rugInner = scene.add.ellipse(0, height * 0.28, Math.min(width * 0.52, 200), 38, 0xa86b7a, 0.35);

    const shelf = scene.add.rectangle(-width * 0.28, -height * 0.08, 64, 10, 0x5a4338, 0.85);
    const plantPot = scene.add.ellipse(-width * 0.28, -height * 0.12, 18, 12, 0x6b4a38, 0.9);
    const plantLeaf = scene.add.triangle(-width * 0.28 - 6, -height * 0.17, 0, 14, 12, 0, 24, 14, 0x4a7d52, 0.75);

    const warmWash = scene.add.rectangle(0, 0, width + 32, height + 32, 0xffc89b, 0.06);

    this.root.add([
      wall,
      wainscot,
      floor,
      windowGlow,
      windowFrame,
      rug,
      rugInner,
      shelf,
      plantPot,
      plantLeaf,
      warmWash,
    ]);

    scene.tweens.add({
      targets: windowGlow,
      alpha: { from: 0.1, to: 0.18 },
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setPosition(x: number, y: number): void {
    this.root.setPosition(x, y);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}