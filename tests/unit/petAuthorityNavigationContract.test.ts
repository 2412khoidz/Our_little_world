import { describe, expect, it } from 'vitest';
import { isConsumptionPlanningSupported, PET_AUTHORITY_NAV_CONTRACT_VERSION } from '../../src/shared/petLiving/petMovement/petAuthorityNavigationContract';

describe('petAuthorityNavigationContract', () => {
  it('versions the nav contract for 04D extension', () => {
    expect(PET_AUTHORITY_NAV_CONTRACT_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('fail-closes garden until 04D placement snapshot', () => {
    expect(isConsumptionPlanningSupported('home')).toBe(true);
    expect(isConsumptionPlanningSupported('garden')).toBe(false);
  });
});