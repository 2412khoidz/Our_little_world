import Phaser from 'phaser';
import {
  PET_PERSONALITY_PRESETS,
  type PetPersonalityTraits,
} from '../../../shared/petLiving/petIntelligenceConfig';
import {
  reactToCareAction,
  reactToCareStroke,
} from '../../../shared/petLiving/petCare/petCareReactions';
import type { PetCareActionKind, PetCareExpression, PetCareZone } from '../../../shared/petLiving/petCare/petCareTypes';
import type { PetSnapshot } from '../../../shared/pet/petTypes';
import type { CatAccessoryId, CatCoatVariantId, PetAnimState } from '../../../shared/petLiving/petVisualTypes';
import { derivePetCareMood } from '../../../shared/petLiving/petCare/petCareMood';
import {
  ensurePetCarePortraitSheet,
  getPetCarePortraitAnimKey,
} from './petCarePortraitTexture';
import { PetCareToyLayer } from './PetCareToyLayer';

const BODY_SCALE = 4.2;

export class PetCarePortraitRig {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly eyeL: Phaser.GameObjects.Ellipse;
  private readonly eyeR: Phaser.GameObjects.Ellipse;
  private readonly pupilL: Phaser.GameObjects.Ellipse;
  private readonly pupilR: Phaser.GameObjects.Ellipse;
  private readonly bubble: Phaser.GameObjects.Text;
  private readonly hitPad: Phaser.GameObjects.Rectangle;
  private readonly toys: PetCareToyLayer;

  private variant: CatCoatVariantId;
  private accessory: CatAccessoryId;
  private traits: PetPersonalityTraits;
  private petName: string;
  private snapshot: PetSnapshot | null;

  private breathPhase = 0;
  private blinkAt = 0;
  private lastStrokeMs = 0;
  private expression: PetCareExpression | null = null;
  private eyeTargetX = 0;
  private eyeTargetY = -8;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    variant: CatCoatVariantId,
    accessory: CatAccessoryId,
    petName: string,
    snapshot: PetSnapshot | null,
    traitId?: string,
  ) {
    this.scene = scene;
    this.variant = variant;
    this.accessory = accessory;
    this.petName = petName;
    this.snapshot = snapshot;
    const preset = PET_PERSONALITY_PRESETS.find((p) => p.id === traitId) ?? PET_PERSONALITY_PRESETS[0]!;
    this.traits = preset.traits;

    const texKey = ensurePetCarePortraitSheet(scene, variant, accessory);
    this.root = scene.add.container(x, y).setScrollFactor(0).setDepth(12_000);

    const floor = scene.add.ellipse(0, 42, 150, 30, 0x281e24, 0.35);
    this.body = scene.add.sprite(0, 6, texKey, 0).setOrigin(0.5, 0.88).setScale(BODY_SCALE);

    this.eyeL = scene.add.ellipse(-12, -58, 10, 12, 0xfff6ea, 1);
    this.eyeR = scene.add.ellipse(12, -58, 10, 12, 0xfff6ea, 1);
    this.pupilL = scene.add.ellipse(-12, -56, 4, 5, 0x2a1a14, 1);
    this.pupilR = scene.add.ellipse(12, -56, 4, 5, 0x2a1a14, 1);

    this.bubble = scene.add
      .text(0, -108, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffe8c7',
        backgroundColor: '#281e24cc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setResolution(2);

    this.hitPad = scene.add
      .rectangle(0, -8, 130, 140, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.toys = new PetCareToyLayer(scene, this.root, (kind) => this.onToyBounce(kind));

    this.root.add([
      floor,
      this.body,
      this.toys.getLayer(),
      this.eyeL,
      this.eyeR,
      this.pupilL,
      this.pupilR,
      this.bubble,
      this.hitPad,
    ]);

    const mood = derivePetCareMood(snapshot, this.traits);
    this.applyExpression({
      anim: mood.label === 'sleepy' ? 'sleep' : 'sit_south',
      bubbleVi: mood.bubbleVi,
      earTilt: 0,
      tail: 'idle',
      eyeMood: mood.label === 'sleepy' ? 'sleep' : 'open',
    });

    this.hitPad.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const local = this.hitPad.getLocalPoint(pointer.worldX, pointer.worldY);
      this.onStroke(this.zoneFromLocal(local.x, local.y), 1);
      this.lastStrokeMs = Date.now();
    });
    this.hitPad.on('drag', (pointer: Phaser.Input.Pointer) => {
      const local = this.hitPad.getLocalPoint(pointer.worldX, pointer.worldY);
      const zone = this.zoneFromLocal(local.x, local.y);
      if (zone !== 'none') {
        this.onStroke(zone, 2);
        this.lastStrokeMs = Date.now();
      }
    });
    scene.input.on('pointermove', this.trackPointer, this);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.trackPointer, this);
    this.toys.destroy();
    this.root.destroy(true);
  }

  setPosition(x: number, y: number): void {
    this.root.setPosition(x, y);
  }

  syncSnapshot(snapshot: PetSnapshot | null): void {
    this.snapshot = snapshot;
    if (snapshot) this.petName = snapshot.name;
  }

  getLastInteractionMs(): number {
    return Math.max(this.lastStrokeMs, this.toys.getLastToyMs());
  }

  strokeFromHud(zone: 'head' | 'chin' | 'back', strokeIndex: number): void {
    this.onStroke(zone, strokeIndex);
    this.lastStrokeMs = Date.now();
  }

  performAction(kind: PetCareActionKind): void {
    if (kind === 'toy_yarn') this.toys.spawnYarn();
    if (kind === 'toy_box') this.toys.spawnBox();
    const mood = derivePetCareMood(this.snapshot, this.traits);
    const ctx = {
      traits: this.traits,
      petName: this.petName,
      shyRefuseRoll: Math.random() + mood.refuseFoodBias * 0.25,
    };
    const expr = reactToCareAction(kind, ctx);
    this.applyExpression(expr);
    if (kind === 'toy_yarn' || kind === 'toy_box') this.toys.playWithToy();
  }

  update(deltaMs: number, nowMs: number): void {
    const mood = derivePetCareMood(this.snapshot, this.traits);
    this.breathPhase += deltaMs * 0.0025;
    const breath = 1 + Math.sin(this.breathPhase) * mood.breathAmplitude;
    this.body.setScale(BODY_SCALE * breath, BODY_SCALE * (breath - 0.004));

    this.toys.update(deltaMs, this.eyeTargetX, this.eyeTargetY);
    const chase = this.toys.isChaseActive();
    if (chase) {
      this.applyExpression({
        anim: 'play_pounce',
        bubbleVi: 'Ôi!',
        earTilt: 14,
        tail: 'wag_fast',
        eyeMood: 'happy',
      });
    }

    if (nowMs > this.blinkAt && this.expression?.eyeMood !== 'sleep') {
      this.blinkAt = nowMs + mood.blinkIntervalMs + Math.random() * 1600;
      this.eyeL.setScale(1, 0.12);
      this.eyeR.setScale(1, 0.12);
      this.scene.time.delayedCall(110, () => {
        this.eyeL.setScale(1, 1);
        this.eyeR.setScale(1, 1);
      });
    }

    const lookX = chase ? this.toys.getToyX() : this.eyeTargetX;
    const lookY = chase ? this.toys.getToyY() : this.eyeTargetY;
    this.pupilL.setPosition(-12 + lookX * 0.12, -56 + lookY * 0.08);
    this.pupilR.setPosition(12 + lookX * 0.12, -56 + lookY * 0.08);
  }

  private trackPointer(pointer: Phaser.Input.Pointer): void {
    const local = this.root.getLocalPoint(pointer.worldX, pointer.worldY);
    this.eyeTargetX = Phaser.Math.Clamp(local.x, -40, 40);
    this.eyeTargetY = Phaser.Math.Clamp(local.y, -90, 10);
  }

  private onToyBounce(kind: 'yarn' | 'box'): void {
    this.performAction(kind === 'yarn' ? 'toy_yarn' : 'toy_box');
  }

  private onStroke(zone: PetCareZone, strokeIndex: number): void {
    const expr = reactToCareStroke(
      zone,
      { traits: this.traits, petName: this.petName, shyRefuseRoll: Math.random() },
      strokeIndex,
    );
    this.applyExpression(expr);
  }

  private zoneFromLocal(px: number, py: number): PetCareZone {
    if (py < -62) return 'head';
    if (py < -22 && px > -22 && px < 22) return 'chin';
    if (py > 18 && px > -28 && px < 28) return 'belly';
    if (py > -48) return 'back';
    return 'none';
  }

  private applyExpression(expr: PetCareExpression): void {
    this.expression = expr;
    this.playAnim(expr.anim);
    if (expr.bubbleVi) this.bubble.setText(expr.bubbleVi);
    if (expr.eyeMood === 'sleep') {
      this.eyeL.setAlpha(0.35);
      this.eyeR.setAlpha(0.35);
    } else {
      this.eyeL.setAlpha(1);
      this.eyeR.setAlpha(1);
    }
  }

  private playAnim(state: PetAnimState): void {
    const animKey = getPetCarePortraitAnimKey(this.variant, this.accessory, state);
    if (this.scene.anims.exists(animKey)) {
      this.body.play(animKey, true);
    }
  }
}