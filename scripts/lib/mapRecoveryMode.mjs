/**
 * Map recovery @ integration/donor-reuse-preview 8e4454d — real donor transplants,
 * no cozy overlay / procedural glade / hollowmere scatter / Casa_player shop.
 *
 * Enable: OLW_MAP_RECOVERY=1 npm run import-donor:recovery-world
 */
export const MAP_RECOVERY_MODE =
  process.env.OLW_MAP_RECOVERY === '1' || process.env.OLW_MAP_RECOVERY === 'true';

export const RECOVERY_SLICE = 'map-recovery-v1-8e4454d';