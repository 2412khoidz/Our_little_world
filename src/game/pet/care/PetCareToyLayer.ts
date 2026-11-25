import Phaser from 'phaser';

export class PetCareToyLayer {
  private readonly layer: Phaser.GameObjects.Container;
  private yarn: Phaser.GameObjects.Ellipse | null = null;
  private box: Phaser.GameObjects.Rectangle | null = null;
  private chaseActive = false;
  private lastToyMs = 0;
  private toyVx = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    private readonly onBounce: (kind: 'yarn' | 'box') => void,
  ) {
    this.layer = scene.add.container(0, 0);
    parent.add(this.layer);
  }

  getLayer(): Phaser.GameObjects.Container {
    return this.layer;
  }

  destroy(): void {
    this.yarn?.destroy();
    this.box?.destroy();
    this.layer.destroy(true);
  }

  getLastToyMs(): number {
    return this.lastToyMs;
  }

  isChaseActive(): boolean {
    return this.chaseActive;
  }

  getToyX(): number {
    return this.yarn?.x ?? this.box?.x ?? 0;
  }

  getToyY(): number {
    return this.yarn?.y ?? this.box?.y ?? 0;
  }

  spawnYarn(): void {
    this.yarn?.destroy();
    this.yarn = this.scene.add
      .ellipse(48, 36, 22, 22, 0xe85c7a, 1)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.layer.add(this.yarn);
    this.yarn.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.yarn!.setPosition(dragX, dragY);
      this.chaseActive = true;
      this.lastToyMs = Date.now();
    });
    this.yarn.on('dragend', () => {
      this.chaseActive = false;
      this.onBounce('yarn');
    });
    this.lastToyMs = Date.now();
  }

  spawnBox(): void {
    this.box?.destroy();
    this.box = this.scene.add
      .rectangle(0, 52, 58, 34, 0xc9a06c, 1)
      .setStrokeStyle(2, 0x5a3e20);
    this.layer.add(this.box);
    this.box.setInteractive({ draggable: true, useHandCursor: true });
    this.box.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.box!.setPosition(dragX, dragY);
      this.lastToyMs = Date.now();
    });
    this.box.on('dragend', () => this.onBounce('box'));
    this.lastToyMs = Date.now();
  }

  playWithToy(): void {
    if (this.yarn) {
      this.toyVx = 4 + Math.random() * 3;
      this.chaseActive = true;
    }
  }

  update(deltaMs: number, _lookX: number, _lookY: number): void {
    if (this.yarn && this.chaseActive) {
      this.yarn.x += this.toyVx * (deltaMs / 16);
      if (this.yarn.x > 70 || this.yarn.x < -70) this.toyVx *= -1;
    }
  }
}