# PyDew (clear-code-projects/PyDew) — forest glade slice

**License:** CC0 — see `UPSTREAM-LICENSE.txt`  
**OLW status:** `partial_reuse` (portal smoke slice)

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

Patches `forest.json` (`olwDonor=pydew`) and adds `village-to-forest` on Cabacos `village.json`. Forest art stays cozy procedural until a future tile transplant.

## Tests

- `tests/unit/pydewForestSlice.test.ts`
- `tests/e2e/pydew-forest-portal-smoke.spec.ts`