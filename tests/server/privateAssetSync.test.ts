import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  PRIVATE_CHECKSUM_MANIFEST_REL,
  REQUIRED_PRIVATE_RUNTIME_FILES,
  syncPrivateAssets,
  verifyPrivateAssets,
} from '../../scripts/sync-private-assets.mjs';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
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

function seedMockSourceRepo(root: string): void {
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

  for (const rel of REQUIRED_PRIVATE_RUNTIME_FILES.filter((f) => f.endsWith('.mp3'))) {
    write(rel, Buffer.from('ID3mock-mp3-data'));
  }

  // Sensitive / saved state files that MUST NEVER be copied
  write('.env', 'SUPABASE_SECRET=do-not-copy\n');
  write('.dev-lan-state.json', '{"world":"saved-world"}\n');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('sync-private-assets parity & exclusion guards', () => {
  it('syncs allowlisted private atlases & 5 audio tracks, verifies checksums, and never copies .env or saved worlds', () => {
    const src = makeTempDir('olw-src-');
    const dst = makeTempDir('olw-dst-');
    seedMockSourceRepo(src);
    fs.writeFileSync(path.join(dst, '.dev-lan-state.json'), '{"world":"dst-preserved"}\n');

    const syncRes = syncPrivateAssets({ fromDir: src, toDir: dst });
    expect(syncRes.ok).toBe(true);
    expect(syncRes.copied).toHaveLength(REQUIRED_PRIVATE_RUNTIME_FILES.length);
    expect(fs.existsSync(path.join(dst, PRIVATE_CHECKSUM_MANIFEST_REL))).toBe(true);

    // Credentials and saved worlds must never be copied or overwritten
    expect(fs.existsSync(path.join(dst, '.env'))).toBe(false);
    expect(fs.readFileSync(path.join(dst, '.dev-lan-state.json'), 'utf8')).toContain('dst-preserved');

    const verifyRes = verifyPrivateAssets(dst);
    expect(verifyRes.ok).toBe(true);
    expect(verifyRes.missing).toEqual([]);
    expect(verifyRes.errors).toEqual([]);
  });

  it('reports missing files and PNG-vs-manifest dimension mismatches clearly', () => {
    const root = makeTempDir('olw-bad-');
    seedMockSourceRepo(root);
    fs.unlinkSync(path.join(root, 'public/assets/private-audio/music/beach.mp3'));
    fs.writeFileSync(path.join(root, 'public/assets/private-unified/avatars.png'), makePngBuffer(384, 288));

    const res = verifyPrivateAssets(root);
    expect(res.ok).toBe(false);
    expect(res.missing).toContain('public/assets/private-audio/music/beach.mp3');
    expect(res.errors.some((e) => e.includes('avatars.png dims mismatch'))).toBe(true);
  });
});
