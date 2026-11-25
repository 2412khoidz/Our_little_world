# MISSION 04D — Unified Extended World

**Branch:** `cursor/mission-04d-unified-extended-world-36fd`  
**PR:** #12 (tiếp quản tại baseline `7bbc047`)

## Trạng thái checkpoint (Cloud Agent)

| Checkpoint | Nội dung | Trạng thái |
|------------|----------|------------|
| **P0** | Không còn cỏ “ảo” ngoài bounds; viền tối + rào/cây; collision khớp playable; overlay DEV | **Done** |
| **P1** | `outdoor` 64×64, `home`/`garden` giữ nguyên, portal hai chiều, `meadow` → `outdoor` compat | **Done** |
| **P2** | `outdoorRenderer` (Demo E pipeline), đường mòn hữu cơ, biển/hồ/cầu | **Done (mức main game)** |
| **P3** | Anchors trung thực (mailbox, picnic, fishing/market/farm preview) — **không** fake RPC farming/pet | **Done** |
| **P4** | `MAP_IDS` + realtime `outdoor`; presence normalize `meadow`; pet vẫn home-only | **Done** |
| **P5** | E2E navigation; Vitest contract; sandbox route giữ nguyên | **Partial** (sandbox chưa redirect) |

**HEAD đã kiểm tra (agent):** commit trên branch sau push lần này — xem `git log -1` trên PR #12.

## Owner — mở game & kiểm tra

1. `npm run dev`
2. `http://localhost:5173/?extended-world=1`
3. Dev: **Chọn cặp thử** → **Nhà** / **Vườn** / **Ngoài trời** (hoặc cổng vườn tile 9,13).
4. **Collision overlay (DEV):** `?collision-debug=1` hoặc phím **C** trong WorldScene — đỏ = blocked, xanh lá = bounds, cyan = portal.
5. Deep link: `?map=outdoor` (cần `?extended-world=1` hoặc localStorage preview).
6. **Private Demo E:** `npm run build:private` trên máy owner (art đầy đủ).

## Kiến trúc (main game, không sandbox mới)

| Layer | Path |
|-------|------|
| Zones & collision | `src/shared/world/outdoorZones.ts`, `outdoorCollision.ts` |
| Map contract | `src/shared/maps.ts` (`outdoor` 64×64) |
| Renderer | `src/game/world/outdoorRenderer.ts` ← hấp thụ sandbox outdoor |
| Scene | `WorldScene` — một engine; **không** `WorldExpansionScene` trong luồng chính |
| Debug | `src/game/dev/mapDebugOverlay.ts`, `mapDebugFlag.ts` |
| Legacy map id | `src/shared/world/mapIdCompat.ts` (`meadow` → `outdoor`) |

**Sandbox:** `?world-sandbox=1` / `?experience-demo=1` **vẫn tồn tại** cho parity — chưa redirect.

## Ranh giới Composer (farming / pet)

- **Không** implement farming domain engine hay pet authority SQL (PR #10).
- Outdoor anchors `crop_plot` / `fishing_spot` / `shop_npc` chỉ hiển thị nhãn V0.2 — contract tại `mainGameInteractables.ts` + `MAIN_GAME_WORLD_ANCHORS.outdoor`.
- Pet: `PetEntity` / `PetLivingMainGameDriver` **chỉ home** — không đổi 04B contracts.

## Tests đã chạy (agent)

```bash
npm run lint && npm run typecheck && npm run test && npm run build
npm run test:e2e -- tests/e2e/unified-world-navigation.spec.ts tests/e2e/extended-world-meadow.spec.ts
```

- `tests/unit/outdoorWorldContract.test.ts` — BFS tới 10 landmark
- `tests/unit/realtimeMapContract.test.ts`
- E2E: garden/outdoor nav, WASD trên outdoor

## Phase 6 — World overhaul (reference repos, 2026-11-25)

Owner yêu cầu thế giới kiểu Stardew (nhiều vùng, cửa hàng vào trong, collision trung thực). **Không** thay OLW bằng repo khác; giữ React + Phaser 4.

| Tài liệu | Nội dung |
|----------|----------|
| [WORLD_OVERHAUL_REFERENCE_MATRIX.md](../research/WORLD_OVERHAUL_REFERENCE_MATRIX.md) | Clone + đánh giá Hollowmere, Harvest Duo, Rai Lanna, … |
| [COMPOSER1_HOLLOWMERE_HARVEST_MEADOWBROOK.md](./COMPOSER1_HOLLOWMERE_HARVEST_MEADOWBROOK.md) | **Composer 1** — Hollowmere maps, Harvest Hollow ledger, Meadowbrook (`webfarmville`) sim |
| `src/shared/world/worldAreaGraph.ts` | Đồ thị vùng **planned** (làng/rừng/hồ/biển) + warps đang live |

**Quyết định:** mở rộng pipeline **Tiled tilemap + area graph** (mẫu Hollowmere JSON + Harvest Duo `warps`); dần thay vẽ tay `outdoorRenderer.ts` cho vùng playable.

## Known gaps (owner / follow-up)

- Chưa ghi video gameplay đầy đủ 10 địa danh trên private build (cần máy owner + `build:private`).
- Multiplayer 2 client outdoor E2E chưa mở rộng (schema sẵn sàng).
- SQL / placement ngoài trời: **không** migration (đúng plan B phase 1–4).
- Visual parity 100% Demo E 96×96: chỉ 64×64 production path.