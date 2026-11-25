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
  { portalId: 'garden-to-home', kind: 'door', hookId: 'garden_home_door', from: 'garden', to: 'home' },
  { portalId: 'outdoor-to-garden', kind: 'zone_warp', hookId: 'meadow_garden_gate', from: 'outdoor', to: 'garden' },
  { portalId: 'farm_barn_door', kind: 'door', hookId: 'farm_barn_door', from: 'farm', to: 'shop' },
];

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
  if (toMapId === 'village' || toMapId === 'farm' || toMapId === 'beach') {
    return { kind: 'zone_warp', hookId: `warp_${fromMapId}_${toMapId}`, fromMapId, toMapId };
  }
  return { kind: 'door', hookId: `generic_${fromMapId}_${toMapId}`, fromMapId, toMapId };
}