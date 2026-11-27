/**
 * Static boundary check (Node environment): `src/shared/**` must stay pure
 * TypeScript with no React/Phaser/Supabase/UI imports.
 *
 * Lives under tests/server because it needs node:fs; tests/unit is compiled with
 * the browser tsconfig that intentionally has no Node types.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function collectTsFiles(directory: string, out: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(path, out);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(path);
    }
  }
  return out;
}

describe('module boundary — src/shared stays pure', () => {
  it('never imports React, Phaser, Supabase, game, lib or feature code', () => {
    const root = join(process.cwd(), 'src', 'shared');
    const files = collectTsFiles(root);
    expect(files.length).toBeGreaterThan(20);

    const forbidden = [
      "from 'react'",
      "from 'react-dom'",
      "from 'phaser'",
      "from '@supabase/",
      "from '../game/",
      "from '../lib/",
      "from '../features/",
    ];
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        if (source.includes(pattern)) {
          violations.push(`${file} -> ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
