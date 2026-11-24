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

function makePixelDrawer(ctx: CanvasRenderingContext2D, ox: number, oy: number): Px {
  return (x, y, color) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= PET_FRAME_SIZE || py >= PET_FRAME_SIZE) return;
    ctx.fillStyle = color;
    ctx.fillRect(ox + px, oy + py, 1, 1);
  };
}

function fillOutlinedEllipse(
  px: Px,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  outline: string,
  shade?: string,
) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1.0) {
        px(x, y, shade && dy > 0.35 ? shade : fill);
      } else {
        // 4-neighbor outline test
        const n =
          ((x - 1 - cx) / rx) ** 2 + dy * dy <= 1.0 ||
          ((x + 1 - cx) / rx) ** 2 + dy * dy <= 1.0 ||
          dx * dx + ((y - 1 - cy) / ry) ** 2 <= 1.0 ||
          dx * dx + ((y + 1 - cy) / ry) ** 2 <= 1.0;
        if (n) px(x, y, outline);
      }
    }
  }
}

function drawEars(
  px: Px,
  spec: CatVariantSpec,
  headCx: number,
  headTopY: number,
  facing: PetFacing,
  earTwitch = 0,
) {
  const { outline, primary, innerEar, patchDark, secondary } = spec.palette;
  const leftFill = spec.id === 'calico-patch' ? (patchDark ?? secondary) : primary;
  const rightFill = spec.id === 'calico-patch' ? secondary : primary;
  const sideOffset = facing === 'east' ? -1 : facing === 'west' ? 1 : 0;

  if (spec.earShape === 'rounded') {
    // Soft rounded chubby ears
    for (const [ex, fill] of [
      [headCx - 3 + sideOffset, leftFill],
      [headCx + 3 + sideOffset, rightFill],
    ] as const) {
      const dy = ex < headCx ? earTwitch : 0;
      px(ex - 1, headTopY - 2 + dy, outline);
      px(ex, headTopY - 2 + dy, outline);
      px(ex + 1, headTopY - 2 + dy, outline);
      px(ex - 2, headTopY - 1 + dy, outline);
      px(ex - 1, headTopY - 1 + dy, fill);
      px(ex, headTopY - 1 + dy, innerEar);
      px(ex + 1, headTopY - 1 + dy, fill);
      px(ex + 2, headTopY - 1 + dy, outline);
      px(ex - 1, headTopY + dy, fill);
      px(ex, headTopY + dy, innerEar);
      px(ex + 1, headTopY + dy, fill);
    }
    return;
  }

  for (const [ex, fill, isLeft] of [
    [headCx - 3 + sideOffset, leftFill, true],
    [headCx + 3 + sideOffset, rightFill, false],
  ] as const) {
    const dy = isLeft ? earTwitch : 0;
    const tipColor = spec.earShape === 'tufted' ? (spec.palette.stripe ?? outline) : outline;
    px(ex, headTopY - 3 + dy, tipColor);
    px(ex - 1, headTopY - 2 + dy, outline);
    px(ex, headTopY - 2 + dy, fill);
    px(ex + 1, headTopY - 2 + dy, outline);
    px(ex - 2, headTopY - 1 + dy, outline);
    px(ex - 1, headTopY - 1 + dy, fill);
    px(ex, headTopY - 1 + dy, facing === 'north' ? fill : innerEar);
    px(ex + 1, headTopY - 1 + dy, fill);
    px(ex + 2, headTopY - 1 + dy, outline);
  }
}

function drawAccessory(
  px: Px,
  accessory: CatAccessoryId,
  neckX: number,
  neckY: number,
  facing: PetFacing,
) {
  if (accessory === 'none') return;
  const spec = CAT_ACCESSORIES.find((a) => a.id === accessory);
  if (!spec) return;
  for (let x = neckX - 3; x <= neckX + 3; x += 1) {
    px(x, neckY, spec.color);
  }
  if (facing !== 'north') {
    if (accessory === 'ribbon_rose') {
      px(neckX - 1, neckY + 1, spec.accent);
      px(neckX, neckY + 1, spec.color);
      px(neckX + 1, neckY + 1, spec.accent);
    } else if (accessory === 'scarf_mint') {
      px(neckX + 1, neckY + 1, spec.color);
      px(neckX + 1, neckY + 2, spec.accent);
      px(neckX + 2, neckY + 1, spec.color);
    } else if (accessory === 'bell_gold') {
      px(neckX, neckY + 1, spec.accent);
      px(neckX + 1, neckY + 1, spec.accent);
    }
  }
}

function drawTail(
  px: Px,
  spec: CatVariantSpec,
  tx: number,
  ty: number,
  sway: number,
) {
  const { outline, primary, secondary, stripe, patchDark } = spec.palette;
  const tip = spec.tailStyle === 'bob_tipped' ? (patchDark ?? secondary) : (stripe ?? secondary);
  if (spec.tailStyle === 'fluffy_round') {
    fillOutlinedEllipse(px, tx + sway, ty - 1, 2.2, 2.0, primary, outline, spec.palette.primaryShadow);
    return;
  }
  if (spec.tailStyle === 'bob_tipped') {
    px(tx, ty, outline);
    px(tx + 1, ty - 1, primary);
    px(tx + 2 + sway, ty - 2, tip);
    px(tx + 2 + sway, ty - 3, outline);
    px(tx + 3 + sway, ty - 2, outline);
    px(tx + 1 + sway, ty - 2, outline);
    return;
  }
  // Curled striped tabby tail
  const pts: Array<[number, number, string]> = [
    [tx, ty, primary],
    [tx + 1, ty - 1, tip],
    [tx + 2 + sway, ty - 2, primary],
    [tx + 2 + sway, ty - 3, tip],
    [tx + 1 + sway, ty - 4, primary],
  ];
  for (const [x, y] of pts) {
    px(x - 1, y, outline);
    px(x + 1, y, outline);
    px(x, y - 1, outline);
    px(x, y + 1, outline);
  }
  for (const [x, y, c] of pts) {
    px(x, y, c);
  }
}

function drawFaceDetails(
  px: Px,
  spec: CatVariantSpec,
  cx: number,
  cy: number,
  facing: PetFacing,
  mood: 'open' | 'blink' | 'happy' | 'sleep' | 'yawn',
) {
  const { eye, cheek, innerEar, stripe, patchDark, secondary } = spec.palette;

  // Coat markings on head
  if (spec.id === 'ginger-tabby' && stripe) {
    px(cx - 1, cy - 3, stripe);
    px(cx + 1, cy - 3, stripe);
    px(cx, cy - 2, stripe);
  } else if (spec.id === 'cream-puff' && patchDark) {
    px(cx - 3, cy - 2, patchDark);
    px(cx + 3, cy - 2, patchDark);
  } else if (spec.id === 'calico-patch') {
    px(cx - 3, cy - 2, patchDark ?? secondary);
    px(cx - 2, cy - 2, patchDark ?? secondary);
    px(cx + 2, cy - 2, secondary);
    px(cx + 3, cy - 2, secondary);
  }

  if (facing === 'north') return;

  const shiftX = facing === 'east' ? 2 : facing === 'west' ? -2 : 0;
  const ex1 = cx - 2 + shiftX;
  const ex2 = cx + 2 + shiftX;

  if (mood === 'blink' || mood === 'sleep') {
    if (facing !== 'east') {
      px(ex1 - 1, cy, eye);
      px(ex1, cy, eye);
    }
    if (facing !== 'west') {
      px(ex2, cy, eye);
      px(ex2 + 1, cy, eye);
    }
  } else if (mood === 'happy') {
    // Happy crescent ^ ^ eyes
    if (facing !== 'east') {
      px(ex1 - 1, cy, eye);
      px(ex1, cy - 1, eye);
    }
    if (facing !== 'west') {
      px(ex2, cy - 1, eye);
      px(ex2 + 1, cy, eye);
    }
  } else {
    // Crisp 2x2 eyes with bright white anime/cozy catchlight
    if (facing !== 'east') {
      px(ex1 - 1, cy - 1, '#ffffff');
      px(ex1, cy - 1, eye);
      px(ex1 - 1, cy, eye);
      px(ex1, cy, eye);
    }
    if (facing !== 'west') {
      px(ex2, cy - 1, '#ffffff');
      px(ex2 + 1, cy - 1, eye);
      px(ex2, cy, eye);
      px(ex2 + 1, cy, eye);
    }
  }

  // Soft rosy cheeks + pink nose
  px(cx + shiftX, cy + 1, innerEar);
  if (mood === 'yawn') {
    px(cx + shiftX - 1, cy + 2, '#d85c72');
    px(cx + shiftX, cy + 2, '#d85c72');
    px(cx + shiftX, cy + 3, '#b8425a');
  }
  if (facing === 'south') {
    px(cx - 4, cy + 1, cheek);
    px(cx + 4, cy + 1, cheek);
  } else if (facing === 'east') {
    px(cx + 3, cy + 1, cheek);
  } else {
    px(cx - 3, cy + 1, cheek);
  }
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
  const px = makePixelDrawer(ctx, ox, oy);
  const { outline, primary, primaryShadow, belly, secondary } = spec.palette;
  const rxBody = spec.bodyRoundness === 'chubby' ? 5.2 : spec.bodyRoundness === 'slim' ? 4.3 : 4.7;

  // Determine facing
  const facing: PetFacing = anim.endsWith('_east')
    ? 'east'
    : anim.endsWith('_west')
      ? 'west'
      : anim.endsWith('_north')
        ? 'north'
        : 'south';

  // Special pose frames: sleep / lie_down / box_peek / wake_yawn_stretch
  if (anim === 'sleep' || anim === 'lie_down') {
    const breathe = anim === 'sleep' ? (frameIdx % 4 >= 2 ? -1 : 0) : 0;
    const tailSway = frameIdx % 2 === 0 ? 0 : 1;
    drawTail(px, spec, 16, 17, anim === 'lie_down' ? tailSway : 0);
    fillOutlinedEllipse(px, 12, 16 + breathe * 0.4, rxBody + 1.2, 3.6, primary, outline, primaryShadow);
    // Tucked head
    fillOutlinedEllipse(px, 8, 15, 4.1, 3.4, primary, outline, primaryShadow);
    drawEars(px, spec, 8, 12, 'south', 0);
    drawFaceDetails(px, spec, 8, 15, 'south', anim === 'sleep' ? 'sleep' : frameIdx === 1 ? 'blink' : 'open');
    drawAccessory(px, accessory, 10, 17, 'south');
    return;
  }

  if (anim === 'box_peek') {
    const bob = frameIdx % 2;
    // Cute cat head peeking up inside cardboard box
    fillOutlinedEllipse(px, 12, 9 + bob, 4.5, 3.8, primary, outline, primaryShadow);
    drawEars(px, spec, 12, 6 + bob, 'south', frameIdx === 2 ? -1 : 0);
    drawFaceDetails(px, spec, 12, 9 + bob, 'south', frameIdx === 3 ? 'blink' : 'open');
    // Cardboard box rim & front box
    for (let x = 5; x <= 18; x += 1) {
      px(x, 12, '#69462f');
      for (let y = 13; y <= 19; y += 1) {
        const isEdge = x === 5 || x === 18 || y === 19;
        px(x, y, isEdge ? '#5e3c28' : y === 13 ? '#e3b685' : '#c9935f');
      }
    }
    // Paws gripping box edge
    for (const pawX of [9, 14]) {
      px(pawX, 12, belly);
      px(pawX + 1, 12, belly);
      px(pawX, 13, outline);
      px(pawX + 1, 13, outline);
    }
    return;
  }

  if (anim === 'wake_yawn_stretch') {
    if (frameIdx < 3) {
      // Yawning upright
      fillOutlinedEllipse(px, 12, 16, rxBody, 3.6, primary, outline, primaryShadow);
      fillOutlinedEllipse(px, 12, 11, 4.7, 3.8, primary, outline, primaryShadow);
      drawEars(px, spec, 12, 8, 'south', 1);
      drawFaceDetails(px, spec, 12, 11, 'south', 'yawn');
      drawAccessory(px, accessory, 12, 14, 'south');
    } else {
      // Cozy arched stretch (front low, hind raised)
      drawTail(px, spec, 17, 13, 1);
      fillOutlinedEllipse(px, 13, 15, 5.2, 3.4, primary, outline, primaryShadow);
      fillOutlinedEllipse(px, 7, 16, 4.0, 3.4, primary, outline, primaryShadow);
      drawEars(px, spec, 7, 13, 'west', 0);
      drawFaceDetails(px, spec, 7, 16, 'west', 'happy');
      // Extended front paw
      px(4, 19, belly);
      px(5, 19, belly);
      px(4, 20, outline);
      px(5, 20, outline);
    }
    return;
  }

  // Standard & dynamic poses
  const isWalk = anim.startsWith('walk_') || anim.startsWith('run_');
  const isSit = anim.startsWith('sit_') || anim === 'groom' || anim === 'eat' || anim === 'drink' || anim === 'pet_purr';
  const isHop = anim === 'happy_hop' || anim === 'play_pounce';

  let bobY = 0;
  let headDy = 0;
  let headDx = 0;
  let pawStride = 0;
  if (isWalk) {
    const cycle = [0, -1, 0, 0, -1, 0];
    bobY = cycle[frameIdx % cycle.length] ?? 0;
    pawStride = frameIdx % 4 === 1 ? 1 : frameIdx % 4 === 3 ? -1 : 0;
  } else if (isHop) {
    bobY = anim === 'happy_hop' ? (frameIdx === 1 || frameIdx === 2 ? -2 : 0) : frameIdx >= 3 ? -2 : 1;
    headDy = anim === 'play_pounce' && frameIdx < 3 ? 1 : 0;
  } else if (anim === 'eat' || anim === 'drink') {
    headDy = frameIdx % 2 === 0 ? 2 : 1;
  } else if (anim === 'sniff') {
    headDx = frameIdx % 2 === 0 ? 1 : 0;
  } else if (anim === 'idle_south' || anim === 'idle_east' || anim === 'idle_west' || anim === 'idle_north') {
    bobY = frameIdx >= 3 ? 0 : 0;
  }

  const bodyCx = facing === 'east' ? 11 : facing === 'west' ? 13 : 12;
  const bodyCy = (isSit ? 16 : 16) + bobY;
  const bodyRx = facing === 'east' || facing === 'west' ? rxBody + 0.8 : rxBody;
  const bodyRy = isSit ? 3.8 : 3.4;

  // Tail positioned behind/beside body
  const tailSway = frameIdx % 2 === 0 ? 0 : 1;
  const tailX = facing === 'east' ? 6 : facing === 'west' ? 17 : 16;
  drawTail(px, spec, tailX, bodyCy, tailSway);

  // Legs / Paws
  const pawLeftX = bodyCx - 2 + (isWalk ? pawStride : 0);
  const pawRightX = bodyCx + 2 - (isWalk ? pawStride : 0);
  for (const lx of [pawLeftX, pawRightX]) {
    px(lx, bodyCy + 3, belly);
    px(lx + 1, bodyCy + 3, belly);
    px(lx, bodyCy + 4, outline);
    px(lx + 1, bodyCy + 4, outline);
  }

  // Torso
  fillOutlinedEllipse(px, bodyCx, bodyCy, bodyRx, bodyRy, primary, outline, primaryShadow);
  if (facing !== 'north') {
    px(bodyCx, bodyCy + 1, belly);
    px(bodyCx - 1, bodyCy + 1, belly);
    px(bodyCx, bodyCy + 2, belly);
  }
  if (spec.id === 'calico-patch') {
    px(bodyCx + 2, bodyCy, secondary);
    px(bodyCx - 2, bodyCy - 1, spec.palette.patchDark ?? secondary);
  }

  // Head
  const headCx = (facing === 'east' ? 13 : facing === 'west' ? 11 : 12) + headDx;
  const headCy = (isSit ? 10 : 11) + bobY + headDy;
  fillOutlinedEllipse(px, headCx, headCy, 4.8, 3.8, primary, outline, primaryShadow);

  // Calico / Tabby body accent & ears
  drawEars(px, spec, headCx, headCy - 3, facing, frameIdx === 2 ? -1 : 0);

  const mood =
    anim === 'pet_purr' || anim === 'happy_hop'
      ? 'happy'
      : frameIdx === 4 && (anim.startsWith('idle_') || anim.startsWith('sit_'))
        ? 'blink'
        : 'open';
  drawFaceDetails(px, spec, headCx, headCy, facing, mood);
  drawAccessory(px, accessory, headCx, headCy + 4, facing);

  // Cute action-specific detail
  if (anim === 'drink' && frameIdx % 2 === 1) {
    px(headCx, headCy + 3, '#f27c93'); // pink tongue lap
  } else if (anim === 'groom' && frameIdx % 2 === 1) {
    px(headCx - 2, headCy + 2, belly); // raised paw near cheek
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

  // Register animations idempotently
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
    rect(3, 8, 10, 5, '#4c2c24');
    rect(4, 9, 8, 3, '#c86f58');
    rect(4, 8, 8, 2, '#f0baa6');
    if (id === 'kibble_bowl_full') {
      rect(5, 7, 6, 2, '#8b5128');
      p(6, 6, '#a96839');
      p(9, 6, '#a96839');
    }
    return;
  }

  if (id === 'water_bowl_empty' || id === 'water_bowl_full') {
    rect(3, 8, 10, 5, '#2b3e52');
    rect(4, 9, 8, 3, '#5c8cb5');
    rect(4, 8, 8, 2, '#a7cde8');
    if (id === 'water_bowl_full') {
      rect(5, 8, 6, 2, '#69b8eb');
      p(7, 8, '#dff5ff');
    }
    return;
  }

  if (id === 'food_kibble' || id === 'food_warm_broth') {
    rect(4, 6, 8, 7, '#513124');
    rect(5, 7, 6, 5, id === 'food_kibble' ? '#e8b679' : '#f2d3a0');
    rect(6, 8, 4, 3, id === 'food_kibble' ? '#9e5c2b' : '#df8f48');
    p(7, 5, '#fff5e4');
    return;
  }

  if (id === 'food_grilled_fish' || id === 'food_salmon_treat') {
    const main = id === 'food_grilled_fish' ? '#8ea8ba' : '#ef8d73';
    const belly = id === 'food_grilled_fish' ? '#dce7ee' : '#ffd0bd';
    rect(4, 6, 8, 4, '#3d2522');
    rect(5, 7, 6, 2, main);
    rect(6, 8, 4, 1, belly);
    rect(12, 6, 2, 4, main);
    p(6, 7, '#2d1c19');
    return;
  }

  if (id === 'water_pitcher_empty' || id === 'water_pitcher_full') {
    rect(5, 4, 6, 9, '#39485a');
    rect(6, 5, 4, 7, '#99bad6');
    rect(11, 6, 2, 4, '#6a8ba8');
    if (id === 'water_pitcher_full') {
      rect(6, 5, 4, 3, '#67bce8');
      p(4, 6, '#7cd1f5');
    }
    return;
  }

  if (id === 'yarn_ball') {
    rect(4, 5, 8, 8, '#4a2030');
    rect(5, 6, 6, 6, '#e76f8e');
    rect(6, 7, 4, 2, '#f9a8bc');
    p(3, 12, '#e76f8e');
    p(2, 13, '#e76f8e');
    return;
  }

  if (id === 'toy_ball') {
    rect(5, 6, 6, 6, '#463420');
    rect(6, 7, 4, 4, '#f5c74d');
    rect(6, 7, 2, 2, '#eb6b5e');
    return;
  }

  if (id === 'cardboard_box') {
    rect(2, 5, 12, 9, '#5e3c28');
    rect(3, 6, 10, 7, '#c78f59');
    rect(3, 5, 10, 2, '#e8bc88');
    rect(7, 7, 2, 1, '#5e3c28');
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
