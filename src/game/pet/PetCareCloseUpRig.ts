import Phaser from 'phaser';
import {
  PET_PERSONALITY_PRESETS,
  type PetPersonalityTraits,
} from '../../shared/petLiving/petIntelligenceConfig';
import {
  reactToCareAction,
  reactToCareStroke,
} from '../../shared/petLiving/petCare/petCareReactions';
import type { PetCareActionKind, PetCareExpression, PetCareZone } from '../../shared/petLiving/petCare/petCareTypes';
import type { CatAccessoryId, CatCoatVariantId, PetAnimState } from '../../shared/petLiving/petVisualTypes';
import {
  ensureLivingCatSpritesheet,
  getLivingCatAnimKey,
  getLivingCatTextureKey,
} from './petSpriteBuilder';

const DISPLAY_SCALE = 5.75;

export class PetCareCloseUpRig {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly earL: Phaser.GameObjects.Triangle;
  private readonly earR: Phaser.GameObjects.Triangle;
  private readonly tail: Phaser.GameObjects.Ellipse;
  private readonly bubble: Phaser.GameObjects.Text;
  private readonly hitPad: Phaser.GameObjects.Rectangle;

  private variant: CatCoatVariantId;
  private accessory: CatAccessoryId;
  private traits: PetPersonalityTraits;
  private petName: string;

  private tailPhase = 0;
  private blinkAt = 0;
  private expression: PetCareExpression | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    variant: CatCoatVariantId,
    accessory: CatAccessoryId,
    petName: string,
    traitId?: string,
  ) {
    this.scene = scene;
    this.variant = variant;
    this.accessory = accessory;
    this.petName = petName;
    const preset = PET_PERSONALITY_PRESETS.find((p) => p.id === traitId) ?? PET_PERSONALITY_PRESETS[0]!;
    this.traits = preset.traits;

    ensureLivingCatSpritesheet(scene, variant, accessory);
    const texKey = getLivingCatTextureKey(variant, accessory);

    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(12_000);

    const floor = scene.add.ellipse(0, 28, 120, 26, 0x281e24, 0.28);
    this.tail = scene.add.ellipse(-42, 4, 14, 36, 0xd98956, 0.9).setAngle(-28);
    this.body = scene.add.sprite(0, 8, texKey, 0).setOrigin(0.5, 0.85).setScale(DISPLAY_SCALE);
    this.earL = scene.add.triangle(-18, -52, 0, 0, 10, 16, 20, 0, 0xe8a56e).setStrokeStyle(1, 0x5c2e1c);
    this.earR = scene.add.triangle(18, -52, 0, 0, 10, 16, 20, 0, 0xe8a56e).setStrokeStyle(1, 0x5c2e1c);

    this.bubble = scene.add
      .text(0, -92, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffe8c7',
        backgroundColor: '#281e24cc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setResolution(2);

    this.hitPad = scene.add
      .rectangle(0, -10, 110, 120, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.container.add([floor, this.tail, this.body, this.earL, this.earR, this.bubble, this.hitPad]);
    this.applyExpression({
      anim: 'sit_south',
      bubbleVi: 'Mrow?',
      earTilt: 0,
      tail: 'wag_slow',
      eyeMood: 'open',
      squeak: 'mrow',
    });

    this.hitPad.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const local = this.hitPad.getLocalPoint(pointer.worldX, pointer.worldY);
      this.onStroke(this.zoneFromLocal(local.x, local.y), 1);
    });
    this.hitPad.on('drag', (pointer: Phaser.Input.Pointer) => {
      const local = this.hitPad.getLocalPoint(pointer.worldX, pointer.worldY);
      const zone = this.zoneFromLocal(local.x, local.y);
      if (zone !== 'none') this.onStroke(zone, 2);
    });
  }

  destroy(): void {
    this.container.destroy(true);
  }

  setWorldPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setPetIdentity(variant: CatCoatVariantId, accessory: CatAccessoryId, name: string): void {
    if (this.variant !== variant || this.accessory !== accessory) {
      this.variant = variant;
      this.accessory = accessory;
      ensureLivingCatSpritesheet(this.scene, variant, accessory);
      this.body.setTexture(getLivingCatTextureKey(variant, accessory), 0);
    }
    this.petName = name;
  }

  update(deltaMs: number, nowMs: number): void {
    this.tailPhase += deltaMs * 0.004;
    const tailMode = this.expression?.tail ?? 'idle';
    const wag =
      tailMode === 'wag_fast' ? Math.sin(this.tailPhase * 2.2) * 10 : Math.sin(this.tailPhase) * 6;
    const tuck = tailMode === 'tuck' ? -18 : tailMode === 'puff' ? 14 : wag;
    this.tail.setAngle(-28 + tuck);

    if (nowMs > this.blinkAt) {
      this.blinkAt = nowMs + 2200 + Math.random() * 2800;
      if (!this.expression || this.expression.eyeMood !== 'sleep') {
        this.earL.setScale(1, 0.85);
        this.earR.setScale(1, 0.85);
        this.scene.time.delayedCall(120, () => {
          this.earL.setScale(1, 1);
          this.earR.setScale(1, 1);
        });
      }
    }
  }

  performAction(kind: PetCareActionKind): void {
    const expr = reactToCareAction(kind, { traits: this.traits, petName: this.petName, shyRefuseRoll: Math.random() });
    this.applyExpression(expr);
  }

  strokeFromHud(zone: 'head' | 'chin' | 'back', strokeIndex: number): void {
    if (zone === 'back' || zone === 'head' || zone === 'chin') {
      this.onStroke(zone, strokeIndex);
    }
  }

  private onStroke(zone: PetCareZone, strokeIndex: number): void {
    const expr = reactToCareStroke(zone, { traits: this.traits, petName: this.petName, shyRefuseRoll: Math.random() }, strokeIndex);
    this.applyExpression(expr);
  }

  private zoneFromLocal(px: number, py: number): PetCareZone {
    if (py < -55) return 'head';
    if (py < -15 && px > -20 && px < 20) return 'chin';
    if (py > 10 && px > -25 && px < 25) return 'belly';
    if (py > -40) return 'back';
    return 'none';
  }

  private applyExpression(expr: PetCareExpression): void {
    this.expression = expr;
    this.playAnim(expr.anim);
    this.bubble.setText(expr.bubbleVi);
    const t = expr.earTilt;
    this.earL.setAngle(-t);
    this.earR.setAngle(t);
    if (expr.eyeMood === 'sleep') this.playAnim('sleep');
  }

  private playAnim(state: PetAnimState): void {
    const animKey = getLivingCatAnimKey(this.variant, this.accessory, state);
    if (this.scene.anims.exists(animKey)) {
      this.body.play(animKey, true);
    }
  }
}