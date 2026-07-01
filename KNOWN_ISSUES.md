# Known issues / future repair

## 1. `xlsx` (SheetJS) npm advisory — low practical risk here

The `.xlsx` export (`server/index.js` → `GET /api/export.xlsx`) uses the `xlsx`
(SheetJS) package, pinned at `0.18.5` — the last version published to the npm
registry. That version carries known advisories:

- **Prototype pollution** (GHSA-4r6h-8v6p-xvw6)
- **Regular-expression denial of service / ReDoS** (GHSA-5pgg-2g8v-p4x9)

There is **no fixed release on npm** — SheetJS moved fixes to their own CDN build.

**Why it's low risk for this app:** both advisories are triggered when *parsing*
untrusted spreadsheet input. This app only ever **writes** a workbook from its own
local data and sends it to the browser; it never reads/parses an uploaded file. For a
local, single-user tool the exposure is negligible. `npm audit` will still flag it.

**Future repair options (pick one):**
1. Move `.xlsx` generation to SheetJS's maintained CDN build instead of the npm package.
2. Replace SheetJS with `exceljs` (actively maintained, on npm).
3. Drop the dependency entirely and hand-write the minimal OOXML (a zipped set of XML
   parts) for the single "Portfolio" sheet — removes the advisory and the dependency.
   The `.csv` export already needs no dependency and covers most paste-into-Excel needs.

## 2. Environment note — WSL ↔ Windows networking (not an app bug)

During development, the Claude-in-Chrome extension (Windows Chrome) could not reach the
dev server running inside WSL at `localhost:4000` or the WSL IP. Direct browser use on
the same machine generally works via WSL2 localhost forwarding; if it doesn't, use the
WSL IP (`hostname -I`) or set up a `netsh portproxy` on the Windows side.
