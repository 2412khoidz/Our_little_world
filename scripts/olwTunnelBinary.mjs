import dns from 'node:dns';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const CLOUDFLARED_RELEASES_BASE = 'https://github.com/cloudflare/cloudflared/releases/latest/download';

export function resolveCloudflaredAsset(
  platform = process.platform,
  arch = process.arch,
) {
  if (platform === 'win32') {
    const assetName = arch === 'ia32' ? 'cloudflared-windows-386.exe' : 'cloudflared-windows-amd64.exe';
    return {
      filename: 'cloudflared.exe',
      assetName,
      downloadUrl: `${CLOUDFLARED_RELEASES_BASE}/${assetName}`,
    };
  }
  if (platform === 'darwin') {
    const assetName = arch === 'arm64' ? 'cloudflared-darwin-arm64.tgz' : 'cloudflared-darwin-amd64.tgz';
    return {
      filename: 'cloudflared',
      assetName,
      downloadUrl: `${CLOUDFLARED_RELEASES_BASE}/${assetName}`,
    };
  }
  if (platform === 'linux') {
    const map = {
      x64: 'cloudflared-linux-amd64',
      arm64: 'cloudflared-linux-arm64',
      arm: 'cloudflared-linux-arm',
    };
    const assetName = map[arch];
    if (!assetName) return null;
    return {
      filename: 'cloudflared',
      assetName,
      downloadUrl: `${CLOUDFLARED_RELEASES_BASE}/${assetName}`,
    };
  }
  return null;
}

export function getDefaultBinDir() {
  if (process.env.OLW_BIN_DIR?.trim()) {
    return path.resolve(process.env.OLW_BIN_DIR.trim());
  }
  return path.resolve(process.cwd(), '.olw-bin');
}

function getFallbackBinDir() {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(localAppData, 'olw-bin');
  }
  return path.join(os.homedir(), '.local', 'share', 'olw-bin');
}

export async function findInstalledCloudflared(binDir = getDefaultBinDir()) {
  const asset = resolveCloudflaredAsset();
  const exeName = asset?.filename ?? (process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');

  const candidates = [];
  if (process.env.OLW_CLOUDFLARED_PATH?.trim()) {
    candidates.push(path.resolve(process.env.OLW_CLOUDFLARED_PATH.trim()));
  }
  candidates.push(path.join(binDir, exeName));
  candidates.push(path.join(getFallbackBinDir(), exeName));

  if (process.platform === 'win32') {
    const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    candidates.push(path.join(pf, 'cloudflared', 'cloudflared.exe'));
    candidates.push(path.join(pf86, 'cloudflared', 'cloudflared.exe'));
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    candidates.push(path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe'));
  } else {
    candidates.push('/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared', '/usr/bin/cloudflared');
  }

  for (const cand of candidates) {
    try {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        return cand;
      }
    } catch {
      /* continue */
    }
  }

  try {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which';
    const { stdout } = await execFileAsync(locator, ['cloudflared'], { timeout: 3000 });
    const first = String(stdout)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    if (first && fs.existsSync(first)) return first;
  } catch {
    /* not on PATH */
  }

  return null;
}

export async function ensureCloudflaredBinary(options = {}) {
  const binDir = options.binDir ?? getDefaultBinDir();
  const existing = await findInstalledCloudflared(binDir);
  if (existing) return existing;

  const asset = resolveCloudflaredAsset();
  if (!asset) {
    throw new Error(`Chưa hỗ trợ tự tải cloudflared trên ${process.platform}/${process.arch}.`);
  }
  if (asset.assetName.endsWith('.tgz')) {
    throw new Error('Trên macOS vui lòng cài cloudflared bằng `brew install cloudflared`.');
  }

  let targetDir = binDir;
  try {
    fs.mkdirSync(targetDir, { recursive: true });
  } catch {
    targetDir = getFallbackBinDir();
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const finalPath = path.join(targetDir, asset.filename);
  const tmpPath = `${finalPath}.tmp-${process.pid}-${Date.now()}`;
  options.onStatus?.('Đang tải Cloudflare Tunnel client lần đầu...');

  const response = await fetch(asset.downloadUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Không tải được cloudflared (HTTP ${response.status}).`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tmpPath, buf);
  if (process.platform !== 'win32') {
    fs.chmodSync(tmpPath, 0o755);
  }
  fs.renameSync(tmpPath, finalPath);
  return finalPath;
}

export async function waitForTunnelReadiness(publicOrigin, probePath, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const deadline = Date.now() + timeoutMs;
  const url = new URL(probePath, publicOrigin);

  while (Date.now() < deadline) {
    try {
      await dns.promises.lookup(url.hostname);
      const res = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(3_000),
      });
      if (res.ok) {
        return true;
      }
    } catch {
      /* tunnel DNS / edge propagating */
    }
    await new Promise((r) => setTimeout(r, 450));
  }
  return false;
}
