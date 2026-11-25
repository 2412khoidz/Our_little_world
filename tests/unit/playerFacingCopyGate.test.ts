import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const BANNED_PHRASES = [
  'donor (C1)',
  'Cối xay donor',
  'Cầu câu donor',
  'Donor chế biến',
  'bãi biển donor',
  '(donor)',
  'composer',
] as const;

const PLAYER_UI_FILES = [
  'src/features/home/MenuModal.tsx',
  'src/features/donor/DonorWorkshopModal.tsx',
  'src/features/home/FarmFishLoopTutorial.tsx',
  'src/features/pets/PetPanel.tsx',
  'src/features/inventory/InventoryModal.tsx',
] as const;

describe('player-facing copy gate', () => {
  for (const rel of PLAYER_UI_FILES) {
    it(`avoids dev donor phrases in ${rel}`, () => {
      const text = readFileSync(join(REPO_ROOT, rel), 'utf8');
      for (const phrase of BANNED_PHRASES) {
        expect(text, `found banned phrase "${phrase}"`).not.toContain(phrase);
      }
    });
  }
});