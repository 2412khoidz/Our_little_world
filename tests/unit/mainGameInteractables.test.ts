import { describe, expect, it } from 'vitest';
import { buildMainGameInteractables } from '../../src/shared/interaction/mainGameInteractables';

describe('mainGameInteractables', () => {
  it('includes portal and bowls on home map', () => {
    const list = buildMainGameInteractables({
      mapId: 'home',
      placements: [],
      petWorldPosition: { x: 200, y: 160 },
      petVisible: true,
      mailboxUnread: 0,
    });
    expect(list.some((t) => t.kind === 'portal')).toBe(true);
    expect(list.some((t) => t.kind === 'food_bowl')).toBe(true);
    expect(list.some((t) => t.kind === 'pet')).toBe(true);
  });

  it('hides outdoor economy stalls when donor preview is off', () => {
    const list = buildMainGameInteractables({
      mapId: 'outdoor',
      placements: [],
      petWorldPosition: null,
      petVisible: false,
      mailboxUnread: 0,
      donorEconomyDev: false,
    });
    expect(list.some((t) => t.id === 'outdoor_market')).toBe(false);
    expect(list.some((t) => t.id === 'outdoor_fishing')).toBe(false);
  });

  it('includes outdoor economy when donor preview is on', () => {
    const list = buildMainGameInteractables({
      mapId: 'outdoor',
      placements: [],
      petWorldPosition: null,
      petVisible: false,
      mailboxUnread: 0,
      donorEconomyDev: true,
    });
    const market = list.find((t) => t.id === 'outdoor_market');
    expect(market?.donorPlayable).toBe(true);
  });

  it('includes mailbox on garden map', () => {
    const list = buildMainGameInteractables({
      mapId: 'garden',
      placements: [],
      petWorldPosition: null,
      petVisible: false,
      mailboxUnread: 2,
    });
    const mailbox = list.find((t) => t.kind === 'mailbox');
    expect(mailbox?.labelVi).toContain('2');
  });
});