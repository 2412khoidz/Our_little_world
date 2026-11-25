import type { PetPersonalityTraits } from './petIntelligenceConfig';
import {
  evaluateFoodOffer,
  type FoodEvaluationInput,
  type FoodEvaluationResult,
} from './petFoodCatalog';

export interface PetFoodDecisionContext {
  traits: PetPersonalityTraits;
  emotion: string;
  currentCommitmentAction: string | null;
  favoriteSkus: readonly string[];
  dislikedSkus: readonly string[];
  familiarSkus: readonly string[];
  lastFedAtMs: number | null;
  nowMs: number;
}

/** Brain-side food decision — no inventory or persistent affection mutation. */
export function decideFoodOffer(
  sku: string,
  quality: 'normal' | 'silver' | 'gold',
  hunger: number,
  ctx: PetFoodDecisionContext,
): FoodEvaluationResult & { deferred: boolean } {
  const raw = evaluateFoodOffer({
    sku,
    quality,
    currentHunger: hunger,
    favoriteSkus: ctx.favoriteSkus,
    dislikedSkus: ctx.dislikedSkus,
    familiarSkus: ctx.familiarSkus,
    lastFedAtMs: ctx.lastFedAtMs,
    nowMs: ctx.nowMs,
  });

  const busyWithMeal =
    ctx.currentCommitmentAction === 'eat_bowl' ||
    ctx.currentCommitmentAction === 'sniff_food';
  const veryShy = ctx.traits.shy >= 0.72;
  const deferred =
    busyWithMeal || (veryShy && raw.reaction === 'curious_sniff' && hunger > 55);

  if (deferred && raw.accepted) {
    return {
      ...raw,
      accepted: false,
      reaction: 'curious_sniff',
      consumeItem: false,
      hintVi: 'Bé đánh hơi rồi chờ một lát — đang làm dở việc khác.',
      deferred: true,
    };
  }

  if (ctx.traits.glutton < 0.35 && hunger > 78 && !ctx.favoriteSkus.includes(sku)) {
    return {
      ...raw,
      accepted: false,
      reaction: 'full_refuse',
      consumeItem: false,
      affectionGain: 0,
      hungerGain: 0,
      hydrationGain: 0,
      hintVi: 'Bé lắc đuôi nhẹ: vẫn no, không muốn ăn thêm.',
      deferred: false,
    };
  }

  return { ...raw, deferred: false };
}

export type { FoodEvaluationInput, FoodEvaluationResult };