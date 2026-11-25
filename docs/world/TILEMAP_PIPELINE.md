# Tilemap pipeline — nghiên cứu OSS và OLW

## Quyết định (Stardew-like, 04D overhaul)

| Repo | Engine | Map pipeline | Tích hợp OLW |
|------|--------|--------------|----------------|
| **Hollowmere** | Godot | `map_builder.gd` — ops `rect`/`scatter`/`warps` trên grid | **Pattern only** — generator `generate-world-zone-maps.mjs` |
| **Harvest Duo** | pygame | `world.Area` — char grid + `warps` + camera clamp | **Pattern only** — `MapDefinition.portals` + camera follow |
| **Farm Rai Larn Na** | Canvas/DOM | `ground.ts` path rects + `data/map.ts` objects | UX tham khảo; không port renderer |
| **webfarmville** | Phaser 3 | Farm grid state, không Tiled thế giới | Giữ farming sim shared (sau) |
| **harvest-hollow** | Web | Multi-farm hub | Hub/portals giống zone linking |
| Kaetram / BrowserQuest | TS / JS | Tiled → collision index | **Đang dùng** (`parseTiledWorldMap`) |

**Không** fork Godot/Python renderer vào Phaser 4. **Có** mở rộng zone Tiled liên kết: `village` ↔ `farm` ↔ `forest` ↔ `beach`, `shop` (interior).

# Tilemap pipeline — chi tiết kỹ thuật

Tài liệu này ghi **implementation thực** (không phải README) từ các repo tham chiếu và cách Our Little World (OLW) tái sử dụng kỹ thuật.

## Kaetram-Open (`Kaetram/Kaetram-Open`, MPL-2.0)

| Chủ đề | File / symbol | Kỹ thuật |
|--------|----------------|----------|
| Export Tiled → game | `packages/tools/map/parser/parser.ts` — class `ProcessMap` | Đọc Tiled JSON; thuộc tính tile `c` → `collisions[]`; layer object → doors/warps/areas |
| Collision authority | `packages/server/src/game/map/map.ts` — `Map` | `collisions` tile index list; `isColliding()` trên grid |
| Client render | `packages/client/src/renderer/canvas.ts` | Vẽ tile từ `map.data`; tách back/fore theo `high` tiles; animated tile index |
| Map transitions | `ProcessedDoor` / `map.areas.warps` trong `map.ts` | Cửa object layer nối destination tile |

**OLW:** `scripts/generate-world-zone-maps.mjs` + `parseTiledWorldMap.ts` — layer `Collision` (gid>0) là single source; object group `Portals` cho chuyển map; `renderTiledWorldMapLayers.ts` render cùng JSON.

## BrowserQuest (`mozilla/BrowserQuest`)

| Chủ đề | File | Kỹ thuật |
|--------|------|----------|
| Tiled → JSON | `tools/maps/processmap.js` | `property c` trên tileset → `collidingTiles`; layer blocking; `doors` object group |
| Server collision | `server/js/map.js` — `generateCollisionGrid`, `isColliding` | Mảng index 1D `y*width+x` |
| Client | `client/js/map.js` | Multi-layer `data`, `high`, `blocking` từ cùng export |

**OLW:** Cùng mô hình index tile + portal objects; không port trực tiếp JS (Phaser 4 + TS).

## webfarmville (`Shiz0id/webfarmville`, MIT)

| Chủ đề | File | Kỹ thuật |
|--------|------|----------|
| Farm grid | `client/src/scenes/FarmScene.ts` | Isometric-style placement: `footprint`, `canPlace`, `objectAt` trên `FarmState` grid |
| Camera | `FarmScene` — `MIN_ZOOM`/`MAX_ZOOM`, pan | Không fit toàn bộ farm; zoom gameplay + theo nhân vật |
| Domain | `shared/src/features/*` | RNG, crops, orders — **không** map tile; farming logic tách khỏi renderer |

**OLW:** Ruộng lớn trên `farm.json` (160+ ô đất walkable); gameplay farming vẫn milestone sau — chỉ collision/render chung.

## Harvest Hollow (`KrasimirKralev/harvest-hollow`, MIT)

| Chủ đề | Kỹ thuật |
|--------|----------|
| Multi-farm hubs | UI gate giữa các farm snapshot — pattern liên kết vùng, không một tilemap khổng lồ |
| Economy sim | `tools/economy-model.mjs` — tham chiếu balance, không map |

**OLW:** Liên kết `garden` ↔ `village` ↔ `farm` qua portals (như hub), mở rộng thêm zone Tiled thay vì procedural `outdoorRenderer`.

## OpenWorld / Harvest Hollow “OpenWorld”

Không có repo canonical tên `OpenWorld` trong scope research; map RPG lớn lấy mẫu chính từ **Kaetram + BQ pipeline** (Tiled export, collision list, warp areas).

## Quy tắc OLW (sau đại tu 04D)

1. **Không** đặt cottage / cừu / cối xay / cây trông cây ngoài `isStaticBlocked` bounds (`WorldScene.buildScenicSurround` chỉ sky haze).
2. **Render + collision** cùng nguồn: `tiledMapRegistry` + `buildMovementCollisionGrid` → `MapDefinition.isStaticBlocked`.
3. **Camera:** map lớn (`village`, `farm`, `outdoor`) — `startFollow` nhân vật, không fit full map desktop.
4. Regenerate maps: `node scripts/generate-world-zone-maps.mjs`.

## License reuse

| Repo | License | Copy code? |
|------|---------|------------|
| Kaetram-Open | MPL-2.0 | Pattern + clean-room parser (không paste file) |
| BrowserQuest | MPL-2.0 | Pattern export |
| webfarmville | MIT | Economy/farm sim only (shared/), không Phaser 3 scene |
| harvest-hollow | MIT | Economy / hub patterns |