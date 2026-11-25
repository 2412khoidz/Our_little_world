# PyDew (clear-code-projects/PyDew) — forest glade slice

**License:** CC0 — see `UPSTREAM-LICENSE.txt`  
**OLW status:** `partial_reuse` (`glade-v1-playable` tilemap)

This folder vendors **metadata only** (no PyDew tile sprites):

| File | Purpose |
|------|---------|
| `MANIFEST.json` | Upstream pin + slice id |
| `forest-glade-slice.json` | Portal tile coords for Cabacos village ↔ forest |
| `UPSTREAM-LICENSE.txt` | CC0 attribution |

## Import

```bash
npm run import-donor:pydew-forest
```

Rebuilds `forest.json` as a playable glade (cozy tileset): collision, path spine, west/east portal art. Patches Cabacos `village-to-forest`.

```bash
node scripts/capture-donor-pydew-forest.mjs
```

## Tests

- `tests/unit/pydewForestSlice.test.ts`
- `tests/e2e/pydew-forest-portal-smoke.spec.ts`