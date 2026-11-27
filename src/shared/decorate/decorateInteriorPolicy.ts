import type { MapId } from '../types';

/** Interior maps where furniture placement is persisted (matches DB CHECK). */
export const DECORATE_MAP_IDS = ['home', 'garden'] as const satisfies readonly MapId[];

export type DecorateMapId = (typeof DECORATE_MAP_IDS)[number];

export function isDecorateMapId(mapId: MapId): mapId is DecorateMapId {
  return (DECORATE_MAP_IDS as readonly MapId[]).includes(mapId);
}

export function defaultDecorateMapId(current: MapId): DecorateMapId {
  if (isDecorateMapId(current)) return current;
  return 'home';
}

export function decorateMapLabelVi(mapId: DecorateMapId): string {
  return mapId === 'home' ? 'Trong nhà' : 'Khu vườn';
}