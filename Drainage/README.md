# Drainage Operations Dashboard — Technical Reference

**File:** `index.html`
**Deploy path:** `gis.local/Drainage/index.html`
**Author:** Ernie Martz, GIS Administrator
**Last updated:** April 2026

---

## Overview

Single-file HTML dashboard providing a public-facing summary of the City of Fair Oaks Ranch stormwater drainage infrastructure. Displays asset counts, inspection coverage, condition assessments, material distribution and an interactive map with address search. Designed for sharing with council, stakeholders and the general public without requiring an AGOL login.

---

## Architecture

The dashboard is a single `index.html` file with no build process, no server-side dependencies and no authentication requirement. All data is fetched at runtime from publicly shared AGOL feature services via REST POST queries. The file can be served from IIS, GitHub Pages, or opened directly from disk (`file://`).

### CDN Dependencies

| Library | Version | CDN URL | Purpose |
|---------|---------|---------|---------|
| Chart.js | 4.4.7 | `cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js` | KPI charts |
| ArcGIS JS SDK | 4.31 | `js.arcgis.com/4.31/` | Map, layer rendering, spatial queries |
| Google Fonts | — | `fonts.googleapis.com` | Playfair Display + DM Sans |

**Critical load order:** Chart.js must load before the ArcGIS SDK. The SDK's AMD loader (`define()`) conflicts with Chart.js if Chart.js loads second. This is enforced by the `<script>` tag order in `<head>`.

### Design System

This dashboard follows the **public-facing color profile** established across CoFOR GIS applications.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#FAF8F4` | Page background (light cream) |
| `--accent` | `#1B3A2D` | Primary text, headings (forest green) |
| `--green` | `#3A8A5C` | Good condition, high coverage |
| `--amber` | `#C4860B` | Fair condition, moderate coverage |
| `--red` | `#C0392B` | Poor condition, low coverage |
| `--font-display` | Playfair Display | Section headings, KPI values |
| `--font-body` | DM Sans | Body text, labels, chart text |

This is distinct from the **internal PW operations profile** (`#1F1E1A`/`#D49A4E`, Bricolage Grotesque + Manrope) used on staff-only dashboards like the Water Utility Operations Dashboard.

---

## Data Sources

All queries target the **Public View** feature service. This is a hosted view layer that exposes read-only data without requiring authentication.

### Primary Service

**Drainage Inventory (Public View)**
- **Variable:** `DRAINAGE`
- **URL:** `https://services6.arcgis.com/Cnwpb7mZuifVHE6A/ArcGIS/rest/services/City_of_Fair_Oaks_Ranch_Drainage_Inventory_(Public_View)/FeatureServer`
- **Item ID:** `1632e151d2ff470bbb6159da4d93c8d4`

| Sublayer | Name | Geometry | Key Fields |
|----------|------|----------|------------|
| `/1` | DrainageStructures | Point | `FeatureID`, `FeatureType`, `Condition`, `LastInspectionDate` |
| `/2` | DrainageChannels | Polyline | `FeatureID`, `Condition`, `Shape__Length`, `LastInspectionDate` |
| `/3` | DrainageBasins | Polygon | (map reference only, no queries) |
| `/4` | DrainageCulverts | Polyline | `FeatureID`, `FeatureType`, `Material`, `Width`, `Condition`, `LastInspectionDate` |

### Context Layers

| Layer | Variable/Config | URL / Item | Purpose |
|-------|----------------|------------|---------|
| Jurisdictional Boundary | `CTX.jurisdictional` | `.../FOR_Jurisdictional/FeatureServer` | Map extent initialization, boundary outline |
| Parcels (Public View) | `CTX.parcels` | Portal Item `bd5079b30310433998c6a54652074dd6`, L0 | Address search, map context at 1:18k |
| Roads (Public View) | `CTX.roads` | `.../CoFORPW_Road_Public/FeatureServer/0` | Map context with labels at 1:8k |
| FEMA NFHL | `nfhl` | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` (sublayer 28) | National Flood Hazard Layer zones at 35% opacity |

### Authentication Suppression

The dashboard overrides `esriId.getCredential` with a blanket rejection to prevent login prompts when loading public layers:

```javascript
esriId.getCredential = function () {
    return Promise.reject(new Error("Auth suppressed"));
};
```

**If you see a login dialog**, it means one of the consumed layers is not shared publicly. Check the sharing settings on all referenced portal items and feature services in AGOL.

---

## Dashboard Sections

### 1. KPI Row (4 cards)

| Card | Data Source | Query |
|------|------------|-------|
| Total Infrastructure | L1 + L2 + L4 | `returnCountOnly` on each |
| Culverts | L4 | Count + `groupByFieldsForStatistics` on `Material` for subtitle |
| Miles of Drainage Channels | L2 | `sum` statistic on `Shape__Length`, converted from feet to miles (`÷ 5280`) |
| Structures | L1 | `returnCountOnly` |

### 2. Inspection Status (2 cards)

**Left card — Progress ring:** Shows overall % of assets inspected across all three editable layers (L1, L2, L4). The ring color shifts based on coverage: red (<25%), amber (25–59%), green (≥60%).

**Right card — Breakdown bars:** Per-layer horizontal bars showing `inspected / total` for culverts, structures and channels individually.

**How inspection is determined:** The dashboard counts features where `LastInspectionDate IS NOT NULL` as inspected. This is a straightforward presence check — it does not consider inspection age or recency.

**Troubleshooting inspections showing 0%:**
1. Verify `LastInspectionDate` field exists on the Public View layers (not just the authoritative service)
2. Verify the field is not hidden in the view definition
3. Verify at least some features have non-null values in that field
4. Check the browser console for 400 errors on the inspection count queries — a 400 with `"Invalid field"` confirms the field isn't exposed on the view

### 3. Condition Overview (3 pills)

Aggregates `Condition` field values across L1, L2 and L4 using `groupByFieldsForStatistics`. Displays count and percentage for Good, Fair and Poor. Features with null or unrecognized condition values are excluded from the percentage denominator.

### 4. Charts (2 cards)

**Condition by Asset Type** — Stacked bar chart (Chart.js). Each bar represents one layer (Culverts, Channels, Structures) with Good/Fair/Poor segments.

**Culvert Material** — Horizontal bar chart showing material type distribution from the `Material` field on L4. Sorted descending by count.

### 5. Map

**Basemap:** `gray-vector` (Esri). Requires no API key for public use.

**Initial view:** The MapView is initialized with `center: [-98.69, 29.745], zoom: 13` (centered on Fair Oaks Ranch) so the map never starts at the world view. Once both the view and the Jurisdictional Boundary layer are ready, a `queryExtent()` + `view.goTo(extent.expand(1.05))` refines the extent to fit the city boundary precisely.

**Layer draw order** (bottom to top): Jurisdictional Boundary → Parcels (1:18k) → Roads (1:24k, labels at 1:8k) → FEMA NFHL (35% opacity) → Drainage Basins → Channels → Culverts → Structures.

**FEMA National Flood Hazard Layer:** Added as a `MapImageLayer` from `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` with sublayer 28 (S_Fld_Haz_Ar — flood zone polygons) visible. Rendered at 35% opacity so drainage features remain clearly visible on top. This is a public federal service requiring no authentication. FEMA uses its own symbology (blue shading for A/AE/AH zones, orange for X500, etc.). If the FEMA service is temporarily unavailable, the layer simply won't render — it does not block the rest of the dashboard.

**Culvert symbology:** Unique-value renderer on `Condition` field. Good = green (`#3A8A5C`), Fair = amber (`#C4860B`), Poor = red (`#C0392B`), unassessed = gray (`#8A948E`).

### 6. Address Search

The search bar queries the `ADDRESS` field on the **authoritative ParcelStatus** feature service via a direct REST `fetch()` POST to a hardcoded URL (`CTX.parcelsQuery`). This is completely decoupled from the ArcGIS JS SDK — no `queryFeatures()`, no `parcels.load()`, no portal item resolution, no SDK auth pipeline involvement whatsoever.

**Why hardcoded?** Three previous approaches were attempted and all failed:
1. SDK `parcels.queryFeatures()` — killed by the blanket `getCredential` rejection before the portal-loaded layer could resolve
2. SDK `parcels.load()` + direct fetch — same portal resolution failure
3. Portal REST API (`/sharing/rest/content/items/{id}`) — also blocked by org-level auth

The hardcoded URL (`https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/ParcelStatus/FeatureServer/0/query`) works because it targets the authoritative service directly, which is publicly accessible without any portal or SDK mediation. The field name `ADDRESS` is confirmed from the ParcelStatus layer schema (verified via the parcel view layer creation script and the Parcel Editor app).

**If search returns no results for known addresses:**
1. Open the browser console and run the diagnostic fetch provided in the Troubleshooting section below
2. If the service returns a 403 or login redirect, ParcelStatus is not shared publicly — share it with Everyone or switch `CTX.parcelsQuery` to the public view URL
3. If the service returns features but the field is named differently, update three locations in `doSearch()`: the `where` clause, `outFields`, and `f.attributes.ADDRESS`

**Search results behavior:** Results return as raw JSON from the REST endpoint (not SDK Graphic objects). Click-to-zoom calculates the polygon centroid from ring coordinates and navigates to zoom level 18 with a popup showing the address.

---

## Deployment

### IIS (Primary — `gis.local/Drainage/`)

1. Create `C:\inetpub\wwwroot\Drainage\` (or equivalent IIS root path)
2. Copy `index.html` into the folder
3. Verify IIS serves `.html` files with MIME type `text/html`
4. Access at `http://gis.local/Drainage/`

No HTTPS is required (IIS server is HTTP only). No MIME type configuration beyond IIS defaults is needed.

### GitHub Pages

Copy `index.html` to the `gis-maps` repository (public read-only viewers). The `gis-maps` repo is separate from `gis-apps` (which hosts OAuth-authenticated editing tools). No build step required.

### CivicPlus Embedding

Embed via `<iframe>` following the established pattern from the Annexation History map:

```html
<iframe src="http://gis.local/Drainage/" 
        width="100%" height="800" 
        frameborder="0" 
        style="border: none;">
</iframe>
```

If deploying behind the CivicPlus website, the iframe source must be reachable from the client browser (not just the server). For public access, use the GitHub Pages URL or ensure `gis.local` resolves externally.

### File Protocol (`file://`)

The dashboard works when opened directly from disk because all external resources are loaded from CDNs and the city logo is embedded as a base64 data URI. However, AGOL REST queries may fail due to CORS restrictions in some browsers when served from `file://`. Chrome typically allows this; Firefox may not.

---

## Troubleshooting

### Dashboard loads but shows no data (all KPIs show "—")

1. **Public View not created or not shared:** Open the `DRAINAGE` URL in a browser and append `/1/query?where=1=1&returnCountOnly=true&f=json`. If you get a login page or 403, the service is not shared publicly.
2. **L4 not added to Public View:** If culvert data specifically is missing, L4 (DrainageCulverts) may not have been added to the Public View yet. Check `DRAINAGE + "/4"` — a 404 confirms L4 is absent.
3. **CORS:** If the browser console shows CORS errors, the AGOL organization may have restrictive CORS settings. This is unusual for services6.arcgis.com but possible with custom domains.

### Inspection ring shows 0% when features have been inspected

The `LastInspectionDate` field must be:
- Present on the **Public View** layer (not just the authoritative source)
- Not hidden in the view's field visibility settings
- A date field type (not string)

Test with a direct REST query:
```
POST {DRAINAGE}/4/query
where=LastInspectionDate IS NOT NULL&returnCountOnly=true&f=json
```

If this returns `{"count": 0}` but you know inspections exist on the authoritative layer, the field is either hidden on the view or not included in the view definition.

### Map shows login dialog

The `getCredential` rejection only suppresses SDK-initiated prompts. If a layer's service itself returns a 401/403 redirect to an OAuth page, the browser may render the login page inside the map div. Solutions:
1. Share all consumed layers and portal items publicly (Everyone)
2. Verify the portal item IDs haven't changed (parcels: `bd5079b30310433998c6a54652074dd6`)

### Charts render with incorrect colors or layout

Chart.js AMD conflict. Verify the `<script>` tag for Chart.js appears **before** the ArcGIS SDK tag in `<head>`. If they are swapped, Chart.js will fail to register and the `Chart` constructor will be undefined.

### Address search shows no results

The search queries `CTX.parcelsQuery` (hardcoded to ParcelStatus authoritative service). To diagnose, paste this into the browser console:

```javascript
fetch("https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/ParcelStatus/FeatureServer/0/query", {
  method: "POST", headers: {"Content-Type":"application/x-www-form-urlencoded"},
  body: new URLSearchParams({where:"ADDRESS LIKE '%FAIR%'", outFields:"ADDRESS", resultRecordCount:"3", f:"json"})
}).then(r=>r.json()).then(d=>console.log(d));
```

Possible outcomes:
1. **Returns features array** — search is working, the query term isn't matching data. Try searching just a house number.
2. **Returns `{"error":{"code":403,...}}`** — ParcelStatus is not shared publicly. Either share it with Everyone or change `CTX.parcelsQuery` to the public parcels view URL.
3. **Returns `{"error":{"code":400,"message":"Invalid field: ADDRESS"}}`** — the field is named differently. Append `?f=json` to the FeatureServer URL, find the correct field name in the `fields` array, and update three places in `doSearch()`.
4. **Network error / CORS** — the service host is unreachable from the client browser.

### Condition counts don't match AGOL

The dashboard aggregates condition values using exact string matching (`"Good"`, `"Fair"`, `"Poor"`). Values like `"good"` (lowercase), `"GOOD"` (uppercase), null, empty string, or any other variant will fall into the unrecognized bucket and be excluded from the condition pills. Standardize the Condition domain values on the authoritative layer to use title case.

---

## Modifying the Dashboard

### Adding a new drainage sublayer

If a new layer (e.g., L5) is added to the Drainage Inventory service and its Public View:

1. Add entry to the `DL` object:
   ```javascript
   var DL = {
       ...
       newlayer: { id: 5, name: "New Layer", color: "#hex" }
   };
   ```
2. Add its count to `loadKPIs()` and include it in the `total` sum
3. Add an inspection entry in `loadInspections()` if the layer has `LastInspectionDate`
4. Add a `grp()` call in `loadCondition()` and add the result to the `res` array
5. Add a FeatureLayer to the map in `initMap()` with appropriate renderer
6. Update the legend bar HTML if the new layer has distinct symbology

### Changing the address search field

If the parcel layer schema changes, update three locations in `doSearch()`:
- `where` clause field name
- `outFields` array
- `f.attributes.FIELDNAME` in the result display

### Switching to the internal PW theme

Replace the CSS variables in `:root`:
```css
--bg: #1F1E1A;
--bg-card: #2A2824;
--accent: #D49A4E;
--text: #E8E4DC;
```
And swap font imports to Bricolage Grotesque + Manrope. This converts the dashboard to the internal operations color profile used by the Water Utility and Hydrant dashboards.

---

## Prerequisites Checklist

Before this dashboard will function correctly, the following must be complete:

- [ ] L4 (DrainageCulverts) added to Public View (Item `1632e151d2ff470bbb6159da4d93c8d4`)
- [ ] L4 added to Maintenance View (Item `bed682f22d60495297efe6a691721b97`) with editing enabled
- [ ] `LastInspectionDate` field visible on all Public View sublayers (L1, L2, L4)
- [ ] `Created_User` and `Cost_Code` hidden on L4 in Public View per governance standards
- [ ] All consumed portal items and services shared publicly (Everyone)
- [ ] `index.html` and `logo.svg` copied to `gis.local/Drainage/` on IIS server
- [ ] Legacy `CoFORPW_Drainage_Culvert_Inventory` renamed to include "(Legacy)" in title

---

## File Inventory

| File | Purpose |
|------|---------|
| `index.html` | Complete dashboard application (single file) |
| `logo.svg` | City logo — used as favicon and referenced by `<link rel="icon">` |
| `README.md` | This technical reference |

### Favicon

The favicon uses `<link rel="icon" href="logo.svg" type="image/svg+xml">`, referencing the same `logo.svg` file used across other CoFOR apps (WaterMeterEditor, ParcelEditor, etc.). Copy the `logo.svg` from any existing app deployment folder into `gis.local/Drainage/` alongside `index.html`. This is the standard pattern for all CoFOR HTML deployments.
