/**
 * `npm run economy:experiments` — balance experiments that never mutate the
 * approved catalog. Every variant is an override on a fresh simulator run.
 *
 * Node >= 22.18 (native TypeScript). No new dependency.
 */

import {
  cropEconomics,
  runBalanceExperiments,
  runSaturationSweep,
  type ExperimentReport,
} from '../src/shared/economy/sim/experiments.ts';

function pad(value: string | number, width: number): string {
  return String(value).padStart(width);
}

function fixed(value: number, width = 9): string {
  return value.toFixed(2).padStart(width);
}

function renderText(report: ExperimentReport): string {
  const lines: string[] = [];
  lines.push('=== OUR LITTLE WORLD — ECONOMY EXPERIMENTS ===');
  lines.push(
    `profile ${report.profileId} | ${report.days} ngày | seeds ${report.seeds.join(', ')} | fingerprint ${report.catalogFingerprint}`,
  );
  lines.push('');
  lines.push('-- Saturation sweep (median qua các seed) --');
  lines.push(
    `  ${pad('ngưỡng', 8)}${pad('bước', 6)}${pad('sàn', 7)}${pad('persona', 12)}${pad('xu/phút phiên', 15)}${pad('xu/phút thao tác', 17)}${pad('xu/ngày thực', 14)}${pad('nhóm bán', 10)}${pad('top share', 11)}`,
  );
  for (const row of report.sweeps) {
    lines.push(
      `  ${pad(row.threshold, 8)}${pad(row.stepBp, 6)}${pad(row.floorBp, 7)}${pad(row.personaId, 12)}${fixed(row.coinsPerSessionMinute, 15)}${fixed(row.coinsPerWorkedMinute, 17)}${fixed(row.coinsPerRealDay, 14)}${pad(row.distinctGroups, 10)}${fixed(row.topGroupShare, 11)}`,
    );
  }

  lines.push('');
  lines.push('-- Cây nhanh vs cây chậm (phân tích, chưa tính bão hòa) --');
  lines.push(
    `  ${pad('cây', 14)}${pad('vốn hạt', 9)}${pad('doanh thu', 10)}${pad('lãi/chu kỳ', 11)}${pad('phút thao tác', 13)}${pad('lãi/phút', 10)}${pad('ck/ngày', 9)}${pad('ck/phiên', 9)}${pad('lãi/ô/ngày', 12)}${pad('trần/ô/ngày', 12)}${pad('tương quan', 10)}`,
  );
  for (const row of report.crops) {
    lines.push(
      `  ${pad(row.sku, 14)}${pad(row.seedCostCoins, 9)}${pad(row.revenueCoins, 10)}${pad(row.profitPerCycleCoins, 11)}${fixed(row.actionSeconds / 60, 13)}${fixed(row.profitPerActionMinute, 10)}${pad(row.wallClockCyclesPerPlotDay, 9)}${pad(row.sessionCyclesPerPlotDay, 9)}${fixed(row.profitPerPlotDay, 12)}${fixed(row.profitPerPlotDayCeiling, 12)}${fixed(row.relativePlotValue, 10)}`,
    );
  }

  lines.push('');
  lines.push('-- Bán thô vs nấu ăn (xu/phút thao tác) --');
  lines.push(
    `  ${pad('món', 18)}${pad('nguyên liệu', 11)}${pad('bán món', 9)}${pad('lãi', 7)}${pad('bán thô/phút', 13)}${pad('đơn NPC/phút', 14)}${pad('nhà hàng/phút', 15)}`,
  );
  for (const row of report.cooking) {
    lines.push(
      `  ${pad(row.dishSku, 18)}${pad(row.inputValueCoins, 11)}${pad(row.dishSaleCoins, 9)}${pad(row.profitCoins, 7)}${fixed(row.profitPerActionMinute, 13)}${fixed(row.orderProfitPerActionMinute, 14)}${fixed(row.restaurantProfitPerActionMinute, 15)}`,
    );
  }

  lines.push('');
  lines.push('-- Pacing mua sắm (ngày thực để đủ tiền) --');
  lines.push(`  ${pad('persona', 12)}${pad('món', 18)}${pad('giá', 7)}${pad('ngày', 7)}${pad('phút phiên', 12)}`);
  for (const row of report.pacing) {
    lines.push(
      `  ${pad(row.personaId, 12)}${pad(row.sinkId, 18)}${pad(row.cost, 7)}${pad(row.days ?? '-', 7)}${fixed(row.sessionMinutes, 12)}`,
    );
  }

  lines.push('');
  lines.push('-- Bảng đơn NPC (casual, cùng seed) --');
  lines.push(
    `  không đơn: ${fixed(report.orders.withoutOrders.coinsPerSessionMinute)} xu/phút phiên`,
  );
  lines.push(`  có đơn:   ${fixed(report.orders.withOrders.coinsPerSessionMinute)} xu/phút phiên`);

  lines.push('');
  lines.push('-- So sánh market policy A–E (median qua các seed) --');
  lines.push(
    `  ${pad('policy', 22)}${pad('persona', 16)}${pad('xu/phút thao tác', 17)}${pad('xu/phút phiên', 15)}${pad('xu/ngày', 10)}${pad('xu/ô-ngày', 12)}${pad('idle', 7)}${pad('top', 7)}${pad('nhóm', 6)}${pad('tài sản', 10)}`,
  );
  for (const row of report.policies) {
    lines.push(
      `  ${pad(row.policyId, 22)}${pad(row.personaId, 16)}${fixed(row.coinsPerWorkedMinute, 17)}${fixed(row.coinsPerSessionMinute, 15)}${fixed(row.coinsPerRealDay, 10)}${fixed(row.netPerPlotDay, 12)}${fixed(row.idleShare, 7)}${fixed(row.topGroupShare, 7)}${pad(row.distinctGroups, 6)}${pad(row.medianWealth, 10)}`,
    );
  }

  lines.push('');
  lines.push('-- Kênh bán món ăn (xu/phút thao tác, trần nhà hàng 1,60–2,00×) --');
  lines.push(
    `  ${pad('món', 18)}${pad('NVL', 6)}${pad('bán thô', 10)}${pad('đơn NPC', 9)}${pad('NH 1,6', 8)}${pad('NH 1,8', 8)}${pad('NH 2,0', 8)}`,
  );
  for (const row of report.cookingChannels) {
    lines.push(
      `  ${pad(row.dishSku, 18)}${pad(row.inputValueCoins, 6)}${fixed(row.binPerMinute, 10)}${fixed(row.orderPerMinute, 9)}${fixed(row.restaurant160PerMinute, 8)}${fixed(row.restaurant180PerMinute, 8)}${fixed(row.restaurant200PerMinute, 8)}`,
    );
  }

  lines.push('');
  lines.push('-- E · Bán dồn vs bán rải rác (24 đơn vị nhóm grain) --');
  for (const row of report.recoverySplit) {
    lines.push(
      `  bán dồn: ${row.dumpCoins}c | chia 3 phiên (0h/3h/6h): ${row.splitAcrossThreeSessionsCoins}c | chênh lệch ${(row.recoveredShare * 100).toFixed(1)}%`,
    );
  }

  lines.push('');
  lines.push('-- Sai lệch catalog --');
  for (const gap of report.gaps) {
    lines.push(`  [${gap.severity}] ${gap.id}: ${gap.summaryVi}`);
    lines.push(`    đề xuất: ${gap.proposalVi}`);
  }

  lines.push('');
  lines.push('-- Cảnh báo catalog --');
  for (const warning of report.catalogWarnings) {
    lines.push(`  ${warning}`);
  }
  return lines.join('\n');
}

const asJson = process.argv.includes('--json');
const seedArg = process.argv.find((argument) => argument.startsWith('--seed='));
const dayArg = process.argv.find((argument) => argument.startsWith('--days='));
const seeds = seedArg ? [Number(seedArg.slice('--seed='.length))] : [20261125, 7, 99];
const days = dayArg ? Number(dayArg.slice('--days='.length)) : 90;

const report = runBalanceExperiments({ seeds, days });
process.stdout.write(`${asJson ? JSON.stringify(report, null, 2) : renderText(report)}\n`);

// Extra, fast checks appended for the operator.
const quick = cropEconomics();
const best = quick[0];
if (best) {
  process.stdout.write(
    `\nCây lãi/ô/ngày cao nhất: ${best.sku} (${best.profitPerPlotDay} xu/ô/ngày, ${best.exceedsSaturationThreshold ? 'vượt ngưỡng bão hòa' : 'dưới ngưỡng bão hòa'}).\n`,
  );
}
const sweep = runSaturationSweep({ seeds: [20261125], days: 30, profileId: 'v021' });
const strict = sweep.find((row) => row.threshold === 12 && row.personaId === 'optimizer');
const loose = sweep.find((row) => row.threshold === 30 && row.personaId === 'optimizer');
if (strict && loose) {
  process.stdout.write(
    `Optimizer ngày 30: ngưỡng 12 -> ${strict.coinsPerSessionMinute} xu/phút, ngưỡng 30 -> ${loose.coinsPerSessionMinute} xu/phút.\n`,
  );
}
