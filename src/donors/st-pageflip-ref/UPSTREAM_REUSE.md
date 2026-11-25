# StPageFlip / react-pageflip — reuse evidence

| Field | Value |
|-------|--------|
| Package | `react-pageflip@2.0.3` (wraps [StPageFlip](https://github.com/Nodlik/StPageFlip)) |
| License | MIT |
| OLW branch | `cursor/scrapbook-album-c2-302d` on `integration/preview-art-recovery` |
| Replaces | `PhotoFrameModal` static preset carousel |

## Transplant

| Donor pattern | OLW |
|---------------|-----|
| Page-flip book UI | `ScrapbookAlbumModal.tsx` + `HTMLFlipBook` |
| Polaroid card layout | `scrapbookAlbum.css` + `ScrapbookFlipPage` |
| Stickers / upload / 2P | `COUPLE_SCRAPBOOK` realtime + `localStorage` per `worldId` |

Owner recovery brief: [`docs/owner-reject-8e4454d-recovery.md`](../../../docs/owner-reject-8e4454d-recovery.md) § Album.