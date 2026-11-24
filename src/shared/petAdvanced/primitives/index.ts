/**
 * Public API for low-level Pet AI primitives (V0.2.3 preparation).
 *
 * These are reusable algorithm building blocks only. They do NOT implement the
 * Pet MVP: personality, emotion, real cat behaviour and the AgentBrain remain
 * Neon's design. V0.2.3 is not complete until the Pet MVP wires these modules
 * into `WorldObservation -> AgentBrain -> ValidatedAction`.
 *
 * Pure TypeScript; no React, Phaser, DOM, Supabase, timers or wall clock.
 * Time is an explicit `nowMs`; randomness is an explicit seed/RNG.
 */

export * from './utilityMath';
export * from './stabilization';
export * from './memory';
export * from './affordances';
export * from './sandbox';
