import { spawnSync } from 'node:child_process';

/**
 * Resolve a Python executable for atlas/GIF tooling (Windows + Linux).
 * Set OLW_PYTHON to override (e.g. py -3 on Windows).
 */
export function resolvePythonCommand() {
  const candidates = [];
  if (process.env.OLW_PYTHON) {
    candidates.push(process.env.OLW_PYTHON);
  }
  if (process.platform === 'win32') {
    candidates.push('python', 'py');
  } else {
    candidates.push('python3', 'python');
  }
  for (const cmd of candidates) {
    const probe = spawnSync(cmd, ['--version'], { encoding: 'utf8', stdio: 'pipe' });
    if (probe.status === 0) return cmd;
  }
  throw new Error(
    'Không tìm thấy Python 3. Đặt biến OLW_PYTHON hoặc cài Python 3 và Pillow (pip install Pillow).',
  );
}

/** Args prefix: -X utf8 on Unix for UTF-8 mode (Python 3.7+). */
export function pythonArgv(scriptPath, trailingArgs = []) {
  const cmd = resolvePythonCommand();
  const args =
    process.platform === 'win32'
      ? [scriptPath, ...trailingArgs]
      : ['-X', 'utf8', scriptPath, ...trailingArgs];
  return { cmd, args };
}