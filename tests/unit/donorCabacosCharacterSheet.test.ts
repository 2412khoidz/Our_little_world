import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CABACOS_PLAYER_SPRITE,
  CABACOS_PLAYER_SPRITE_REJECT_REASON,
} from '../../src/shared/donor/cabacos-79e423d/cabacosPlayerSprite';

const root = path.resolve(import.meta.dirname, '../..');
const charDir = path.join(root, 'public/assets/donor/cabacos-characters');

describe('Cabacos character strips (reference)', () => {
  it('vendors idle and walk PNGs from upstream', () => {
    expect(fs.existsSync(path.join(charDir, 'base_waiting_strip9.png'))).toBe(true);
    expect(fs.existsSync(path.join(charDir, 'base_walk_strip8.png'))).toBe(true);
    expect(fs.existsSync(path.join(charDir, 'UPSTREAM_SHA.txt'))).toBe(true);
  });

  it('documents 96x64 flipX-only locomotion (not gameplay 8-dir)', () => {
    expect(CABACOS_PLAYER_SPRITE.frameWidth).toBe(96);
    expect(CABACOS_PLAYER_SPRITE.idle.frames).toBe(9);
    expect(CABACOS_PLAYER_SPRITE.walk.frames).toBe(8);
    expect(CABACOS_PLAYER_SPRITE.locomotion).toBe('flipX');
    expect(CABACOS_PLAYER_SPRITE_REJECT_REASON).toContain('flipX');
  });
});