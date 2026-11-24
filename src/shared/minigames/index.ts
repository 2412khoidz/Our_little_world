/**
 * Public entry point for the pure mini-game domain (V0.2.5).
 *
 * Consumers (React screens, realtime adapters, tests) import from this module
 * only. No DOM, React, Phaser, Supabase or network code lives here.
 */

export * from './types';
export * from './caro';
export * from './othello';
export * from './battleship';
export * from './memory';
export * from './registry';
