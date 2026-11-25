# Feature Completeness Matrix — `integration/night-merge`

Phân loại theo mission: **(1)** tích hợp game chính · **(2)** sandbox/demo · **(3)** logic chưa UI · **(4)** prototype chưa hoàn thiện · **(5)** chưa triển khai.

*Nguồn: đối chiếu `App.tsx`, `WorldScene.ts`, `WorldExpansionScene.ts`, `WorldBackend` types, `DEEPSEEK_NIGHT_CHECKPOINT.md`, `NEON_NIGHT_CHECKPOINT.md`, Vitest/E2E.*

## 1. Đã tích hợp và hoạt động trong game chính

| Hạng mục | Bằng chứng chính |
|---|---|
| Đăng nhập / ghép đôi / world 2 thành viên | `App.tsx`, Dev LAN, E2E `v01-our-little-home` |
| Avatar + Tủ đồ | `AvatarModal`, `unifiedAvatarBuilder` / atlas public |
| Di chuyển realtime + nội suy | `MovementTxThrottle` 125 ms, E2E reconnect/map |
| Bản đồ home ↔ garden + decorate | `WorldScene.ts`, placement RPC/Dev LAN |
| Camera mobile-first | `worldCamera`, E2E overflow 430×932 |
| Inventory V0.1.5 (kibble, catalog) | `InventoryModal`, migrations + Dev LAN handlers |
| Pet MVP (adopt, feed, panel) | `PetPanel`, `PetEntity` quadruped trong `WorldScene` |
| Pomodoro / Study co-presence | `PomodoroPanel`, study backend |
| Couple interactions (sofa, ôm, giường) | `CoupleActionBar`, `couple_event` realtime |
| Mailbox + quà bất ngờ | `MailboxModal`, server-side gift hide |
| Dev Console (DEV only) | `DevConsoleDrawer`, `verify-prod-guard` |
| Spike 0 Video sync PoC | E2E SSE cinema |
| PWA shell + tiếng Việt | `vite-plugin-pwa`, UI strings |

## 2. Chỉ hoạt động trong sandbox / demo (DEV hoặc entry riêng)

| Hạng mục | Entry | Ghi chú |
|---|---|---|
| Combined physical experience | `/?experience-demo=1` | Hotbar, J/K, adopt, notebook, expansion map |
| World expansion 64/96 + landmarks | `/?world-sandbox=1`, Combined | Homestead Demo E quality khi atlas đủ |
| Pet art variants (27 tracks) | `/?pet-art=1` | |
| Pet intelligence lab | `/?pet-lab=1` | Dùng adapter fixture |
| UI design variants | `/?ui-sandbox=1` | Cottage vs Storybook |
| V0.3 prototype modals (local) | Menu → dev `v03_proto` | Không fake currency/cloud |
| Mini-game UI (4 trò) | `/minigames.html` | E2E **UI smoke** trong `grand-experience-sandboxes` (GIF test); chưa multiplayer E2E |
| Art demos A–E | Dev routes / `artDemos` | Không production |

## 3. Đã có logic nhưng chưa nối UI / gameplay chính

| Hạng mục | Vị trí logic | Gap |
|---|---|---|
| Farming (plant/water/harvest) | `src/shared/farming/` | Không `garden_plots` backend; không UI |
| Fishing FSM | `src/shared/fishing/` | Không scene/hook |
| Cooking co-op | `src/shared/cooking/` | Không bếp UI |
| Economy ledger / shop / shipping | `src/shared/economy/`, `shippingBin`, `shop` | Không RPC V0.2, không xu UI |
| Order board / NPC market | `orderBoard`, docs OLW-020 | Simulator only |
| Mini-game PvP sessions | `src/shared/minigames/` + components | Chưa `WorldBackend.minigames` |
| Physical interaction resolver | `src/shared/interaction/` | **Chỉ** Expansion/Combined scenes |
| Shared Life V0.3 (notebook sync) | `sharedLifeTypes`, Dev LAN stubs | UI notebook trong sandbox; chưa shell chính |
| DeepSeek pet primitives | `src/shared/petAdvanced/primitives/` | Adapter fixture thay thế trong lab |
| Game UI kit (hotbar, dialogue) | `src/ui/designSystem/` | Chưa gắn `App.tsx` production |

## 4. Prototype chưa hoàn thiện

| Hạng mục | Trạng thái |
|---|---|
| `petPrimitivesAdapter` | Chạy được nhưng cố ý không parity DeepSeek contract đầy đủ |
| Cinema WAN / Jellyfin | Spike LAN only; `OLW-S05B` pending |
| 16× `path_dirt_*` 9-slice tiles | Kế hoạch trong `ART_PIPELINE_RECONCILIATION.md`, chưa trong `props-manifest.json` |
| 5 landmark gameplay | Scenery anchors only |
| Economy balance V0.2.1+ | Simulator báo pacing ~2× mục tiêu (`DEEPSEEK_NIGHT_CHECKPOINT` §5) |
| Battleship / Othello privacy trên backend | Rules OK; server projection chưa wire (`GPT_INTEGRATION_REVIEW`) |

## 5. Chưa triển khai (hoặc ngoài scope night-merge)

| Hạng mục | Ghi chú |
|---|---|
| Supabase production deploy + iPhone nghiệm thu | `OLW-010-05`, `OLW-010-06` |
| Pet / học / hộp thư full cloud | Cần apply migrations trên Postgres thật |
| Farming → persistence | Milestone V0.2.1+ |
| Cinema không VPN | Research only |
| Competitive economy / ads / streak惩罚 | Loại trừ theo `PRODUCT_SPEC` |

## 6. Chuyên đề mission — trạng thái nhanh

| Chủ đề | Game chính | Sandbox | Domain logic |
|---|---|---|---|
| **Farming** | Không | Không (landmarks farm là decor) | ✓ tests |
| **Inventory** | ✓ | ✓ combined | ✓ |
| **Pet intelligence** | Needs/backend đơn giản | ✓ pet-lab | Fixture + DeepSeek primitives tách rời |
| **Physical interactions** | Không | ✓ experience-demo | ✓ resolver |
| **Couple activities** | ✓ | ✓ combined | ✓ |
| **Mini-games** | Không menu | `minigames.html` (smoke E2E) | ✓ reducers; ✗ PvP E2E |
| **Multiplayer** | ✓ Dev LAN; Supabase khi `.env` | ✓ | — |
| **Persistence** | ✓ Dev LAN file / Supabase schema sẵn | Local sandbox state | Migrations chưa apply cloud |