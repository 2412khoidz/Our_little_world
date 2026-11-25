import type { Direction } from '../types';
import type { LivingItemIconId } from '../petLiving/petVisualTypes';

export type HeldItemKind = 'none' | 'food' | 'water_pitcher' | 'toy' | 'gift' | 'tool';

import type { InventoryOwnerScope } from '../inventory/inventoryTypes';

export interface HotbarSlot {
  slotIndex: number;
  /** Mission 02 stack owner; V0.1.5 adapter only fills shared stacks. */
  ownerScope?: InventoryOwnerScope;
  itemSku: string | null;
  itemKind: HeldItemKind;
  iconId: LivingItemIconId | null;
  labelVi: string;
  qty: number;
  waterFillLevel?: number;
  quality?: 'normal' | 'silver' | 'gold';
}

export interface HeldItemState {
  ownerScope?: InventoryOwnerScope;
  slotIndex: number | null;
  itemSku: string | null;
  itemKind: HeldItemKind;
  iconId: LivingItemIconId | null;
  labelVi: string;
  waterFillLevel: number;
  quality: 'normal' | 'silver' | 'gold';
  temporaryActionState: 'none' | 'offering' | 'pouring' | 'rolling_toy' | 'petting';
}

export type InteractableDomainKind =
  | 'pet'
  | 'food_bowl'
  | 'water_bowl'
  | 'water_source'
  | 'toy_spot'
  | 'cardboard_box'
  | 'scratching_post'
  | 'wardrobe'
  | 'study_desk'
  | 'mailbox'
  | 'photo_frame'
  | 'sofa'
  | 'bed'
  | 'bench'
  | 'door'
  | 'portal'
  | 'crop_plot'
  | 'fishing_spot'
  | 'workshop_building'
  | 'kitchen'
  | 'shop_npc'
  | 'shipping_bin';

export interface InteractableTarget {
  id: string;
  kind: InteractableDomainKind;
  labelVi: string;
  x: number;
  y: number;
  maxRadiusPx: number;
  busy?: boolean;
  empty?: boolean;
  full?: boolean;
  /** Dev LAN donor economy preview (Mission C1). */
  donorPlayable?: boolean;
}

export type InteractionActionCode =
  | 'offer_food_pet'
  | 'fill_food_bowl'
  | 'pour_water_bowl'
  | 'fill_water_pitcher'
  | 'pet_cat'
  | 'enter_pet_care'
  | 'roll_toy'
  | 'place_cardboard_box'
  | 'pickup_starter_kibble'
  | 'open_wardrobe'
  | 'open_study'
  | 'open_mailbox'
  | 'open_photo_frame'
  | 'sit_sofa'
  | 'lie_bed'
  | 'sit_bench'
  | 'enter_home'
  | 'exit_home'
  | 'use_portal'
  | 'talk_npc'
  | 'till_plot'
  | 'plant_crop'
  | 'water_crop'
  | 'harvest_crop'
  | 'open_farm_market'
  | 'open_shipping_bin'
  | 'open_donor_fishing'
  | 'open_donor_stream_fishing'
  | 'open_donor_workshop'
  | 'inspect_prop'
  | 'put_away_held';

export interface ContextualAction {
  code: InteractionActionCode;
  keyHint: 'J' | 'K';
  labelVi: string;
  targetId: string;
  available: boolean;
  reasonVi?: string;
}

export interface ContextualResolution {
  targetId: string | null;
  primary: ContextualAction | null;
  secondary: ContextualAction | null;
}

export interface KeybindingConfig {
  interactPrimary: string;
  interactSecondary: string;
  toggleInventory: string;
  closeModal: string;
}

export const DEFAULT_KEYBINDINGS: KeybindingConfig = {
  interactPrimary: 'KeyJ',
  interactSecondary: 'KeyK',
  toggleInventory: 'KeyI',
  closeModal: 'Escape',
};

export interface InteractionResolveInput {
  playerX: number;
  playerY: number;
  facing: Direction;
  heldItem: HeldItemState;
  interactables: readonly InteractableTarget[];
}
