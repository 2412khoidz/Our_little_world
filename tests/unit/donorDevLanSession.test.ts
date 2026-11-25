import { afterEach, describe, expect, it } from 'vitest';
import { devLanRequestHeaders, getDevLanSessionUser } from '../../src/lib/backend/devLanSessionHeaders';

const SESSION_KEY = 'olw:dev-lan:session-user:v1';
const MAY_ID = '11111111-1111-4111-8111-111111111111';

describe('donorDevLan session headers', () => {
  afterEach(() => {
    window.sessionStorage.removeItem(SESSION_KEY);
  });

  it('sends x-dev-user-id when dev session is stored', () => {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: MAY_ID, email: 'a@test' }));
    expect(getDevLanSessionUser()?.userId).toBe(MAY_ID);
    const h = devLanRequestHeaders();
    expect(h['x-dev-user-id']).toBe(MAY_ID);
    expect(h['Content-Type']).toBe('application/json');
  });

  it('omits x-dev-user-id without session (server returns account picker message)', () => {
    expect(getDevLanSessionUser()).toBeNull();
    expect(devLanRequestHeaders()['x-dev-user-id']).toBeUndefined();
  });
});