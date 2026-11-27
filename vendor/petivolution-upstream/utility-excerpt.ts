// ============================================
// V1 AI - Utility Decision System
// ============================================

import type {
    EntityRuntime,
    Goal,
    Stimulus,
} from '@shared/types';
import type { SimulationState } from '../core/tick';
import { SPECIES_CONFIGS, clamp01 } from '@shared/species.config';
import { V1 } from '@shared/constants';

// ============================================
// Utility Calculation
// ============================================

export function calculateUtility(
    entity: EntityRuntime,
    _sim: SimulationState
): Partial<Record<Goal, number>> {
    const config = SPECIES_CONFIGS[entity.species];
    const uw = config.utility;
    const v = entity.vitals;
    const stimuli = entity.ai.recentStimuli;

    // ========================================
    // Calculate Urgency (0..1, higher = more urgent)
    // ========================================
    const uHunger = clamp01(1 - v.hunger01);
    const uThirst = clamp01(1 - v.thirst01);
    const uFatigue = clamp01(1 - v.fatigue01);

    // Fear: Seeing a predator
    let uFear = 0;
    const predatorStimulus = stimuli.find(s => s.type === 'predator');
    if (predatorStimulus) {
        const senseRadiusPx = config.sense.radiusTiles * V1.tileSizePx;
        uFear = clamp01(1 - (predatorStimulus.dist / senseRadiusPx));
    }

    // ========================================
    // Get Nearest Resources
    // ========================================
    const nearestWater = findNearest(stimuli, 'water');
    const nearestBush = findNearest(stimuli, 'bush');
    const nearestTrash = findNearest(stimuli, 'trash');
    const nearestPrey = findNearest(stimuli, 'prey');

    // ========================================
    // Calculate Score for Each Goal
    // ========================================
    const scores: Partial<Record<Goal, number>> = {};

    // -------- Flee --------
    // Generic flee logic for all species if fear is high or they are prey-like
    if (uFear > 0) {
        let fleeScore = uw.base.flee;
        fleeScore += uw.urgency.fear * uFear;

        if (nearestBush) {
            fleeScore += uw.bonuses.nearBush;
            fleeScore -= uw.distancePenalty.bush * (nearestBush.dist / V1.tileSizePx);
        }

        // Personality bonus
        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.fear) fleeScore += personalityMod.fear * uFear;
        if (personalityMod.nearBush) fleeScore += personalityMod.nearBush;

        // Force flee rule: Flee when fear > 0.4 (increased threshold to avoid jitters)
        if (uFear > 0.4) {
            fleeScore += 10;
        }

        scores.flee = fleeScore;
    }

    // -------- Drink --------
    {
        let drinkScore = uw.base.drink;
        drinkScore += uw.urgency.thirst * uThirst;

        if (nearestWater) {
            drinkScore += uw.bonuses.nearWater;
            drinkScore -= uw.distancePenalty.water * (nearestWater.dist / V1.tileSizePx);
        } else {
            drinkScore -= 0.5; // No water visible, reduce score
        }

        scores.drink = drinkScore;
    }

    // -------- Eat (from trash pile, for rats) --------
    if (entity.species === 'rat') {
        let eatScore = uw.base.eat;
        eatScore += uw.urgency.hunger * uHunger;

        if (nearestTrash) {
            eatScore += uw.bonuses.nearTrash;
            eatScore -= uw.distancePenalty.trash * (nearestTrash.dist / V1.tileSizePx);
        } else {
            eatScore -= 0.5;
        }

        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.nearTrash) eatScore += personalityMod.nearTrash;

        scores.eat = eatScore;
    }

    // -------- Forage (Chicken/Bird) --------
    if (entity.species === 'chicken' || entity.species === 'smallBird' || entity.species === 'rat') {
        let forageScore = uw.base.forage ?? 0;
        forageScore += uw.urgency.hunger * uHunger;

        // Chickens like bushes
        if (nearestBush && entity.species === 'chicken') {
            forageScore += uw.bonuses.nearBush * 0.5;
        }
