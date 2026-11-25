import type { PetCareActionKind, PetCareExpression, PetCareReactionContext, PetCareZone } from './petCareTypes';

function shyRefuse(ctx: PetCareReactionContext, threshold = 0.55): boolean {
  const roll = ctx.shyRefuseRoll ?? 0.4;
  return ctx.traits.shy > 0.45 && roll > threshold;
}

export function reactToCareStroke(zone: PetCareZone, ctx: PetCareReactionContext, strokeIndex: number): PetCareExpression {
  if (zone === 'none') {
    return {
      anim: 'idle_south',
      bubbleVi: '',
      earTilt: 0,
      tail: 'idle',
      eyeMood: 'open',
    };
  }
  if (zone === 'belly' && shyRefuse(ctx, 0.35)) {
    return {
      anim: 'sit_south',
      bubbleVi: '…không thích đụng bụng!',
      earTilt: -12,
      tail: 'tuck',
      eyeMood: 'shy',
      squeak: 'refuse',
      refuse: true,
    };
  }
  if (zone === 'chin') {
    return {
      anim: 'pet_purr',
      bubbleVi: 'Purr~',
      earTilt: 6,
      tail: ctx.traits.clingy > 0.5 ? 'wag_slow' : 'wag_fast',
      eyeMood: 'happy',
      squeak: 'purr',
    };
  }
  if (zone === 'back') {
    return {
      anim: strokeIndex % 3 === 0 ? 'groom' : 'sit_south',
      bubbleVi: strokeIndex % 4 === 0 ? '*liếm lông nhẹ*' : 'Thích lắm~',
      earTilt: 0,
      tail: 'wag_slow',
      eyeMood: strokeIndex % 5 === 0 ? 'blink' : 'open',
      squeak: 'purr',
    };
  }
  return {
    anim: ctx.traits.playful > 0.5 ? 'happy_hop' : 'sit_south',
    bubbleVi: ctx.traits.clingy > 0.55 ? 'Mrow mrow ♡' : '❤️',
    earTilt: 8,
    tail: 'wag_fast',
    eyeMood: 'happy',
    squeak: 'mrow',
  };
}

export function reactToCareAction(kind: PetCareActionKind, ctx: PetCareReactionContext): PetCareExpression {
  switch (kind) {
    case 'toy_yarn':
      if (shyRefuse(ctx, 0.7)) {
        return {
          anim: 'sit_south',
          bubbleVi: 'Chưa muốn chơi lắm…',
          earTilt: -8,
          tail: 'tuck',
          eyeMood: 'shy',
          refuse: true,
          squeak: 'refuse',
        };
      }
      return {
        anim: 'play_pounce',
        bubbleVi: 'Ôi cuộn len!',
        earTilt: 10,
        tail: 'wag_fast',
        eyeMood: 'happy',
        squeak: 'chirp',
      };
    case 'toy_box':
      return {
        anim: 'box_peek',
        bubbleVi: 'Chui vào hộp~',
        earTilt: 4,
        tail: 'puff',
        eyeMood: 'happy',
        squeak: 'mrow',
      };
    case 'offer_food': {
      if (shyRefuse(ctx, 0.6)) {
        return { anim: 'sniff', bubbleVi: 'Ngửi… thử một chút?', earTilt: 5, tail: 'wag_slow', eyeMood: 'open', squeak: 'chirp' };
      }
      if (ctx.traits.glutton > 0.55) {
        return { anim: 'eat', bubbleVi: 'Ngon quá!', earTilt: 0, tail: 'wag_fast', eyeMood: 'happy', squeak: 'purr' };
      }
      const fussy = Math.random() > 0.62;
      return {
        anim: fussy ? 'sniff' : 'eat',
        bubbleVi: fussy ? 'Hôm nay không thích món này…' : 'Mmm, ăn nhé!',
        earTilt: fussy ? -3 : 0,
        tail: fussy ? 'tuck' : 'wag_slow',
        eyeMood: fussy ? 'shy' : 'open',
        squeak: fussy ? 'refuse' : 'mrow',
        refuse: fussy,
      };
    }
    case 'brush':
      return {
        anim: 'groom',
        bubbleVi: 'Xù mượt~',
        earTilt: -4,
        tail: 'wag_slow',
        eyeMood: 'blink',
        squeak: 'purr',
      };
    case 'pour_water':
      return {
        anim: 'eat',
        bubbleVi: 'Uống nước mát~',
        earTilt: 2,
        tail: 'wag_slow',
        eyeMood: 'happy',
        squeak: 'purr',
      };
    case 'call':
      return {
        anim: ctx.traits.independent > 0.6 ? 'idle_south' : 'happy_hop',
        bubbleVi: ctx.traits.independent > 0.6 ? `…${ctx.petName}?` : `${ctx.petName} đây!`,
        earTilt: ctx.traits.independent > 0.6 ? 3 : 12,
        tail: ctx.traits.clingy > 0.5 ? 'wag_fast' : 'wag_slow',
        eyeMood: ctx.traits.independent > 0.6 ? 'open' : 'happy',
        squeak: 'mrow',
      };
    case 'observe':
      return {
        anim: 'sleep',
        bubbleVi: 'Zzz…',
        earTilt: 0,
        tail: 'idle',
        eyeMood: 'sleep',
      };
    default:
      return { anim: 'idle_south', bubbleVi: '', earTilt: 0, tail: 'idle', eyeMood: 'open' };
  }
}