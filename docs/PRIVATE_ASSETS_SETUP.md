# Private Runtime Assets Setup & Parity

Tài liệu này mô tả cách đồng bộ **runtime private assets** giữa các worktree của **Our Little World** mà không commit tài sản có bản quyền, không sao chép `.env`/token và không ghi đè file save `.dev-lan-state*.json`.

## Danh sách file bắt buộc (15 file, gitignored)

1. `public/assets/private-unified/`
   - `world.png`, `world-props.png`, `avatars.png`
   - `manifest.json`, `props-manifest.json`, `CREDITS.md`
   - `donor-pydew-characters/CREDITS.md`, `farmer-may-atlas.png`, `farmer-nang-atlas.png`, `farmer-rose-atlas.png`
2. `public/assets/private-audio/music/`
   - `home_garden_theme.mp3`
   - `farm.mp3`
   - `blue_forest.mp3`
   - `beach.mp3`
   - `pet_care.mp3`

## Lệnh kiểm tra & đồng bộ chuẩn giữa các worktree

```bash
# 1) Đồng bộ từ worktree đã duyệt (chỉ copy allowlist 15 file, tạo .asset-checksums.json local)
npm run assets:private:sync -- --from ../OLW-Neon

# 2) Kiểm tra đủ 15 file, khớp kích thước PNG <-> manifest JSON, bounds và SHA-256 checksum
npm run assets:private:verify

# 3) Tái tạo local checksum manifest sau khi build lại private atlas
npm run assets:private:manifest
```

## Quy tắc an toàn Git History

- Cả `public/assets/private-unified/` và `public/assets/private-audio/` đều bị chặn trong `.gitignore`.
- Không đẩy (`git push`) tag backup `backup/owner-accepted-baseline` (`4cfc3b7`) vì commit đó từng chứa 4 file nhạc `.mp3` trong `public/assets/audio/music/`.
- Lịch sử cũ trước `4d875b4` (trên `origin/antigravity/unified-neon-carbon` @ `a0c8f80`) từng chứa `public/assets/audio/music/home_garden_theme.mp3` (đã xóa ở `4d875b4`); chỉ đẩy lên remote sau khi chủ dự án xác nhận phạm vi history.
