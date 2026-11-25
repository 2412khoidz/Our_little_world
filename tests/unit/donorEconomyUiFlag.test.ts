import { describe, expect, it } from 'vitest';
import { isDonorLanPlayableMode, setDevLanDonorUiActive } from '../../src/shared/donor/donorEconomyUiFlag';

describe('donorEconomyUiFlag', () => {
  it('enables donor LAN UI when dev-lan flag is synced (preview build)', () => {
    setDevLanDonorUiActive(true);
    expect(isDonorLanPlayableMode('dev-lan')).toBe(true);
    setDevLanDonorUiActive(false);
    expect(isDonorLanPlayableMode('dev-lan')).toBe(import.meta.env.DEV || import.meta.env.VITE_OLW_DONOR_ECONOMY === '1');
  });

  it('never enables on supabase mode', () => {
    setDevLanDonorUiActive(true);
    expect(isDonorLanPlayableMode('supabase')).toBe(false);
  });
});