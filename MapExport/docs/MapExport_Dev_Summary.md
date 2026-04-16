# CoFOR Map Export App — Development Summary

## Overview

Single-file HTML map export tool (`index.html`, ~3,258 lines) for the City of Fair Oaks Ranch. Built using ArcGIS JS SDK 4.31, jsPDF, Shepherd.js, and two custom Claude skills (`municipal-map-export-app`, `frontend-design`). The app lets staff compose, preview, and download maps as print-ready PDFs or digital PNGs with city branding, and includes a guided first-run tour.

**Deployment targets:**

- **IIS (internal):** `http://gis.local/MapExport/`
- **GitHub Pages (external):** `https://cofor-gis.github.io/gis-maps/MapExport/` — public read-only viewer variant in the `gis-maps` repo

**Current state:** Functional. All features working including dynamic polygon layer rendering with themed symbology from hosted view layers, guided user tour, and local SVG favicon.

---

## Recent Changes (April 2026)

### Added — Guided User Tour (Shepherd.js)

A first-run guided tour walks new users through the five-step export workflow using Shepherd.js 11.2.0. Key implementation details:

- **Welcome card** in the side panel appears ~1.2s after load for first-time visitors. Non-modal, two buttons: "Take the tour" / "No thanks". Either dismissal marks the tour as seen via `localStorage` key `cofor_mapexport_tour_seen_v1`.
- **Twelve tour steps** keyed to real DOM selectors: `.mode-toggle`, `#printSettings`, `#basemapGrid`, `#mapTitle`, `#layerSearchInput`, `#activeLayerList`, `#drawingToggle`, `#legendToggleBtn`, `#overlayToggle`, `#exportPrimary`, plus intro and conclusion cards.
- **Help button** in the header (next to coord badge) replays the tour on demand regardless of seen status.
- **Narrow screens** (<800px) skip the auto-prompt since the side panel becomes a bottom drawer and Shepherd positioning degrades. The Help button still works.
- **Graceful fallback** — if the Shepherd CDN is blocked, a console warning fires and the Help button hides itself. Core app is unaffected.
- **Version-gated storage key** — bump `_v1` to `_v2` in a future update to force re-run for all users after major UI changes.
- **Custom styling** overrides Shepherd defaults to match the CoFOR forest/gold/cream palette: forest header bar, gold-warm cancel icon, Playfair Display titles, DM Sans body, progress label ("STEP 3 OF 12") in the footer.

### Added — Local SVG Favicon

Two `<link>` tags in `<head>`:

```html
<link rel="icon" href="logo.svg" type="image/svg+xml">
<link rel="alternate icon" href="logo.svg">
```

Requires `logo.svg` to be deployed alongside `index.html`. For IIS, `web.config` must register the SVG MIME type:

```xml
<staticContent>
  <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
</staticContent>
```

The in-app header logo and loading overlay logo continue to use the embedded `LOGO_DATA_URI` base64 string — the favicon is the only place that reads from the filesystem.

### Fixed — AMD/UMD Load Order for Shepherd.js

Initial Shepherd integration placed the CDN script **after** the ArcGIS SDK, which caused the app to hang on the "Initializing Map Export Tool…" overlay indefinitely. Root cause matches the known Chart.js issue: Shepherd's UMD wrapper detected Dojo's global `define()` and registered itself as an anonymous AMD module instead of attaching `Shepherd` to `window`. Dojo's loader then waited forever for the unresolved define, blocking the `require([...])` block.

**Fix:** Load Shepherd before the ArcGIS SDK, same pattern as jsPDF:

```html
<!-- 1. jsPDF (UMD) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<!-- 2. Shepherd.js (UMD) — MUST load before ArcGIS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/css/shepherd.css">
<script src="https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/js/shepherd.min.js"></script>
<!-- 3. ArcGIS Dojo loader LAST -->
<link rel="stylesheet" href="https://js.arcgis.com/4.31/esri/themes/light/main.css">
<script src="https://js.arcgis.com/4.31/"></script>
```

This is now a general rule for this app: every UMD library goes before the ArcGIS SDK. The existing CoFOR standard for Chart.js extends to any UMD dependency.

---

## Resolved Bug — Polygon Layers Did Not Render

### Root Cause

AGOL hosted view layers can rename fields from the source feature layer, but the service's `drawingInfo` (which defines the renderer) still references the **source** field names and uses **label-style values** rather than the coded values stored in the data. The ArcGIS JS SDK renders client-side using the **view's** field names and actual data values, so:

1. **Field mismatch:** The renderer referenced `Land_Use` (source field name), but the view layer exposes the field as `Designation`. Every feature's `attributes["Land_Use"]` was `undefined`.
2. **Value mismatch:** The renderer expected human-readable labels like `"Existing Residential One: Under 0.3 Acres"`, but the data contained coded values like `"Existing Residential 1"`.

Both mismatches caused all features to silently fall through every unique-value class into the default symbol (which was null/transparent), producing invisible polygons. AGOL's own Map Viewer renders server-side and handles these mappings internally, so the layer appeared correct there.

### Fix — `fixRendererFields()` (3-tier field remap + fuzzy value remap)

The fix runs inside the `lyr.when()` callback for every dynamically added layer. It operates in two phases:

**Phase 1 — Field Name Resolution (3 tiers, synchronous → async fallback):**

| Tier | Method | Example |
|------|--------|---------|
| 1 | Exact match — renderer field exists in `lyr.fields` | No action needed |
| 2 | Alias match — renderer field matches a field's `.alias` | `Land_Use` → field with alias `Land_Use` |
| 3 | Value-probe — queries 50 features, scores each string field by how many feature values appear in the renderer's `uniqueValueInfos` | `Land_Use` → `Designation` (2/11 values matched exactly) |

**Phase 2 — Value Remapping (fuzzy word-overlap matching):**

After the field is resolved, compares the renderer's expected unique values against actual data values. For any unmatched pairs:

1. Tokenizes both values into lowercase words, masking decimal numbers (`0.3` → ignored) to prevent false digit matches.
2. Normalizes number-words to digits (`one` → `1`, `two` → `2`, etc.).
3. Scores each renderer↔data value pair by token overlap count + Jaccard similarity tiebreaker.
4. Greedy best-match pairing from highest score down (minimum 1 word overlap required).
5. Patches `uniqueValueInfos[].value` entries with the data values, preserving the original as `uvi.label` so the legend reads the human-friendly name.

### Affected Layers (confirmed fixed)

| Layer | Source Field | View Field | Renderer Values | Data Values |
|-------|-------------|------------|-----------------|-------------|
| Zoning (Public View) | `Land_Use` | `Designation` | `Existing Residential One: Under 0.3 Acres` | `Existing Residential 1` |
| Future Land Use (Public View) | `Use_` | `Designation` | `Civic & Community Facilities` | `Community Facilities District` |

### What Was Tried During Debugging

1. **Projection engine preload** — Added `esri/geometry/projection` to `require()` and called `projection.load()` before adding layers. This did not fix the polygon issue (projection was not the cause) but remains in production as a safety measure for layers with non-Web-Mercator spatial references (WKID 102740).
2. **`reactiveUtils.whenOnce` for late-arriving renderer** — Added a watcher for the edge case where `lyr.renderer` is null after `when()` resolves. Retained in production.
3. **Red override test** — Forced a bright red `simple-fill` renderer on polygon layers, which confirmed features were rendering fine — isolating the problem to the renderer, not feature fetching or projection.
4. **Diagnostic logging** — Added per-layer console output (field names, aliases, renderer field, UV values, feature query results, LayerView status). All removed for production.
5. **IdentityManager override tuning** — The original "surgical" override that passed non-error `getCredential` calls through to the SDK was still triggering login dialogs. Replaced with a blanket rejection (`esriId.getCredential = function() { return Promise.reject(...); }`) since only public layers are accessed.

---

## Technical Architecture

### File Structure (deployed)

```
MapExport/
  index.html          — Single self-contained app (~3,258 lines)
  logo.svg            — CoFOR logo for favicon (required at runtime)
  README.md           — Deployment and usage reference
  web.config          — IIS deployment only: SVG MIME type registration
```

### Load Order (Critical)

```html
<!-- 1. jsPDF (UMD) — must precede ArcGIS to avoid AMD define() capture -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<!-- 2. Shepherd.js (UMD) — same rule: before ArcGIS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/css/shepherd.css">
<script src="https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/js/shepherd.min.js"></script>
<!-- 3. ArcGIS JS SDK 4.31 — loads last -->
<link rel="stylesheet" href="https://js.arcgis.com/4.31/esri/themes/light/main.css">
<script src="https://js.arcgis.com/4.31/"></script>
```

### require() Modules

```
esri/config, esri/Map, esri/views/MapView, esri/layers/FeatureLayer,
esri/widgets/ScaleBar, esri/widgets/Zoom, esri/widgets/Locate,
esri/widgets/BasemapToggle (unused — replaced by basemap grid),
esri/layers/GraphicsLayer, esri/widgets/Sketch/SketchViewModel,
esri/identity/IdentityManager, esri/geometry/projection,
esri/core/reactiveUtils
```

### APP_CONFIG

| Field | Value | Notes |
|-------|-------|-------|
| `portalUrl` | `https://fairoaksranch.maps.arcgis.com` | CoFOR AGOL org |
| `mapCenter` | `[-98.69, 29.745]` | City center (fallback; overridden by boundary extent) |
| `mapZoom` | `14` | Initial zoom |
| `apiKey` | `""` (empty) | Set to enable vector basemaps |
| `basemap` | `"streets-navigation-vector"` | Used when apiKey is set; falls back to `"osm"` |
| `dpi` | `150` | PDF export resolution |

### Base Layers (hardcoded in APP_CONFIG.layers)

| Type | Source | Sublayer | Geometry | Renderer |
|------|--------|----------|----------|----------|
| Parcels | Portal Item `bd5079b30310433998c6a54652074dd6` → resolved to URL | 0 | Polygon | Simple (hardcoded — fill + outline) |
| Road Centerlines | `CoFORPW_Road_Centerline/FeatureServer` | 0 | Polyline | Simple (hardcoded) |
| Jurisdictional Boundaries | `FOR_Jurisdictional/FeatureServer` | 0 | Polygon | Simple (hardcoded — transparent fill, dashed outline) |

Parcels URL is resolved dynamically at runtime via `resolveItemUrl()` which fetches the item metadata from `fairoaksranch.maps.arcgis.com/sharing/rest/content/items/{id}?f=json` and extracts the `.url` property.

### Initialization Sequence

1. `projection.load()` — ensures client-side projection engine is ready.
2. `addConfigLayers()` — builds parcels (async URL resolution), roads, and boundaries with hardcoded renderers.
3. `syncBaseLayersToActive()` — populates the active layer list from `state.layerRefs`.
4. Zoom to city limits — `boundsRef.layer.queryExtent()` → `view.goTo()`.

All four steps run in sequence inside a `projection.load().then()` chain so that `state.layerRefs` is populated before the extent query runs.

### IdentityManager Strategy

```javascript
esriId.destroyCredentials();
esriId.getCredential = function() {
  return Promise.reject(new Error("Login suppressed — public access only"));
};
```

All `getCredential` calls are rejected unconditionally. This prevents the SDK from ever showing a sign-in dialog. Public layers load via direct FeatureServer URLs and do not require authentication. The `fixRendererFields()` workaround handles any client-side rendering mismatches that result from this approach.

### Guided Tour Implementation

Tour logic lives in a single IIFE at the bottom of the file (~lines 2830–3258). Structure:

```
(function() {
  TOUR_STORAGE_KEY = 'cofor_mapexport_tour_seen_v1'
  NARROW_BREAKPOINT = 800

  buildTour()          — returns new Shepherd.Tour with 12 steps
  markTourSeen()       — writes to localStorage
  tourHasBeenSeen()    — reads from localStorage
  startTour()          — closes any open popups, instantiates and starts
  showWelcomeCard()    — injects the non-modal prompt into .side-panel
  wireHelpButton()     — binds click handler to #helpBtn
  init()               — bootstraps on DOMContentLoaded
})();
```

Each step gets a progress label (`STEP N OF TOTAL`) injected into its footer via the `when.show` hook. Tour completion or cancellation both call `markTourSeen()`.

---

## Feature Inventory

### Working Features

- **Map loads** with OSM raster basemap (no API key required).
- **Map centers** on city limits at startup via `queryExtent()` on the Jurisdictional Boundaries layer.
- **Basemap selector** — 6 options in a grid: Streets (OSM default), Satellite, Hybrid, Topo, Light, Dark.
- **Base layers** — Parcels (labels via Arcade on `Address_Num_`), Road Centerlines (`FULL_NAME` labels), Jurisdictional Boundary (dashed outline). All have hardcoded renderers.
- **Layer search** — Fetches org ID from `fairoaksranch.maps.arcgis.com/sharing/rest/portals/self`, then searches `www.arcgis.com/sharing/rest/search` with `orgid:` filter for public Feature Services. Predictive text with highlighted matches. Each sublayer becomes its own entry.
- **Themed symbology** — Dynamically added layers with unique-value or class-breaks renderers display their full themed symbology. The `fixRendererFields()` function automatically resolves field name mismatches (source → view renaming) and value mismatches (labels → coded values) for hosted view layers.
- **Active layer list** — Per-layer cards with visibility toggle, opacity slider, rename (double-click), remove (✕), and Clear All button.
- **Layer symbology** — Simple layers get fill/outline/width controls. Complex renderers show "Themed" badge with no override controls. `applyLayerSymbology()` skips complex renderers.
- **Drawing tools** — SketchViewModel with Point, Line, Rectangle, Polygon, Text tools. Color picker, fill opacity slider, stroke opacity slider. Behind a toggle switch.
- **Text tool** — Click map to place text labels. Text input + font size selector. Stays active for rapid placement.
- **Graphic editor popup** — Click any drawn shape to edit color, fill, opacity. Text graphics get text/size fields. All shapes get a "Label" field that creates a companion text graphic. Delete button removes shape + companion.
- **Legend** — Togglable floating overlay on the map. Flat list of all visible layers and drawings with color swatches. Complex renderer layers expand to show each unique-value category. Legend composited into both PDF and PNG exports.
- **Export gating** — PDF/PNG buttons disabled until export frame is toggled on.
- **Export frame overlay** — Draggable, resizable (aspect-ratio locked), pointer-events passthrough for map interaction.
- **PDF export** — jsPDF with title block (logo, title, subtitle, department, date, north arrow, scale bar, coordinate system, disclaimer, neat line). Legend rendered via jsPDF drawing commands.
- **PNG export** — Canvas compositing with logo watermark + legend overlay. Dimension presets: 1:1, 16:9, 4:5.
- **10-second safety timeout** on loading overlay.
- **Guided tour** — First-run welcome card and on-demand Help button tour (Shepherd.js).
- **Local SVG favicon** — `logo.svg` deployed alongside `index.html`.

### Known Issues

1. **Basemap grid uses emoji icons** — These render inconsistently across OS/browsers. Could be replaced with SVG icons.
2. **Legend position in exports** — The legend is placed at a fixed offset (bottom-right for PNG, top-right for PDF). For some paper sizes or when the legend is long, it may overlap important map content.
3. **Mobile layout** — Responsive CSS exists (panel becomes bottom drawer below 800px) but has not been tested with the new features. Guided tour auto-prompt is suppressed on narrow screens as a precaution.
4. **Fuzzy value remap depends on word overlap** — If renderer labels and data values share no words in common, the remap will fail silently and those categories will not render. This has not been encountered in practice with CoFOR layers.
5. **Tour positioning near the bottom of the side panel** can cause the popover to float partially off-screen on short viewports. Users can scroll; Shepherd follows the target.

---

## Branding Reference

| Element | Value |
|---------|-------|
| Primary font | Playfair Display (headings) |
| Body font | DM Sans |
| Forest green | `#1B3A2D` |
| Gold accent | `#C8A94E` |
| Cream background | `#FAF6EE` |
| Stone/bark text | `#8B8573` / `#5C4F3C` |
| Logo viewBox | `0 0 954.59 861.88` (~1.11:1 aspect ratio) |
| Logo CSS classes | `.st0` white, `.st1` navy `#192737`, `.st2` sage `#8d956c` |
| Logo encoding | Base64 data URI embedded in `LOGO_DATA_URI` variable; also `logo.svg` file at deployment root for favicon |

---

## Key Decisions and Lessons Learned

1. **jsPDF must load before ArcGIS SDK** — AMD `define()` conflict.
2. **Shepherd.js must load before ArcGIS SDK** — same AMD `define()` conflict; generalizes to any UMD library.
3. **`"osm/standard"` is not a valid basemap in SDK 4.31** — causes silent failure where `view.when()` never resolves.
4. **SVG logo must be embedded as base64 for in-app use** — all external SVG loading approaches are fragile for the header/loading logo.
5. **Favicon can use a local file** — browsers load favicons independently of the JS app, so the `logo.svg` in the deployment folder works fine; IIS needs the SVG MIME type registered in `web.config`.
6. **Logo renders at natural aspect ratio** — no circular clipping; canvas pre-render at 477×431.
7. **`portalItem: { id }` triggers login prompts** — switched to direct URL construction for public layers.
8. **IdentityManager must reject all getCredential calls** — any passthrough to the original handler can trigger a login dialog. Blanket rejection is safe when only accessing public layers.
9. **`outFields: ["*"]` is required** for unique-value renderers to resolve.
10. **hexToRgba must return alpha as 0–1** — the ArcGIS JS SDK 4.x color array format is `[r, g, b, a]` where `a` is 0.0–1.0, NOT 0–255.
11. **Multi-sublayer services should create separate entries** — grouping them prevents independent control.
12. **Hosted view layers break client-side renderer field resolution** — views can rename fields from the source layer, but `drawingInfo` still references source field names. The SDK does a direct string match on `attributes[rendererField]` and silently fails. Fix: 3-tier field remap (exact → alias → value-probe).
13. **Hosted view layers break client-side renderer value resolution** — `drawingInfo` unique values can be human-readable labels while the data contains coded/abbreviated values. Fix: fuzzy word-overlap matching with number-word normalization.
14. **`projection.load()` must be awaited before adding layers** — without it, the client-side projection engine may not be ready for polygon reprojection from WKID 102740 to Web Mercator.
15. **Zoom-to-extent must run inside the async initialization chain** — moving `addConfigLayers()` into `projection.load().then()` means `state.layerRefs` is empty at the top-level scope; the `queryExtent()` call must be chained after `addConfigLayers()` resolves.
16. **Tour storage keys should be versioned** — `cofor_mapexport_tour_seen_v1` allows a future update to force a re-run for all users by bumping to `_v2` without needing any user action.
17. **Guided tours should degrade gracefully** — if the Shepherd CDN is blocked, the app still functions and the Help button hides itself.

---

## Code Map (approximate line ranges)

| Section | Lines | Notes |
|---------|-------|-------|
| CSS | 25–570 | Variables, layout, all component styles |
| HTML — Header | 650–665 | Fixed header bar with logo + Help button |
| HTML — Side Panel | 660–860 | Mode, basemap, details, layers, drawing, export sections |
| HTML — Map Area | 862–935 | MapView, extent overlay, legend overlay, graphic editor, scale info |
| APP_CONFIG | 940–990 | Configuration block |
| Logo base64 + pre-render | 990–1030 | LOGO_DATA_URI constant, canvas pre-render IIFE |
| State + UI functions | 1030–1100 | Mode toggle, orientation, overlay geometry, drag/resize |
| Layer list (legacy) | 1100–1110 | `buildLayerList()` — no-op, delegates to `renderActiveLayerList()` |
| Export pipeline | 1110–1500 | `doExport()`, `exportPDF()`, `exportPNG()`, `downloadCanvas()` |
| Map initialization | 1510–1545 | `require()`, IdentityManager override, basemap, MapView creation |
| Base layer construction | 1575–1695 | `resolveItemUrl()`, `addConfigLayers()`, projection load chain |
| Widgets + zoom to extent | 1715–1730 | Zoom, Locate, ScaleBar, zoom/scale sync |
| Drawing tools | 1740–1880 | SketchViewModel, text tool, tool buttons, color/fill/opacity handlers |
| Graphic editor | 1880–2090 | Click-to-edit popup, applyEditorToGraphic, label companion management |
| Unified layer management | 2090–2500 | activeLayers, search, `addLayerFromService()`, `fixRendererFields()`, `applyRendererToEntry()`, `renderActiveLayerList()`, symbology controls |
| Legend | 2520–2620 | `updateLegend()`, `getLegendItems()`, canvas/PDF compositing |
| Basemap selector + resize | 2620–2825 | Grid handler, window resize |
| Tour CSS | 2830–3000 | Help button, welcome card, Shepherd overrides |
| Tour logic | 3005–3258 | IIFE: step definitions, localStorage gate, bootstrap |
