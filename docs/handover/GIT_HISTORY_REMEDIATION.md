# Git History — Dev LAN State Leak (P1)

**Phạm vi PR #1:** commit `9ec4234` thêm `.dev-lan-state-pw-4176.json`; `6889996` xóa file khỏi HEAD.  
**HEAD hiện tại:** file **không** tracked; `.gitignore` có `.dev-lan-state-pw-*.json`.

## Đánh giá nội dung (không sao chép vào repo)

| Câu hỏi | Kết luận |
|---|---|
| Fixture test hay dữ liệu thật? | **Dev LAN fixture** — cấu trúc `profiles`, `worlds`, `v015`, idempotency giống seed E2E |
| UUID trong file | Pattern test cố định (`11111111-…`, `22222222-…`) + world id generate — **không** phải production user |
| Email / mật khẩu / token API | **Không phát hiện** key dạng `password`, `service_role`, PEM trong object structure scan |
| Kích thước ~25 KiB | Snapshot runtime Playwright/Dev LAN một phiên test, không media |

**Rủi ro:** File vẫn **có thể đọc** trên GitHub tại commit `9ec4234` cho tới khi history được rewrite (nếu chủ dự án quyết định). Squash merge **không** xóa blob cũ khỏi history của branch đã push.

## Các commit khác trên `cursor/cloud-handover-36fd`

Quét tên file: chỉ `.dev-lan-state-pw-4176.json` là state nhạy cảm; không commit `.env`, `.pem`, `private-unified`, `asset-candidates`.

## Phòng ngừa (đã làm)

- `.gitignore`: `.dev-lan-state.json`, `.dev-lan-state-pw-*.json`
- Playwright: `OLW_DEV_LAN_STATE_FILE` mặc định theo port (ngoài repo)

## Phương án clean branch (chờ phê duyệt chủ dự án — **không** tự force-push)

1. Từ `integration/night-merge` tạo `cursor/cloud-handover-36fd-clean` (hoặc cherry-pick).
2. Cherry-pick **chỉ** các commit net diff (handover docs, guards, PWA fix, Python tooling) — bỏ qua `9ec4234` hoặc pick sau khi đã revert file state.
3. Hoặc `git diff integration/night-merge...cursor/cloud-handover-36fd` → một commit sạch.
4. Force-push **chỉ** sau khi chủ dự án đồng ý; đóng PR cũ hoặc retarget.

## Nếu cần gỡ blob khỏi history GitHub

- Cần `git filter-repo` / BFG trên repo **sau approval**; rotate chỉ khi từng có secret thật (hiện **không** báo blocker secret).

## Blocker secret

**Không** — fixture Dev LAN. Không cần rotate production credentials cho incident này.