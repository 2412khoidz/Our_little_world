import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRIVATE_CHECKSUM_MANIFEST_REL = 'public/assets/private-unified/.asset-checksums.json';

export const REQUIRED_PRIVATE_UNIFIED_FILES = [
  'public/assets/private-unified/world.png',
  'public/assets/private-unified/world-props.png',
  'public/assets/private-unified/avatars.png',
  'public/assets/private-unified/manifest.json',
  'public/assets/private-unified/props-manifest.json',
  'public/assets/private-unified/CREDITS.md',
  'public/assets/private-unified/donor-pydew-characters/CREDITS.md',
  'public/assets/private-unified/donor-pydew-characters/farmer-may-atlas.png',
  'public/assets/private-unified/donor-pydew-characters/farmer-nang-atlas.png',
  'public/assets/private-unified/donor-pydew-characters/farmer-rose-atlas.png',
];

export const REQUIRED_PRIVATE_AUDIO_FILES = [
  'public/assets/private-audio/music/home_garden_theme.mp3',
  'public/assets/private-audio/music/farm.mp3',
  'public/assets/private-audio/music/blue_forest.mp3',
  'public/assets/private-audio/music/beach.mp3',
  'public/assets/private-audio/music/pet_care.mp3',
];

export const REQUIRED_PRIVATE_RUNTIME_FILES = [
  ...REQUIRED_PRIVATE_UNIFIED_FILES,
  ...REQUIRED_PRIVATE_AUDIO_FILES,
];

export const FORBIDDEN_SYNC_REGEX = /(?:^\.env(?:\.|$)|\.dev-lan-state|credential|secret|token|\.pem$|\.key$|\.sqlite)/i;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
  };
}

export function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_MAGIC)) {
    return null;
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function isLikelyMp3(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(10);
    const bytesRead = fs.readSync(fd, head, 0, 10, 0);
    if (bytesRead < 3) return false;
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) return true; // ID3
    return head[0] === 0xff && (head[1] & 0xe0) === 0xe0; // MPEG sync
  } finally {
    fs.closeSync(fd);
  }
}

export function buildChecksumManifest(repoRoot) {
  const root = path.resolve(repoRoot);
  const files = {};
  const missing = [];
  for (const rel of REQUIRED_PRIVATE_RUNTIME_FILES) {
    if (FORBIDDEN_SYNC_REGEX.test(path.basename(rel)) || FORBIDDEN_SYNC_REGEX.test(rel)) {
      throw new Error(`Refusing forbidden path in asset manifest: ${rel}`);
    }
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      missing.push(rel);
      continue;
    }
    const { sha256, bytes } = sha256File(abs);
    files[rel] = { sha256, bytes };
  }
  return {
    manifest: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      files,
    },
    missing,
  };
}

export function verifyPrivateAssets(repoRoot, options = {}) {
  const root = path.resolve(repoRoot);
  const missing = [];
  const errors = [];
  const warnings = [];
  const checksums = {};

  for (const rel of REQUIRED_PRIVATE_RUNTIME_FILES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      missing.push(rel);
      continue;
    }
    const stat = fs.statSync(abs);
    if (stat.size <= 0) {
      errors.push(`Empty asset file: ${rel}`);
      continue;
    }
    if (rel.endsWith('.png') && !readPngDimensions(abs)) {
      errors.push(`Invalid PNG header: ${rel}`);
    }
    if (rel.endsWith('.mp3') && !isLikelyMp3(abs)) {
      errors.push(`Invalid MP3 header: ${rel}`);
    }
    checksums[rel] = sha256File(abs);
  }

  // Atlas PNG <-> JSON manifest consistency
  const manifestRel = 'public/assets/private-unified/manifest.json';
  const propsManifestRel = 'public/assets/private-unified/props-manifest.json';
  const worldPngRel = 'public/assets/private-unified/world.png';
  const avatarsPngRel = 'public/assets/private-unified/avatars.png';
  const propsPngRel = 'public/assets/private-unified/world-props.png';

  const manifestAbs = path.join(root, manifestRel);
  const propsManifestAbs = path.join(root, propsManifestRel);

  const worldDim = fs.existsSync(path.join(root, worldPngRel))
    ? readPngDimensions(path.join(root, worldPngRel))
    : null;
  const avatarsDim = fs.existsSync(path.join(root, avatarsPngRel))
    ? readPngDimensions(path.join(root, avatarsPngRel))
    : null;
  const propsDim = fs.existsSync(path.join(root, propsPngRel))
    ? readPngDimensions(path.join(root, propsPngRel))
    : null;

  if (fs.existsSync(manifestAbs)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestAbs, 'utf8'));
      const mWorld = m?.textures?.world;
      const mAvatars = m?.textures?.avatars;
      if (!mWorld || !mAvatars) {
        errors.push(`${manifestRel}: missing textures.world or textures.avatars`);
      } else {
        if (worldDim && (mWorld.width !== worldDim.width || mWorld.height !== worldDim.height)) {
          errors.push(
            `${manifestRel}: world.png dims mismatch (manifest ${mWorld.width}x${mWorld.height} != PNG ${worldDim.width}x${worldDim.height})`,
          );
        }
        if (avatarsDim && (mAvatars.width !== avatarsDim.width || mAvatars.height !== avatarsDim.height)) {
          errors.push(
            `${manifestRel}: avatars.png dims mismatch (manifest ${mAvatars.width}x${mAvatars.height} != PNG ${avatarsDim.width}x${avatarsDim.height})`,
          );
        }
      }
      if (!Array.isArray(m?.entries) || m.entries.length === 0) {
        errors.push(`${manifestRel}: entries must be a non-empty array`);
      } else {
        for (const entry of m.entries) {
          const targetDim = entry.sheet === 'avatars' ? avatarsDim : worldDim;
          if (!targetDim) continue;
          if (
            entry.x < 0 ||
            entry.y < 0 ||
            entry.x + entry.w > targetDim.width ||
            entry.y + entry.h > targetDim.height
          ) {
            errors.push(
              `${manifestRel}: entry "${entry.id ?? '?'}" (${entry.x},${entry.y},${entry.w}x${entry.h}) exceeds ${entry.sheet ?? 'world'} (${targetDim.width}x${targetDim.height})`,
            );
          }
        }
      }
      const gameplayFiles = m?.avatarGameplay?.files;
      if (gameplayFiles && typeof gameplayFiles === 'object') {
        for (const [k, relSub] of Object.entries(gameplayFiles)) {
          if (typeof relSub !== 'string') continue;
          const expected = `public/assets/private-unified/${relSub.replace(/^\/+/, '')}`;
          if (!fs.existsSync(path.join(root, expected))) {
            missing.push(expected);
            errors.push(`${manifestRel}: missing avatarGameplay.files["${k}"] -> ${expected}`);
          }
        }
      }
    } catch (err) {
      errors.push(`${manifestRel}: invalid JSON (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  if (fs.existsSync(propsManifestAbs)) {
    try {
      const pm = JSON.parse(fs.readFileSync(propsManifestAbs, 'utf8'));
      const tex = pm?.texture;
      if (!tex) {
        errors.push(`${propsManifestRel}: missing texture metadata`);
      } else if (propsDim && (tex.width !== propsDim.width || tex.height !== propsDim.height)) {
        errors.push(
          `${propsManifestRel}: world-props.png dims mismatch (manifest ${tex.width}x${tex.height} != PNG ${propsDim.width}x${propsDim.height})`,
        );
      }
      if (!Array.isArray(pm?.entries) || pm.entries.length === 0) {
        errors.push(`${propsManifestRel}: entries must be a non-empty array`);
      } else if (propsDim) {
        for (const entry of pm.entries) {
          const w = entry.w ?? (entry.frameWidth ?? 0) * (entry.frameCount ?? 1);
          const h = entry.h ?? entry.frameHeight ?? 0;
          if (entry.x < 0 || entry.y < 0 || entry.x + w > propsDim.width || entry.y + h > propsDim.height) {
            errors.push(
              `${propsManifestRel}: entry "${entry.id ?? '?'}" (${entry.x},${entry.y},${w}x${h}) exceeds world-props.png (${propsDim.width}x${propsDim.height})`,
            );
          }
        }
      }
    } catch (err) {
      errors.push(`${propsManifestRel}: invalid JSON (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  const checksumPath = options.checksumManifestPath
    ? path.resolve(options.checksumManifestPath)
    : path.join(root, PRIVATE_CHECKSUM_MANIFEST_REL);
  if (fs.existsSync(checksumPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(checksumPath, 'utf8'));
      const expectedFiles = saved?.files ?? {};
      for (const [rel, meta] of Object.entries(expectedFiles)) {
        const actual = checksums[rel];
        if (!actual) continue;
        if (actual.sha256 !== meta.sha256 || actual.bytes !== meta.bytes) {
          errors.push(
            `Checksum mismatch for ${rel}: expected ${meta.sha256.slice(0, 12)} (${meta.bytes}B), got ${actual.sha256.slice(0, 12)} (${actual.bytes}B)`,
          );
        }
      }
    } catch (err) {
      errors.push(`Invalid checksum manifest ${checksumPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    warnings.push(`Local checksum manifest not yet generated (${PRIVATE_CHECKSUM_MANIFEST_REL}). Run npm run assets:private:manifest.`);
  }

  return {
    ok: missing.length === 0 && errors.length === 0,
    missing,
    errors,
    warnings,
    checksums,
  };
}

export function writePrivateChecksumManifest(repoRoot) {
  const root = path.resolve(repoRoot);
  const verification = verifyPrivateAssets(root, { checksumManifestPath: '__ignore__' });
  if (!verification.ok) {
    return { ok: false, ...verification, manifestPath: null };
  }
  const { manifest, missing } = buildChecksumManifest(root);
  if (missing.length > 0) {
    return { ok: false, missing, errors: ['Missing files'], warnings: [], checksums: {}, manifestPath: null };
  }
  const outPath = path.join(root, PRIVATE_CHECKSUM_MANIFEST_REL);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {
    ok: true,
    missing: [],
    errors: [],
    warnings: [],
    checksums: verification.checksums,
    manifestPath: outPath,
  };
}

export function syncPrivateAssets({ fromDir, toDir }) {
  const srcRoot = path.resolve(fromDir);
  const dstRoot = path.resolve(toDir);
  if (srcRoot === dstRoot) {
    return {
      ok: false,
      copied: [],
      missing: [],
      errors: ['Source and destination directories must be different.'],
    };
  }
  if (!fs.existsSync(srcRoot) || !fs.statSync(srcRoot).isDirectory()) {
    return {
      ok: false,
      copied: [],
      missing: [...REQUIRED_PRIVATE_RUNTIME_FILES],
      errors: [`Source directory does not exist: ${srcRoot}`],
    };
  }

  const sourceVerification = verifyPrivateAssets(srcRoot, { checksumManifestPath: '__ignore__' });
  if (!sourceVerification.ok) {
    return {
      ok: false,
      copied: [],
      missing: sourceVerification.missing,
      errors: sourceVerification.errors,
    };
  }

  const copied = [];
  for (const rel of REQUIRED_PRIVATE_RUNTIME_FILES) {
    if (FORBIDDEN_SYNC_REGEX.test(rel)) {
      return {
        ok: false,
        copied,
        missing: [],
        errors: [`Blocked forbidden path during sync: ${rel}`],
      };
    }
    const srcAbs = path.join(srcRoot, rel);
    const dstAbs = path.join(dstRoot, rel);
    fs.mkdirSync(path.dirname(dstAbs), { recursive: true });
    fs.copyFileSync(srcAbs, dstAbs);
    copied.push(rel);
  }

  // Remove stale legacy donor-cc0-puny-8d directory under private-unified if Neon donor-pydew-characters is active
  const legacyDir = path.join(dstRoot, 'public/assets/private-unified/donor-cc0-puny-8d');
  if (fs.existsSync(legacyDir)) {
    fs.rmSync(legacyDir, { recursive: true, force: true });
  }

  const written = writePrivateChecksumManifest(dstRoot);
  if (!written.ok) {
    return {
      ok: false,
      copied,
      missing: written.missing,
      errors: written.errors,
    };
  }

  // Verify destination hashes match source hashes byte-for-byte
  const hashMismatches = [];
  for (const rel of REQUIRED_PRIVATE_RUNTIME_FILES) {
    const srcHash = sourceVerification.checksums[rel]?.sha256;
    const dstHash = written.checksums[rel]?.sha256;
    if (!srcHash || srcHash !== dstHash) {
      hashMismatches.push(`Copy verification failed for ${rel}`);
    }
  }
  if (hashMismatches.length > 0) {
    return { ok: false, copied, missing: [], errors: hashMismatches };
  }

  return {
    ok: true,
    copied,
    missing: [],
    errors: [],
    manifestPath: written.manifestPath,
  };
}

function parseCliArgs(argv) {
  const args = { mode: 'verify', from: '', to: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--verify') args.mode = 'verify';
    else if (a === '--write-manifest') args.mode = 'write-manifest';
    else if (a === '--sync') args.mode = 'sync';
    else if (a === '--from' && argv[i + 1]) {
      args.mode = 'sync';
      args.from = argv[++i];
    } else if (a === '--to' && argv[i + 1]) {
      args.to = argv[++i];
    }
  }
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.mode === 'sync') {
    if (!args.from) {
      console.error(
        'Missing --from <source-worktree>. Example:\n  npm run assets:private:sync -- --from ../OLW-Neon',
      );
      process.exit(1);
    }
    const res = syncPrivateAssets({ fromDir: args.from, toDir: args.to });
    if (!res.ok) {
      console.error('PRIVATE ASSET SYNC FAILED:');
      for (const m of res.missing) console.error(`  [MISSING] ${m}`);
      for (const e of res.errors) console.error(`  [ERROR]   ${e}`);
      process.exit(1);
    }
    console.log(
      `Private asset sync PASSED (${res.copied.length} files copied & SHA-256 verified). Checksum manifest: ${res.manifestPath}`,
    );
    process.exit(0);
  }

  if (args.mode === 'write-manifest') {
    const res = writePrivateChecksumManifest(args.to);
    if (!res.ok) {
      console.error('PRIVATE ASSET MANIFEST GENERATION FAILED:');
      for (const m of res.missing) console.error(`  [MISSING] ${m}`);
      for (const e of res.errors) console.error(`  [ERROR]   ${e}`);
      process.exit(1);
    }
    console.log(
      `Private checksum manifest written (${Object.keys(res.checksums).length} files): ${res.manifestPath}`,
    );
    process.exit(0);
  }

  const res = verifyPrivateAssets(args.to);
  for (const w of res.warnings) console.warn(`  [WARN] ${w}`);
  if (!res.ok) {
    console.error('PRIVATE ASSET VERIFICATION FAILED:');
    for (const m of res.missing) console.error(`  [MISSING] ${m}`);
    for (const e of res.errors) console.error(`  [ERROR]   ${e}`);
    console.error(
      '\nTo synchronize private runtime assets from an approved local worktree (without copying .env or saved worlds), run:\n  npm run assets:private:sync -- --from ../OLW-Neon',
    );
    process.exit(1);
  }
  console.log(
    `Private asset verification PASSED: ${REQUIRED_PRIVATE_UNIFIED_FILES.length} atlas/character files + ${REQUIRED_PRIVATE_AUDIO_FILES.length} custom music tracks verified.`,
  );
}
