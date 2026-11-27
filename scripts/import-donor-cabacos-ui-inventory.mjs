/**
 * Cabacos @ 79e423d — HUD + inventory slot skins (MIT).
 * Presentation only; OLW economy authority stays on WorldBackend / farm RPC.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHA = '79e423defc12bd99327cfcc28bf7ec0085996244';
const VENDOR = path.join(ROOT, 'vendor', 'farming-simulator-cabacos-upstream');
const OUT = path.join(ROOT, 'public', 'assets', 'donor', 'cabacos-ui');

const FILES = [
  'public/assets/inventory/hotbar_selector.png',
  'public/assets/inventory/inventorySlot.png',
  'public/assets/inventory/InventoryRect.png',
  'public/assets/ui/hud/coin.png',
];

function ensureVendor() {
  if (!fs.existsSync(path.join(VENDOR, '.git'))) {
    execSync(
      `git clone --depth 1 https://github.com/goncalojbsousa/Farming-Simulator-Cabacos.git "${VENDOR}"`,
      { stdio: 'inherit' },
    );
  }
  execSync(`git -C "${VENDOR}" fetch --depth 1 origin ${SHA}`, { stdio: 'inherit' });
  execSync(`git -C "${VENDOR}" checkout ${SHA}`, { stdio: 'inherit' });
}

function copyFiles() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = { upstreamSha: SHA, files: [] };
  for (const rel of FILES) {
    const src = path.join(VENDOR, rel);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing Cabacos asset: ${rel}`);
    }
    const base = path.basename(rel);
    const dest = path.join(OUT, base);
    fs.copyFileSync(src, dest);
    manifest.files.push({ upstream: rel, publicPath: `/assets/donor/cabacos-ui/${base}` });
  }
  fs.writeFileSync(
    path.join(OUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );
  console.log(`Wrote ${manifest.files.length} Cabacos UI skins → ${OUT}`);
}

ensureVendor();
copyFiles();