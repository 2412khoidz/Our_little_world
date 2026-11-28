import type { DeepFarmSnapshot } from './deepFarmState';
import type { FarmPlotView } from './farmSnapshotTypes';

export type PlotEffect = 'till' | 'plant' | 'water' | 'harvest';

export function confirmedPlotEffects(before: readonly FarmPlotView[], after: readonly FarmPlotView[]) {
  const effects: { action: PlotEffect; plotId: number }[] = [];
  const oldById = new Map(before.map((plot) => [plot.plotId, plot]));
  for (const plot of after) {
    const old = oldById.get(plot.plotId);
    if (!old) continue;
    let action: PlotEffect | undefined;
    if (old.soil === 'empty' && plot.soil === 'tilled') action = 'till';
    else if (old.soil === 'tilled' && plot.soil === 'planted') action = 'plant';
    else if (old.soil === 'planted' && (plot.soil !== 'planted' || old.plantedAtMs !== plot.plantedAtMs)) action = 'harvest';
    else if (plot.soil === 'planted' && !plot.autoWatered && plot.waterCount > old.waterCount) action = 'water';
    if (action) effects.push({ action, plotId: plot.plotId });
  }
  return effects;
}

export function confirmedDeepFarmEffects(previous: DeepFarmSnapshot | null, next: DeepFarmSnapshot) {
  if (!previous || previous.worldId !== next.worldId || next.version <= previous.version) return [];
  const effects: ({ kind: 'tree'; slotIndex: number; treeId: string } | { kind: 'pet'; animalId: string })[] = [];

  for (const view of next.orchardViews) {
    const before = previous.orchardViews.find((old) => old.slotIndex === view.slotIndex);
    if (view.tree && before?.tree?.treeId === view.tree.treeId && view.harvestsCount > before.harvestsCount) {
      effects.push({ kind: 'tree', slotIndex: view.slotIndex, treeId: view.tree.treeId });
    }
  }

  for (const animal of next.livestock.animals) {
    const before = previous.livestock.animals.find((old) => old.animalId === animal.animalId);
    if (before && animal.petByActors.some((actor) => (
      animal.petCalendarDay > before.petCalendarDay || !before.petByActors.includes(actor)
    ))) {
      effects.push({ kind: 'pet', animalId: animal.animalId });
    }
  }
  return effects;
}
