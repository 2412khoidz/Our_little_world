import { getCropDefinition } from './crops';
import { FERTILIZER_DEFS, SPRINKLER_DEFS } from './deepCropSimulation';
import type { FarmPlotView } from './farmSnapshotTypes';

function formatDurationVi(ms: number): string {
  if (ms <= 0) return 'Sẵn sàng';
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `Còn ${totalSec} giây`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `Còn ${min} phút ${sec} giây` : `Còn ${min} phút`;
}

const SOIL_LABEL: Record<FarmPlotView['soil'], string> = {
  empty: 'Đất trống — cầm cuốc để cày',
  tilled: 'Đất đã cày — cầm hạt để gieo',
  planted: 'Đang trồng',
};

/** Vietnamese inspect line for contextual J when no tool action applies. */
export function farmPlotInspectLabelVi(plot: FarmPlotView, serverNowMs: number): string {
  const badges: string[] = [];
  if (plot.greenhouse) badges.push('Nhà kính');
  if (plot.sprinkler) badges.push(SPRINKLER_DEFS[plot.sprinkler]?.nameVi ?? 'Vòi phun');
  if (plot.fertilizer) badges.push(FERTILIZER_DEFS[plot.fertilizer]?.nameVi ?? 'Đã bón phân');

  if (plot.sprinkler && plot.soil !== 'planted') {
    const base = SPRINKLER_DEFS[plot.sprinkler]?.nameVi ?? 'Vòi phun tự động';
    return badges.length > 0 ? `${base} (${badges.join(' · ')})` : base;
  }

  if (plot.soil === 'planted' && plot.cropSku) {
    const name = getCropDefinition(plot.cropSku)?.nameVi ?? plot.cropSku;
    if (plot.seasonMatch === false && !plot.greenhouse) {
      badges.push('Trái mùa · lớn chậm 50%');
    }
    if (plot.autoWatered) badges.push('Tự tưới ẩm');
    const suffix = badges.length > 0 ? ` [${badges.join(' · ')}]` : '';
    if (plot.ready) return `${name} — sẵn sàng thu hoạch${suffix}`;
    const eta = plot.harvestReadyAtMs != null ? plot.harvestReadyAtMs - serverNowMs : 0;
    const pct = Math.floor(plot.growthPermille / 10);
    return `${name} — ${pct}% · ${formatDurationVi(eta)}${suffix}`;
  }
  const baseLabel = SOIL_LABEL[plot.soil];
  return badges.length > 0 ? `${baseLabel} [${badges.join(' · ')}]` : baseLabel;
}
