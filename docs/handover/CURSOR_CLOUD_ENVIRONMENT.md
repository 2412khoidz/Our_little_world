# Cursor Cloud — Môi trường phát triển Our Little World

- **Nhánh làm việc handover:** `cursor/cloud-handover-36fd`
- **Base:** `integration/night-merge` @ `4743ab9`
- **Ngày kiểm chứng:** 2026-11-25 (UTC)

## 1. Stack đã xác minh trên Cloud Agent

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | v22.23.4 | Khớp yêu cầu `economy:sim` (≥ 22.18) |
| npm | 10.9.9 | `npm ci` theo `package-lock.json` |
| Python | 3.12.3 | Cần cho `npm run assets:atlas:private` |
| Pillow | 13.0.0 | `pip3 install Pillow` (không có trong `package.json`) |
| Playwright Chromium | headless shell 1255 | `npx playwright install chromium` sau `npm ci` |

## 2. Khôi phục môi trường (thứ tự khuyến nghị)

```bash
cd /workspace   # hoặc clone 2412khoidz/Our_little_world
git checkout integration/night-merge
npm ci
pip3 install Pillow
npx playwright install chromium
```

### Dev LAN (không cần Supabase / `.env`)

```bash
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

- Mở `http://127.0.0.1:4173/` — backend tự rơi **Dev LAN Multiplayer Relay** khi không có `VITE_SUPABASE_*`.
- E2E/Playwright dùng port riêng: `PLAYWRIGHT_PORT=4176 npx playwright test` (file state `.dev-lan-state-pw-4176.json`).

### Sandbox dev-only (chỉ khi `npm run dev`, không có trong `dist/`)

| URL | Mục đích |
|---|---|
| `/?experience-demo=1` | Combined Experience — mở rộng thế giới, tương tác vật lý, vào/ra nhà |
| `/?pet-art=1` | So sánh 3 giống mèo + animation |
| `/?pet-lab=1` | Pet intelligence lab (18 kịch bản) |
| `/?world-sandbox=1` | Bản đồ 64×64 / 96×96 |
| `/?ui-sandbox=1` | UI Variant A/B |
| `/minigames.html` | Caro, Othello, Memory, Battleship (entry riêng, dev build) |

## 3. Asset & atlas trên Cloud

### Có sẵn trong Git (đủ chạy game chính + E2E public atlas)

- `public/assets/unified/` — world.png (~13 KiB), world-props.png (~9.5 KiB), avatars.png, manifest, props-manifest (**CC0 procedural + CC BY 4.0 Frakassets pet frames** — xem `CREDITS.md`).
- `public/assets/maps/garden.json`, `home.json` — Tiled maps V0.1.
- `public/assets/starter/` — fallback procedural.

### **Không** có trên Cloud (gitignore — cần máy chủ dự án)

- `asset-candidates/` — toàn bộ pack Demo E đã extract (Sprout Lands, Modern Interiors, Sunnyside, …).
- `public/assets/private-unified/` — atlas Demo E đầy đủ cho `build:private` và dev `VITE_OLW_PRIVATE_ART`.

### Script asset

| Lệnh | Cloud (2026-11-25) | Ghi chú |
|---|---|---|
| `npm run assets:generate` | **Pass** | Starter CC0 |
| `npm run assets:atlas` | Chạy được nếu thiếu pack (fallback starter) | Atlas public nhỏ |
| `npm run assets:atlas:private` | **Fail** — thiếu `asset-candidates/extracted/...` | Cần nguồn local; xem [MISSING_ASSETS_MANIFEST.md](./MISSING_ASSETS_MANIFEST.md) |
| `npm run build:private` | **Fail** cùng lý do | Vite: `Thiếu atlas riêng. Chạy npm run assets:atlas:private trước.` |
| `node scripts/verify-prod-guard.mjs` | Sau **`npm run build` only** | Quét **`dist/`** — không được có `private-unified` |
| `npm run verify:private` | Sau **`npm run build:private` only** | Quét **`dist-private/`** — phải có atlas private |
| `npm run assets:check-demo-e` | Exit 1 trên cloud | 40 file bắt buộc — xem manifest |

### Biến môi trường tùy chọn

- `OLW_PYTHON=python3` — nếu máy không có lệnh `python` (script đã ưu tiên `python3` trên Unix).
- `OLW_DEV_LAN_STATE_FILE` — tách state Dev LAN khi chạy nhiều cổng song song.
- `PLAYWRIGHT_PORT` / `PLAYWRIGHT_BASE_URL` — cấu hình E2E.

## 4. Thay đổi repo trong handover (không đụng gameplay)

- `scripts/resolve-python.mjs` + E2E GIF: `python3` / `OLW_PYTHON`, `execFileSync` (Windows + Linux).
- `scripts/verify-private-build.mjs`: guard tách biệt cho `dist-private/` (không làm yếu `verify-prod-guard.mjs`).
- `scripts/check-demo-e-sources.mjs` + `pack-demo-e-minimal.mjs`: đóng gói tối thiểu 40 file Demo E.

## 5. Không làm trên Cloud (theo mission)

- Không deploy Internet, không migration Supabase Cloud, không commit `asset-candidates/` hay `private-unified/`.
- Không thay thế atlas Demo E bằng placeholder rồi báo hoàn thành `build:private`.