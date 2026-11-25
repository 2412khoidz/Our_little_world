# Missing Assets Manifest — Cursor Cloud

Tài nguyên cần từ **máy chủ dự án** để tái tạo `npm run assets:atlas:private` và `npm run build:private`.  
**Không** commit tarball hoặc `asset-candidates/` vào git. Private repo GitHub **không** đồng nghĩa quyền phân phối pack itch.io — tuân `docs/art/ART_DIRECTION.md` và PD-01.

## Kiểm tra & đóng gói tối thiểu (thay vì upload cả `asset-candidates/`)

```bash
# Trên máy có extracted packs
npm run assets:check-demo-e -- --root asset-candidates/extracted
npm run assets:pack-demo-e-minimal -- --source asset-candidates/extracted --output ./demo-e-minimal-sources.tar.gz
```

Cloud/CI (không có nguồn): `npm run assets:check-demo-e` → exit **1** với danh sách file thiếu.

Sau khi giải nén tarball vào repo root (`asset-candidates/extracted/...`):

```bash
npm run assets:atlas:private
npm run build:private
node scripts/verify-private-build.mjs    # dist-private/ — KHÁC verify-prod-guard (dist/ public)
```

### Attribution atlas public (đang commit)

Profile **`public/assets/unified/`** là **hỗn hợp**:

- **CC0 1.0** — procedural Our Little World (sàn, nội thất stylized, rig avatar).
- **CC BY 4.0** — Frakassets Free Pets Pack (`cat-orange`, preview shiba); xem `public/assets/unified/CREDITS.md`.

Không mô tả unified public là “100% CC0”.

---

## 1. Output atlas (sau build, không commit)

| Đường dẫn | Vai trò |
|---|---|
| `public/assets/private-unified/world.png` | `WORLD_ART_KEY` |
| `public/assets/private-unified/world-props.png` | `WORLD_PROPS_KEY` |
| `public/assets/private-unified/avatars.png` | Avatar Modern Interiors rigs |
| `public/assets/private-unified/manifest.json` | Semantic frames |
| `public/assets/private-unified/props-manifest.json` | Props + anims (chưa 16× `path_dirt_*`) |
| `public/assets/private-unified/CREDITS.md` | Attribution per file |
| `dist-private/` | Production bundle **private-art** — kiểm bằng `verify-private-build.mjs` |

`public/assets/maps/garden.json` và `home.json` **đã có trên Git** (placement/collision); chất lượng pixel phụ thuộc atlas.

---

## 2. Bắt buộc — tái tạo private atlas (40 file)

Gốc: `asset-candidates/extracted/<đường dẫn dưới>`.  
Nguồn: `scripts/atlas-sources/demo-e-textures.json` + `scripts/build-private-atlas.py` (9 sheet nhân vật).

| # | Đường dẫn | Pack | License / chia sẻ |
|---|---|---|---|
| 1 | `sprout-lands-basic/Tilesets/Grass.png` | Sprout Basic | Pending Deployment License Verification |
| 2 | `sprout-lands-basic/Tilesets/Tilled_Dirt_Wide_v2.png` | Sprout Basic | Pending Deployment License Verification |
| 3 | `sprout-lands-basic/Tilesets/Water.png` | Sprout Basic | Pending Deployment License Verification |
| 4 | `sprout-lands-basic/Objects/Wood Bridge.png` | Sprout Basic | Pending Deployment License Verification |
| 5 | `sprout-lands-basic/Tilesets/Fences.png` | Sprout Basic | Pending Deployment License Verification |
| 6 | `sprout-lands-basic/Objects/Basic Furniture.png` | Sprout Basic | Pending Deployment License Verification |
| 7 | `sprout-lands-basic/Objects/Basic Grass Biom things 1.png` | Sprout Basic | Pending Deployment License Verification |
| 8 | `sprout-lands-basic/Objects/Basic Plants.png` | Sprout Basic | Pending Deployment License Verification |
| 9 | `sprout-lands-basic/Characters/Free Chicken Sprites.png` | Sprout Basic | Pending Deployment License Verification |
| 10 | `sprout-lands-sorry/Early Access/Plant update 2/Cherry Blossom Biom.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 11 | `sprout-lands-sorry/Early Access/Plant update 2/Cherry Blossom Biom water plants.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 12 | `sprout-lands-sorry/Early Access/Plant update 2/Trees, stumps and bushes v2.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 13 | `sprout-lands-sorry/Early Access/Village pack/houses/small house/small_House_light_with_door_grass.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 14 | `sprout-lands-sorry/Early Access/Plant update 2/piknik/Piknik blanket.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 15 | `sprout-lands-sorry/Early Access/Plant update 2/piknik/Piknik basket.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 16 | `sprout-lands-sorry/Early Access/Plant update 2/piknik/piknik_foods.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 17 | `sprout-lands-sorry/Early Access/Plant update 2/Bee/beehive.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 18 | `sprout-lands-sorry/Early Access/Sprout winter/fire animation.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 19 | `sprout-lands-sorry/Early Access/Plant update 2/frog/frog_spritesheet.png` | Sprout Sorry EA | Pending Deployment License Verification |
| 20 | `modern-interiors-free/Interiors_free/16x16/Room_Builder_free_16x16.png` | LimeZu | Pending Deployment License Verification |
| 21 | `modern-interiors-free/Interiors_free/16x16/Interiors_free_16x16.png` | LimeZu | Pending Deployment License Verification |
| 22 | `cozy-lands-basic/Objects/Object/other.png` | Amo-QAQ | Pending Deployment License Verification |
| 23 | `sunnyside-world/Tileset/spr_tileset_sunnysideworld_16px.png` | Sunnyside | Pending Deployment License Verification |
| 24 | `sunnyside-world/Elements/Crops/sunflower_05.png` | Sunnyside | Pending Deployment License Verification |
| 25 | `sunnyside-world/Elements/Crops/beetroot_05.png` | Sunnyside | Pending Deployment License Verification |
| 26 | `sunnyside-world/Elements/Crops/cabbage_03.png` | Sunnyside | Pending Deployment License Verification |
| 27 | `sunnyside-world/Elements/Animals/spr_deco_duck_01_strip4.png` | Sunnyside | Pending Deployment License Verification |
| 28 | `sunnyside-world/Elements/Animals/spr_deco_sheep_01_strip4.png` | Sunnyside | Pending Deployment License Verification |
| 29 | `sunnyside-world/Elements/Other/spr_deco_windmill_withshadow_strip9.png` | Sunnyside | Pending Deployment License Verification |
| 30 | `free-pets-pack/cat-orange/cat-orange_16px_top-down_outline_lit.png` | Frakassets | **CC BY 4.0** (attribution) |
| 31 | `free-pets-pack/cat-orange/cat-orange_16px_top-down_shadow.png` | Frakassets | **CC BY 4.0** |
| 32 | `modern-interiors-free/Characters_free/Adam_idle_anim_16x16.png` | LimeZu | Pending Deployment License Verification |
| 33 | `modern-interiors-free/Characters_free/Adam_run_16x16.png` | LimeZu | Pending Deployment License Verification |
| 34 | `modern-interiors-free/Characters_free/Adam_sit_16x16.png` | LimeZu | Pending Deployment License Verification |
| 35 | `modern-interiors-free/Characters_free/Alex_idle_anim_16x16.png` | LimeZu | Pending Deployment License Verification |
| 36 | `modern-interiors-free/Characters_free/Alex_run_16x16.png` | LimeZu | Pending Deployment License Verification |
| 37 | `modern-interiors-free/Characters_free/Alex_sit_16x16.png` | LimeZu | Pending Deployment License Verification |
| 38 | `modern-interiors-free/Characters_free/Amelia_idle_anim_16x16.png` | LimeZu | Pending Deployment License Verification |
| 39 | `modern-interiors-free/Characters_free/Amelia_run_16x16.png` | LimeZu | Pending Deployment License Verification |
| 40 | `modern-interiors-free/Characters_free/Amelia_sit_16x16.png` | LimeZu | Pending Deployment License Verification |

---

## 3. Tùy chọn — public atlas rebuild từ local

| Đường dẫn | Ghi chú |
|---|---|
| `free-pets-pack/puppy-shiba/puppy-shiba_16px_top-down_outline_lit.png` | CC BY 4.0; nếu thiếu, `build-unified-atlas.mjs` dùng frame đã pin trong repo |

---

## 4. Art upgrade tiếp theo (không chặn atlas hiện tại)

| Đường dẫn | Mục đích |
|---|---|
| `sprout-lands-basic/Tilesets/Bitmask references 1.png` | Autotile đường dirt 9-slice |
| `sprout-lands-basic/Tilesets/Bitmask references 2.png` | Autotile đường dirt 9-slice |
| `cozy-lands-basic/Buildings/house_01.png` | Landmark Chợ Bác Hai |
| `cozy-lands-basic/Buildings/house_02.png` | Landmark dự phòng |
| `cozy-lands-basic/Terrain/` (thư mục) | Biến thể đất/cỏ bổ sung |
| `cozy-lands-basic/Items/fish/` (thư mục) | Icon held-item mở rộng |

---

## 5. Pack zip gốc (chỉ trên máy chủ — không bắt buộc nếu đã extract)

Script `scripts/prepare-asset-candidates.py` map zip → `asset-candidates/extracted/`.  
Chỉ cần tarball **40 file** ở mục 2 nếu đã extract đúng cây thư mục.

---

## 6. Cách cung cấp an toàn

1. `npm run assets:pack-demo-e-minimal` trên máy local đã có license pack.
2. Chia sẻ `demo-e-minimal-sources.tar.gz` qua kênh riêng (không PR/GitHub công khai nếu không chắc quyền deploy).
3. Giải nén vào repo root; chạy `assets:check-demo-e` → exit 0.
4. Không commit `public/assets/private-unified/` trừ khi PD-01 + deployment license đã chốt.