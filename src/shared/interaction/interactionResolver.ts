import type { Direction } from '../types';
import type {
  ContextualAction,
  ContextualResolution,
  HeldItemState,
  HotbarSlot,
  InteractableTarget,
  InteractionResolveInput,
} from './interactionTypes';

export const EMPTY_HELD_ITEM: HeldItemState = {
  slotIndex: null,
  itemSku: null,
  itemKind: 'none',
  iconId: null,
  labelVi: 'Tay không',
  waterFillLevel: 0,
  quality: 'normal',
  temporaryActionState: 'none',
};

export function isEditableInputTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as Partial<HTMLElement>;
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Selects a hotbar slot purely for presentation/holding.
 * Does NOT consume or alter underlying inventory counts.
 */
export function selectHotbarSlot(
  slots: readonly HotbarSlot[],
  currentHeld: HeldItemState,
  slotIndex: number,
): HeldItemState {
  const slot = slots.find((s) => s.slotIndex === slotIndex);
  if (!slot || !slot.itemSku || slot.qty <= 0 || currentHeld.slotIndex === slotIndex) {
    return EMPTY_HELD_ITEM;
  }
  return {
    slotIndex: slot.slotIndex,
    ownerScope: slot.ownerScope ?? 'shared',
    itemSku: slot.itemSku,
    itemKind: slot.itemKind,
    iconId: slot.iconId,
    labelVi: slot.labelVi,
    waterFillLevel: slot.waterFillLevel ?? (slot.itemKind === 'water_pitcher' ? 0 : 0),
    quality: slot.quality ?? 'normal',
    temporaryActionState: 'none',
  };
}

function facingVector(facing: Direction): { x: number; y: number } {
  switch (facing) {
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
  }
}

function actionForTarget(
  target: InteractableTarget,
  held: HeldItemState,
): ContextualAction {
  switch (target.kind) {
    case 'pet': {
      if (held.itemKind === 'food') {
        return {
          code: 'offer_food_pet',
          keyHint: 'J',
          labelVi: `Đưa ${held.labelVi} cho bé ngửi`,
          targetId: target.id,
          available: true,
        };
      }
      if (held.itemKind === 'toy') {
        return {
          code: 'roll_toy',
          keyHint: 'J',
          labelVi: `Chơi ${held.labelVi} cùng bé`,
          targetId: target.id,
          available: true,
        };
      }
      return {
        code: 'pet_cat',
        keyHint: 'J',
        labelVi: 'Vuốt ve nhẹ nhàng',
        targetId: target.id,
        available: true,
      };
    }
    case 'food_bowl': {
      if (held.itemKind === 'food') {
        return {
          code: 'fill_food_bowl',
          keyHint: 'J',
          labelVi: `Đổ ${held.labelVi} vào bát`,
          targetId: target.id,
          available: !target.full,
          reasonVi: target.full ? 'Bát ăn vẫn còn đầy rồi.' : undefined,
        };
      }
      return {
        code: 'inspect_prop',
        keyHint: 'J',
        labelVi: target.empty ? 'Bát ăn đang trống' : 'Bát ăn vẫn còn hạt',
        targetId: target.id,
        available: false,
        reasonVi: 'Hãy cầm thức ăn trên tay trước khi đổ vào bát.',
      };
    }
    case 'water_bowl': {
      if (held.itemKind === 'water_pitcher') {
        const hasWater = held.waterFillLevel > 0;
        return {
          code: 'pour_water_bowl',
          keyHint: 'J',
          labelVi: 'Rót nước mát vào bát',
          targetId: target.id,
          available: hasWater && !target.full,
          reasonVi: !hasWater
            ? 'Bình nước đang cạn — hãy ghé bồn nước hoặc hồ lấy nước nhé.'
            : target.full
              ? 'Bát nước đang đầy rồi.'
              : undefined,
        };
      }
      return {
        code: 'inspect_prop',
        keyHint: 'J',
        labelVi: target.empty ? 'Bát nước đang cạn' : 'Bát nước còn sạch',
        targetId: target.id,
        available: false,
        reasonVi: 'Chọn bình nước trên thanh đồ để rót vào bát.',
      };
    }
    case 'water_source': {
      return {
        code: 'fill_water_pitcher',
        keyHint: 'J',
        labelVi: 'Múc nước sạch (0₫)',
        targetId: target.id,
        available: held.itemKind === 'water_pitcher',
        reasonVi: held.itemKind !== 'water_pitcher' ? 'Cầm bình nước trước để lấy nước.' : undefined,
      };
    }
    case 'wardrobe':
      return { code: 'open_wardrobe', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'study_desk':
      return { code: 'open_study', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'mailbox':
      return { code: 'open_mailbox', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'photo_frame':
      return { code: 'open_photo_frame', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'sofa':
      return { code: 'sit_sofa', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'bed':
      return { code: 'lie_bed', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'bench':
      return { code: 'sit_bench', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'door':
      return {
        code: target.id === 'cottage_exit' ? 'exit_home' : 'enter_home',
        keyHint: 'J',
        labelVi: target.labelVi,
        targetId: target.id,
        available: true,
      };
    case 'portal':
      return { code: 'use_portal', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
    case 'crop_plot': {
      if (held.itemSku === 'tool_hoe') {
        return {
          code: 'till_plot',
          keyHint: 'J',
          labelVi: 'Cuốc đất',
          targetId: target.id,
          available: true,
        };
      }
      if (held.itemSku?.startsWith('seed_')) {
        return {
          code: 'plant_crop',
          keyHint: 'J',
          labelVi: `Gieo ${held.labelVi}`,
          targetId: target.id,
          available: true,
        };
      }
      if (held.itemSku === 'tool_watering_can' || held.itemSku === 'water_pitcher') {
        return {
          code: 'water_crop',
          keyHint: 'J',
          labelVi: 'Tưới cây',
          targetId: target.id,
          available: true,
        };
      }
      return {
        code: 'harvest_crop',
        keyHint: 'J',
        labelVi: 'Thu hoạch',
        targetId: target.id,
        available: true,
      };
    }
    case 'shop_npc':
      if (target.id.startsWith('npc:')) {
        return { code: 'talk_npc', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
      }
      return { code: 'open_farm_market', keyHint: 'J', labelVi: 'Cửa hàng hạt giống', targetId: target.id, available: true };
    case 'shipping_bin':
      return { code: 'open_shipping_bin', keyHint: 'J', labelVi: 'Gửi nông sản', targetId: target.id, available: true };
    default:
      return { code: 'inspect_prop', keyHint: 'J', labelVi: target.labelVi, targetId: target.id, available: true };
  }
}

export function resolveContextualActions(input: InteractionResolveInput): ContextualResolution {
  const { playerX, playerY, facing, heldItem, interactables } = input;
  const fVec = facingVector(facing);

  const scored: Array<{ target: InteractableTarget; action: ContextualAction; score: number }> = [];
  for (const t of interactables) {
    const dx = t.x - playerX;
    const dy = t.y - playerY;
    const dist = Math.hypot(dx, dy);
    if (dist > t.maxRadiusPx) continue;

    const action = actionForTarget(t, heldItem);
    const nx = dist > 0.01 ? dx / dist : 0;
    const ny = dist > 0.01 ? dy / dist : 0;
    const facingDot = nx * fVec.x + ny * fVec.y;
    // Lower score wins: distance penalized less when object is in front and action is directly usable
    const contextBonus = action.available ? -12 : 10;
    const facingBonus = -facingDot * 10;
    const portalBoost = t.kind === 'portal' && dist < 14 ? -40 : 0;
    const score = dist + contextBonus + facingBonus + portalBoost;
    scored.push({ target: t, action, score });
  }

  scored.sort((a, b) => a.score - b.score || a.target.id.localeCompare(b.target.id));
  const best = scored[0];

  const secondary: ContextualAction | null =
    heldItem.itemKind === 'toy'
      ? {
          code: 'roll_toy',
          keyHint: 'K',
          labelVi: heldItem.itemSku === 'toy_cardboard_box' ? 'Đặt hộp giấy xuống sàn' : `Lăn ${heldItem.labelVi}`,
          targetId: best?.target.id ?? 'floor',
          available: true,
        }
      : heldItem.itemKind !== 'none'
        ? {
            code: 'put_away_held',
            keyHint: 'K',
            labelVi: 'Cất vật phẩm đang cầm',
            targetId: 'hands',
            available: true,
          }
        : null;

  if (!best) {
    return { targetId: null, primary: null, secondary };
  }

  return {
    targetId: best.target.id,
    primary: best.action,
    secondary,
  };
}
