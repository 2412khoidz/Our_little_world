import type Phaser from 'phaser';
import {
  CAT_ACCESSORIES,
  CAT_VARIANTS,
  LIVING_ITEM_ICONS,
  PET_ANIMATION_SPECS,
  PET_FRAME_SIZE,
  type CatAccessoryId,
  type CatCoatVariantId,
  type CatVariantSpec,
  type LivingItemIconId,
  type PetAnimState,
  type PetFacing,
} from '../../shared/petLiving/petVisualTypes';
import { WORLD_PROPS_KEY } from '../art/worldAtlas';
import { livingCatLicensedPackReady, stampLivingCatPackDataset } from './livingCatWorldSprite';

const SHEET_COLS = 6;
export const LIVING_ITEMS_ATLAS_KEY = 'olw-living-items';

export function getLivingCatTextureKey(variant: CatCoatVariantId, accessory: CatAccessoryId): string {
  return `olw-living-cat-${variant}-${accessory}`;
}

export function getLivingCatAnimKey(
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
  state: PetAnimState,
): string {
  return `${getLivingCatTextureKey(variant, accessory)}:${state}`;
}

type Px = (x: number, y: number, color: string) => void;

interface VariantTone extends CatVariantSpec {
  topOutline: string;
  bottomOutline: string;
  highlight: string;
  eyeIris: string;
}

function getVariantTone(spec: CatVariantSpec): VariantTone {
  if (spec.id === 'cream-puff') {
    return {
      ...spec,
      topOutline: '#8f6b64',
      bottomOutline: '#5d423e',
      highlight: '#ffffff',
      eyeIris: '#6a4854',
    };
  }
  if (spec.id === 'calico-patch') {
    return {
      ...spec,
      topOutline: '#875c4a',
      bottomOutline: '#4e3128',
      highlight: '#fffbf4',
      eyeIris: '#785028',
    };
  }
  // Flagship Ginger Tabby (Quýt): warm cinnamon sel-out, golden apricot back highlight
  return {
    ...spec,
    topOutline: '#965630',
    bottomOutline: '#5c2e1c',
    highlight: '#fac987',
    eyeIris: '#c97b28',
  };
}

function makePixelDrawer(ctx: CanvasRenderingContext2D, ox: number, oy: number, mirrorX = false): Px {
  return (x, y, color) => {
    const rawX = Math.round(x);
    const px = mirrorX ? PET_FRAME_SIZE - 1 - rawX : rawX;
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= PET_FRAME_SIZE || py >= PET_FRAME_SIZE) return;
    ctx.fillStyle = color;
    ctx.fillRect(ox + px, oy + py, 1, 1);
  };
}

/** Sel-out shaded ellipse: softer warm outline above/sides, richer outline below. */
function fillSelOutEllipse(
  px: Px,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tone: VariantTone,
  overrideFill?: string,
) {
  const fill = overrideFill ?? tone.palette.primary;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1.0) {
        const shade =
          dy < -0.45 && dx > -0.6 && dx < 0.6
            ? tone.highlight
            : dy > 0.4
              ? tone.palette.primaryShadow
              : fill;
        px(x, y, shade);
      } else {
        const n =
          ((x - 1 - cx) / rx) ** 2 + dy * dy <= 1.0 ||
          ((x + 1 - cx) / rx) ** 2 + dy * dy <= 1.0 ||
          dx * dx + ((y - 1 - cy) / ry) ** 2 <= 1.0 ||
          dx * dx + ((y + 1 - cy) / ry) ** 2 <= 1.0;
        if (n) {
          px(x, y, dy > 0.25 ? tone.bottomOutline : tone.topOutline);
        }
      }
    }
  }
}

function drawPaw(px: Px, x: number, y: number, tone: VariantTone, shaded = false) {
  const fur = shaded ? tone.palette.secondary : tone.palette.belly;
  const line = tone.bottomOutline;
  px(x, y - 1, shaded ? tone.palette.primaryShadow : tone.palette.primary);
  px(x + 1, y - 1, shaded ? tone.palette.primaryShadow : tone.palette.primary);
  px(x, y, fur);
  px(x + 1, y, fur);
  px(x - 1, y, line);
  px(x + 2, y, line);
  px(x, y + 1, line);
  px(x + 1, y + 1, line);
}

function drawKittenEars(
  px: Px,
  tone: VariantTone,
  leftX: number,
  rightX: number,
  baseY: number,
  backFacing: boolean,
  twitchL = 0,
  twitchR = 0,
) {
  const { primary, innerEar, patchDark, secondary } = tone.palette;
  const fillL = tone.id === 'calico-patch' ? (patchDark ?? secondary) : primary;
  const fillR = tone.id === 'calico-patch' ? secondary : primary;
  const specs: Array<[number, string, number]> = [
    [leftX, fillL, twitchL],
    [rightX, fillR, twitchR],
  ];

  for (const [ex, fill, dy] of specs) {
    if (tone.earShape === 'rounded') {
      px(ex - 1, baseY - 2 + dy, tone.topOutline);
      px(ex, baseY - 2 + dy, tone.topOutline);
      px(ex + 1, baseY - 2 + dy, tone.topOutline);
      px(ex - 2, baseY - 1 + dy, tone.topOutline);
      px(ex - 1, baseY - 1 + dy, fill);
      px(ex, baseY - 1 + dy, backFacing ? fill : innerEar);
      px(ex + 1, baseY - 1 + dy, fill);
      px(ex + 2, baseY - 1 + dy, tone.topOutline);
      px(ex - 1, baseY + dy, fill);
      px(ex, baseY + dy, backFacing ? fill : innerEar);
      px(ex + 1, baseY + dy, fill);
    } else {
      px(ex, baseY - 3 + dy, tone.topOutline);
      px(ex - 1, baseY - 2 + dy, tone.topOutline);
      px(ex, baseY - 2 + dy, fill);
      px(ex + 1, baseY - 2 + dy, tone.topOutline);
      px(ex - 2, baseY - 1 + dy, tone.topOutline);
      px(ex - 1, baseY - 1 + dy, fill);
      px(ex, baseY - 1 + dy, backFacing ? fill : innerEar);
      px(ex + 1, baseY - 1 + dy, fill);
      px(ex + 2, baseY - 1 + dy, tone.topOutline);
      px(ex - 1, baseY + dy, fill);
      px(ex, baseY + dy, backFacing ? fill : innerEar);
      px(ex + 1, baseY + dy, fill);
    }
  }
}

function drawCurvedTail(
  px: Px,
  tone: VariantTone,
  pts: ReadonlyArray<readonly [number, number]>,
) {
  const { primary, secondary, stripe, patchDark, belly } = tone.palette;
  const accent = tone.id === 'ginger-tabby' ? (stripe ?? secondary) : (patchDark ?? secondary);

  for (const [x, y] of pts) {
    px(x - 1, y, tone.topOutline);
    px(x + 1, y, tone.topOutline);
    px(x, y - 1, tone.topOutline);
    px(x, y + 1, tone.bottomOutline);
  }
  pts.forEach(([x, y], idx) => {
    const isTip = idx === pts.length - 1;
    const c = isTip
      ? tone.id === 'ginger-tabby'
        ? belly
        : accent
      : idx % 2 === 1
        ? accent
        : primary;
    px(x, y, c);
  });
}

function drawCollarAccessory(
  px: Px,
  accessory: CatAccessoryId,
  cx: number,
  cy: number,
  width = 3,
  frontVisible = true,
) {
  if (accessory === 'none') return;
  const spec = CAT_ACCESSORIES.find((a) => a.id === accessory);
  if (!spec) return;
  for (let dx = -width; dx <= width; dx += 1) {
    px(cx + dx, cy, spec.color);
  }
  if (!frontVisible) return;
  if (accessory === 'ribbon_rose') {
    px(cx - 1, cy + 1, spec.accent);
    px(cx, cy + 1, '#fff3f6');
    px(cx + 1, cy + 1, spec.accent);
  } else if (accessory === 'scarf_mint') {
    px(cx + 1, cy + 1, spec.color);
    px(cx + 1, cy + 2, spec.accent);
    px(cx + 2, cy + 1, spec.color);
  } else if (accessory === 'bell_gold') {
    px(cx, cy + 1, spec.accent);
    px(cx + 1, cy + 1, spec.color);
  }
}

function drawHeadMarkingsAndFace(
  px: Px,
  tone: VariantTone,
  cx: number,
  cy: number,
  view: 'front' | 'side' | 'back',
  mood: 'open' | 'blink' | 'happy' | 'sleep' | 'yawn',
) {
  const { eye, cheek, innerEar, stripe, patchDark, secondary } = tone.palette;

  // Forehead / crown coat markings
  if (tone.id === 'ginger-tabby' && stripe) {
    px(cx - 1, cy - 3, stripe);
    px(cx + 1, cy - 3, stripe);
    px(cx, cy - 2, stripe);
  } else if (tone.id === 'cream-puff' && patchDark) {
    px(cx - 3, cy - 2, patchDark);
    px(cx + 3, cy - 2, patchDark);
  } else if (tone.id === 'calico-patch') {
    px(cx - 3, cy - 2, patchDark ?? secondary);
    px(cx - 2, cy - 2, patchDark ?? secondary);
    px(cx + 2, cy - 2, secondary);
    px(cx + 3, cy - 2, secondary);
  }

  if (view === 'back') return;

  if (view === 'side') {
    // 3/4 side view facing right (+x): both eyes visible for clear cute read!
    const farEyeX = cx + 1;
    const nearEyeX = cx + 3;
    if (mood === 'blink' || mood === 'sleep') {
      px(farEyeX, cy, eye);
      px(nearEyeX - 1, cy, eye);
      px(nearEyeX, cy, eye);
    } else if (mood === 'happy') {
      px(farEyeX, cy - 1, eye);
      px(nearEyeX - 1, cy, eye);
      px(nearEyeX, cy - 1, eye);
    } else {
      // Near eye 2x2 with catchlight; far eye 1x2
      px(farEyeX, cy - 1, '#ffffff');
      px(farEyeX, cy, eye);
      px(nearEyeX - 1, cy - 1, '#ffffff');
      px(nearEyeX, cy - 1, eye);
      px(nearEyeX - 1, cy, eye);
      px(nearEyeX, cy, tone.eyeIris);
    }
    px(cx + 4, cy + 1, innerEar); // dainty pink nose tip
    px(cx + 2, cy + 1, cheek);
    if (mood === 'yawn') {
      px(cx + 3, cy + 2, '#ec7b92');
      px(cx + 4, cy + 2, '#d1526e');
    } else {
      px(cx + 3, cy + 2, tone.palette.belly); // soft cream muzzle
    }
    return;
  }

  // Front view (South)
  const exL = cx - 2;
  const exR = cx + 2;
  if (mood === 'blink' || mood === 'sleep') {
    px(exL - 1, cy, eye);
    px(exL, cy, eye);
    px(exR, cy, eye);
    px(exR + 1, cy, eye);
  } else if (mood === 'happy') {
    px(exL - 1, cy, eye);
    px(exL, cy - 1, eye);
    px(exR, cy - 1, eye);
    px(exR + 1, cy, eye);
  } else {
    px(exL - 1, cy - 1, '#ffffff');
    px(exL, cy - 1, eye);
    px(exL - 1, cy, eye);
    px(exL, cy, tone.eyeIris);

    px(exR, cy - 1, '#ffffff');
    px(exR + 1, cy - 1, eye);
    px(exR, cy, eye);
    px(exR + 1, cy, tone.eyeIris);
  }

  // Muzzle cream + tiny pink nose + cute 'w' smile
  px(cx - 1, cy + 1, tone.palette.belly);
  px(cx + 1, cy + 1, tone.palette.belly);
  px(cx, cy + 1, innerEar);
  px(cx - 3, cy + 1, cheek);
  px(cx + 3, cy + 1, cheek);
  if (mood === 'yawn') {
    px(cx - 1, cy + 2, '#ec7b92');
    px(cx, cy + 2, '#d1526e');
    px(cx + 1, cy + 2, '#ec7b92');
  } else {
    px(cx - 1, cy + 2, tone.bottomOutline);
    px(cx, cy + 2, tone.palette.belly);
    px(cx + 1, cy + 2, tone.bottomOutline);
  }
}

function drawQuadrupedSide(
  px: Px,
  tone: VariantTone,
  accessory: CatAccessoryId,
  anim: PetAnimState,
  frameIdx: number,
) {
  const isWalk = anim.startsWith('walk_');
  const isRun = anim.startsWith('run_');
  const isSit = anim.startsWith('sit_');
  const strideSeq = [0, 1, 2, 0, -1, -2];
  const s = isWalk ? (strideSeq[frameIdx % strideSeq.length] ?? 0) : isRun ? (frameIdx % 2 === 0 ? 2 : -2) : 0;
  const bob = isWalk ? (frameIdx % 3 === 1 ? -1 : 0) : isRun ? (frameIdx === 1 || frameIdx === 2 ? -1 : 0) : 0;

  // Tail behind left hip curling gracefully
  const tailBob = frameIdx % 2 === 0 ? 0 : -1;
  drawCurvedTail(px, tone, [
    [6, 15 + bob],
    [4, 14 + bob],
    [3, 12 + bob + tailBob],
    [4, 10 + bob + tailBob],
    [5, 9 + bob + tailBob],
  ]);

  if (isSit) {
    // Graceful seated profile
    fillSelOutEllipse(px, 9, 17, 3.8, 3.6, tone);
    drawPaw(px, 12, 20, tone, false);
    drawPaw(px, 9, 20, tone, true);
    fillSelOutEllipse(px, 13, 11, 4.4, 3.6, tone);
    drawKittenEars(px, tone, 10, 14, 8, false, frameIdx === 2 ? -1 : 0, 0);
    drawHeadMarkingsAndFace(px, tone, 13, 11, 'side', frameIdx === 3 ? 'blink' : 'open');
    drawCollarAccessory(px, accessory, 12, 15, 2, true);
    return;
  }

  // Far legs (behind torso)
  drawPaw(px, 7 - s, 20, tone, true);
  drawPaw(px, 13 + s, 20, tone, true);

  // Horizontal sleek feline quadruped torso
  fillSelOutEllipse(px, 10, 16 + bob, 4.8, 2.9, tone);
  // Soft cream chest & tummy underside
  for (let x = 9; x <= 13; x += 1) {
    px(x, 18 + bob, tone.palette.belly);
  }
  if (tone.id === 'calico-patch') {
    px(9, 15 + bob, tone.palette.secondary);
    px(11, 14 + bob, tone.palette.patchDark ?? tone.palette.secondary);
  } else if (tone.id === 'ginger-tabby' && tone.palette.stripe) {
    px(8, 14 + bob, tone.palette.stripe);
    px(10, 14 + bob, tone.palette.stripe);
  }

  // Near legs (distinct 4-legged stride!)
  drawPaw(px, 6 + s, 20, tone, false);
  drawPaw(px, 14 - s, 20, tone, false);

  // Expressive head set cleanly forward at shoulder
  const headCx = 15;
  const headCy = 11 + bob;
  fillSelOutEllipse(px, headCx, headCy, 4.3, 3.5, tone);
  drawKittenEars(px, tone, headCx - 2, headCx + 2, headCy - 3, false, frameIdx === 2 ? -1 : 0, 0);
  drawHeadMarkingsAndFace(
    px,
    tone,
    headCx,
    headCy,
    'side',
    frameIdx === 4 && anim.startsWith('idle_') ? 'blink' : 'open',
  );
  drawCollarAccessory(px, accessory, 14, 15 + bob, 2, true);
}

function drawCatFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  spec: CatVariantSpec,
  accessory: CatAccessoryId,
  anim: PetAnimState,
  frameIdx: number,
) {
  const tone = getVariantTone(spec);
  const facing: PetFacing = anim.endsWith('_east')
    ? 'east'
    : anim.endsWith('_west')
      ? 'west'
      : anim.endsWith('_north')
        ? 'north'
        : 'south';
  const px = makePixelDrawer(ctx, ox, oy, facing === 'west');

  // 1. Curled cinnamon-roll sleep / relaxed lie-down
  if (anim === 'sleep' || anim === 'lie_down') {
    const breathe = anim === 'sleep' ? (frameIdx >= 2 && frameIdx <= 4 ? -1 : 0) : 0;
    const rxB = tone.bodyRoundness === 'chubby' ? 5.6 : 5.2;
    fillSelOutEllipse(px, 13, 16 + breathe * 0.4, rxB, 3.6, tone);
    if (tone.id === 'ginger-tabby' && tone.palette.stripe) {
      px(13, 13 + breathe * 0.4, tone.palette.stripe);
      px(15, 13 + breathe * 0.4, tone.palette.stripe);
    }
    // Wrapped striped tail around paws
    drawCurvedTail(px, tone, [
      [18, 17],
      [17, 19],
      [14, 20],
      [11, 20],
    ]);
    // Cozy tucked head resting on paws
    fillSelOutEllipse(px, 8, 15, 4.1, 3.4, tone);
    drawKittenEars(px, tone, 6, 10, 12, false, 0, anim === 'lie_down' && frameIdx === 2 ? -1 : 0);
    drawHeadMarkingsAndFace(px, tone, 8, 15, 'front', anim === 'sleep' ? 'sleep' : frameIdx === 1 ? 'blink' : 'open');
    drawPaw(px, 6, 19, tone, false);
    drawCollarAccessory(px, accessory, 10, 18, 2, true);
    return;
  }

  // 2. Cardboard box peek!
  if (anim === 'box_peek') {
    const bob = frameIdx % 2;
    fillSelOutEllipse(px, 12, 9 + bob, 4.5, 3.6, tone);
    drawKittenEars(px, tone, 9, 15, 6 + bob, false, frameIdx === 2 ? -1 : 0, 0);
    drawHeadMarkingsAndFace(px, tone, 12, 9 + bob, 'front', frameIdx === 3 ? 'blink' : 'open');
    // Warm corrugated box
    for (let x = 5; x <= 18; x += 1) {
      px(x, 12, '#69442c');
      for (let y = 13; y <= 20; y += 1) {
        const border = x === 5 || x === 18 || y === 20;
        px(x, y, border ? '#593722' : y === 13 ? '#ebc28f' : '#cc9560');
      }
    }
    drawPaw(px, 8, 12, tone, false);
    drawPaw(px, 14, 12, tone, false);
    return;
  }

  // 3. Natural Sleep -> Wake Yawn -> Classic Play-Bow Stretch transition!
  if (anim === 'wake_yawn_stretch') {
    if (frameIdx < 2) {
      // Drowsy uncurling wake-up
      fillSelOutEllipse(px, 12, 16, 4.9, 3.4, tone);
      fillSelOutEllipse(px, 10, 13, 4.3, 3.4, tone);
      drawKittenEars(px, tone, 7, 13, 10, false, 1, 0);
      drawHeadMarkingsAndFace(px, tone, 10, 13, 'front', frameIdx === 0 ? 'sleep' : 'blink');
      drawPaw(px, 8, 20, tone, false);
      drawPaw(px, 13, 20, tone, false);
    } else if (frameIdx < 4) {
      // Big adorable pink yawn!
      drawCurvedTail(px, tone, [
        [16, 17],
        [18, 15],
        [18, 12],
      ]);
      fillSelOutEllipse(px, 12, 16, 4.5, 3.5, tone);
      fillSelOutEllipse(px, 12, 10, 4.5, 3.7, tone);
      drawKittenEars(px, tone, 9, 15, 7, false, 1, 1);
      drawHeadMarkingsAndFace(px, tone, 12, 10, 'front', 'yawn');
      drawPaw(px, 9, 20, tone, false);
      drawPaw(px, 13, 20, tone, false);
      drawCollarAccessory(px, accessory, 12, 14, 3, true);
    } else {
      // Classic feline play-bow stretch (front low, hind lifted high, happy crescent eyes!)
      drawCurvedTail(px, tone, [
        [17, 13],
        [19, 11],
        [19, 8],
        [17, 7],
      ]);
      fillSelOutEllipse(px, 14, 14, 3.8, 3.3, tone);
      fillSelOutEllipse(px, 10, 16, 3.5, 2.7, tone);
      drawPaw(px, 14, 20, tone, false); // hind planted tall
      drawPaw(px, 4, 20, tone, false); // stretched front paws!
      drawPaw(px, 6, 20, tone, true);
      fillSelOutEllipse(px, 7, 15, 3.9, 3.2, tone);
      drawKittenEars(px, tone, 5, 9, 12, false, 0, 0);
      drawHeadMarkingsAndFace(px, tone, 7, 15, 'front', 'happy');
    }
    return;
  }

  // 4. Side / 3-quarter quadruped view (East or mirrored West)
  if (facing === 'east' || facing === 'west') {
    drawQuadrupedSide(px, tone, accessory, anim, frameIdx);
    return;
  }

  // 5. Front (South) & Back (North) views — clear 4 paws, fluffy chest, expressive head
  const isWalk = anim.startsWith('walk_') || anim.startsWith('run_');
  const isSit =
    anim.startsWith('sit_') ||
    anim === 'groom' ||
    anim === 'eat' ||
    anim === 'drink' ||
    anim === 'pet_purr';
  const isHop = anim === 'happy_hop' || anim === 'play_pounce';

  const bobY = isWalk
    ? (frameIdx % 3 === 1 ? -1 : 0)
    : isHop
      ? (anim === 'happy_hop' ? (frameIdx === 1 || frameIdx === 2 ? -2 : 0) : frameIdx >= 3 ? -2 : 1)
      : 0;
  const headDy =
    anim === 'eat' || anim === 'drink'
      ? (frameIdx % 2 === 0 ? 2 : 1)
      : anim === 'sniff'
        ? 1
        : anim === 'play_pounce' && frameIdx < 3
          ? 1
          : 0;
  const pawStepL = isWalk ? (frameIdx % 4 === 1 ? -1 : 0) : 0;
  const pawStepR = isWalk ? (frameIdx % 4 === 3 ? -1 : 0) : 0;

  const tailSway = frameIdx % 2 === 0 ? 0 : 1;
  drawCurvedTail(px, tone, [
    [15, 17 + bobY],
    [17 + tailSway, 15 + bobY],
    [18 + tailSway, 13 + bobY],
    [17 + tailSway, 11 + bobY],
  ]);

  const bodyRx = tone.bodyRoundness === 'chubby' ? 5.1 : tone.bodyRoundness === 'slim' ? 4.3 : 4.7;
  const bodyCy = 16 + bobY;

  // Tucked outer hind paws + clear twin front cream paws (4 visible paws!)
  drawPaw(px, 7, 19 + bobY, tone, true);
  drawPaw(px, 15, 19 + bobY, tone, true);

  fillSelOutEllipse(px, 12, bodyCy, bodyRx, isSit ? 3.7 : 3.4, tone);
  if (facing !== 'north') {
    // Cozy cream chest bib
    px(11, bodyCy, tone.palette.belly);
    px(12, bodyCy, tone.palette.belly);
    px(13, bodyCy, tone.palette.belly);
    px(11, bodyCy + 1, tone.palette.belly);
    px(12, bodyCy + 1, tone.palette.belly);
    px(12, bodyCy + 2, tone.palette.belly);
  }
  if (tone.id === 'calico-patch') {
    px(14, bodyCy - 1, tone.palette.secondary);
    px(10, bodyCy - 1, tone.palette.patchDark ?? tone.palette.secondary);
  }

  drawPaw(px, 9, 20 + bobY + pawStepL, tone, false);
  drawPaw(px, 13, 20 + bobY + pawStepR, tone, false);

  const headCx = 12 + (anim === 'sniff' && frameIdx % 2 === 0 ? 1 : 0);
  const headCy = (isSit ? 10 : 10) + bobY + headDy;
  fillSelOutEllipse(px, headCx, headCy, 4.9, 3.8, tone);
  drawKittenEars(
    px,
    tone,
    headCx - 3,
    headCx + 3,
    headCy - 3,
    facing === 'north',
    frameIdx === 2 ? -1 : 0,
    0,
  );

  const mood =
    anim === 'pet_purr' || anim === 'happy_hop'
      ? 'happy'
      : frameIdx === 4 && (anim.startsWith('idle_') || anim.startsWith('sit_'))
        ? 'blink'
        : 'open';
  drawHeadMarkingsAndFace(px, tone, headCx, headCy, facing === 'north' ? 'back' : 'front', mood);
  drawCollarAccessory(px, accessory, headCx, headCy + 4, 3, facing !== 'north');

  if (anim === 'drink' && frameIdx % 2 === 1) {
    px(headCx, headCy + 3, '#f27c93');
  } else if (anim === 'groom' && frameIdx % 2 === 1) {
    px(headCx - 2, headCy + 2, tone.palette.belly);
    px(headCx - 3, headCy + 2, tone.palette.belly);
  }
}

export function renderLivingCatPreviewToCanvas(
  canvas: HTMLCanvasElement,
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
  animState: PetAnimState,
  frameIdx: number,
  zoom = 4,
): void {
  canvas.width = PET_FRAME_SIZE * zoom;
  canvas.height = PET_FRAME_SIZE * zoom;
  const off = document.createElement('canvas');
  off.width = PET_FRAME_SIZE;
  off.height = PET_FRAME_SIZE;
  const octx = off.getContext('2d');
  const ctx = canvas.getContext('2d');
  if (!octx || !ctx) return;

  const spec = CAT_VARIANTS.find((v) => v.id === variant) ?? CAT_VARIANTS[0]!;
  drawCatFrame(octx, 0, 0, spec, accessory, animState, frameIdx);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
}

export function ensureLivingCatSpritesheet(
  scene: Phaser.Scene,
  variant: CatCoatVariantId,
  accessory: CatAccessoryId,
): string {
  if (livingCatLicensedPackReady(scene, variant)) {
    stampLivingCatPackDataset(scene, true);
    return WORLD_PROPS_KEY;
  }
  stampLivingCatPackDataset(scene, false);
  const key = getLivingCatTextureKey(variant, accessory);
  const spec = CAT_VARIANTS.find((v) => v.id === variant) ?? CAT_VARIANTS[0]!;

  if (!scene.textures.exists(key)) {
    const rows = PET_ANIMATION_SPECS.length;
    const width = SHEET_COLS * PET_FRAME_SIZE;
    const height = rows * PET_FRAME_SIZE;
    const canvasTex = scene.textures.createCanvas(key, width, height);
    if (canvasTex) {
      const ctx = canvasTex.getContext();
      ctx.clearRect(0, 0, width, height);
      PET_ANIMATION_SPECS.forEach((animSpec, rowIdx) => {
        for (let col = 0; col < animSpec.frameCount; col += 1) {
          drawCatFrame(
            ctx,
            col * PET_FRAME_SIZE,
            rowIdx * PET_FRAME_SIZE,
            spec,
            accessory,
            animSpec.key,
            col,
          );
        }
      });
      canvasTex.refresh();
      canvasTex.setFilter(1); // NEAREST

      PET_ANIMATION_SPECS.forEach((animSpec, rowIdx) => {
        for (let col = 0; col < animSpec.frameCount; col += 1) {
          const idx = rowIdx * SHEET_COLS + col;
          canvasTex.add(
            idx,
            0,
            col * PET_FRAME_SIZE,
            rowIdx * PET_FRAME_SIZE,
            PET_FRAME_SIZE,
            PET_FRAME_SIZE,
          );
        }
      });
    }
  }

  PET_ANIMATION_SPECS.forEach((animSpec, rowIdx) => {
    const animKey = `${key}:${animSpec.key}`;
    if (scene.anims.exists(animKey)) return;
    const frames = Array.from({ length: animSpec.frameCount }, (_, col) => ({
      key,
      frame: rowIdx * SHEET_COLS + col,
    }));
    scene.anims.create({
      key: animKey,
      frames,
      frameRate: animSpec.fps,
      repeat: animSpec.loop ? -1 : 0,
    });
  });

  return key;
}

function drawItemIcon16(ctx: CanvasRenderingContext2D, ox: number, oy: number, id: LivingItemIconId) {
  const p = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, oy + y, w, h);
  };

  if (id === 'kibble_bowl_empty' || id === 'kibble_bowl_full') {
    rect(3, 8, 10, 6, '#5c3428');
    rect(4, 9, 8, 4, '#c86a52');
    rect(4, 8, 8, 2, '#f5c4b0');
    rect(5, 9, 6, 1, '#9c4b39');
    p(4, 11, '#e68c73');
    p(11, 11, '#9c4b39');
    if (id === 'kibble_bowl_full') {
      rect(5, 7, 6, 2, '#8b4e24');
      p(6, 6, '#b8713c');
      p(8, 6, '#a05f2d');
      p(9, 7, '#cfa06b');
    }
    return;
  }

  if (id === 'water_bowl_empty' || id === 'water_bowl_full') {
    rect(3, 8, 10, 6, '#2f455c');
    rect(4, 9, 8, 4, '#5e90ba');
    rect(4, 8, 8, 2, '#b3d7f0');
    rect(5, 9, 6, 1, '#3b648a');
    if (id === 'water_bowl_full') {
      rect(5, 8, 6, 2, '#69bdef');
      p(7, 8, '#e8f8ff');
      p(9, 9, '#9fd9f8');
    }
    return;
  }

  if (id === 'food_kibble' || id === 'food_warm_broth') {
    rect(3, 5, 10, 9, '#643d2a');
    rect(4, 6, 8, 7, '#f2dec0');
    rect(5, 7, 6, 5, id === 'food_kibble' ? '#cf8d48' : '#f2c179');
    p(6, 8, id === 'food_kibble' ? '#8c4c1f' : '#d67435');
    p(8, 9, id === 'food_kibble' ? '#9e5c2b' : '#fff5de');
    p(9, 8, id === 'food_kibble' ? '#7d4119' : '#e68d46');
    p(7, 3, '#fff5e4');
    p(8, 4, '#ffead2');
    return;
  }

  if (id === 'food_grilled_fish' || id === 'food_salmon_treat') {
    const main = id === 'food_grilled_fish' ? '#7d9db5' : '#f0866b';
    const light = id === 'food_grilled_fish' ? '#b8d1e3' : '#ffb8a1';
    const belly = id === 'food_grilled_fish' ? '#e6f0f5' : '#ffe0d4';
    rect(3, 5, 9, 6, '#4c2c24');
    rect(4, 6, 7, 4, main);
    rect(5, 6, 5, 1, light);
    rect(5, 9, 5, 1, belly);
    rect(12, 5, 2, 6, main);
    p(13, 7, belly);
    p(5, 7, '#2d1c19');
    if (id === 'food_salmon_treat') {
      p(7, 7, '#ffd5c4'); // salmon marbling
      p(9, 8, '#ffd5c4');
    } else {
      p(7, 7, '#5c3c28'); // sear grill marks
      p(9, 7, '#5c3c28');
    }
    return;
  }

  if (id === 'water_pitcher_empty' || id === 'water_pitcher_full') {
    rect(5, 3, 6, 11, '#3b5066');
    rect(6, 4, 4, 9, '#9fc1de');
    rect(7, 4, 1, 8, '#d4e8f7');
    rect(11, 5, 2, 5, '#688ead');
    p(4, 4, '#688ead');
    if (id === 'water_pitcher_full') {
      rect(6, 5, 4, 4, '#5cb8eb');
      p(7, 5, '#dff6ff');
      p(3, 5, '#7fd4f7');
    }
    return;
  }

  if (id === 'yarn_ball') {
    rect(4, 4, 8, 8, '#5e273a');
    rect(5, 5, 6, 6, '#e76f8e');
    rect(6, 6, 4, 2, '#f9a8bc');
    p(6, 8, '#b84261');
    p(8, 9, '#b84261');
    p(3, 12, '#e76f8e');
    p(2, 13, '#f9a8bc');
    return;
  }

  if (id === 'toy_ball') {
    rect(5, 5, 6, 6, '#4d3622');
    rect(6, 6, 4, 4, '#f5c74d');
    rect(6, 6, 2, 2, '#eb6b5e');
    p(8, 6, '#fff4bd');
    return;
  }

  if (id === 'cardboard_box') {
    rect(2, 4, 12, 10, '#623f2a');
    rect(3, 6, 10, 7, '#c78f59');
    rect(3, 5, 10, 2, '#ecc18e');
    rect(7, 7, 2, 1, '#623f2a');
    return;
  }

  if (id === 'scratching_post') {
    rect(4, 12, 8, 2, '#6d4732');
    rect(7, 3, 2, 9, '#d6b078');
    rect(5, 3, 6, 2, '#e68c9a');
    return;
  }

  // pet_cushion
  rect(2, 6, 12, 7, '#5a343b');
  rect(3, 7, 10, 5, '#f2a2b4');
  rect(5, 8, 6, 3, '#ffd9e1');
}

export function ensureLivingItemTextures(scene: Phaser.Scene): string {
  if (scene.textures.exists(LIVING_ITEMS_ATLAS_KEY)) {
    return LIVING_ITEMS_ATLAS_KEY;
  }
  const cols = LIVING_ITEM_ICONS.length;
  const tex = scene.textures.createCanvas(LIVING_ITEMS_ATLAS_KEY, cols * 16, 16);
  if (tex) {
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, cols * 16, 16);
    LIVING_ITEM_ICONS.forEach((iconId, idx) => {
      drawItemIcon16(ctx, idx * 16, 0, iconId);
    });
    tex.refresh();
    tex.setFilter(1);
    LIVING_ITEM_ICONS.forEach((iconId, idx) => {
      tex.add(iconId, 0, idx * 16, 0, 16, 16);
    });
  }
  return LIVING_ITEMS_ATLAS_KEY;
}
