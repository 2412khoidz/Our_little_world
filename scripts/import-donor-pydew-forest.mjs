/**
 * Forest import — Tuxemon transplant (replaces pydewGladeTilemap procedural path).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const importTuxemon = path.resolve(import.meta.dirname, 'import-donor-tuxemon-forest.mjs');

execFileSync(process.execPath, [importTuxemon], { stdio: 'inherit' });