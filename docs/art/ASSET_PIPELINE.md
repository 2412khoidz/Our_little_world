# Quy chuẩn & Pipeline Tích hợp Asset — Our Little World

*Tài liệu kiến trúc kỹ thuật cho hệ thống đồ họa hợp nhất (`Unified Cozy World`). Xem định hướng tổng quan tại [ART_DIRECTION.md](ART_DIRECTION.md).*

---

## 1. 14 Quy tắc Chuẩn hóa Đa Bộ Asset (Asset Compatibility Contract)

Mọi sprite từ các bộ khác nhau khi đưa vào world chính phải tuân theo 14 quy tắc chuẩn sau (khai báo tập trung trong [semanticAssetRegistry.ts](../../src/game/artDemos/semanticAssetRegistry.ts)):

1. **Logical Tile Size (`16×16 px`):** Giữ nguyên lưới logic `16px` của domain V0.1 (`src/shared/maps.ts`, pathfinding BFS, furniture placement grid). Không ép kích thước ảnh vật lý phải là `16×16`.
2. **Native Sprite Resolution:** Mọi spritesheet dùng trong runtime chính sử dụng mật độ gốc **`1×` = 16px / ô logic** (không trộn lẫn asset đã upscale 32x hoặc 48x như `RPGMAKERMV` của Modern Interiors).
3. **Pixel Density & Scaling:** Toàn màn hình dùng nearest-neighbor (`pixelArt: true`, `roundPixels: true`, `antialias: false`, `image-rendering: pixelated`), tránh phóng to nhỏ lẻ giữa các sprite.
4. **Perspective:** Thống nhất **3/4 Top-Down (~45°)** (nhìn thấy mặt trước công trình/bàn/giường cùng một phần mặt trên), tránh trộn view nhìn ngang hoàn toàn (`scroller`).
5. **Character Scale:** Mục tiêu **`~16px rộng × 22–24px cao`** trên cell chuẩn **`16×32`** (`Modern Interiors` rig), giữ nhân vật nổi bật vừa vặn khi đứng sau bàn trà/ghế/hàng rào mà không lọt thỏm.
6. **Furniture & Prop Scale:** Đồ nội thất có thể chiếm nhiều ô (`1×1`, `2×1`, `2×2`, `3×2`, `4×3`), cắt đúng khung hình theo pixel thực thay vì chia đều theo bội số `16px` (ví dụ thảm `Basic Furniture` hàng 5 rộng `24×16`).
7. **Palette Harmony:** Ưu tiên gam kem ấm, gỗ mật ong, hồng đào pastel, xanh xô thơm. Điều chỉnh màu nhân vật về dải `SKIN_TONE_OPTIONS`, `HAIR_COLOR_OPTIONS`, `OUTFIT_COLOR_OPTIONS` sẵn có; dùng tint cực nhẹ khi cần đồng bộ lá cây/hoa.
8. **Outline Discipline:** Viền mảnh màu nâu-tím hoặc xám tím đậm (`#3a3a50`..`#6c4640`); tránh viền đen tuyệt đối `#000000` gây gắt với nền pastel của Sprout Lands.
9. **Sprite Anchor (`origin`):**
   - Toàn bộ vật thể đứng (`cây`, `tủ`, `bàn`, `nhân vật`, `chòi`) đặt anchor tại **chân giữa dưới `(0.5, 1.0)`** — hoặc tỷ lệ chân thực nếu khung chứa khoảng trống phía dưới (ví dụ pet `0.85`, Sunnyside sheep `0.84`, Sprout character `0.67`).
   - Vật thể nằm phẳng (`thảm`, `mặt ao`, `cầu`, `chăn picnic`) đặt tại tâm `(0.5, 0.5)` hoặc `(0, 0)` thuộc lớp sàn.
10. **Soft Contact Shadow:** Đặt elip bóng đổ mềm màu nâu tím `#22151c` (alpha `0.45–0.65`) ngay dưới chân nhân vật, thú cưng, thân cây và bàn ghế ở độ sâu `depth - 10` trước vật thể đó.
11. **Animation Cadence:** Thống nhất nhịp frame mượt và êm (`idle` 6–7 fps, `walk/run` 9–10 fps, `pet` 8–12 fps, `water/fire` 4–9 fps); animation môi trường không chớp gắt gây mỏi mắt trên màn hình điện thoại.
12. **Collision Footprint:** Mọi món đồ có kích thước lớn vẫn chỉ chiếm đúng vùng đáy tiếp đất (ví dụ cây anh đào `48×48px` chỉ khóa va chạm `1×1` tại gốc thân; rèm cửa/tranh tường có collision `0×0` để người chơi đi ngang trước tường được).
13. **Y-Depth Sorting:** Thứ tự vẽ theo trục dọc **`depth = Math.round(worldBottomY)`** trên lớp vật thể (`100..900`); lớp sàn/đất/thảm nằm cố định ở `1..18`; tường & tranh nằm ở `8..28`; ánh sáng nhẹ `ADD` (`alpha <= 0.28`) và cánh hoa ở `850..960`; name tag gọn gàng ở `1100`.
14. **Interaction Points:** Mỗi đồ vật tương tác (`bed`, `sofa`, `tv_cinema`, `desk`, `picnic`, `pond`) định nghĩa sẵn `interactionOffsetPx` (ô đứng hợp lệ ngay phía trước hoặc cạnh món đồ) để BFS pathfinding dẫn nhân vật đi tới tự nhiên mà không đi xuyên qua thân đồ.

---

## 2. Ánh xạ Semantic Asset ID & Bộ sưu tập Nội thất

Thay vì lưu trực tiếp tọa độ pixel hay tên file tileset vào database `furniture_placements`, toàn bộ domain & render tách bạch qua khóa ngữ nghĩa (`SKU / Semantic ID`):

```text
Supabase `furniture_placements.sku` ("sofa_cream" | "tv_cinema_unit" | ...)
        │
        ▼ (Catalog & Collection Resolver)
SemanticAssetRegistry (`src/game/.../semanticAssetRegistry.ts`)
        ├─ collection: 'pastel' | 'modern' | 'cottage' | 'rustic'
        ├─ textureKey + exact pixel rect { x, y, w, h }
        ├─ anchor, shadow, collisionTiles, interactionOffsetPx
        └─ Phaser Renderer / Atlases (thay skin đồ nội thất không đổi save data)
```

Nhờ cơ chế này:
- Mở rộng sang các bộ sưu tập **Pastel** (*Sprout Lands*), **Modern** (*LimeZu*), **Cottage** (*Cozy Farm / Cozy Lands*), **Rustic** (*Sunnyside World*) chỉ là thêm metadata mới trong Registry, **không phải di chuyển dữ liệu người chơi đã lưu**.
- Khi cần thay một món đồ free bằng bản trả phí về sau (ví dụ nâng từ giường `Basic Furniture` lên giường đôi lớn *Modern Interiors Complete*), chỉ đổi ánh xạ rect của đúng Semantic ID đó.

---

## 3. Kế hoạch Tích hợp Vào Game V0.1 Chính (Không Phá Vỡ Hệ Thống Hiện Có)

Demo E đã được duyệt. Các bước sau áp dụng khi mở OLW-010-01:

1. **Giữ nguyên 100% lớp Domain, Backend & Bảo mật:**
   - Không sửa giao diện/hợp đồng của `WorldBackend`, `LocalPreviewBackend`, `DevLanBackend`, `SupabaseBackend`.
   - Không sửa RLS policies, pairing 2/2, đa thiết bị cho cùng 1 tài khoản, hay cơ chế chặn tài khoản thứ 3.
   - Không sửa thuật toán pathfinding BFS trên lưới 16px, cơ chế optimistic placement/move/remove + `layoutVersion` hay Spike 0 Video Sync PoC.
2. **Tạo Production Atlas Tối ưu & Kiểm soát Bản quyền:**
   - Viết script build riêng cắt đúng ~40–60 sprite & tile được sử dụng từ danh sách đã duyệt vào `src/game/assets-pack/` hoặc `public/assets/unified/` kèm file `CREDITS.md` (`Cup Nooble`, `LimeZu`, `Amo-QAQ`, `Daniel Diggle`, `Frakassets`).
   - PD-01 phân biệt quyền sử dụng trong game cá nhân phi thương mại với quyền phân phối lại pack. Khi phát triển riêng, dùng subset asset gốc Demo E, ghi nguồn và giữ atlas private ngoài Git. Khi đưa qua Internet, xác minh quyền cho bản triển khai và cho URL asset. Atlas public dùng bản CC0 dự phòng cho nguồn chưa xác minh ở môi trường public.
   - Tuyệt đối không đưa `.zip`, `.aseprite`, `Sunnyside_World_Gamemaker/` hay hàng ngàn ảnh dư thừa vào `public/` hay `dist/` (giữ kích thước precache PWA nhẹ cho iPhone Safari).
3. **Thay thế Tầng Render `WorldScene.ts` & `BootScene.ts`:**
   - Giữ map, collision, footprint, spawn và portal V0.1. Gắn semantic ID ở render. Mở rộng địa hình có thay đổi save/SQL thuộc milestone sau.
   - Chuyển `phaserAvatarTexture.ts` sang dùng `unifiedAvatarBuilder.ts` (giữ nguyên `avatarConfigSchema` trong `src/shared/avatar.ts` và UI `AvatarModal.tsx`).
4. **Duy trì `verify-prod-guard.mjs`:**
   - Tiếp tục kiểm tra `dist/assets/*.js` sau mỗi lần build để đảm bảo toàn bộ mã thử nghiệm `?art-demo=A..E`, `/asset-candidates` và `/api/dev-lan` không rò rỉ vào bản phát hành chính thức.


## 4. Tạo bản phát triển riêng và bản public

| Lệnh | Đầu ra và mục đích |
|---|---|
| `npm run assets:atlas:private` | Đọc pack hiện có dưới `asset-candidates/extracted/` (Python + Pillow). Chỉ trích khung được chọn từ registry Demo E. `public/assets/private-unified/` bị ignore. Vite dev nhận atlas riêng khi khởi động với đủ bốn tệp. |
| `VITE_OLW_PRIVATE_ART=1` + extended maps | `WorldScene` vẽ village/farm/forest/beach/shop qua `demoEZoneRenderer` (Sprout `env.meadow_tile` + `prop.*` manifest); Tiled JSON chỉ còn collision/portals/NPC — không `tileset-cozy` khi atlas sẵn sàng. |
| `npm run build:private` và `npm run preview:private` | `dist-private/` để xem bản build riêng qua loopback. Atlas riêng nằm ngoài precache. |
| `npm run assets:atlas` và `npm run build` | `public/assets/unified/` là fallback có quyền Web/PWA. `dist/` chỉ nhận tệp công khai trong danh sách allowlist. Production guard kiểm tra asset, JS và Service Worker. |

Manifest riêng ghi pack/version, SHA-256, lựa chọn khung và trạng thái quyền. Sprout Lands, Modern Interiors, Cozy Lands và Sunnyside được cắt cho bản phát triển riêng, với quyền triển khai Internet **Pending Deployment License Verification**. Hai frame Free Pets Pack đã xác minh CC BY 4.0 có ở cả hai profile. Emote và khung gameplay pet sau V0.1 nằm ngoài atlas.

Nếu triển khai Internet riêng sau này, xác minh điều khoản cho đúng pack và cách phục vụ sprite trước khi dùng. Phương án đề xuất là gateway HTTPS xác thực cả trang và `/assets/private-unified/**` trước khi cấp file. Thử truy cập URL asset trực tiếp khi chưa đăng nhập và sau khi đăng xuất. Asset hạn chế nằm ngoài CDN public và Service Worker. Supabase RLS bảo vệ dữ liệu của Supabase, còn gateway phải kiểm quyền cho file tĩnh. Bản private hiện chỉ dành cho máy local hoặc LAN tin cậy, có ngân sách bổ sung 0₫.
