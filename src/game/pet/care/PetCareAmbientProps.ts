import Phaser from 'phaser';

/** Presentation-only bowls + brush motion in care close-up (no bowl RPC). */
export class PetCareAmbientProps {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly waterBowl: Phaser.GameObjects.Ellipse;
  private readonly waterSurface: Phaser.GameObjects.Ellipse;
  private readonly foodBowl: Phaser.GameObjects.Ellipse;
  private readonly brush: Phaser.GameObjects.Rectangle;
  private waterLevel = 0.15;
  private pourTween: Phaser.Tweens.Tween | null = null;
  private brushTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
    this.layer = scene.add.container(0, 0);
    this.foodBowl = scene.add.ellipse(52, 38, 36, 14, 0xc8a882, 0.55).setStrokeStyle(2, 0x8b6f52);
    this.waterBowl = scene.add.ellipse(-50, 40, 40, 16, 0x6b5b72, 0.6).setStrokeStyle(2, 0x4a3d55);
    this.waterSurface = scene.add.ellipse(-50, 38, 30, 10, 0x5fb7ea, 0);
    this.brush = scene.add
      .rectangle(-20, -18, 28, 10, 0xd4a574, 0)
      .setStrokeStyle(2, 0x8b6914)
      .setAngle(-18);
    this.layer.add([this.foodBowl, this.waterBowl, this.waterSurface, this.brush]);
    parent.add(this.layer);
    this.syncWaterVisual();
  }

  /** De-emphasize bowls for close-up hero (Frakassets cat focal). */
  softenCloseUpPresentation(): void {
    this.layer.setAlpha(0.28);
    this.layer.setY(10);
  }

  destroy(): void {
    this.pourTween?.stop();
    this.brushTween?.stop();
    this.layer.destroy(true);
  }

  playPourWater(onMid?: () => void): void {
    this.pourTween?.stop();
    const scene = this.layer.scene;
    this.waterLevel = Math.min(1, this.waterLevel + 0.55);
    const drops = scene.add.circle(-50, -8, 3, 0x8ed4ff, 0.85);
    this.layer.add(drops);
    this.pourTween = scene.tweens.add({
      targets: drops,
      y: 28,
      alpha: 0,
      duration: 420,
      ease: 'Quad.in',
      onComplete: () => drops.destroy(),
    });
    scene.time.delayedCall(180, () => {
      this.syncWaterVisual();
      onMid?.();
    });
  }

  playBrush(): void {
    this.brushTween?.stop();
    this.brush.setAlpha(0.95);
    const scene = this.layer.scene;
    this.brushTween = scene.tweens.add({
      targets: this.brush,
      x: { from: -42, to: 28 },
      y: { from: -32, to: -12 },
      duration: 520,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.inOut',
      onComplete: () => {
        this.brush.setAlpha(0);
        this.brush.setPosition(-20, -18);
      },
    });
    scene.time.delayedCall(200, () => {
      scene.tweens.add({
        targets: this.foodBowl,
        scaleX: 1.06,
        scaleY: 0.94,
        duration: 120,
        yoyo: true,
      });
    });
  }

  private syncWaterVisual(): void {
    const fill = Phaser.Math.Clamp(this.waterLevel, 0, 1);
    this.waterSurface.setAlpha(fill > 0.08 ? 0.55 + fill * 0.35 : 0);
    const scaleX = 0.35 + fill * 0.85;
    const scaleY = 0.3 + fill * 0.75;
    this.waterSurface.setScale(scaleX, scaleY);
    this.waterSurface.setPosition(-50, 38 - fill * 2);
  }
}