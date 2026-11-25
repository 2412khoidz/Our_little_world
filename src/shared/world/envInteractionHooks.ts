import type { MapId } from '../types';

export type EnvInteractionHookKind = 'door' | 'ladder' | 'zone_warp';

export interface EnvInteractionHook {
  kind: EnvInteractionHookKind;
  /** Stable id for C3 door/ladder art hooks. */
  hookId: string;
  fromMapId: MapId;
  toMapId: MapId;
}

const PORTAL_HOOKS: ReadonlyArray<{
  portalId: string;
  kind: EnvInteractionHookKind;
  hookId: string;
  from: MapId;
  to: MapId;
}> = [
  { portalId: 'door-to-garden', kind: 'door', hookId: 'home_garden_door', from: 'home', to: 'garden' },
  { portalId: 'cottage-to-home', kind: 'door', hookId: 'garden_home_door', from: 'garden', to: 'home' },
  { portalId: 'garden-to-village', kind: 'door', hookId: 'garden_village_gate', from: 'garden', to: 'village' },
  { portalId: 'village-to-garden', kind: 'door', hookId: 'village_garden_gate', from: 'village', to: 'garden' },
  { portalId: 'outdoor-to-garden', kind: 'zone_warp', hookId: 'meadow_garden_gate', from: 'outdoor', to: 'garden' },
  { portalId: 'farm-to-village', kind: 'zone_warp', hookId: 'farm_village_path', from: 'farm', to: 'village' },
  { portalId: 'village-to-farm', kind: 'zone_warp', hookId: 'village_farm_path', from: 'village', to: 'farm' },
  { portalId: 'village-to-beach', kind: 'zone_warp', hookId: 'village_beach_coast', from: 'village', to: 'beach' },
  { portalId: 'beach-to-village', kind: 'zone_warp', hookId: 'beach_village_path', from: 'beach', to: 'village' },
  { portalId: 'village-to-forest', kind: 'ladder', hookId: 'village_forest_ladder', from: 'village', to: 'forest' },
  { portalId: 'forest-to-village', kind: 'ladder', hookId: 'forest_village_ladder', from: 'forest', to: 'village' },
  { portalId: 'forest-to-beach', kind: 'ladder', hookId: 'forest_beach_ladder', from: 'forest', to: 'beach' },
  { portalId: 'player_house_door', kind: 'door', hookId: 'village_player_house_door', from: 'village', to: 'home' },
  { portalId: 'shop-to-village', kind: 'door', hookId: 'shop_village_door', from: 'shop', to: 'village' },
  { portalId: 'farm_barn_door', kind: 'door', hookId: 'farm_barn_door', from: 'farm', to: 'shop' },
];

const LADDER_MAP_PAIRS = new Set<string>([
  'village|forest',
  'forest|village',
  'forest|beach',
  'beach|forest',
]);

function pairKey(from: MapId, to: MapId): string {
  return `${from}|${to}`;
}

function inferTransitionKind(fromMapId: MapId, toMapId: MapId): EnvInteractionHookKind {
  if (LADDER_MAP_PAIRS.has(pairKey(fromMapId, toMapId))) return 'ladder';
  if (
    fromMapId === 'home' ||
    toMapId === 'home' ||
    fromMapId === 'shop' ||
    toMapId === 'shop' ||
    fromMapId === 'garden' ||
    toMapId === 'garden'
  ) {
    return 'door';
  }
  return 'zone_warp';
}

export function resolveEnvHookForPortal(fromMapId: MapId, portalId: string): EnvInteractionHook | null {
  const row = PORTAL_HOOKS.find((p) => p.portalId === portalId && p.from === fromMapId);
  if (!row) return null;
  return { kind: row.kind, hookId: row.hookId, fromMapId: row.from, toMapId: row.to };
}

export function resolveEnvHookForMapChange(fromMapId: MapId, toMapId: MapId): EnvInteractionHook | null {
  const row = PORTAL_HOOKS.find((p) => p.from === fromMapId && p.to === toMapId);
  if (row) {
    return { kind: row.kind, hookId: row.hookId, fromMapId: row.from, toMapId: row.to };
  }
  const kind = inferTransitionKind(fromMapId, toMapId);
  return { kind, hookId: `${kind}_${fromMapId}_${toMapId}`, fromMapId, toMapId };
}

export function resolveEnvHookForTravel(
  fromMapId: MapId,
  toMapId: MapId,
  portalId?: string,
): EnvInteractionHook | null {
  if (portalId) {
    const byPortal = resolveEnvHookForPortal(fromMapId, portalId);
    if (byPortal && byPortal.toMapId === toMapId) return byPortal;
  }
  return resolveEnvHookForMapChange(fromMapId, toMapId);
}