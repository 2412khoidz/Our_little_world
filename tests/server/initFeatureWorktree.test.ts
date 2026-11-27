import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initFeatureWorktree } from '../../scripts/init-feature-worktree.mjs';
import { verifyPrivateAssets } from '../../scripts/sync-private-assets.mjs';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', ['-C', cwd, '-c', 'safe.directory=*', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function makePngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function makeFakeMp3(tag: string): Buffer {
  return Buffer.concat([Buffer.from('ID3'), Buffer.from(tag, 'utf8')]);
}

function seedPrivateAssets(root: string): void {
  const write = (rel: string, data: Buffer | string) => {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, data);
  };
  write('public/assets/private-unified/world.png', makePngBuffer(640, 310));
  write('public/assets/private-unified/avatars.png', makePngBuffer(384, 384));
  write('public/assets/private-unified/world-props.png', makePngBuffer(1024, 504));
  write('public/assets/private-unified/CREDITS.md', '# Credits\n');
  write('public/assets/private-unified/donor-pydew-characters/CREDITS.md', '# PyDew\n');
  write('public/assets/private-unified/donor-pydew-characters/farmer-may-atlas.png', makePngBuffer(64, 64));
  write('public/assets/private-unified/donor-pydew-characters/farmer-nang-atlas.png', makePngBuffer(64, 64));
  write('public/assets/private-unified/donor-pydew-characters/farmer-rose-atlas.png', makePngBuffer(64, 64));
  write(
    'public/assets/private-unified/manifest.json',
    JSON.stringify({
      version: 1,
      textures: {
        world: { file: 'world.png', width: 640, height: 310 },
        avatars: { file: 'avatars.png', width: 384, height: 384 },
      },
      entries: [{ id: 'grass_0', sheet: 'world', x: 0, y: 0, w: 16, h: 16 }],
      avatarGameplay: {
        files: {
          'farmer-may-atlas.png': 'donor-pydew-characters/farmer-may-atlas.png',
          'farmer-nang-atlas.png': 'donor-pydew-characters/farmer-nang-atlas.png',
          'farmer-rose-atlas.png': 'donor-pydew-characters/farmer-rose-atlas.png',
        },
      },
    }),
  );
  write(
    'public/assets/private-unified/props-manifest.json',
    JSON.stringify({
      version: 1,
      texture: { file: 'world-props.png', width: 1024, height: 504 },
      entries: [{ id: 'tree_0', x: 0, y: 0, w: 32, h: 48 }],
    }),
  );
  for (const name of ['home_garden_theme.mp3', 'farm.mp3', 'blue_forest.mp3', 'beach.mp3', 'pet_care.mp3']) {
    write(`public/assets/private-audio/music/${name}`, makeFakeMp3(name));
  }
}

function setupRepoWithBareOrigin(): { bareDir: string; localRepo: string; mainSha: string } {
  const base = makeTempDir('olw-wt-test-');
  const bareDir = path.join(base, 'origin.git');
  const localRepo = path.join(base, 'Our_little_world');
  fs.mkdirSync(bareDir, { recursive: true });
  runGit(bareDir, ['init', '--bare']);

  runGit(base, ['clone', bareDir, 'Our_little_world']);
  runGit(localRepo, ['config', 'user.email', 'test@example.com']);
  runGit(localRepo, ['config', 'user.name', 'Test User']);
  runGit(localRepo, ['checkout', '-b', 'main']);
  fs.writeFileSync(path.join(localRepo, 'README.md'), '# OLW\n', 'utf8');
  fs.writeFileSync(path.join(localRepo, '.env.example'), 'VITE_SUPABASE_URL=\n', 'utf8');
  runGit(localRepo, ['add', 'README.md', '.env.example']);
  runGit(localRepo, ['commit', '-m', 'chore: canonical baseline']);
  runGit(localRepo, ['push', '-u', 'origin', 'main']);

  fs.writeFileSync(path.join(localRepo, '.env'), 'SUPABASE_SECRET=do-not-copy\n', 'utf8');
  fs.writeFileSync(path.join(localRepo, '.dev-lan-state.json'), '{"walletCoins":999}\n', 'utf8');
  seedPrivateAssets(localRepo);

  const mainSha = runGit(localRepo, ['rev-parse', 'main']);
  return { bareDir, localRepo, mainSha };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('scripts/init-feature-worktree.mjs', () => {
  it('fetches origin/main, creates isolated feature worktree, syncs & verifies private assets, and excludes secrets/saves', () => {
    const { localRepo, mainSha } = setupRepoWithBareOrigin();
    const targetDir = path.join(path.dirname(localRepo), 'OLW-feat-cinema');

    const res = initFeatureWorktree({
      repoRoot: localRepo,
      prefix: 'feat',
      name: 'cinema-sync',
      dir: targetDir,
    });

    expect(res.ok).toBe(true);
    expect(res.startSha).toBe(mainSha);
    expect(res.branchName).toBe('feat/cinema-sync');
    expect(res.worktreePath).toBe(targetDir);
    expect(res.syncedFileCount).toBe(15);
    expect(runGit(targetDir, ['rev-parse', 'HEAD'])).toBe(mainSha);
    expect(runGit(targetDir, ['branch', '--show-current'])).toBe('feat/cinema-sync');
    expect(verifyPrivateAssets(targetDir).ok).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.env'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.dev-lan-state.json'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.env.example'))).toBe(true);
  });

  it('refuses to overwrite existing branches, existing directories, or diverged local main', () => {
    const { localRepo } = setupRepoWithBareOrigin();
    const firstDir = path.join(path.dirname(localRepo), 'OLW-fix-a');
    initFeatureWorktree({
      repoRoot: localRepo,
      prefix: 'fix',
      name: 'ui-pad',
      dir: firstDir,
    });

    expect(() =>
      initFeatureWorktree({
        repoRoot: localRepo,
        prefix: 'fix',
        name: 'ui-pad',
        dir: path.join(path.dirname(localRepo), 'OLW-fix-b'),
      }),
    ).toThrow(/existing local branch/i);

    const preExistingDir = path.join(path.dirname(localRepo), 'OLW-occupied');
    fs.mkdirSync(preExistingDir, { recursive: true });
    expect(() =>
      initFeatureWorktree({
        repoRoot: localRepo,
        prefix: 'feat',
        name: 'new-slug',
        dir: preExistingDir,
      }),
    ).toThrow(/existing directory/i);

    fs.writeFileSync(path.join(localRepo, 'LOCAL_ONLY.md'), 'unpushed\n', 'utf8');
    runGit(localRepo, ['add', 'LOCAL_ONLY.md']);
    runGit(localRepo, ['commit', '-m', 'unpushed local main commit']);
    expect(() =>
      initFeatureWorktree({
        repoRoot: localRepo,
        prefix: 'feat',
        name: 'clean-slug',
        dir: path.join(path.dirname(localRepo), 'OLW-clean-slug'),
      }),
    ).toThrow(/ahead of or diverged from/i);
  });
});
