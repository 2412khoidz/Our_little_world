import type { PetMood, PetSnapshot, PetVitals } from '../../pet/petTypes';
import type { PetPersonalityTraits } from '../petIntelligenceConfig';

export type PetCareMoodLabel = 'cozy' | 'playful' | 'sleepy' | 'hungry' | 'grumpy' | 'affectionate';

export interface PetCareMoodState {
  label: PetCareMoodLabel;
  blinkIntervalMs: number;
  breathAmplitude: number;
  proactiveChance: number;
  refuseFoodBias: number;
  bubbleVi: string;
}

function labelFromEmotion(emotion: PetMood, vitals: PetVitals): PetCareMoodLabel {
  if (emotion === 'sleepy' || vitals.energy < 42) return 'sleepy';
  if (emotion === 'hungry' || vitals.hunger < 45) return 'hungry';
  if (vitals.fun > 78) return 'playful';
  if (vitals.fun < 40) return 'grumpy';
  if (emotion === 'cozy') return 'cozy';
  return 'affectionate';
}

export function derivePetCareMood(snapshot: PetSnapshot | null, traits: PetPersonalityTraits): PetCareMoodState {
  const vitals = snapshot?.vitals ?? { hunger: 70, energy: 70, fun: 70 };
  const emotion = snapshot?.emotion ?? 'happy';
  const label = labelFromEmotion(emotion, vitals);

  const proactiveChance = Math.min(0.45, 0.12 + traits.clingy * 0.28 + (label === 'playful' ? 0.15 : 0));
  const refuseFoodBias = traits.shy * 0.35 + (label === 'grumpy' ? 0.2 : 0);

  const bubbles: Record<PetCareMoodLabel, string> = {
    cozy: 'Yên bình quá~',
    playful: 'Chơi đi!',
    sleepy: 'Ngủ một chút…',
    hungry: 'Đói bụng rồi…',
    grumpy: 'Hừm.',
    affectionate: 'Mrow~',
  };

  return {
    label,
    blinkIntervalMs: label === 'sleepy' ? 3200 : 2100,
    breathAmplitude: label === 'sleepy' ? 0.008 : 0.014,
    proactiveChance,
    refuseFoodBias,
    bubbleVi: bubbles[label],
  };
}