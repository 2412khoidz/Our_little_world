/**
 * Human-readable and JSON reporting for the economy simulator.
 * Pure string building: no console, no file system, no clock.
 */

import type { ArbitrageReport } from '../arbitrage.ts';
import type { CatalogValidation } from '../catalogConfig.ts';
import type {
  BatchSessionSummary,
  ProfileId,
  RecoveryProbe,
  SimResult,
  StrategyComparison,
} from './types.ts';

export interface ProfileReport {
  readonly profileId: ProfileId;
  readonly labelVi: string;
  readonly results: readonly SimResult[];
  readonly recovery: readonly RecoveryProbe[];
  readonly strategies: readonly StrategyComparison[];
}

export interface SimReportBundle {
  readonly seed: number;
  readonly sessions: number;
  readonly days: number;
  readonly catalogVersion: string;
  readonly catalogFingerprint: string;
  readonly catalog: CatalogValidation;
  readonly arbitrage: ArbitrageReport;
  readonly profiles: readonly ProfileReport[];
  readonly batches: readonly BatchSessionSummary[];
}

function pad(value: string | number, width: number): string {
  return String(value).padStart(width);
}

function fixed(value: number, width = 8): string {
  return value.toFixed(2).padStart(width);
}

function topEntry(record: Readonly<Record<string, number>>): string {
  const entries = Object.entries(record).sort((left, right) => right[1] - left[1]);
  const first = entries[0];
  if (!first) {
    return '-';
  }
  return `${first[0]} ${first[1]}c`;
}

export function formatMilestones(results: readonly SimResult[]): string {
  const milestoneDays = results[0]?.snapshots.map((snapshot) => snapshot.day) ?? [];
  const out: string[] = [];
  for (const day of milestoneDays) {
    out.push('');
    out.push(`  Mốc ngày ${day}:`);
    out.push(
      `    ${pad('persona', 16)}${pad('ví', 8)}${pad('kho', 8)}${pad('tổng', 9)}${pad('xu/phút', 10)}  nguồn chính / đích chính`,
    );
    for (const result of results) {
      const snapshot = result.snapshots.find((entry) => entry.day === day);
      if (!snapshot) {
        continue;
      }
      out.push(
        `    ${pad(result.personaId, 16)}${pad(snapshot.walletCoins, 8)}${pad(
          snapshot.inventoryValueCoins,
          8,
        )}${pad(snapshot.wealthCoins, 9)}${fixed(snapshot.incomePerMinute, 10)}  ${topEntry(
          snapshot.sources,
        )} / ${topEntry(snapshot.sinks)}`,
      );
    }
  }
  return out.join('\n');
}

export function formatBatch(summary: BatchSessionSummary): string {
  const out: string[] = [];
  out.push(`  ${summary.sessions} phiên × ${summary.profileId} (seed gốc ${summary.seeds[0] ?? '-'})`);
  out.push(`    ${pad('persona', 16)}${pad('phiên', 8)}${pad('ok', 6)}${pad('ví trung vị', 14)}`);
  for (const personaId of Object.keys(summary.perPersona)) {
    const bucket = summary.perPersona[personaId];
    if (!bucket) {
      continue;
    }
    out.push(
      `    ${pad(personaId, 16)}${pad(bucket.sessions, 8)}${pad(bucket.ok ? 'yes' : 'NO', 6)}${pad(
        bucket.medianWallet,
        14,
      )}`,
    );
  }
  out.push(
    `    vi phạm invariant: ${summary.invariantFailures} | deadlock: ${summary.deadlocks} | arbitrage: ${summary.arbitrageFindings}`,
  );
  return out.join('\n');
}

export function formatRecovery(probes: readonly RecoveryProbe[]): string {
  const out: string[] = [];
  for (const probe of probes) {
    const status = probe.recovered ? 'OK' : 'FAIL';
    out.push(
      `    ${pad(probe.personaId, 16)} ${status}  ${probe.secondsToRecover}s  ví ${probe.walletAfterRecovery}c (cần ${probe.requiredCoins}c)`,
    );
  }
  return out.join('\n');
}

export function formatStrategies(comparisons: readonly StrategyComparison[]): string {
  const out: string[] = [];
  for (const comparison of comparisons) {
    const flag = comparison.withinGuard ? 'OK' : 'VƯỢT TRẦN';
    out.push(
      `    ${pad(comparison.personaId, 16)} mono ${fixed(comparison.monocultureCoinsPerMinute, 7)} xu/phút` +
        ` | cân bằng ${fixed(comparison.balancedCoinsPerMinute, 7)} xu/phút` +
        ` | tỉ lệ ${comparison.ratio.toFixed(2)} / trần ${comparison.guardLimit} ${flag}` +
        ` | cây độc tôn: ${comparison.monocultureCrop ?? '-'}`,
    );
  }
  return out.join('\n');
}

export function renderTextReport(bundle: SimReportBundle): string {
  const lines: string[] = [];
  lines.push('=== OUR LITTLE WORLD — ECONOMY SIMULATOR ===');
  lines.push(
    `config ${bundle.catalogVersion} (fingerprint ${bundle.catalogFingerprint}) | seed ${bundle.seed} | ${bundle.days} ngày | ${bundle.sessions} phiên/batch`,
  );
  lines.push('');
  lines.push(
    `Catalog: ${bundle.catalog.ok ? 'OK' : 'LỖI'} (${bundle.catalog.errors.length} lỗi, ${bundle.catalog.warnings.length} cảnh báo)`,
  );
  for (const issue of bundle.catalog.warnings) {
    lines.push(`  cảnh báo ${issue.code} [${issue.sku}]: ${issue.messageVi}`);
  }
  for (const issue of bundle.catalog.errors) {
    lines.push(`  LỖI ${issue.code} [${issue.sku}]: ${issue.messageVi}`);
  }
  lines.push(
    `Arbitrage: ${bundle.arbitrage.ok ? 'OK (0 finding)' : `${bundle.arbitrage.findings.length} FINDING`} | chuỗi bị chặn bởi thời gian: ${bundle.arbitrage.timeGatedItems.length}`,
  );
  for (const finding of bundle.arbitrage.findings) {
    lines.push(`  ${finding.kind}: ${finding.detailVi}`);
  }

  for (const profile of bundle.profiles) {
    lines.push('');
    lines.push(`--- ${profile.labelVi} ---`);
    lines.push(formatMilestones(profile.results));
    lines.push('  Đường phục hồi ví 0 qua hái lượm + Shipping Bin:');
    lines.push(formatRecovery(profile.recovery));
    if (profile.strategies.length > 0) {
      lines.push('  Dominant strategy (monoculture vs cân bằng, 30 ngày):');
      lines.push(formatStrategies(profile.strategies));
    }
  }

  lines.push('');
  lines.push('--- Batch ---');
  for (const batch of bundle.batches) {
    lines.push(formatBatch(batch));
  }

  const failures = bundle.profiles
    .flatMap((profile) => profile.results)
    .filter((result) => !result.invariants.ok);
  lines.push('');
  lines.push(
    `Invariant: ${failures.length === 0 ? 'OK' : `${failures.length} lần chạy lỗi`}`,
  );
  for (const failure of failures.slice(0, 10)) {
    lines.push(`  ${failure.personaId}@${failure.profileId}: ${failure.invariants.issues[0]?.messageVi ?? ''}`);
  }
  return lines.join('\n');
}

export function renderJsonReport(bundle: SimReportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/** Exit-code policy shared by the CLI and CI. */
export function reportFailures(bundle: SimReportBundle): string[] {
  const failures: string[] = [];
  if (!bundle.catalog.ok) {
    failures.push('catalog không hợp lệ');
  }
  if (!bundle.arbitrage.ok) {
    failures.push(`phát hiện ${bundle.arbitrage.findings.length} arbitrage`);
  }
  for (const batch of bundle.batches) {
    if (batch.invariantFailures > 0) {
      failures.push(`batch ${batch.profileId}: ${batch.invariantFailures} vi phạm invariant`);
    }
    if (batch.deadlocks > 0) {
      failures.push(`batch ${batch.profileId}: ${batch.deadlocks} deadlock`);
    }
  }
  for (const profile of bundle.profiles) {
    for (const result of profile.results) {
      if (!result.invariants.ok) {
        failures.push(
          `${result.personaId}@${result.profileId}: ${result.invariants.issues[0]?.messageVi ?? 'invariant'}`,
        );
      }
    }
    for (const probe of profile.recovery) {
      if (!probe.recovered) {
        failures.push(`${probe.personaId}@${profile.profileId}: không phục hồi ví 0`);
      }
    }
  }
  return failures;
}
