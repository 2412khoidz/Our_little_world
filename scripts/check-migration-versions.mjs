import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function duplicateMigrationVersions(filenames) {
  const versions = new Map();
  for (const name of filenames) {
    if (!name.endsWith('.sql')) continue;
    const match = /^(\d+)_/.exec(name);
    if (!match) throw new Error('Invalid migration filename: ' + name);
    const files = versions.get(match[1]) ?? [];
    files.push(name);
    versions.set(match[1], files);
  }
  return [...versions].filter(([, files]) => files.length > 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const duplicates = duplicateMigrationVersions(readdirSync(new URL('../supabase/migrations/', import.meta.url)));
  if (duplicates.length) {
    for (const [version, files] of duplicates) console.error('Duplicate version ' + version + ': ' + files.join(', '));
    process.exitCode = 1;
  } else {
    console.log('Migration versions are unique.');
  }
}
