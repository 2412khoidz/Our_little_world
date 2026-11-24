/**
 * Types for the headless economy simulator (`npm run economy:sim`).
 *
 * The simulator is pure TypeScript: no Phaser, React, Supabase or DOM. Every
 * run is reproducible from `(seed, profileId, personaId, days, strategy)`.
 */

import type {
  ItemGroup,
  ItemQuality,
  MilestoneId,
  SaturationConfig,
} from '../types.ts';
import type { MarketPolicy } from './marketPolicies.ts';

export type PersonaId =
  | 'casual'
  | 'solo'
  | 'coop'
  | 'optimizer'
  | 'decorator'
  | 'long_absence'
  | 'mixed_craft_fish'
  | 'optimizer_mixed';

export type ProfileId = 'v020' | 'v021' | 'v022' | 'v025' | 'v030';

export type StrategyId = 'balanced' | 'monoculture';

/** Relative budget shares for the four productive activities. */
export interface ActivityWeights {
  readonly forage: number;
  readonly farm: number;
  readonly fish: number;
  readonly cook: number;
}

export interface PersonaDefinition {
  readonly id: PersonaId;
  readonly nameVi: string;
  readonly descriptionVi: string;
  /** `[min, max]` active seconds per playing day (inclusive). */
  readonly dailyActiveSeconds: readonly [number, number];
  readonly weights: ActivityWeights;
  /** 0..1 chance of buying the next decoration tier when affordable. */
  readonly decorAffinity01: number;
  /** Play cadence: `null` = plays every day. */
  readonly playEveryDays: number | null;
  /** Days away between sessions, inclusive range. */
  readonly awayDaysRange: readonly [number, number] | null;
}

export interface ProfileFeatures {
  readonly forage: boolean;
  readonly farming: boolean;
  readonly fishing: boolean;
  readonly cooking: boolean;
  /** Reserved for V0.2.5; the order board is not implemented yet. */
  readonly orders: boolean;
}

export interface ForageConfig {
  /** Free gathering points near the gate (MARKET_AND_NPC §3). */
  readonly points: number;
  /** Seconds until a point gives another unit. */
  readonly respawnSeconds: number;
  readonly skus: readonly string[];
}

export interface SimProfile {
  readonly id: ProfileId;
  readonly labelVi: string;
  readonly milestone: MilestoneId;
  readonly features: ProfileFeatures;
  /** Plantable plots. `0` while farming is not shipped. */
  readonly plotCount: number;
  readonly forage: ForageConfig;
}

export interface SimOptions {
  readonly seed: number;
  readonly profileId: ProfileId;
  readonly personaId: PersonaId;
  readonly days: number;
  readonly strategy?: StrategyId;
  readonly startingCoins?: number;
  readonly milestones?: readonly number[];
  /** If set, wipes wallet+inventory at the start of this day (deadlock probe). */
  readonly resetWalletAtDay?: number | null;
  /** Override the soft-saturation rules for balance experiments only. */
  readonly saturation?: SaturationConfig;
  /** Full experimental market policy (supersedes saturation when set). */
  readonly market?: MarketPolicy;
}

export interface SimStats {
  foraged: number;
  harvests: number;
  fishCaught: number;
  dishesCooked: number;
  itemsSold: number;
  itemsBought: number;
  decorBought: number;
  seedsPlanted: number;
}

export interface MilestoneSnapshot {
  readonly day: number;
  readonly walletCoins: number;
  readonly inventoryValueCoins: number;
  readonly standingCropsValueCoins: number;
  readonly wealthCoins: number;
  readonly activeSeconds: number;
  /** Seconds actually spent on productive actions (not idle session time). */
  readonly workedSeconds: number;
  readonly idleSeconds: number;
  readonly plotDays: number;
  readonly soldValueToday: number;
  readonly netIncomeCoins: number;
  readonly incomePerMinute: number;
  readonly incomePerWorkedMinute: number;
  /** Net coins per occupied plot-day (labour opportunity cost of land). */
  readonly netPerPlotDay: number;
  /** Share of the session spent with no available action. */
  readonly idleShare: number;
  readonly sources: Readonly<Record<string, number>>;
  readonly sinks: Readonly<Record<string, number>>;
  readonly groupUnitsSold: Readonly<Record<string, number>>;
  readonly stats: Readonly<SimStats>;
}

export interface InvariantIssue {
  readonly day: number;
  readonly code: string;
  readonly messageVi: string;
}

export interface SimResult {
  readonly seed: number;
  readonly profileId: ProfileId;
  readonly personaId: PersonaId;
  readonly strategy: StrategyId;
  readonly catalogVersion: string;
  readonly catalogFingerprint: string;
  readonly days: number;
  readonly startingCoins: number;
  readonly snapshots: readonly MilestoneSnapshot[];
  readonly finalWallet: number;
  readonly activeSeconds: number;
  readonly totalPlayDays: number;
  readonly absentDays: number;
  readonly invariants: { readonly ok: boolean; readonly issues: readonly InvariantIssue[] };
  readonly actionLog: readonly string[];
}

export interface RecoveryProbe {
  readonly profileId: ProfileId;
  readonly personaId: PersonaId;
  readonly seed: number;
  readonly recovered: boolean;
  /** Active seconds until the persona can afford the recovery seed. */
  readonly secondsToRecover: number;
  readonly walletAfterRecovery: number;
  readonly requiredCoins: number;
  readonly log: readonly string[];
}

export interface StrategyComparison {
  readonly profileId: ProfileId;
  readonly personaId: PersonaId;
  readonly days: number;
  readonly monocultureCoinsPerMinute: number;
  readonly balancedCoinsPerMinute: number;
  readonly ratio: number;
  readonly withinGuard: boolean;
  readonly guardLimit: number;
  readonly monocultureCrop: string | null;
}

export interface BatchSessionSummary {
  readonly sessions: number;
  readonly profileId: ProfileId;
  readonly seeds: readonly number[];
  readonly perPersona: Readonly<
    Record<string, { readonly sessions: number; readonly ok: boolean; readonly medianWallet: number }>
  >;
  readonly invariantFailures: number;
  readonly deadlocks: number;
  readonly arbitrageFindings: number;
}

export type { ItemGroup, ItemQuality };
