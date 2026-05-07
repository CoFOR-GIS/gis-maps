# CFOR Standards

City of Fair Oaks Ranch GIS organizational standards. These apply to all CFOR GIS work, not just this project.

---

## Naming Conventions

### Feature Services

Pattern: `CoFOR[Dept]_[Theme]_[Component]` in PascalCase.

**Department codes:**
- `PW` — Public Works
- `U` — Utilities (Water, Wastewater)
- `ENG` — Engineering Services
- `ADM` — Administration
- `PD` — Police
- `FD` — Fire

**Examples:**
- `CoFORPW_CIP_Projects` ← this project
- `CoFORPW_Drainage_Inventory`
- `CoFORU_Hydrants`
- `CoFOR_Parcels`

### Service Item Titles

Pattern: `City of Fair Oaks Ranch [Theme] ([Tier])`

**Tier values:**
- `Authoritative` — primary editing service
- `Public View` — read-only view shared with public
- `Internal Editing` — internal staff editing service
- `Legacy` — deprecated service kept for reference

**Examples:**
- `City of Fair Oaks Ranch CIP Projects (Authoritative)`
- `City of Fair Oaks Ranch CIP Projects (Public View)` ← used in this project
- `City of Fair Oaks Ranch Drainage Inventory (Internal Editing)`

### Other

- **No Oxford commas** in titles, descriptions, or any user-facing text
- **Compound words** for multi-word terms: `stormwater`, `wastewater` (not `storm water`, `waste water`)

---

## Spatial Reference

- **Storage:** WKID 2278 — NAD83 Texas South Central, US Survey Feet
- **Source data:** WGS84 (4326) for ClearGov, lat/lon
- **Display:** Web Mercator (102100) — handled automatically by AGOL

When publishing services from ArcGIS Pro: WKID 2278 + Pro-published is the governance standard. Services created via AGOL UI may default to Web Mercator — these are non-authoritative.

---

## Field Visibility Standards

In public views, hide internal/sensitive fields:

| Field | Reason |
|-------|--------|
| `Created_User` | Internal username |
| `Cost_Code` | Internal accounting reference |
| `Editor` | Internal username |
| `CreationDate` | Often confusing vs business dates |
| `EditDate` | Often confusing vs business dates |

The CIP project doesn't have these fields, but the convention applies to all public views.

---

## Thumbnail Color Codes

When uploading service thumbnails (600×400 PNG), use these accent colors:

| Department | Color |
|------------|-------|
| PW (Public Works) | Orange |
| U (Utilities) | Blue |
| ADM (Administration) | Green |
| ENG (Engineering) | Gray/neutral |

CIP is a PW service → orange accent.

---

## Department Color Palettes

For dashboards and apps, six department color profiles exist. Each has a "dark" variant for header/dark mode, and a "light" variant for body/text.

| Department | Dark | Light |
|------------|------|-------|
| Admin | Cream `#FAF8F4` | Sage |
| Water | Navy | Light blue |
| Wastewater | Dark green | Emerald |
| Public Works | Dark warm | Amber |
| Planning | Dark stone | Gold |
| Public-facing apps | Cream `#FAF8F4` / Forest green `#1B3A2D` | — |

**This project uses the Public-facing apps palette** — cream + forest green.

---

## Typography

| Use Case | Display | Body |
|----------|---------|------|
| Operations apps (internal) | Bricolage Grotesque | Manrope |
| Public-facing apps | Playfair Display | DM Sans |

**This project uses Playfair Display + DM Sans.**

---

## CFOR Brand Colors

### Primary

| Color | Hex |
|-------|-----|
| Olive Green | `#8D956C` |
| Dark Blue | `#192737` |

### Secondary

| Color | Hex |
|-------|-----|
| Tan | `#D4CA96` |
| Light Blue | `#B0C1C9` |
| Red | `#A64850` |
| Dark Olive | `#717C60` |

### Public App Theme (additional)

| Color | Hex |
|-------|-----|
| Cream (background) | `#FAF8F4` |
| Forest Green (header) | `#1B3A2D` |

---

## Standing Technical Rules

These apply to all CFOR HTML deployments:

### 1. Favicon

Every HTML deployment includes:

```html
<link rel="icon" href="logo.svg" type="image/svg+xml">
```

Plus a local `logo.svg` file alongside the HTML.

### 2. Logo Embedding

The CFOR logo is always embedded inline as a base64 data URI:

- ViewBox: `0 0 954.59 861.88` (~1.11:1 aspect ratio)
- CSS classes: `.st0` = white, `.st1` = `#192737`, `.st2` = `#8d956c`
- Size: ~19KB raw / ~25KB base64
- Encode: `base64 -w 0 logo.svg`

**Never crop the logo to a circle.** Maintain its native aspect ratio.

### 3. AMD Load Order

Any UMD libraries (Chart.js, jsPDF, Shepherd.js) MUST load BEFORE the ArcGIS JS SDK in `<head>`. This avoids Dojo AMD hijacking.

```html
<!-- ✓ CORRECT -->
<script src="https://cdn.jsdelivr.net/npm/shepherd.js@11/..."></script>
<script src="https://js.arcgis.com/4.34/"></script>

<!-- ✗ WRONG -->
<script src="https://js.arcgis.com/4.34/"></script>
<script src="https://cdn.jsdelivr.net/npm/shepherd.js@11/..."></script>
```

### 4. REST Query Pattern

For direct REST queries to AGOL:

- **Always use POST** with `URLSearchParams` body, not GET
- **Paginate at 1,000 records** with `resultOffset` (check `supportsPagination` first)
- **Never use SDK-resolved `.url`** for raw fetch — hardcode REST endpoints separately

```javascript
// ✓ CORRECT
const params = new URLSearchParams({
  where: "1=1",
  outFields: "*",
  f: "json"
});
const response = await fetch(`${REST_ENDPOINT}/query`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: params
});
```

### 5. Authentication for Public Apps

Blanket-reject all `getCredential` calls:

```javascript
esriId.getCredential = function() {
  return Promise.reject(new Error("Public app — auth not available"));
};
```

Public apps use direct fetch to public view services, NOT authenticated SDK layer queries.

### 6. Map Centering

```javascript
// 1. Initialize with safe center/zoom
const view = new MapView({ center: [-98.629, 29.748], zoom: 13, ... });

// 2. After view ready, query FOR_Jurisdictional and goTo
await view.when();
await centerOnJurisdiction();  // queries FOR_Jurisdictional, goTo with padding
```

**Never** rely on `fullExtent` for invisible/initially-empty layers.

### 7. ArcPy Scripts

For all schema-modifying or data-modifying scripts:

- Use `GIS("pro")` for active Pro session (when using `arcgis` package — but prefer pure REST when possible)
- `_args` class fallback for exec()-mode (detect via `"__file__" not in globals()`)
- All schema-modifying scripts default to **dry-run**, require `--execute` flag
- Log to `logs/` subdirectory with timestamped filename

### 8. IIS Deployments

If hosting on `gis.local`:

- HTTP only (no HTTPS upgrade planned)
- SVG MIME type registered in `web.config`:
  ```xml
  <staticContent>
    <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
  </staticContent>
  ```

### 9. GitHub Pages Apps

Repository pattern:

- `cofor-gis/gis-apps` — OAuth/editing tools (e.g., MapExport, ParcelEditor)
- `cofor-gis/gis-maps` — public read-only viewers (e.g., Annexation History, this CIP map)

Folder-per-app structure:

```
gis-maps/
├── AnnexationHistory/
│   └── index.html
├── CIP/
│   └── index.html
└── MapExport/
    └── index.html
```

Redirect-based OAuth only (no popups).

### 10. AGOL Services Base URL

Always:

```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/
```

This is the base for all CFOR-owned hosted feature services.

---

## CFOR Code Style

### Python

- 4-space indentation
- Type hints encouraged but not required
- `or {}` pattern for None-safe dict navigation
- Logging via `logging` module, never `print()` in production scripts
- Configuration constants at top of file
- `if __name__ == "__main__":` guard for runnable scripts

### JavaScript

- 2-space indentation
- ES6+ syntax (arrow functions, async/await, template literals)
- No build step — vanilla JS only
- IIFE wrapper or `require([])` callback for scope isolation
- CSS custom properties for all theming

### HTML

- Single-file for public-facing apps
- Inline `<style>` and `<script>` blocks
- Logo as base64 data URI
- Semantic HTML (header, main, aside, etc.)
- ARIA labels for icon-only buttons

---

## Documentation Style

- Markdown for all docs
- One concept per file (don't combine "deployment" and "operations" in one doc)
- Frontmatter not required, but a clear H1 title and a one-line description after the title
- Cross-link related docs at the bottom of each file
- Use code blocks with language tags: ` ```python `, ` ```bash `, ` ```javascript `

---

## Related Patterns from Other Projects

When you need to do something this project hasn't done:

| Need | Reference Project |
|------|-------------------|
| OAuth/editing tools | ParcelEditor, MapExport (in `gis-apps` repo) |
| Internal IIS-hosted dashboard | Drainage Operations Dashboard (`gis.local/Drainage/`) |
| Public read-only viewer | Annexation History map (`cofor-gis.github.io/gis-maps/AnnexationHistory/`) |
| Field-data collection | Field Maps web maps for stormwater MS4 |
| OCR / document processing | Plat ROW/easement review pipeline |
| Multi-script ArcPy pipeline | Tyler EPS centerline integration |
| Guided tour (Shepherd.js) | Drainage Operations Dashboard |
| Time slider | Annexation History map |

---

*All CFOR GIS staff are expected to follow these standards on new projects.*
