import type { InventoryEntry } from '../inventory/inventoryTypes';
import type { PetSnapshot } from '../pet/petTypes';
import type { StudySession } from '../study/studyTypes';
import type { FurniturePlacement } from '../types';

export interface DevSanitizedWorldSnapshot {
  schemaVersion: 1;
  worldId: string;
  exportedAt: string;
  placements: FurniturePlacement[];
  inventory: InventoryEntry[];
  pet: PetSnapshot | null;
  studySessions: StudySession[];
}
