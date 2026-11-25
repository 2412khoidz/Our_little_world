/**
 * Regenerates src/shared/world/farmPlotContract.v1.json from TS source.
 * Run after anchor / region edits: node scripts/export-farm-plot-contract.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outPath = path.join(root, 'src/shared/world/farmPlotContract.v1.json');
const snippet = `
import { buildFarmPlotContractExport } from './src/shared/world/farmPlotContract.ts';
import fs from 'node:fs';
fs.writeFileSync(${JSON.stringify(outPath)}, JSON.stringify(buildFarmPlotContractExport(), null, 2) + '\\n');
`;

const js = path.join(root, '.tmp-export-farm-contract.mjs');
fs.writeFileSync(js, snippet);

try {
  execFileSync(
    'npx',
    ['--yes', 'tsx', js],
    { cwd: root, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '' } },
  );
  console.log(`Wrote ${outPath}`);
} finally {
  fs.rmSync(js, { force: true });
}