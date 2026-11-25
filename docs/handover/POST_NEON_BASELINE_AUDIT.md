# Post-Neon Baseline Audit — Cursor Cloud

- **Repository:** `2412khoidz/Our_little_world`
- **Baseline commit (mission):** `4743ab9`
- **Art pass reference:** `0499704`
- **Handover branch:** `cursor/cloud-handover-36fd`
- **Auditor:** Cursor Cloud Agent (Mission 01)
- **Ngày:** 2026-11-25

## 1. Đối chiếu tài liệu vs mã nguồn

| Tuyên bố trong `NEON_NIGHT_CHECKPOINT.md` | Xác minh trên Cloud | Kết luận |
|---|---|---|
| 46 test files, 453/453 Vitest | Chạy thật: **46 passed, 453 passed** | **Khớp** |
| lint / typecheck pass | **0 errors** | **Khớp** |
| `verify-prod-guard.mjs` pass | **PASSED** sau `npm run build` | **Khớp** |
| Playwright 15 pass, 1 skip | **15 passed, 1 skipped** (`grand-experience` GIF trên project iPhone) | **Khớp** |
| `build:private` pass | **Fail** — không có `public/assets/private-unified/` | **Lệch môi trường** (thiếu asset local) |
| Combined demo vào/ra `map.home` | Code: `WorldExpansionScene` `interiorMode`; E2E sandbox pass | **Khớp** |
| Mèo quadruped + wake/stretch | `petSpriteBuilder.ts` + E2E GIF 12/9 frames | **Khớp** |
| 16 `path_dirt_*` chưa cắt | `props-manifest.json` không có `path_dirt_*`; doc art vẫn ghi pending | **Khớp (chưa làm)** |

## 2. Kết quả regression (Cloud)

```text
npm run lint          → exit 0
npm run typecheck     → exit 0 (tsc -b)
npm test              → 46 files, 453/453 pass
npm run build         → exit 0
node scripts/verify-prod-guard.mjs → PASSED (chỉ dist/ public; không quét dist-private)
npm run build:private → exit 1 (thiếu private-unified atlas)
npm run verify:private → chưa chạy (cần build:private thành công trước)
npm run assets:check-demo-e → exit 1 (0/40 nguồn trên cloud)
PLAYWRIGHT_PORT=4176 npx playwright test → 15 passed, 1 skipped (~2.1 min)
```

### Phân loại sai lệch

| Sai lệch | Loại | Giải thích |
|---|---|---|
| `build:private` fail | **Thiếu asset** | `asset-candidates/extracted/` không có trên git/cloud |
| Playwright lần đầu fail | **Lỗi môi trường** | Chưa `npx playwright install chromium` — đã khắc phục |
| `assets:atlas:private` ENOENT python | **Lỗi môi trường** | Linux không có `python` — sửa `OLW_PYTHON`/`python3` trong handover |
| Atlas public ~84 KiB vs Demo E đầy đủ | **Thiếu asset** | Unified public = CC0 procedural + CC BY 4.0 pet; chất lượng thấp hơn private Demo E |

## 3. Kiểm tra runtime (Playwright + artifact)

### Game chính (`/`)

- Pairing Dev LAN, 2/2 world, decorate, garden↔home, inventory/pet/study/couple/mailbox loop — **E2E `v01-our-little-home` 8/8**, **`v015-living-home` 2/2** (cả desktop + mobile viewport projects).

### Sandboxes

| Route | E2E | Ghi chú |
|---|---|---|
| `/?experience-demo=1` | ✓ `grand-experience-sandboxes` | Canvas + combined UI; screenshot/GIF trong `test-results/grand-showcase/` |
| `/?pet-art=1` | ✓ | Quadruped preview |
| `/?pet-lab=1` | ✓ | 8 needs / scenarios |
| `/?world-sandbox=1` | ✓ | Expansion map |
| `/?ui-sandbox=1` | ✓ | Cottage + Storybook |
| `/minigames.html` | ✓ (nested) | Trong `grand-experience-sandboxes.spec.ts` test GIF desktop — xem bảng dưới |

### Mini-games — mức kiểm thử

| Mức | Phạm vi | Trạng thái Cloud |
|---|---|---|
| **UI smoke (art/tabletop)** | `grand-experience` mở `/minigames.html`, click vài ô Caro, chụp 4 tab (Caro/Othello/Memory/Battleship) | ✓ E2E desktop (nested trong GIF test) |
| **Functional (rules)** | Vitest `minigames.test.ts`, `minigamePrivacy.test.ts` | ✓ 453 suite |
| **Multiplayer E2E** | Hai client Dev LAN, session sync qua backend | **Chưa có** — UI qua `minigames.html` dev only, **chưa** menu `App.tsx` |

### Bằng chứng hình ảnh (Cloud run)

- Playwright sinh lại: `test-results/grand-showcase/*`, `test-results/v015-living-home/*`, GIF locomotion/feeding.
- Bản sao PR: `/opt/cursor/artifacts/01-pet-art-desktop.png`, `06-combined-experience-desktop.png`, `desktop-home-pet-couple.png`.
- Neon art pass (trong repo worktree sau E2E local, gitignored `test-results/`): `test-results/art-pass/after/` vẫn tồn tại sau Playwright run.

## 4. Kiến trúc đã đọc (tóm tắt handover)

- **Game chính:** `WorldScene.ts` + `PetEntity` (đã dùng `petSpriteBuilder` quadruped + `PetAnimationController`).
- **Sandbox nâng cao:** `WorldExpansionScene.ts` — đồ họa Homestead Demo E, `interactionResolver`, vào nhà `map.home`, physical care.
- **Pet AI:** `petPrimitivesAdapter.ts` vẫn là **[PRE-INTEGRATION FIXTURE]**; DeepSeek `petAdvanced/primitives` có test (`petPrimitives.test.ts`) nhưng chưa nối runtime chính.
- **V0.2+ domain (DeepSeek):** farming/fishing/cooking/economy/minigames — **chỉ `src/shared/` + tests**, không `WorldBackend` hook trong `App.tsx`.

## 5. Rủi ro còn lại (không khai khống Accepted)

1. **Supabase Cloud + migration trùng `20261125000100`** (GPT security vs Neon inventory) — chưa merge/apply trên cloud.
2. **iPhone Safari PWA thật** — E2E mô phỏng viewport 430×932, không thay thiết bị thật.
3. **Private Demo E atlas** — cần `asset-candidates` từ máy chủ dự án để parity visual với Neon local.
4. **Landmark ngoại vi** — 5 landmark vẫn scenery-only (`ART_PIPELINE_RECONCILIATION.md` §2).