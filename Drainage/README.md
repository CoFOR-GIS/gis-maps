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

**Extent initialization:** Uses `queryExtent()` on the Jurisdictional Boundary layer, then `view.goTo(extent.expand(1.05))`. This pattern is used instead of `fullExtent` because `fullExtent` fails on layers that are not yet visible at the initial scale.

**Layer draw order** (bottom to top): Jurisdictional Boundary → Parcels (1:18k) → Roads (1:24k, labels at 1:8k) → Drainage Basins → Channels → Culverts → Structures.

**Culvert symbology:** Unique-value renderer on `Condition` field. Good = green (`#3A8A5C`), Fair = amber (`#C4860B`), Poor = red (`#C0392B`), unassessed = gray (`#8A948E`).

### 6. Address Search

The search bar queries the `ADDRESS` field on the public parcel layer (portal item `bd5079b30310433998c6a54652074dd6`, L0) using a case-insensitive LIKE query. Results are sorted alphabetically, limited to 15 matches. Clicking a result zooms to that parcel's extent and opens a popup.

**If search returns no results for known addresses:**
1. Verify the field name is `ADDRESS` (not `SiteAddress`, `Site_Address`, `SITEADDRESS`, etc.) by checking the parcel layer's REST endpoint: append `?f=json` to the FeatureServer URL and search the `fields` array
2. Verify the parcel layer is shared publicly
3. Verify the portal item ID (`bd5079b30310433998c6a54652074dd6`) is still correct — if the parcel view was recreated, the item ID changes

**To change the address field name**, update these two locations in the `doSearch()` function:
- The `where` clause: `"UPPER(ADDRESS) LIKE ..."`
- The `outFields` array: `["ADDRESS", "OBJECTID"]`

And update the result display line:
- `f.attributes.ADDRESS`

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
- [ ] `index.html` copied to `gis.local/Drainage/` on IIS server
- [ ] Legacy `CoFORPW_Drainage_Culvert_Inventory` renamed to include "(Legacy)" in title

---

## File Inventory

| File | Purpose |
|------|---------|
| `index.html` | Complete dashboard application (single file, ~1,020 lines) |
| `README.md` | This technical reference |
