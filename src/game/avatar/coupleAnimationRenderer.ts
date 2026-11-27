import type Phaser from 'phaser';
import {
  DEFAULT_AVATAR_PARTNER_A,
  OUTFIT_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
} from '../../shared/avatar';
import { computeSharedHandAnchor } from '../../shared/couple/coupleHandKinematics';
import {
  evaluateCouplePhase,
  type CoupleAnimationPhase,
} from '../../shared/couple/coupleStateMachine';
import type { CouplePostureKind } from '../../shared/couple/coupleTypes';
import type { AvatarConfig, Direction } from '../../shared/types';

export interface CoupleRenderFrameInput {
  localX: number;
  localY: number;
  localFacing: Direction;
  localMoving: boolean;
  localPosture: CouplePostureKind;
  localAvatar: AvatarConfig | null;
  partnerX: number;
  partnerY: number;
  partnerFacing: Direction;
  partnerMoving: boolean;
  partnerPosture: CouplePostureKind;
  partnerAvatar: AvatarConfig | null;
  phaseStartedAtMs: number;
  releaseStartedAtMs: number | null;
  releasing: boolean;
  sameRoom: boolean;
  scale: number;
  timeMs: number;
}

interface PaletteRgb {
  skin: number;
  skinShade: number;
  outfit: number;
  outfitShade: number;
}

const OUTLINE_HEX = 0x3d2a24;

function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

function resolveAvatarColors(config: AvatarConfig | null): PaletteRgb {
  const safe = config ?? DEFAULT_AVATAR_PARTNER_A;
  const skin = SKIN_TONE_OPTIONS.find((s) => s.id === safe.skinTone) ?? SKIN_TONE_OPTIONS[1]!;
  const outfit =
    OUTFIT_COLOR_OPTIONS.find((o) => o.id === safe.outfitColor) ?? OUTFIT_COLOR_OPTIONS[1]!;
  return {
    skin: hexToNumber(skin.baseHex),
    skinShade: hexToNumber(skin.shadeHex),
    outfit: hexToNumber(outfit.baseHex),
    outfitShade: hexToNumber(outfit.shadeHex),
  };
}

/**
 * Dual-layer (background behind-body + foreground over-body) pixel-perfect P0 couple arm & hand
 * contact renderer. Draws real FABRIK-linked arms/hands for hold_hands and wrapped multi-layer
 * embrace arms for hug without ever substituting emojis or text labels.
 */
export class CoupleAnimationRenderer {
  private readonly backGfx: Phaser.GameObjects.Graphics;
  private readonly frontGfx: Phaser.GameObjects.Graphics;

  lastRenderedPhase: CoupleAnimationPhase | 'none' = 'none';
  lastHandGapPx = Infinity;

  constructor(scene: Phaser.Scene) {
    this.backGfx = scene.add.graphics().setDepth(9000);
    this.frontGfx = scene.add.graphics().setDepth(9010);
  }

  private snap(v: number, s: number): number {
    return Math.round(v / s) * s;
  }

  private drawPixelBlock(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    wPx: number,
    hPx: number,
    fill: number,
    s: number,
    withOutline = true,
  ): void {
    const x = this.snap(cx - (wPx * s) / 2, s);
    const y = this.snap(cy - (hPx * s) / 2, s);
    const w = Math.max(s, Math.round(wPx * s));
    const h = Math.max(s, Math.round(hPx * s));
    if (withOutline) {
      gfx.fillStyle(OUTLINE_HEX, 1);
      gfx.fillRect(x - s * 0.5, y - s * 0.5, w + s, h + s);
    }
    gfx.fillStyle(fill, 1);
    gfx.fillRect(x, y, w, h);
  }

  /** Rasterizes an integer-snapped pixel arm segment with dark outline border. */
  private drawPixelArmSegment(
    gfx: Phaser.GameObjects.Graphics,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    fill: number,
    shade: number,
    s: number,
  ): void {
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(2, Math.ceil(dist / Math.max(1, s * 0.85)));

    // 1. Outline pass first so sleeve interior remains solid & cohesive
    gfx.fillStyle(OUTLINE_HEX, 1);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const px = this.snap(ax + (bx - ax) * t, s);
      const py = this.snap(ay + (by - ay) * t, s);
      gfx.fillRect(px - s * 0.95, py - s * 0.95, 1.9 * s, 1.9 * s);
    }

    // 2. Sleeve shade underside + top highlight
    gfx.fillStyle(shade, 1);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const px = this.snap(ax + (bx - ax) * t, s);
      const py = this.snap(ay + (by - ay) * t, s);
      gfx.fillRect(px - s * 0.5, py - s * 0.15, 1.15 * s, 1.15 * s);
    }

    gfx.fillStyle(fill, 1);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const px = this.snap(ax + (bx - ax) * t, s);
      const py = this.snap(ay + (by - ay) * t, s);
      gfx.fillRect(px - s * 0.5, py - s * 0.45, 1.15 * s, 0.9 * s);
    }
  }

  update(input: CoupleRenderFrameInput): void {
    this.backGfx.clear();
    this.frontGfx.clear();

    const kind =
      input.localPosture === 'hug' || input.localPosture === 'hold_hands'
        ? input.localPosture
        : null;

    if (!input.sameRoom || !kind) {
      this.backGfx.setVisible(false);
      this.frontGfx.setVisible(false);
      this.lastRenderedPhase = 'none';
      this.lastHandGapPx = Infinity;
      return;
    }

    const s = Math.max(1, input.scale);
    const maxRenderDist = 56 * s;
    const dist = Math.hypot(input.partnerX - input.localX, input.partnerY - input.localY);
    if (dist > maxRenderDist) {
      this.backGfx.setVisible(false);
      this.frontGfx.setVisible(false);
      this.lastRenderedPhase = 'none';
      this.lastHandGapPx = Infinity;
      return;
    }

    if (input.partnerPosture !== kind && !input.releasing && kind !== 'hold_hands') {
      this.backGfx.setVisible(false);
      this.frontGfx.setVisible(false);
      this.lastRenderedPhase = 'none';
      return;
    }

    const moving = input.localMoving || input.partnerMoving;
    const phaseSnap = evaluateCouplePhase(kind, input.phaseStartedAtMs, input.timeMs, {
      moving,
      releasing: input.releasing,
      releaseStartedAtMs: input.releaseStartedAtMs,
    });
    this.lastRenderedPhase = phaseSnap.phase;

    const leftIsLocal = input.localX <= input.partnerX;
    const lx = leftIsLocal ? input.localX : input.partnerX;
    const ly = leftIsLocal ? input.localY : input.partnerY;
    const lFacing = leftIsLocal ? input.localFacing : input.partnerFacing;
    const rx = leftIsLocal ? input.partnerX : input.localX;
    const ry = leftIsLocal ? input.partnerY : input.localY;
    const rFacing = leftIsLocal ? input.partnerFacing : input.localFacing;

    const leftPalette = resolveAvatarColors(leftIsLocal ? input.localAvatar : input.partnerAvatar);
    const rightPalette = resolveAvatarColors(leftIsLocal ? input.partnerAvatar : input.localAvatar);

    const minDepth = Math.min(ly, ry);
    const maxDepth = Math.max(ly, ry);
    this.backGfx.setDepth(minDepth - 0.8);
    this.frontGfx.setDepth(maxDepth + 2.5);
    this.backGfx.setVisible(true);
    this.frontGfx.setVisible(true);

    if (kind === 'hold_hands') {
      const contactPose = computeSharedHandAnchor({
        ax: lx,
        ay: ly,
        aFacing: lFacing,
        bx: rx,
        by: ry,
        bFacing: rFacing,
        reachAlpha: phaseSnap.contactWeight,
        walkPhaseRad: input.timeMs / (moving ? 115 : 340),
        moving,
        scale: s,
      });
      this.lastHandGapPx = contactPose.distPx;

      const bothFacingAway = lFacing === 'up' && rFacing === 'up';
      const targetLayer = bothFacingAway ? this.backGfx : this.frontGfx;

      // Left partner inner arm (shoulder -> elbow -> wrist)
      this.drawPixelArmSegment(
        targetLayer,
        contactPose.leftArm.shoulder.x,
        contactPose.leftArm.shoulder.y,
        contactPose.leftArm.elbow.x,
        contactPose.leftArm.elbow.y,
        leftPalette.outfit,
        leftPalette.outfitShade,
        s,
      );
      this.drawPixelArmSegment(
        targetLayer,
        contactPose.leftArm.elbow.x,
        contactPose.leftArm.elbow.y,
        contactPose.leftArm.wrist.x,
        contactPose.leftArm.wrist.y,
        leftPalette.outfit,
        leftPalette.outfitShade,
        s,
      );

      // Right partner inner arm (shoulder -> elbow -> wrist)
      this.drawPixelArmSegment(
        targetLayer,
        contactPose.rightArm.shoulder.x,
        contactPose.rightArm.shoulder.y,
        contactPose.rightArm.elbow.x,
        contactPose.rightArm.elbow.y,
        rightPalette.outfit,
        rightPalette.outfitShade,
        s,
      );
      this.drawPixelArmSegment(
        targetLayer,
        contactPose.rightArm.elbow.x,
        contactPose.rightArm.elbow.y,
        contactPose.rightArm.wrist.x,
        contactPose.rightArm.wrist.y,
        rightPalette.outfit,
        rightPalette.outfitShade,
        s,
      );

      // Interlaced touching hand clasp rendered pixel-accurate at shared anchor
      if (phaseSnap.contactWeight > 0.35) {
        this.drawPixelBlock(
          targetLayer,
          contactPose.leftArm.wrist.x,
          contactPose.leftArm.wrist.y,
          1.45,
          1.45,
          leftPalette.skin,
          s,
        );
        this.drawPixelBlock(
          targetLayer,
          contactPose.rightArm.wrist.x,
          contactPose.rightArm.wrist.y,
          1.45,
          1.45,
          rightPalette.skin,
          s,
        );
        this.drawPixelBlock(
          targetLayer,
          contactPose.anchorX,
          contactPose.anchorY,
          1.1,
          0.9,
          leftPalette.skinShade,
          s,
          false,
        );
      } else {
        this.drawPixelBlock(targetLayer, contactPose.leftArm.wrist.x, contactPose.leftArm.wrist.y, 1.35, 1.35, leftPalette.skin, s);
        this.drawPixelBlock(targetLayer, contactPose.rightArm.wrist.x, contactPose.rightArm.wrist.y, 1.35, 1.35, rightPalette.skin, s);
      }
      return;
    }

    // P0 Hug Animation: approach -> embrace (wrapped multi-layer arms on torso/back below faces) -> hold -> release
    const w = phaseSnap.contactWeight;
    const breathY =
      phaseSnap.phase === 'hold' ? Math.sin(input.timeMs / 420) * 0.35 * s : 0;
    const frontPartnerIsLeft = ly >= ry;
    const fgX = frontPartnerIsLeft ? lx : rx;
    const fgY = frontPartnerIsLeft ? ly : ry;
    const bgX = frontPartnerIsLeft ? rx : lx;
    const bgY = frontPartnerIsLeft ? ry : ly;
    const fgPalette = frontPartnerIsLeft ? leftPalette : rightPalette;
    const bgPalette = frontPartnerIsLeft ? rightPalette : leftPalette;
    const fgDirSign = frontPartnerIsLeft ? 1 : -1;

    // 1. Background arm (far partner reaching behind foreground partner's back at waist level)
    const bgShoulder = { x: bgX - fgDirSign * 1.2 * s, y: bgY - 4.3 * s + breathY };
    const bgTarget = {
      x: bgShoulder.x + (fgX - bgX - fgDirSign * 1.8 * s) * w,
      y: fgY - 3.2 * s + breathY,
    };
    this.drawPixelArmSegment(
      this.backGfx,
      bgShoulder.x,
      bgShoulder.y,
      bgTarget.x,
      bgTarget.y,
      bgPalette.outfit,
      bgPalette.outfitShade,
      s,
    );
    this.drawPixelBlock(this.backGfx, bgTarget.x, bgTarget.y, 1.4, 1.4, bgPalette.skin, s);

    // 2. Foreground embracing arm wrapping cleanly across torso/waist onto partner's upper back (below chin/glasses)
    const fgShoulder = { x: fgX - fgDirSign * 1.2 * s, y: fgY - 4.4 * s + breathY };
    const midElbow = {
      x: fgShoulder.x + ((fgX + bgX) * 0.5 - fgShoulder.x) * w,
      y: fgY - 3.0 * s + breathY,
    };
    const wrapWrist = {
      x: bgX + fgDirSign * 2.4 * w * s,
      y: bgY - 4.2 * s + breathY * 0.5,
    };
    this.drawPixelArmSegment(
      this.frontGfx,
      fgShoulder.x,
      fgShoulder.y,
      midElbow.x,
      midElbow.y,
      fgPalette.outfit,
      fgPalette.outfitShade,
      s,
    );
    if (w > 0.2) {
      this.drawPixelArmSegment(
        this.frontGfx,
        midElbow.x,
        midElbow.y,
        midElbow.x + (wrapWrist.x - midElbow.x) * w,
        midElbow.y + (wrapWrist.y - midElbow.y) * w,
        fgPalette.outfit,
        fgPalette.outfitShade,
        s,
      );
      this.drawPixelBlock(
        this.frontGfx,
        midElbow.x + (wrapWrist.x - midElbow.x) * w,
        midElbow.y + (wrapWrist.y - midElbow.y) * w,
        1.4,
        1.4,
        fgPalette.skin,
        s,
      );
    }
    this.lastHandGapPx = 0;
  }

  destroy(): void {
    this.backGfx.destroy();
    this.frontGfx.destroy();
  }
}
