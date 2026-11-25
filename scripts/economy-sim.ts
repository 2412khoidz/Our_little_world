/**
 * `npm run economy:sim` — headless balance audit for the Our Little World economy.
 *
 * Runs the catalog audit, 7 personas × 4 milestone profiles × 7/30/90/180 day
 * milestones, the zero-wallet recovery probe, the dominant-strategy comparison
 * and a seeded batch of sessions. Exits non-zero only on correctness failures
 * (invalid catalog, arbitrage, broken invariants, deadlock or a failed recovery
 * path); balance overshoots are printed as explicit findings instead.
 *
 * Requires Node >= 22.18 (native TypeScript type stripping). No extra dependency.
 *
 * Flags: --seed=N --sessions=N --days=N --batch-profile=v020|v021|v022|v030 --json --smoke
 *         --plots=12|184|contract|sample:N
 *
 * --smoke: 50 sessions × 7 days (quick gate; same sim plotCount as full run).
 * Farming gameplay plot count vs sim: docs/handover/MISSION_05_ECONOMY_SIM_VS_184_GRID.md
 */

import { analyzeArbitrage } from '../src/shared/economy/arbitrage.ts';
import {
  CATALOG_VERSION,
  catalogFingerprint,
  validateCatalog,
} from '../src/shared/economy/catalogConfig.ts';
import { PERSONAS, PROFILES } from '../src/shared/economy/sim/config.ts';
import {
  compareStrategies,
  measureZeroWalletRecovery,
  runBatch,
  runSimulation,
} from '../src/shared/economy/sim/run.ts';
import {
  renderJsonReport,
  renderTextReport,
  reportFailures,
  type ProfileReport,
  type SimReportBundle,
} from '../src/shared/economy/sim/report.ts';
import {
  applyPlotCountOverride,
  DEFAULT_SIM_FARM_PLOT_COUNT,
  FARM_CONTRACT_PLOT_COUNT,
  parseSimPlotsArg,
} from '../src/shared/economy/sim/plotCount.ts';
import type { ProfileId } from '../src/shared/economy/sim/types.ts';

function readArg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const found = process.argv.find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function parsePositiveInt(raw: string, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const smoke = process.argv.includes('--smoke');
const seed = parsePositiveInt(readArg('seed', '20261125'), 20261125);
const sessions = smoke ? 50 : parsePositiveInt(readArg('sessions', '1000'), 1000);
const days = smoke ? 7 : parsePositiveInt(readArg('days', '180'), 180);
const batchProfile = readArg('batch-profile', 'v020') as ProfileId;
const asJson = process.argv.includes('--json');
const plotCountOverride = parseSimPlotsArg(readArg('plots', ''));
const startedAt = Date.now();

if (!asJson) {
  const simPlots =
    plotCountOverride ?? DEFAULT_SIM_FARM_PLOT_COUNT;
  console.log(
    `Farm contract plots: ${FARM_CONTRACT_PLOT_COUNT} | sim farming plotCount: ${simPlots}${plotCountOverride == null ? ' (profile default)' : ' (--plots override)'}`,
  );
  console.log('Docs: docs/handover/MISSION_06_ECONOMY_BALANCE_184.md');
  if (smoke) console.log(`Smoke mode: ${sessions} sessions, ${days} days`);
}

const profiles: ProfileReport[] = PROFILES.map((profile) => {
  const results = PERSONAS.map((persona) =>
    runSimulation({ seed, profileId: profile.id, personaId: persona.id, days, plotCountOverride }),
  );
  const recovery = PERSONAS.map((persona) =>
    measureZeroWalletRecovery(profile.id, persona.id, seed),
  );
  const strategies = profile.features.farming
    ? [
        compareStrategies({
          profileId: profile.id,
          personaId: 'coop',
          seed,
          days: Math.min(days, 30),
          plotCountOverride,
        }),
      ]
    : [];
  const reportProfile = applyPlotCountOverride(profile, plotCountOverride);
  return {
    profileId: profile.id,
    labelVi: reportProfile.labelVi,
    results,
    recovery,
    strategies,
  };
});

const batch = runBatch({
  sessions,
  profileId: batchProfile,
  baseSeed: seed,
  days,
  plotCountOverride,
});

const bundle: SimReportBundle = {
  seed,
  sessions,
  days,
  catalogVersion: CATALOG_VERSION,
  catalogFingerprint: catalogFingerprint(),
  catalog: validateCatalog(),
  arbitrage: analyzeArbitrage(),
  profiles,
  batches: [batch],
};

const output = asJson ? renderJsonReport(bundle) : renderTextReport(bundle);
process.stdout.write(`${output}\n`);

const guardOvershoots = profiles.flatMap((profile) =>
  profile.strategies.filter((comparison) => !comparison.withinGuard),
);
if (guardOvershoots.length > 0) {
  process.stdout.write(
    `\nPHÁT HIỆN CÂN BẰNG: ${guardOvershoots.length} hồ sơ vượt trần dominant strategy ${guardOvershoots[0]?.guardLimit}×.\n`,
  );
}

const failures = reportFailures(bundle);
if (!asJson) {
  process.stdout.write(`\nHoàn tất trong ${Date.now() - startedAt}ms\n`);
}
if (failures.length > 0) {
  process.stderr.write(
    `\nTHẤT BẠI (${failures.length}):\n${failures.map((failure) => `  - ${failure}`).join('\n')}\n`,
  );
  process.exitCode = 1;
}
