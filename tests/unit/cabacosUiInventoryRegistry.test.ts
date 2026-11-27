import { describe, expect, it } from 'vitest';
import { CABACOS_UI_INVENTORY_REGISTRY } from '../../src/shared/donor/cabacos-79e423d/uiInventoryRegistry';
import fs from 'node:fs';
import path from 'node:path';

describe('Cabacos UI inventory registry', () => {
  it('points at vendored public assets', () => {
    expect(CABACOS_UI_INVENTORY_REGISTRY.upstreamSha).toMatch(/79e423d/);
    for (const url of Object.values(CABACOS_UI_INVENTORY_REGISTRY)) {
      if (typeof url !== 'string' || !url.startsWith('/assets/')) continue;
      const disk = path.join(process.cwd(), 'public', url.slice(1));
      expect(fs.existsSync(disk), url).toBe(true);
    }
  });
});