import { getCropDefinition } from './crops';
import type { FarmPlotView } from './farmSnapshotTypes';

function formatDurationVi(remainingMs: number): string {
  if (remainingMs <= 0) return 'sẵn sàng thu hoạch';
  const totalSec = Math.ceil(remainingMs / 1000);
  if (totalSec < 60) return `còn ${totalSec} giây`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `còn ${min} phút ${sec} giây` : `còn ${min} phút`;
  const hr = Math.floor(min / 60);
  const rm = min % 60;
  return rm > 0 ? `còn ${hr} giờ ${rm} phút` : `còn ${hr} giờ`;
}

const SOIL_LABEL: Record<FarmPlotView['soil'], string> = {
  empty: 'Đất trống — cầm cuốc để cày',
  tilled: 'Đất đã cày — cầm hạt để gieo',
  planted: 'Đang trồng',
};

/** Vietnamese inspect line for contextual J when no tool action applies. */
export function farmPlotInspectLabelVi(plot: FarmPlotView, serverNowMs: number): string {
  if (plot.soil === 'planted' && plot.cropSku) {
    const name = getCropDefinition(plot.cropSku)?.nameVi ?? plot.cropSku;
    if (plot.ready) return `${name} — sẵn sàng thu hoạch`;
    const eta = plot.harvestReadyAtMs != null ? plot.harvestReadyAtMs - serverNowMs : 0;
    const pct = Math.floor(plot.growthPermille / 10);
    return `${name} — ${pct}% · ${formatDurationVi(eta)}`;
  }
  return SOIL_LABEL[plot.soil];
}