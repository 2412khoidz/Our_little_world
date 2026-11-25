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
import { ensureLicensedCareCatReady, getLicensedCareCatTextureKey, PET_CARE_CAT_ORANGE_SCALE } from './petCareCatOrange';
import { PET_CARE_ILLUSTRATION_DISPLAY_SCALE, petCareIllustrationAtlasEnabled } from '../../../shared/petLiving/petCare/petCareIllustrationFlag';
import { petCareJ4lpanPortraitEnabled } from '../../../shared/petLiving/petCare/petCareJ4lpanPortraitFlag';
import {
  activeJ4lpanFlash,
  j4lpanFlashFromAction,
  j4lpanFlashFromExpression,
  publishJ4lpanPortrait,
  type J4lpanFlashState,
} from './petCarePortraitRigJ4lpan';
import { ensurePetCareIllustrationSheet, petCareIllustrationFrameForState } from './petCarePortraitTexture';
import { petCareCatShadowTextureKey } from './petCareCatIsolateTexture';
import {
  createPetCareIllustrationFramePlayer,
  createPetCareLicensedFramePlayer,
  type PetCareLicensedAnimPlayer,
} from './petCareLicensedFramePlayer';
import { gameEventBus } from '../../eventBus';
import { PetCareToyLayer } from './PetCareToyLayer';
import { PetCareAmbientProps } from './PetCareAmbientProps';

export class PetCarePortraitRig {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Sprite | null;
  private readonly body: Phaser.GameObjects.Sprite | null;
  private readonly j4lpanMode: boolean;
  private j4lpanFlash: J4lpanFlashState = null;
  private readonly bubble: Phaser.GameObjects.Text;
  private readonly hitPad: Phaser.GameObjects.Rectangle;
  private readonly toys: PetCareToyLayer;
  private readonly ambient: PetCareAmbientProps;

  private traits: PetPersonalityTraits;
  private petName: string;
  private snapshot: PetSnapshot | null;

  private breathPhase = 0;
  private lastStrokeMs = 0;
  private targetTiltDeg = 0;
  private currentTiltDeg = 0;
  private swayPhase = 0;
  private readonly framePlayer: PetCareLicensedAnimPlayer | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    _variant: CatCoatVariantId,
    _accessory: CatAccessoryId,
    petName: string,
    snapshot: PetSnapshot | null,
    traitId?: string,
  ) {
    this.scene = scene;
    const illustration = petCareIllustrationAtlasEnabled();
    this.j4lpanMode = petCareJ4lpanPortraitEnabled();
    this.petName = petName;
    this.snapshot = snapshot;
    const preset = PET_PERSONALITY_PRESETS.find((p) => p.id === traitId) ?? PET_PERSONALITY_PRESETS[0]!;
    this.traits = preset.traits;

    const displayScale = illustration ? PET_CARE_ILLUSTRATION_DISPLAY_SCALE : PET_CARE_CAT_ORANGE_SCALE;
    this.root = scene.add.container(x, y).setScrollFactor(0).setDepth(12_000);

    const floor = scene.add.ellipse(0, 44, 118, 22, 0x1a1218, 0.5);
    this.shadow = null;
    this.body = null;
    this.framePlayer = null;

    if (!this.j4lpanMode) {
      let bodyKey: string;
      let defaultIndex: number;
      if (illustration) {
        bodyKey = ensurePetCareIllustrationSheet(scene, _variant, _accessory);
        defaultIndex = petCareIllustrationFrameForState('sit_south', 0);
      } else {
        ensureLicensedCareCatReady(scene);
        bodyKey = getLicensedCareCatTextureKey();
        defaultIndex = 48;
      }
      const shadowKey = petCareCatShadowTextureKey();
      this.shadow = scene.add
        .sprite(2, 42, shadowKey, defaultIndex)
        .setOrigin(0.5, 0.5)
        .setAlpha(illustration ? 0.28 : 0.45)
        .setScale(displayScale * 0.95)
        .setVisible(!illustration);
      this.body = scene.add
        .sprite(0, 6, bodyKey, defaultIndex)
        .setOrigin(0.5, 0.88)
        .setScale(displayScale);
      this.framePlayer = illustration
        ? createPetCareIllustrationFramePlayer(this.body, scene, _variant, _accessory)
        : createPetCareLicensedFramePlayer(this.body, this.shadow, scene);
      this.publishAtlasRegressionMarkers(scene, bodyKey, defaultIndex, illustration);
    } else {
      scene.game.canvas.dataset.petCareJ4lpan = '1';
      scene.game.canvas.dataset.petCareIllustration = '0';
    }

    this.bubble = scene.add
      .text(0, -72, '', {
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
      .rectangle(0, -4, 128, 120, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.toys = new PetCareToyLayer(scene, this.root, (kind) => this.onToyBounce(kind));
    this.ambient = new PetCareAmbientProps(scene, this.root);
    this.ambient.softenCloseUpPresentation();

    const rigChildren: Phaser.GameObjects.GameObject[] = [floor, this.toys.getLayer(), this.bubble, this.hitPad];
    if (this.shadow) rigChildren.splice(1, 0, this.shadow);
    if (this.body) rigChildren.splice(this.shadow ? 2 : 1, 0, this.body);
    this.root.add(rigChildren);

    const mood = derivePetCareMood(snapshot, this.traits);
    this.applyExpression({
      anim: mood.label === 'sleepy' ? 'sleep' : 'sit_south',
      bubbleVi: mood.bubbleVi,
      earTilt: 0,
      tail: 'idle',
      eyeMood: mood.label === 'sleepy' ? 'sleep' : 'open',
    });
    if (this.j4lpanMode) this.syncJ4lpanPortrait(mood.bubbleVi);

    this.hitPad.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.preventDefault();
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
  }

  destroy(): void {
    this.ambient.destroy();
    this.toys.destroy();
    this.root.destroy(true);
  }

  setPosition(x: number, y: number): void {
    this.root.setPosition(x, y);
  }

  syncSnapshot(snapshot: PetSnapshot | null): void {
    this.snapshot = snapshot;
    if (snapshot) this.petName = snapshot.name;
    if (this.j4lpanMode) this.syncJ4lpanPortrait(this.bubble.text);
  }

  /** 2P shared session — reflect partner care without caregiver toggle. */
  syncSharedPhysical(
    physical: import('../../../shared/petLiving/petPhysicalCare').PhysicalCarePetState,
    actorUserId: string | null,
  ): void {
    const mood = derivePetCareMood(this.snapshot, this.traits);
    if (!actorUserId) return;
    const happy = physical.fun >= 70;
    this.applyExpression({
      anim: physical.isSleeping ? 'sleep' : physical.fun > 75 ? 'pet_purr' : 'sit_south',
      bubbleVi: happy ? 'Purr~ hai người cùng chăm!' : 'Mlem~ người kia vừa chăm bé.',
      earTilt: happy ? 6 : 0,
      tail: happy ? 'wag_slow' : 'idle',
      eyeMood: happy ? 'happy' : 'open',
    });
    window.setTimeout(() => this.bubble.setText(mood.bubbleVi), 2400);
    if (this.j4lpanMode) {
      this.j4lpanFlash = j4lpanFlashFromExpression(
        {
          anim: physical.isSleeping ? 'sleep' : 'pet_purr',
          bubbleVi: '',
          earTilt: 0,
          tail: happy ? 'wag_slow' : 'idle',
          eyeMood: happy ? 'happy' : 'open',
        },
        Date.now(),
      );
      this.syncJ4lpanPortrait(happy ? 'Purr~ hai người cùng chăm!' : 'Mlem~ người kia vừa chăm bé.');
    }
  }

  getLastInteractionMs(): number {
    return Math.max(this.lastStrokeMs, this.toys.getLastToyMs());
  }

  strokeFromHud(zone: 'head' | 'chin' | 'back', strokeIndex: number): void {
    this.onStroke(zone, strokeIndex);
    this.lastStrokeMs = Date.now();
  }

  performAction(kind: PetCareActionKind): void {
    if (this.j4lpanMode) this.j4lpanFlash = j4lpanFlashFromAction(kind, Date.now());
    if (kind === 'toy_yarn') this.toys.spawnYarn();
    if (kind === 'toy_box') this.toys.spawnBox();
    if (kind === 'brush') this.ambient.playBrush();
    if (kind === 'pour_water') {
      this.ambient.playPourWater(() => {
        const mood = derivePetCareMood(this.snapshot, this.traits);
        const ctx = { traits: this.traits, petName: this.petName, shyRefuseRoll: Math.random() + mood.refuseFoodBias * 0.1 };
        this.applyExpression(reactToCareAction('pour_water', ctx));
      });
    }
    const mood = derivePetCareMood(this.snapshot, this.traits);
    const ctx = {
      traits: this.traits,
      petName: this.petName,
      shyRefuseRoll: Math.random() + mood.refuseFoodBias * 0.25,
    };
    if (kind === 'pour_water') return;
    const expr = reactToCareAction(kind, ctx);
    this.applyExpression(expr);
    if (kind === 'toy_yarn' || kind === 'toy_box') this.toys.playWithToy();
  }

  update(deltaMs: number, _nowMs: number): void {
    const mood = derivePetCareMood(this.snapshot, this.traits);
    this.breathPhase += deltaMs * 0.0025;
    this.swayPhase += deltaMs * 0.0011;
    if (this.body) {
      const breath = 1 + Math.sin(this.breathPhase) * mood.breathAmplitude * 0.65;
      const scale = PET_CARE_CAT_ORANGE_SCALE * breath;
      this.body.setScale(scale);
    }

    const lerp = Math.min(1, deltaMs * 0.0045);
    this.currentTiltDeg += (this.targetTiltDeg - this.currentTiltDeg) * lerp;
    const sway = Math.sin(this.swayPhase) * 0.8;
    this.root.setAngle(this.currentTiltDeg * 0.2 + sway);

    this.framePlayer?.tick(deltaMs);
    if (this.j4lpanMode) {
      const now = _nowMs;
      this.j4lpanFlash = activeJ4lpanFlash(this.j4lpanFlash, now);
      this.syncJ4lpanPortrait(this.bubble.text);
    }
    this.toys.update(deltaMs, 0, -12);
    if (this.toys.isChaseActive()) {
      this.applyExpression({
        anim: 'play_pounce',
        bubbleVi: 'Ôi!',
        earTilt: 8,
        tail: 'wag_fast',
        eyeMood: 'happy',
      });
    }
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
    if (zone !== 'none') gameEventBus.emit('evt:pet-care-stroke-done', { zone });
  }

  private zoneFromLocal(px: number, py: number): PetCareZone {
    if (py < -48) return 'head';
    if (py < -18 && px > -20 && px < 20) return 'chin';
    if (py > 14 && px > -26 && px < 26) return 'belly';
    if (py > -42) return 'back';
    return 'none';
  }

  private applyExpression(expr: PetCareExpression): void {
    this.targetTiltDeg = expr.earTilt ?? 0;
    if (expr.refuse) {
      gameEventBus.emit('evt:pet-care-refuse', { squeak: expr.squeak ?? 'refuse' });
      this.scene.tweens.add({
        targets: this.root,
        y: `+=${3}`,
        duration: 90,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    }
    if (expr.bubbleVi && expr.bubbleVi !== this.bubble.text) {
      this.bubble.setAlpha(0.55);
      this.scene.tweens.add({
        targets: this.bubble,
        alpha: 1,
        duration: 220,
        ease: 'Quad.easeOut',
      });
    }
    if (this.j4lpanMode) this.j4lpanFlash = j4lpanFlashFromExpression(expr, Date.now());
    if (this.body && (expr.anim === 'play_pounce' || expr.anim === 'eat')) {
      this.scene.tweens.add({
        targets: this.body,
        y: '+=2',
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    }
    this.playAnim(expr.anim);
    if (expr.bubbleVi) this.bubble.setText(expr.bubbleVi);
    if (this.j4lpanMode) this.syncJ4lpanPortrait(expr.bubbleVi ?? this.bubble.text);
  }

  private syncJ4lpanPortrait(bubbleVi: string): void {
    publishJ4lpanPortrait({
      snapshot: this.snapshot,
      bubbleVi,
      flash: this.j4lpanFlash,
      nowMs: this.snapshot?.serverNowMs ?? Date.now(),
    });
  }

  private publishAtlasRegressionMarkers(
    scene: Phaser.Scene,
    bodyKey: string,
    frameIndex: number,
    illustration = false,
  ): void {
    const canvas = scene.game.canvas;
    if (!scene.textures.exists(bodyKey)) return;
    const tex = scene.textures.get(bodyKey);
    const frame = tex.get(frameIndex);
    const sourceW = tex.source[0]?.width ?? 0;
    canvas.dataset.petCareAtlasIsolated = illustration ? '0' : '1';
    canvas.dataset.petCareIllustration = illustration ? '1' : '0';
    canvas.dataset.petCareBodyTexW = String(sourceW);
    canvas.dataset.petCareBodyFrameW = String(frame?.width ?? 0);
    canvas.dataset.petCareBodyFrameH = String(frame?.height ?? 0);
  }

  private playAnim(state: PetAnimState): void {
    this.framePlayer?.setState(state);
  }
}