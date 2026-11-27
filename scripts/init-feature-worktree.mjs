import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  REQUIRED_PRIVATE_AUDIO_FILES,
  REQUIRED_PRIVATE_UNIFIED_FILES,
  syncPrivateAssets,
  verifyPrivateAssets,
} from './sync-private-assets.mjs';

const ALLOWED_PREFIXES = new Set(['feat', 'fix', 'chore', 'spike', 'docs']);
const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{1,48}$/;

function git(cwd, args, opts = {}) {
  return execFileSync('git', ['-C', cwd, '-c', 'safe.directory=*', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function gitOk(cwd, args) {
  try {
    git(cwd, args);
    return true;
  } catch {
    return false;
  }
}

function normalizeForCompare(p) {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function listRegisteredWorktreePaths(repoRoot) {
  const out = git(repoRoot, ['worktree', 'list', '--porcelain']);
  const paths = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      paths.push(line.slice('worktree '.length).trim());
    }
  }
  return paths;
}

function assertNoLeakedSecretsOrSaves(targetDir) {
  const entries = fs.readdirSync(targetDir);
  const leaked = entries.filter(
    (name) =>
      (name === '.env' || (name.startsWith('.env.') && name !== '.env.example')) ||
      name === '.dev-lan-state.json' ||
      /^\.dev-lan-state.*\.json$/i.test(name),
  );
  if (leaked.length > 0) {
    throw new Error(
      `Security/state leak check failed inside ${targetDir}: unexpected file(s): ${leaked.join(', ')}`,
    );
  }
}

/**
 * Initialize an isolated feature worktree from the latest verified canonical commit
 * without copying credentials, auth tokens, or local world saves.
 */
export function initFeatureWorktree(options) {
  const sourceRepo = path.resolve(options.repoRoot ?? process.cwd());
  const prefix = String(options.prefix ?? 'feat').trim();
  const name = String(options.name ?? '').trim();
  const canonicalBranch = String(options.canonical ?? 'main').trim();
  const remote = String(options.remote ?? 'origin').trim();
  const skipFetch = Boolean(options.skipFetch ?? false);

  if (!ALLOWED_PREFIXES.has(prefix)) {
    throw new Error(
      `Unsupported branch prefix "${prefix}". Allowed: ${[...ALLOWED_PREFIXES].join(', ')}.`,
    );
  }
  if (!SLUG_REGEX.test(name)) {
    throw new Error(
      `Invalid feature slug "${name}". Use lowercase letters, numbers, "-" or "_" (2-49 chars, starting with letter/digit).`,
    );
  }

  const repoRoot = path.resolve(git(sourceRepo, ['rev-parse', '--show-toplevel']));
  const branchName = `${prefix}/${name}`;
  const folderSuffix = name.startsWith(`${prefix}-`) ? name : `${prefix}-${name}`;
  const targetDir = path.resolve(
    options.dir ?? path.join(path.dirname(repoRoot), `OLW-${folderSuffix}`),
  );
  const assetsFromDir = path.resolve(options.assetsFrom ?? repoRoot);

  // Refuse overwriting an existing branch or target worktree path.
  if (gitOk(repoRoot, ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`])) {
    throw new Error(`Refusing to overwrite existing local branch "${branchName}".`);
  }
  const existingWorktrees = listRegisteredWorktreePaths(repoRoot).map(normalizeForCompare);
  if (existingWorktrees.includes(normalizeForCompare(targetDir))) {
    throw new Error(`Refusing to overwrite registered Git worktree at "${targetDir}".`);
  }
  if (fs.existsSync(targetDir)) {
    throw new Error(`Refusing to overwrite existing directory "${targetDir}".`);
  }

  // Fetch & verify canonical branch integrity.
  const remoteRef = `refs/remotes/${remote}/${canonicalBranch}`;
  const localRef = `refs/heads/${canonicalBranch}`;
  if (!skipFetch) {
    if (!gitOk(repoRoot, ['remote', 'get-url', remote])) {
      throw new Error(`Git remote "${remote}" is not configured in "${repoRoot}".`);
    }
    git(repoRoot, ['fetch', remote, canonicalBranch]);
  }

  const hasRemoteCanonical = gitOk(repoRoot, ['show-ref', '--verify', '--quiet', remoteRef]);
  const hasLocalCanonical = gitOk(repoRoot, ['show-ref', '--verify', '--quiet', localRef]);
  if (!hasRemoteCanonical && !hasLocalCanonical) {
    throw new Error(`Canonical branch "${canonicalBranch}" was not found locally or on "${remote}".`);
  }

  let startSha;
  let verifiedRef;
  if (hasRemoteCanonical && hasLocalCanonical) {
    const remoteSha = git(repoRoot, ['rev-parse', remoteRef]);
    const localSha = git(repoRoot, ['rev-parse', localRef]);
    if (remoteSha !== localSha) {
      const localBehindRemote = gitOk(repoRoot, ['merge-base', '--is-ancestor', localSha, remoteSha]);
      if (!localBehindRemote) {
        throw new Error(
          `Canonical branch "${canonicalBranch}" (${localSha.slice(0, 7)}) is ahead of or diverged from "${remote}/${canonicalBranch}" (${remoteSha.slice(0, 7)}). Reconcile/push "${canonicalBranch}" before creating feature worktrees.`,
        );
      }
    }
    startSha = remoteSha;
    verifiedRef = `${remote}/${canonicalBranch}`;
  } else if (hasRemoteCanonical) {
    startSha = git(repoRoot, ['rev-parse', remoteRef]);
    verifiedRef = `${remote}/${canonicalBranch}`;
  } else {
    startSha = git(repoRoot, ['rev-parse', localRef]);
    verifiedRef = canonicalBranch;
  }

  // Verify source private runtime assets BEFORE mutating Git worktrees.
  const preVerify = verifyPrivateAssets(assetsFromDir, { checksumManifestPath: '__ignore__' });
  if (!preVerify.ok) {
    const details = [...preVerify.missing.map((m) => `missing: ${m}`), ...preVerify.errors].join('; ');
    throw new Error(
      `Source workspace "${assetsFromDir}" does not have valid private runtime assets: ${details}`,
    );
  }

  // Create worktree + branch at verified canonical commit.
  git(repoRoot, ['worktree', 'add', '-b', branchName, targetDir, startSha]);

  const syncResult = syncPrivateAssets({ fromDir: assetsFromDir, toDir: targetDir });
  if (!syncResult.ok) {
    const details = [...syncResult.missing, ...syncResult.errors].join('; ');
    throw new Error(`Private asset synchronization failed for "${targetDir}": ${details}`);
  }

  const verifyResult = verifyPrivateAssets(targetDir);
  if (!verifyResult.ok) {
    const details = [...verifyResult.missing, ...verifyResult.errors].join('; ');
    throw new Error(`Private asset checksum verification failed in "${targetDir}": ${details}`);
  }

  assertNoLeakedSecretsOrSaves(targetDir);

  const startSubject = git(repoRoot, ['log', '-1', '--format=%s', startSha]);

  return {
    ok: true,
    repoRoot,
    verifiedRef,
    startSha,
    startSubject,
    branchName,
    worktreePath: targetDir,
    syncedFileCount: syncResult.copied.length,
    manifestPath: syncResult.manifestPath,
  };
}

function parseCliArgs(argv) {
  const args = {
    prefix: 'feat',
    name: '',
    dir: undefined,
    canonical: 'main',
    remote: 'origin',
    assetsFrom: undefined,
    skipFetch: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--no-fetch' || a === '--skip-fetch') args.skipFetch = true;
    else if (a === '--prefix' && argv[i + 1]) args.prefix = argv[++i];
    else if (a === '--name' && argv[i + 1]) args.name = argv[++i];
    else if (a === '--dir' && argv[i + 1]) args.dir = argv[++i];
    else if (a === '--canonical' && argv[i + 1]) args.canonical = argv[++i];
    else if (a === '--remote' && argv[i + 1]) args.remote = argv[++i];
    else if (a === '--assets-from' && argv[i + 1]) args.assetsFrom = argv[++i];
  }
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help || !args.name) {
    console.log(
      [
        'Usage:',
        '  npm run worktree:new -- --name <slug> [--prefix feat|fix|chore|spike|docs] [--dir <abs-path>] [--canonical main] [--remote origin] [--assets-from <dir>] [--no-fetch]',
        '',
        'Example:',
        '  npm run worktree:new -- --name cinema-sync',
      ].join('\n'),
    );
    process.exit(args.help ? 0 : 1);
  }

  try {
    const res = initFeatureWorktree(args);
    console.log(
      [
        'Feature worktree initialized safely:',
        `  Workspace Path  : ${res.worktreePath}`,
        `  Branch Name     : ${res.branchName}`,
        `  Verified Base   : ${res.verifiedRef} @ ${res.startSha}`,
        `  Commit Subject  : ${res.startSubject}`,
        `  Private Assets  : ${res.syncedFileCount} verified (${REQUIRED_PRIVATE_UNIFIED_FILES.length} atlas/char + ${REQUIRED_PRIVATE_AUDIO_FILES.length} music)`,
        `  Checksum File   : ${res.manifestPath}`,
        '  Secret/Save Copy: blocked (.env*, tokens, .dev-lan-state*.json NOT copied)',
        '',
        'Next commands inside the new worktree:',
        `  cd "${res.worktreePath}"`,
        '  npm install',
        '  npm run assets:private:verify',
      ].join('\n'),
    );
  } catch (err) {
    console.error(
      `WORKTREE INIT FAILED: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }
}
