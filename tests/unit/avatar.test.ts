import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_PARTNER_A,
  DEFAULT_AVATAR_PARTNER_B,
  parseAvatarConfig,
} from '../../src/shared/avatar';

describe('avatar config validation', () => {
  it('validates clean avatar configurations', () => {
    expect(parseAvatarConfig(DEFAULT_AVATAR_PARTNER_A)).toEqual(DEFAULT_AVATAR_PARTNER_A);
    expect(parseAvatarConfig(DEFAULT_AVATAR_PARTNER_B)).toEqual(DEFAULT_AVATAR_PARTNER_B);
  });

  it('falls back safely when malformed payload is received', () => {
    const parsed = parseAvatarConfig({ hairStyle: 'mohawk-invalid' }, DEFAULT_AVATAR_PARTNER_B);
    expect(parsed).toEqual(DEFAULT_AVATAR_PARTNER_B);
  });
});
