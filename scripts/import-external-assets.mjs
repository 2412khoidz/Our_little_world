import fs from 'node:fs';
import path from 'node:path';

/**
 * Helper CLI giúp chủ dự án nhập bộ asset hợp lệ tải về từ Itch.io (Cozy Farm, Sprout Lands, v.v.)
 * vào thư mục `public/assets/local-licensed/<pack-name>/` (đã được .gitignore để không vi phạm bản quyền phân phối).
 *
 * Ví dụ:
 *   npm run assets:import -- --source "<thư mục local>/cozy-farm" --name cozy-farm --author "shubibubi" --license "Itch.io Paid/Free"
 */

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) {
      args[key.slice(2)] = argv[i + 1] ?? '';
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.source || !args.name) {
  console.log('Cách dùng:');
  console.log('  npm run assets:import -- --source "<thư mục giải nén>" --name "<tên-pack>" --author "<tác-giả>" --license "<giấy-phép>"');
  process.exit(0);
}

const sourceDir = path.resolve(args.source);
if (!fs.existsSync(sourceDir)) {
  console.error(`Không tìm thấy thư mục nguồn: ${sourceDir}`);
  process.exit(1);
}

const safeName = args.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
const targetDir = path.join(process.cwd(), 'public', 'assets', 'local-licensed', safeName);
fs.mkdirSync(targetDir, { recursive: true });

let copiedCount = 0;
function copyRecursive(src, dst) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true });
      copyRecursive(srcPath, dstPath);
    } else if (/\.(png|json|tmj|tsj|txt|md)$/i.test(entry.name)) {
      fs.copyFileSync(srcPath, dstPath);
      copiedCount += 1;
    }
  }
}

copyRecursive(sourceDir, targetDir);

const notice = {
  packName: safeName,
  author: args.author || 'Unknown (verify pack README)',
  license: args.license || 'Verify before shipping',
  importedAt: new Date().toISOString(),
  fileCount: copiedCount,
  gitIgnored: true,
};
fs.writeFileSync(path.join(targetDir, 'ATTRIBUTION.json'), JSON.stringify(notice, null, 2));

console.log(`Đã nhập ${copiedCount} file vào ${targetDir} (thư mục này đã bị .gitignore).`);
