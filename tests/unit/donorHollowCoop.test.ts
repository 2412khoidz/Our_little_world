import { describe, expect, it } from 'vitest';
import { collectHollowCoop, emptyHollowCoopState, feedHollowCoop, OLW_COOP_CYCLE_MS } from '../../src/shared/donor/harvest-hollow-9b23e1a/hollowCoopCycle';

describe('donor hollow coop', () => {
  it('feed then collect egg after cycle', () => {
    const now = 1_000_000;
    const fed = feedHollowCoop(emptyHollowCoopState(), 2, now);
    expect(fed.error).toBeUndefined();
    expect(fed.feedUsed).toBe(1);
    const early = collectHollowCoop(fed.coop, now + 1000);
    expect(early.error).toBe('NOT_READY');
    const done = collectHollowCoop(fed.coop, now + OLW_COOP_CYCLE_MS + 1);
    expect(done.eggs).toBe(1);
    expect(done.coop.readyAtMs).toBeNull();
  });
});