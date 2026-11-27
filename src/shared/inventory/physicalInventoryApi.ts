import type { ContainerKind, PhysicalBackpack, PhysicalCommand, PhysicalStack, PhysicalDefinition, PhysicalDrop } from './physicalInventory';

export interface PhysicalStorageQuery {
  readonly storage: 'home' | 'overflow';
  readonly page: number;
  readonly search: string;
  readonly category?: string;
}

export const INITIAL_PHYSICAL_QUERY: PhysicalStorageQuery = { storage: 'home', page: 0, search: '' };

export interface PhysicalSlotView {
  readonly index: number;
  readonly stack: PhysicalStack | null;
  readonly locked: boolean;
}

export interface PhysicalInventoryView {
  readonly worldId: string;
  readonly version: number;
  readonly atHome: boolean;
  readonly player: PhysicalBackpack;
  readonly coins: number;
  readonly backpack: readonly PhysicalSlotView[];
  readonly storage: { readonly kind: Exclude<ContainerKind, 'backpack'>; readonly page: number; readonly pages: number; readonly slots: readonly PhysicalSlotView[] } | null;
  readonly definitions: Readonly<Record<string, PhysicalDefinition>>;
  readonly categories: readonly string[];
  readonly nearbyDrops: readonly PhysicalDrop[];
  readonly canDrop: boolean;
}

export interface PhysicalInventoryRequest {
  readonly worldId: string;
  readonly version: number;
  readonly idempotencyKey: string;
  readonly query: PhysicalStorageQuery;
  readonly command: PhysicalCommand;
}

export function preferPhysicalSnapshot(current: PhysicalInventoryView | null, next: PhysicalInventoryView): PhysicalInventoryView {
  return current?.worldId === next.worldId && current.version > next.version ? current : next;
}
