import { spawnSync } from 'node:child_process';

const PYTHON_TOOL_ENV = { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };

/**
 * OLW_PYTHON: path or name of the Python **executable** only (e.g. python3, C:\Python312\python.exe).
 * Optional: OLW_PYTHON_ARGS — space-separated argv inserted before script (e.g. -3 for `py -3` → OLW_PYTHON=py OLW_PYTHON_ARGS=-3).
 * Do not put launcher flags in OLW_PYTHON unless the whole value is a single executable path.
 */
function parsePythonOverride() {
  const exe = process.env.OLW_PYTHON?.trim();
  const extra = process.env.OLW_PYTHON_ARGS?.trim();
  const prefixArgs = extra ? extra.split(/\s+/).filter(Boolean) : [];
  return { exe: exe || null, prefixArgs };
}

function runPython(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', env: PYTHON_TOOL_ENV });
}

function versionText(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function isPython3(result) {
  return /Python 3\.\d+/i.test(versionText(result));
}

/**
 * @returns {{ cmd: string, prefixArgs: string[] }}
 */
export function resolvePythonCommand() {
  const { exe, prefixArgs } = parsePythonOverride();
  const candidates = [];
  if (exe) candidates.push({ cmd: exe, prefixArgs });
  if (process.platform === 'win32') {
    candidates.push({ cmd: 'python', prefixArgs: [] });
    candidates.push({ cmd: 'py', prefixArgs: ['-3'] });
  } else {
    candidates.push({ cmd: 'python3', prefixArgs: [] });
    candidates.push({ cmd: 'python', prefixArgs: [] });
  }
  for (const { cmd, prefixArgs: pre } of candidates) {
    const probe = runPython(cmd, [...pre, '--version']);
    if (probe.status === 0 && isPython3(probe)) {
      return { cmd, prefixArgs: pre };
    }
  }
  throw new Error(
    'Không tìm thấy Python 3. Đặt OLW_PYTHON (executable) và/hoặc OLW_PYTHON_ARGS (-3 cho py), cài Python 3 và Pillow (pip install Pillow).',
  );
}

/** -X utf8 on all platforms; PYTHONUTF8=1 in env for Windows console I/O. */
export function pythonArgv(scriptPath, trailingArgs = []) {
  const { cmd, prefixArgs } = resolvePythonCommand();
  return { cmd, args: [...prefixArgs, '-X', 'utf8', scriptPath, ...trailingArgs] };
}

/** Verify Pillow is importable (GIF + private atlas). */
export function assertPillowAvailable() {
  const { cmd, prefixArgs } = resolvePythonCommand();
  const check = runPython(cmd, [...prefixArgs, '-X', 'utf8', '-c', 'import PIL; from PIL import Image']);
  if (check.status !== 0) {
    throw new Error(
      'Thiếu Pillow. Chạy: pip install Pillow (cùng interpreter với OLW_PYTHON). ' +
        (check.stderr || check.stdout || '').trim(),
    );
  }
}