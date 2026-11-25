# Missing Assets Manifest — Cursor Cloud

Tài nguyên **cần từ máy chủ dự án** (local Windows path `C:\Users\admin\Downloads\Our_little_world` theo Neon checkpoint) để đạt parity với baseline Neon local: atlas Demo E, `build:private`, và dev preview chất lượng cao.

**Không** commit các mục dưới đây vào git (đã `.gitignore`). Cách cung cấp an toàn: **rsync/scp nén `.tar.gz` riêng**, tải qua kênh riêng tư, giải nén vào đúng đường dẫn repo; **không** dán zip vào chat hoặc PR.

## 1. Thư mục tổng

| Đường dẫn (tương đối repo) | Trên máy chủ? | Cloud 2026-11-25 | Mục đích |
|---|---|---|---|
| `asset-candidates/` | Có (local) | **Thiếu** | Nguồn extract Demo E; Phaser dev serve `/asset-candidates/` qua `devLanServerPlugin` |
| `public/assets/private-unified/` | Có sau `assets:atlas:private` | **Thiếu** | `world.png`, `world-props.png`, `avatars.png`, manifest, baked maps textures |

## 2. Atlas outputs cần tái tạo (sau khi có nguồn)

Tạo bằng:

```bash
npm run assets:atlas:private   # cần Python 3 + Pillow
npm run build:private
```

| File output | Ước lượng | Mục đích |
|---|---|---|
| `public/assets/private-unified/world.png` | ~100 KiB–2 MiB (local) | `WORLD_ART_KEY` — nền, tile lớn |
| `public/assets/private-unified/world-props.png` | ~50 KiB–1 MiB | `WORLD_PROPS_KEY` — props/anim frames |
| `public/assets/private-unified/avatars.png` | ~10–50 KiB | Avatar Modern Interiors rig |
| `public/assets/private-unified/manifest.json` | JSON | Semantic frame registry |
| `public/assets/private-unified/props-manifest.json` | JSON | Prop frames; **chưa** có 16× `path_dirt_*` |
| `public/assets/private-unified/CREDITS.md` | text | Third-party attribution |
| Bản bake `map.garden` / `map.home` trong pipeline private | PNG trong atlas | Homestead full-quality (xem `build-private-atlas.py`) |

*Cloud hiện chỉ có unified public ~84 KiB tổng — đủ chạy game/E2E nhưng **không** đủ Demo E.*

## 3. Nguồn extract bắt buộc (`asset-candidates/extracted/`)

Lỗi Cloud khi chạy private atlas (file đầu tiên thiếu):

```text
Thiếu nguồn Demo E local: modern-interiors-free/Interiors_free/16x16/Room_Builder_free_16x16.png
```

Danh sách đường dẫn được `scripts/atlas-sources/demo-e-textures.json` tham chiếu (tất cả under `asset-candidates/extracted/`):

| Key atlas | Đường dẫn extract |
|---|---|
| e-room | `modern-interiors-free/Interiors_free/16x16/Room_Builder_free_16x16.png` |
| e-interiors | `modern-interiors-free/Interiors_free/16x16/Interiors_free_16x16.png` |
| e-grass, e-dirt-wide, e-water, … | `sprout-lands-basic/Tilesets/...` |
| e-cherry, e-trees-v2, e-small-house, … | `sprout-lands-sorry/Early Access/...` |
| e-sun-* | `sunnyside-world/Tileset/...`, `Elements/...` |
| e-cat | `free-pets-pack/cat-orange/cat-orange_16px_top-down_outline_lit.png` |

### Pack zip gốc (script `prepare-asset-candidates.py`)

Chủ dự án thường giữ trong `asset-candidates/zips/` rồi extract:

| Archive (ví dụ) | ID extract |
|---|---|
| Sprout Lands Basic/Sorry/UI | `sprout-lands-basic`, `sprout-lands-sorry`, … |
| Modern_Interiors_Free_v2.2.zip | `modern-interiors-free` |
| Cozy_Lands_Basic_v1.25.zip | `cozy-lands-basic` |
| Sunnyside_World_ASSET_PACK_V2.1.zip | `sunnyside-world` (bỏ `Gamemaker/` duplicate) |
| free_pets_pack_frakassets.zip | `free-pets-pack` |
| Cozy Farm/Interior/People (shubibubi) | `cozy-*` (demo A) |

**Không** đưa pack trả phí hoặc chưa xác nhận license vào repo.

## 4. Maps JSON (đã có trên Git)

| File | Trạng thái Cloud |
|---|---|
| `public/assets/maps/garden.json` | ✓ committed (~9.8 KiB) |
| `public/assets/maps/home.json` | ✓ committed (~7.6 KiB) |

Chú thích: collision/placement V0.1 dùng các file này; **chất lượng pixel** phụ thuộc atlas (`unified` vs `private-unified`), không phải JSON.

## 5. Artifact tùy chọn (không chặn build)

| Đường dẫn | Mục đích |
|---|---|
| `asset-candidates/INVENTORY.json` | Inventory script |
| `asset-candidates/contact-sheets/*.png` | Art review |
| `test-results/art-pass/` | Before/after QA (gitignored; Neon đã có locally) |
| `public/assets/local-licensed/` | Paid/licensed assets gitignored |

## 6. Cách cung cấp cho Cloud Agent lần sau

1. Tạo tarball: `tar -czf olw-asset-candidates.tar.gz -C /path/to/repo asset-candidates`
2. (Tuỳ chọn) thêm `public/assets/private-unified` nếu đã build sẵn để tiết kiệm CPU.
3. Upload qua kênh riêng (không GitHub public). Trên VM: giải nén đúng root repo.
4. Chạy xác minh: `npm run assets:atlas:private && npm run build:private && node scripts/verify-prod-guard.mjs`

**Không** yêu cầu `WORLD_ART_KEY` / `WORLD_PROPS_KEY` dạng secret — đây là symbol runtime Phaser, không phải biến môi trường.