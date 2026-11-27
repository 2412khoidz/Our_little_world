# Canonical Source of Truth & Workspace Organization (`main` / `v0.2.5`)

Tài liệu này là điểm vào chuẩn duy nhất cho mọi agent và phiên làm việc tương lai của **Our Little World**.

---

## 1. Nguồn chân lý Canonical (Verified Baseline)

| Hạng mục | Giá trị đã xác minh |
|---|---|
| **Primary playable workspace** | `C:\Users\admin\Downloads\Our_little_world` |
| **Remote repository** | `origin` → `https://github.com/2412khoidz/Our_little_world.git` |
| **Canonical stable branch** | `main` (`origin/main`) |
| **Verified baseline release tag** | `v0.2.5` (code commit `b43712e9f30d5d8b90bc14c4501f3ef1efb5c69e`, RC1 tích hợp `integration/olw-canonical-rc1` @ `8f6a505`) |
| **Private runtime assets (local-only)** | `public/assets/private-unified/` (10 file) + `public/assets/private-audio/music/` (5 track) — kiểm bằng `npm run assets:private:verify` |
| **Live owner save (local-only)** | `.dev-lan-state.json` trong primary workspace (**giữ nguyên, không bao giờ xóa hoặc sync sang worktree mới**) |
| **Playtest / Host command** | `npm run host:couple` (hoặc `npm run dev`) |

> **Lưu ý GitHub UI:** Trên remote `origin`, branch mặc định hiển thị web (`HEAD`) lịch sử là `integration/night-merge`; toàn bộ phát triển mới bắt buộc tách từ `origin/main`.

---

## 2. Kiểm kê Workspace & Recovery Branches

| Workspace / Branch | Commit HEAD | Trạng thái | Ghi chú xử lý |
|---|---|---|---|
| `C:\Users\admin\Downloads\Our_little_world` | `main` (`origin/main`) | Clean | **Primary Playable Workspace & Release Home** |
| `C:\Users\admin\Downloads\OLW-Neon` | `antigravity/unified-neon-carbon` @ `f69106e` | Read-only reference | Baseline 16px đã hợp nhất vào `v0.2.5` (`backup/recovery-neon-f69106e`). Có thể dùng làm nguồn `assets:private:sync` nếu cần. |
| `C:\Users\admin\Downloads\OLW-Multiplayer` | `feature/multiplayer-hardening` @ `27560ac` | Freeze / Archive candidate | NET.1.1 đã hợp nhất vào `v0.2.5` (`backup/recovery-multiplayer-27560ac`). Không code mới ở đây. |
| `C:\Users\admin\Downloads\OLW-Carbon` | `antigravity/carbon-living-pet-v2` @ `b162a2d` | Freeze / Archive candidate | Đã nằm trong tổ tiên `f69106e` & `v0.2.5` (`backup/recovery-carbon-b162a2d`). |
| `C:\Users\admin\Downloads\OLW-mission-02` | `codex/mission-02-sql-foundation` @ `33c4f18` | Audit pending | Giữ nguyên đến khi rà soát SQL parity trước cloud cutover. |
| `C:\Users\admin\Downloads\OLW-m02-m03-trial` | `codex/mission-025-trial` @ `d610ef3` | Audit pending | Giữ nguyên đến khi audit commit độc nhất. |
| `C:\Users\admin\Downloads\OLW-deepseek-night` | `deepseek/night-dev` @ `3dfd32c` | Audit pending | Chứa báo cáo review/handover lịch sử. |
| `C:\Users\admin\Downloads\OLW-gpt-night` | `gpt/night-dev` @ `a8b2468` | Audit pending | Chứa báo cáo domain review & integration gates. |
| `C:\Users\admin\Downloads\OLW-pr1-143f563`, `OLW-pr1-31559eb` | Detached (`143f563`, `31559eb`) | Audit pending | Worktree PR1 lịch sử. |
| Nhánh/tag sao lưu local | `integration/olw-canonical-rc1`, `backup/pre-release-main-34f58c7`, `backup/recovery-*`, tag `backup/owner-accepted-baseline` (`4cfc3b7`), `checkpoint/p0-cabacos-pet-7474eb0` | Keep local only | **Không xóa** trước khi audit commit độc nhất; **KHÔNG BAO GIỜ push** `backup/*` hay `4cfc3b7`. |

---

## 3. Mandatory Startup Gate (Chạy trước mọi thay đổi)

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git fetch origin main && git rev-parse origin/main
git merge-base --is-ancestor origin/main HEAD && echo "ANCESTRY_OK"
npm run assets:private:verify
```

**Điều kiện dừng ngay:**
- Working tree không phải repository dự án hoặc không chứa commit `origin/main` trong tổ tiên (`ANCESTRY_OK` thất bại).
- Đang ở trên nhánh feature cũ (`feature/multiplayer-hardening`, `feat/deep-farming-transplant`, `antigravity/*`) hoặc `detached HEAD` không tách từ `main`.
- Thiếu hoặc sai checksum ở `npm run assets:private:verify`.

---

## 4. Vòng đời Feature Worktree (Khởi tạo & Dọn dẹp An toàn)

### 4.1 Tạo worktree tính năng mới từ `origin/main`
Dùng script chuẩn [`scripts/init-feature-worktree.mjs`](../scripts/init-feature-worktree.mjs) (chạy từ primary workspace `C:\Users\admin\Downloads\Our_little_world`):

```bash
npm run worktree:new -- --name <ten-tinh-nang>
# Ví dụ với tiền tố cụ thể hoặc thư mục đích riêng:
npm run worktree:new -- --prefix fix --name safari-viewport-lock --dir C:\Users\admin\Downloads\OLW-fix-safari-viewport
```

Script tự động thực hiện và bảo vệ:
1. `git fetch origin main` và kiểm tra commit canonical mới nhất (từ chối nếu `main` phân kỳ với `origin/main`).
2. Từ chối ghi đè nếu branch (`feat/<slug>`) hoặc thư mục worktree đích đã tồn tại.
3. Tạo branch mới + `git worktree add` từ commit canonical mới nhất trên `origin/main`.
4. Đồng bộ an toàn 15 file private runtime assets qua allowlist của [`scripts/sync-private-assets.mjs`](../scripts/sync-private-assets.mjs) và kiểm tra SHA-256 checksum.
5. **Tuyệt đối không sao chép** `.env*`, credential/token hay `.dev-lan-state*.json`.

Sau khi script tạo xong, vào thư mục worktree mới được in ra và chạy `npm install`.

### 4.2 Dọn dẹp an toàn sau khi đã tích hợp vào `main`
**CẤM** dùng `git worktree remove --force`, `git branch -D`, `git reset --hard`, hoặc `git clean -fdx` trên worktree chưa audit. Chỉ xóa khi đã gộp xong:

```bash
# 1. Kiểm tra worktree sạch hoàn toàn (không còn thay đổi chưa commit)
git -C C:\Users\admin\Downloads\OLW-<slug> status --short
# 2. Xác nhận 100% commit trên nhánh tính năng đã nằm trong origin/main
git fetch origin main
git merge-base --is-ancestor feat/<slug> origin/main && echo "SAFE_TO_CLEANUP"
# 3. Gỡ worktree và xóa branch an toàn (dùng -d thường, không -D)
git worktree remove C:\Users\admin\Downloads\OLW-<slug>
git branch -d feat/<slug>
```

---

## 5. Chính sách Tích hợp & Bàn giao (Integration Policy)

- **Vai trò tách biệt:** Feature Agent chỉ phát triển trong worktree riêng trên nhánh `feat/*` / `fix/*` / `chore/*`. **Chỉ Integration & Release Agent** mới có quyền hợp nhất vào `main` tại `C:\Users\admin\Downloads\Our_little_world`, kiểm toán `git rev-list --objects`, chạy gate tích hợp và push `main` / tag.
- **Yêu cầu bàn giao mỗi feature:**
  1. Đã reconcile (`rebase` hoặc merge sạch) lên commit mới nhất của `origin/main`.
  2. Báo cáo rõ: SHA các commit, danh sách file thay đổi (đặc biệt file dùng chung như `App.tsx`, `WorldScene.ts`, `devLanServerPlugin.mjs`), kết quả focused tests + regression checks và hướng dẫn playtest cho chủ dự án.
  3. Bảo toàn toàn bộ hệ thống đã duyệt: artwork, 6 bản đồ & va chạm 16px, túi đồ Nuvora, âm thanh 5 track riêng tư + MIT/CC0 SFX, NET.1.1, Deep Farming A–G, Billiards V2, mèo 2D + 3D Pet Care V2 và tương thích `.dev-lan-state.json`.

---

## 6. Sổ tay Hệ thống con (`docs/handovers/`)

- [MULTIPLAYER.md](handovers/MULTIPLAYER.md) — NET.1/NET.1.1 WebSocket, `/__share/<token>`, reconnect & auth guards.
- [FARMING.md](handovers/FARMING.md) — Deep Farming Checkpoints A–G, catalog, crops/flowers/orchard/livestock/workshops/orders & visual scale.
- [BILLIARDS.md](handovers/BILLIARDS.md) — Billiards V2 fixed-timestep physics, NET.1 protocol sync & `billiards_matches` SQL.
- [ART_AND_ANIMATION.md](handovers/ART_AND_ANIMATION.md) — Maps `16×16`, Cozy Human V2, donor portals/shops, Nuvora HUD, music & SFX.
- [LIVING_PET.md](handovers/LIVING_PET.md) — Mèo 2D `Quýt`, 3D `vuena-cat.glb` Pet Care V2, living brain & CC0 vocalizations.
