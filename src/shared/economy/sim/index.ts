/**
 * Economy simulator public surface (V0.2.0).
 *
 * Usage:
 *   npm run economy:sim                 # full audit, 1000 sessions
 *   npm run economy:sim -- --seed=42 --sessions=200 --days=90
 *
 * Programmatic:
 *   import { runSimulation, runBatch, compareStrategies } from './sim';
 */

export * from './types.ts';
export * from './config.ts';
export * from './engine.ts';
export * from './run.ts';
export * from './report.ts';
