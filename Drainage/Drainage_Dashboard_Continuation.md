# Drainage Dashboard — Continuation Summary

**Purpose:** Provide context for continuing modifications to the Drainage Operations Dashboard in a new chat thread.
**Last updated:** April 10, 2026
**Files:** `index.html` (dashboard), `logo.svg` (favicon, same folder), `README.md` (technical reference)
**Deploy path:** `gis.local/Drainage/`

---

## Current State

The dashboard is a single `index.html` file (no build process) that provides a public-facing overview of the City of Fair Oaks Ranch stormwater drainage infrastructure. It is fully functional pending one AGOL prerequisite: L4 (DrainageCulverts) must be added to the Public View service.

### What It Shows

1. **KPI Row** — Total infrastructure count, culvert count with material breakdown, channel mileage (from `Shape__Length ÷ 5280`), structure count
2. **Inspection Status** — SVG progress ring showing % inspected (based on `LastInspectionDate IS NOT NULL`), per-layer breakdown bars (Culverts, Structures, Channels)
3. **Condition Overview** — Three color-coded pills (Good/Fair/Poor) with counts and percentages aggregated across all layers
4. **Charts** — Stacked bar for condition by asset type, horizontal bar for culvert material distribution (both Chart.js 4.4.7)
5. **Map** — ArcGIS JS SDK 4.31, gray-vector basemap, centered on Fair Oaks Ranch (`[-98.69, 29.745]` zoom 13), auto-refines to jurisdictional boundary extent. Includes FEMA NFHL flood zones at 35% opacity (MapImageLayer, sublayer 28). Culverts color-coded by condition, structures by type, channels as dashed lines. Full page toggle button expands the map to fill the viewport (Escape to exit).
6. **Address Search** — Queries `ADDRESS` field on the Parcels_View public view service via hardcoded REST `fetch()` POST to `CTX.parcelsQuery`. Completely decoupled from the ArcGIS SDK auth pipeline — no portal item resolution, no SDK queryFeatures, just a plain fetch to the known public service URL.

### Technical Architecture

- **CDN load order:** Chart.js → ArcGIS SDK CSS → ArcGIS SDK JS (Chart.js must load first to avoid AMD `define()` conflict)
- **Auth suppression:** `esriId.getCredential` rejected to prevent login prompts on public layers
- **All data queries:** POST with URLSearchParams, 1000-record pagination against Public View FeatureServer
- **Logo:** Embedded as base64 data URI in `<img>` tag (~25KB)
- **Favicon:** References `logo.svg` in the same folder via `<link rel="icon" href="logo.svg" type="image/svg+xml">` (same pattern as WaterMeterEditor)
- **Color profile:** Public-facing — cream `#FAF8F4` background, forest green `#1B3A2D` accents, Playfair Display + DM Sans

### Key Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Drainage Public View | `.../City_of_Fair_Oaks_Ranch_Drainage_Inventory_(Public_View)/FeatureServer` | KPIs, charts, condition, inspection, map layers (L1–L4) |
| Parcels (Search) | `.../Parcels_View/FeatureServer/0/query` | Address search — hardcoded URL (field: `ADDRESS`), no SDK/portal dependency |
| Jurisdictional | `.../FOR_Jurisdictional/FeatureServer` | Map extent, boundary outline |
| Roads Public | `.../CoFORPW_Road_Public/FeatureServer/0` | Map context, labels at 1:8k |
| Parcels Public View | Portal Item `bd5079b30310433998c6a54652074dd6`, L0 | Map context at 1:18k |
| FEMA NFHL | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` (sublayer 28) | Flood zone overlay |

All services under `https://services6.arcgis.com/Cnwpb7mZuifVHE6A/ArcGIS/rest/services/`.

### Code Structure (inside single `<script>` IIFE)

| Function | Purpose |
|----------|---------|
| `qry(lid, p)` | Generic REST query helper — POST to `DRAINAGE/{lid}/query` |
| `cnt(lid, w)` | Shortcut for returnCountOnly queries |
| `grp(lid, fld)` | Group-by statistics query |
| `loadKPIs()` | Fetches counts, mileage, material stats → returns `{ total, matStats, counts }` |
| `loadInspections(counts)` | Queries `LastInspectionDate IS NOT NULL` per layer → ring + bars |
| `loadCondition()` | Groups Condition field across L1/L2/L4 → pills + returns `{ byLayer, combined }` |
| `buildConditionChart(byLayer)` | Chart.js stacked bar |
| `buildMaterialChart(ms)` | Chart.js horizontal bar |
| `initMap()` | ArcGIS require block — map, layers, search, zoom, full page toggle |
| `doSearch(text)` | Direct REST fetch to Parcels_View for address search |
| `init()` | Orchestrates load: KPIs → inspections → condition → charts → map |

### Known Issues & Gotchas

1. **L4 not yet on Public View** — Culvert queries and map layer will return 404 until L4 is added to the view
2. **`LastInspectionDate` field visibility** — Must be exposed on the Public View layers for inspection metrics to work; if hidden, queries return 0
3. **Address search URL and field** — Both are hardcoded: `CTX.parcelsQuery` points to Parcels_View/FeatureServer/0/query, field is `ADDRESS`. If the field name differs on a future schema change, update three places inside `doSearch()` (the `where` clause, `outFields`, and `f.attributes.ADDRESS`). To diagnose, run the test fetch from the README troubleshooting section in the browser console.
4. **Chart.js AMD conflict** — Chart.js MUST load before ArcGIS SDK. If swapped, `Chart` constructor is undefined.
5. **Parcels map layer** uses portalItem which depends on SDK portal resolution. If parcels don't render on the map, the portal item may need public sharing or could be switched to a direct URL like the other layers.

---

## Prerequisites Before Dashboard Goes Live

- [ ] Add L4 (DrainageCulverts) to Public View (Item `1632e151d2ff470bbb6159da4d93c8d4`)
- [ ] Add L4 to Maintenance View (Item `bed682f22d60495297efe6a691721b97`) with editing enabled
- [ ] Expose `LastInspectionDate` on all Public View sublayers
- [ ] Hide `Created_User` and `Cost_Code` on L4 in Public View
- [ ] Share all consumed layers publicly (Everyone)
- [ ] Copy `index.html` and `logo.svg` to `gis.local/Drainage/` on IIS
- [ ] Rename legacy `CoFORPW_Drainage_Culvert_Inventory` to "(Legacy)"

---

## Planned Enhancements (from Project Summary)

- **Short-term:** Implement Field Maps web map, populate DrainageStructures (L1) from line endpoints
- **Medium-term:** Populate DrainageBasins (L3) for MS4, build internal PW-themed dashboard at staff-only URL, add inspection history tracking
- **Long-term:** Condition trend analysis over time, ClearGov capital planning integration, CivicPlus iframe embed for public website
