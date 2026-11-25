# OLWH-40 — full donor map transplant (recovery only)

Owner sprint: replace procedural / GID-remap maps with **vendored donor TMX/JSON + native tilesets**.

- **Brief (canonical):** store `docs/world-map-transplant-sprint.md` on the project agent store.
- **Integration queue + screenshot gate:** store `internal/olwh-40-map-transplant-integration.md`.
- **Branch:** `integration/donor-reuse-recovery` only — do **not** merge zone PRs to `integration/donor-reuse-preview`.
- **Frozen tip:** merge only after per-zone `media/map-transplant-<zone>-donor.png` + `map-transplant-<zone>-olw.png` land in store.

PR **#61** (`OLW_MAP_RECOVERY` import flags) is **not** sufficient; this sprint requires full map render per zone rules in the brief.