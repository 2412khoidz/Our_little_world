import type { BotDifficulty, PlayerSlot } from '../../../shared/billiards/types';

export interface BilliardsLocalStats {
  local2p: {
    p1Wins: number;
    p2Wins: number;
    matches: number;
  };
  bot: Record<BotDifficulty, { wins: number; losses: number }>;
}

const STORAGE_KEY = 'olw.billiards.localStats.v1';

export function createEmptyLocalStats(): BilliardsLocalStats {
  return {
    local2p: { p1Wins: 0, p2Wins: 0, matches: 0 },
    bot: {
      easy: { wins: 0, losses: 0 },
      medium: { wins: 0, losses: 0 },
      hard: { wins: 0, losses: 0 },
    },
  };
}

export function loadBilliardsLocalStats(): BilliardsLocalStats {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyLocalStats();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyLocalStats();
    const parsed = JSON.parse(raw) as Partial<BilliardsLocalStats>;
    const base = createEmptyLocalStats();
    if (parsed.local2p) {
      base.local2p.p1Wins = Math.max(0, Number(parsed.local2p.p1Wins) || 0);
      base.local2p.p2Wins = Math.max(0, Number(parsed.local2p.p2Wins) || 0);
      base.local2p.matches = Math.max(0, Number(parsed.local2p.matches) || 0);
    }
    if (parsed.bot) {
      for (const diff of ['easy', 'medium', 'hard'] as const) {
        const entry = parsed.bot[diff];
        if (entry) {
          base.bot[diff] = {
            wins: Math.max(0, Number(entry.wins) || 0),
            losses: Math.max(0, Number(entry.losses) || 0),
          };
        }
      }
    }
    return base;
  } catch {
    return createEmptyLocalStats();
  }
}

function saveBilliardsLocalStats(stats: BilliardsLocalStats): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordLocal2pMatchResult(winnerSlot: PlayerSlot): BilliardsLocalStats {
  const stats = loadBilliardsLocalStats();
  stats.local2p.matches += 1;
  if (winnerSlot === 0) stats.local2p.p1Wins += 1;
  else stats.local2p.p2Wins += 1;
  saveBilliardsLocalStats(stats);
  return stats;
}

export function recordBotMatchResult(
  difficulty: BotDifficulty,
  winnerSlot: PlayerSlot,
): BilliardsLocalStats {
  const stats = loadBilliardsLocalStats();
  if (winnerSlot === 0) stats.bot[difficulty].wins += 1;
  else stats.bot[difficulty].losses += 1;
  saveBilliardsLocalStats(stats);
  return stats;
}
