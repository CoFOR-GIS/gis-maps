# Architecture

System design, data flow, and architectural decisions for the CIP Map project.

---

## System Overview

The CIP Map system has four layers that interact via well-defined boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│  ClearGov Public API                                            │
│  cleargov.com — managed by ClearGov, not by CFOR                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS GET (no auth)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Python Sync Layer                                              │
│  sync_cleargov_cip.py — runs in ArcGIS Pro Python env           │
│  - Fetches all 5 capital plans                                  │
│  - Extracts geometry from GeoJSON Feature wrappers              │
│  - Projects WGS84 → NAD83 TX South Central via arcpy            │
│  - Authenticates to AGOL via REST token                         │
│  - Truncates and re-populates 3 sublayers                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS POST (token auth)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ArcGIS Online — Authoritative Tier                             │
│  CoFORPW_CIP_Projects (hosted feature service)                  │
│  - Owner: EMartz                                                │
│  - WKID 2278 (NAD83 TX South Central)                           │
│  - Layer 0: Points · Layer 1: Lines · Layer 2: Polygons         │
│  - Capabilities: Query, Create, Update, Delete (admin only)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ View layer reference
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ArcGIS Online — Public View Tier                               │
│  City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)             │
│  - Same layer count, linked schema                              │
│  - Capabilities: Query only (read-only)                         │
│  - Sharing: Everyone (Public)                                   │
│  - Hidden fields: Created_User, Cost_Code (CFOR standard)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS POST (no auth)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Web Map (Static)                                               │
│  index.html on GitHub Pages                                     │
│  - ArcGIS JS SDK 4.34 imperative API                            │
│  - Direct fetch to public view REST endpoints                   │
│  - Blanket-rejects esriId.getCredential                         │
│  - Three FeatureLayer instances + UI panels                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Sync Direction (write path)

1. **Trigger:** Manual run of `python sync_cleargov_cip.py` in ArcGIS Pro Python Command Prompt
2. **Fetch:** Sequential GET requests to ClearGov for each of 5 capital plans
3. **Parse:** Extract `name`, `status`, `financial.allocated`, `financial.spent`, `progress.percentage`, `departmentName`, dates, description, and `mapSettings.location.value.mapBoxFeatures` from each project
4. **Geometry extraction:**
   - Markers (points): `{lat, lng}` at top level
   - Polygons array (lines + polygons): GeoJSON Feature with nested `geometry.type` and `geometry.coordinates`
5. **Projection:** Transform from WGS84 (4326) to NAD83 TX South Central (2278) using `arcpy.PointGeometry/Polyline/Polygon.projectAs()`
6. **Authentication:** POST to `/sharing/rest/generateToken` with username/password → receive token (2-hour expiry)
7. **Service search:** GET `/sharing/rest/search` for existing service
8. **If exists:** POST `/FeatureServer/{id}/deleteFeatures` with `where=1=1` for each layer (truncate)
9. **If new:** POST `/sharing/rest/content/users/{u}/createService` then `/admin/services/.../addToDefinition`
10. **Populate:** POST batches of 250 features to `/FeatureServer/{id}/addFeatures`

### Read Direction (web map path)

1. **Page load:** Browser requests `index.html` from GitHub Pages CDN
2. **SDK load:** `<script src="https://js.arcgis.com/4.34/">` registers `require()`
3. **Module resolution:** `require([Map, MapView, FeatureLayer, ...])` loads modules
4. **Auth blocking:** `esriId.getCredential = () => Promise.reject(...)` — prevents the SDK from prompting for sign-in if any layer turns out to need auth
5. **Layer creation:** Three `new FeatureLayer({url, renderer, popupTemplate, labelingInfo})` instances
6. **Map creation:** `new Map({basemap, layers})` then `new MapView({container, map, ...})`
7. **View ready:** `await view.when()` resolves when MapView has rendered
8. **Centering:** Direct fetch to `FOR_Jurisdictional` for extent, then `view.goTo()` with `padding: { right: 380 }`
9. **Data load:** Three parallel POSTs to `/FeatureServer/{id}/query` for stats and directory population (separate from layer rendering)
10. **UI:** Render stats panel, populate directory list, attach event handlers

---

## Component Responsibilities

### Python Sync Script

**Owns:**
- ClearGov API contract knowledge
- Geometry extraction logic
- Coordinate transformation
- AGOL service schema definition
- Service create vs update branching

**Does NOT:**
- Perform incremental updates (always truncate-and-replace)
- Validate data quality beyond required fields
- Notify users of sync results (only logs)

### ArcGIS Online

**Owns:**
- Persistent storage of project features
- Field schema enforcement
- Public sharing/permissions
- Spatial reference

**Does NOT:**
- Run any custom logic (no GeoEvent, no notebooks)
- Provide editing interface to public

### Web Map

**Owns:**
- All visual presentation
- Filter and search behavior
- User interaction (click → zoom, etc.)
- Stats calculation (client-side)

**Does NOT:**
- Maintain state between sessions (no localStorage)
- Authenticate users
- Allow editing
- Cache data (relies on browser HTTP caching only)

---

## Key Architectural Decisions

### 1. Why Python Sync Instead of Webhook / GeoEvent / Notebook?

**Considered:**
- ClearGov webhook → AGOL (would require always-on endpoint)
- AGOL Notebook scheduled task (requires Notebook Server license)
- ArcGIS GeoEvent (overkill, requires server license)

**Chosen:** Python script in ArcGIS Pro

**Reasons:**
- Zero additional infrastructure
- Uses existing ArcGIS Pro license
- Easy to debug (interactive Python window)
- Matches CFOR's other ArcPy scripting patterns
- Works whether run manually or via Task Scheduler

### 2. Why Truncate-and-Replace Instead of Diff/Merge?

**Considered:** Detect changed projects via `updatedAt` field, only update modified records

**Chosen:** Delete all features, re-add all features

**Reasons:**
- ClearGov has ~30 projects total — performance is irrelevant
- Truncate-and-replace handles deletes naturally (a project removed from ClearGov disappears from the map)
- No state tracking complexity
- One sync method covers create/update/delete

### 3. Why Three Sublayers Instead of One?

**Considered:** Single layer with `Esri Geometry Type` mixed (not actually supported in feature services)

**Chosen:** Three separate sublayers in one Feature Service

**Reasons:**
- AGOL feature services require homogeneous geometry per layer
- Allows different symbology per geometry type
- Maintains category-based color coding consistently
- Single service item in AGOL (not three separate ones)

### 4. Why Direct REST Fetch in Web Map Instead of FeatureLayer Queries?

**Used:** `FeatureLayer.queryFeatures()` for popups and zoom-to logic
**Used:** Direct `fetch()` POST for stats panel and directory population

**Reasons:**
- Direct fetch happens before/in parallel with map init — no need to wait for view ready
- Direct fetch is decoupled from any auth issues
- Aligns with established CFOR pattern (Drainage Dashboard, MapExport)
- Easier to debug network issues in browser DevTools

### 5. Why Public View Instead of Sharing Authoritative?

**Considered:** Just share the authoritative service publicly

**Chosen:** Create separate view, share view publicly, keep authoritative private

**Reasons:**
- Allows hiding internal fields per CFOR governance
- Restricts public capabilities to Query only
- Decouples public-facing schema changes from internal schema changes
- Matches established CFOR public view pattern
- Allows independent permission changes without touching authoritative

### 6. Why Imperative `new Map()` Pattern Instead of `<arcgis-map>` Web Component?

**Initially used:** `<arcgis-map>` web component (per memory notes)

**Switched to:** Imperative `new Map()` + `new MapView()`

**Reasons:**
- Web component requires a separate `arcgis-map-components.esm.js` script tag
- Imperative is consistent with `require([])` pattern already in use
- `await view.when()` is more reliable than polling for component readiness
- One less external dependency to debug

### 7. Why GitHub Pages Instead of IIS / AGOL Hub / S3?

**Chosen:** GitHub Pages

**Reasons:**
- Free for public repos
- Built-in CDN
- Git-based deployment matches CFOR's `cofor-gis.github.io` pattern
- No HTTPS configuration needed (auto)
- Fits the read-only public viewer use case

---

## Standards and Conventions

### Naming

- **Authoritative service:** `CoFORPW_CIP_Projects` (CFOR + Dept + Theme + Component, PascalCase)
- **Public view:** `City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)` (auto-generated by AGOL from title)
- **Layers within service:**
  - Layer 0: `CoFORPW_CIP_Projects_Point`
  - Layer 1: `CoFORPW_CIP_Projects_Line`
  - Layer 2: `CoFORPW_CIP_Projects_Polygon`

### Spatial Reference

- **Storage:** WKID 2278 (NAD83 Texas South Central, US Survey Feet)
- **Source data:** WGS84 (lat/lon from ClearGov)
- **Display:** Web Mercator (102100) — handled automatically by AGOL

### Field Schema

| Field Name | Type | Length | Source |
|------------|------|--------|--------|
| `OBJECTID` | Integer | — | Auto |
| `ProjectID` | Integer | — | ClearGov `id` |
| `ProjectName` | String | 255 | ClearGov `name` |
| `Category` | String | 50 | Plan name (Water, Wastewater, ...) |
| `Status` | String | 50 | ClearGov `status` |
| `Department` | String | 100 | ClearGov `departmentName` |
| `Description` | String | 2000 | ClearGov `description` (truncated) |
| `StartDate` | String | 50 | ClearGov `startDate` (formatted MM/DD/YYYY) |
| `EndDate` | String | 50 | ClearGov `endDate` |
| `BudgetAllocated` | Double | — | ClearGov `financial.allocated` |
| `BudgetSpent` | Double | — | ClearGov `financial.spent` |
| `ProgressPercent` | Double | — | ClearGov `progress.percentage` |
| `LastUpdated` | String | 50 | Sync run timestamp |

Dates stored as strings (rather than `esriFieldTypeDate`) intentionally — simpler client-side rendering, no timezone conversion issues.

### Category Colors (CFOR Brand)

| Category | Color | Hex |
|----------|-------|-----|
| Water | Light Blue | `#B0C1C9` |
| Wastewater | Dark Blue | `#192737` |
| Roadway | Olive Green | `#8D956C` |
| Drainage | Dark Olive | `#717C60` |
| Building | Red | `#A64850` |

### Web Map Theme (CFOR Public App Pattern)

- **Background:** Cream `#FAF8F4`
- **Header:** Forest Green `#1B3A2D`
- **Headings:** Playfair Display
- **Body:** DM Sans

---

## Performance Characteristics

| Operation | Expected Duration |
|-----------|-------------------|
| Sync (one full run) | 30-90 seconds |
| Web map cold load | 2-4 seconds |
| Filter/search (client-side) | <100ms |
| Click to zoom + popup | <500ms |
| Stats panel render | <200ms (after data load) |

Data volume is small enough (~30 features) that no pagination, caching, or lazy loading is needed.

---

## Security Model

- **Sync credentials:** Stored as Windows env vars or prompted interactively. Never committed to source control.
- **Public view:** Read-only, no authentication required. URL is intentionally public.
- **Authoritative service:** Owner-only by default. Editable only by EMartz.
- **Web map:** Static HTML, no server-side code, no input validation needed.
- **Token leakage:** Tokens are never logged. Logs only show username and authentication success/failure.

---

## Disaster Recovery

| Scenario | Recovery |
|----------|----------|
| Web map breaks | Roll back HTML in Git, push |
| Public view deleted | Recreate via AGOL UI from authoritative service |
| Authoritative service deleted | Re-run `sync_cleargov_cip.py` |
| All AGOL content deleted | Re-run sync (creates new service from scratch) |
| Python script lost | Recover from GitHub repo |
| ClearGov API changes | Run `dump_cleargov_structure.py`, update extraction logic |

The system has no irreplaceable state — everything is reproducible from ClearGov + the scripts.

---

*See [TECHNICAL.md](TECHNICAL.md) for implementation details, [OPERATIONS.md](OPERATIONS.md) for day-to-day usage.*
