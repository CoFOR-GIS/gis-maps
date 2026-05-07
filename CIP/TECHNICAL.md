# Technical Implementation

Detailed implementation notes for developers modifying the codebase. Pairs with [`ARCHITECTURE.md`](ARCHITECTURE.md) (which is more conceptual).

---

## Python Sync Script (`sync_cleargov_cip.py`)

### Module Structure

```
sync_cleargov_cip.py
├── CONFIGURATION                    Constants, plan IDs, colors, URLs
├── EXEC MODE DETECTION              _args fallback for Pro Python window
├── LOGGING                          File + console handlers
├── AGOLSession class                Token-based REST authentication
├── CLEARGOV API                     fetch_capital_plans, fetch_projects_for_plan
├── GEOMETRY EXTRACTION              extract_geometries (multi-geometry aware)
├── ATTRIBUTE EXTRACTION             extract_attributes
├── GEOMETRY PROCESSING              project_geometry (arcpy projection)
├── PROJECT PROCESSING               process_all_projects (orchestrator)
├── AGOL OPERATIONS                  create_feature_service, populate_layers, truncate_layer
└── MAIN                             get_credentials, main
```

### Critical Design Patterns

#### 1. Pure REST AGOL Operations

The script does **NOT** use `from arcgis.gis import GIS` because that package triggers a numpy/pandas binary incompatibility in many ArcGIS Pro Python environments:

```
ValueError: numpy.dtype size changed, may indicate binary incompatibility.
Expected 96 from C header, got 88 from PyObject
```

Instead, all AGOL interaction goes through the `AGOLSession` class which uses `requests` directly:

```python
class AGOLSession:
    def _authenticate(self):
        token_url = f"{self.portal_url}/sharing/rest/generateToken"
        # POST username/password, receive token
```

This pattern matches CFOR's other operational scripts.

#### 2. Multi-Geometry Extraction

A single ClearGov project can have multiple geometries (e.g., a wastewater treatment plant might have 2 markers and 1 polygon for a service area). The extraction returns a **list** of `(geom_type, coordinates)` tuples:

```python
def extract_geometries(project):
    results = []
    map_settings = project.get('mapSettings') or {}  # Note: `or {}` not .get(k, {})
    location = map_settings.get('location') or {}
    value = location.get('value') or {}
    features = value.get('mapBoxFeatures') or {}

    # Markers (Points): flat structure {lat, lng}
    for marker in (features.get('markers') or []):
        if marker.get('lat') is not None and marker.get('lng') is not None:
            results.append(('Point', [[marker['lng'], marker['lat']]]))

    # Polygons array (Lines + Polygons): GeoJSON Features
    for polygon in (features.get('polygons') or []):
        geometry = polygon.get('geometry') or {}
        geom_type = geometry.get('type')          # 'LineString' or 'Polygon'
        coordinates = geometry.get('coordinates') or []
        if geom_type == 'LineString':
            results.append(('Polyline', coordinates))
        elif geom_type == 'Polygon':
            results.append(('Polygon', coordinates))

    return results
```

**Important:** Use `or {}` (not `.get(key, {})`) because ClearGov may return `mapSettings: null` (not missing). `.get('key', default)` only uses the default when the key is missing, not when its value is None.

#### 3. Exec Mode Fallback

When run from ArcGIS Pro's Python window (interactive), `__file__` is not defined. The standard CFOR pattern handles both modes:

```python
class _args:
    script_dir = os.getcwd()

if "__file__" not in globals():
    SCRIPT_DIR = _args.script_dir
else:
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
```

This is also used by `s01_field_audit.py`, `s02_schema_update.py`, `append_culverts.py`, and other CFOR scripts.

#### 4. Truncate Then Add (Service Update)

For updates, the script does NOT use `applyEdits` with deletes+adds. Instead:

1. POST `where=1=1` to `deleteFeatures` for each layer
2. Then POST batches of 250 features to `addFeatures`

This avoids edge cases with object ID conflicts and is simpler to reason about.

#### 5. Service Creation Two-Step

Creating a new feature service requires two REST calls:

```python
# Step 1: Create empty service shell
POST /sharing/rest/content/users/{u}/createService
     ↓ returns serviceurl

# Step 2: Add layers via admin endpoint
POST {serviceurl_admin}/addToDefinition
     ↓ {"layers": [{...layer_def...}, ...]}
```

The admin URL is derived by replacing `/rest/services/` with `/rest/admin/services/`.

### Geometry Projection

ClearGov returns coordinates in WGS84 (EPSG:4326). CFOR standard storage is NAD83 Texas South Central (EPSG:2278) in US Survey Feet. Projection happens via arcpy:

```python
def project_geometry(geom_type, coordinates):
    source_sr = arcpy.SpatialReference(SOURCE_SR)  # 4326
    target_sr = arcpy.SpatialReference(TARGET_SR)  # 2278

    if geom_type == 'Point':
        geom = arcpy.PointGeometry(arcpy.Point(coordinates[0][0], coordinates[0][1]), source_sr)
    elif geom_type == 'Polyline':
        array = arcpy.Array([arcpy.Point(c[0], c[1]) for c in coordinates])
        geom = arcpy.Polyline(array, source_sr)
    elif geom_type == 'Polygon':
        arrays = [arcpy.Array([arcpy.Point(c[0], c[1]) for c in ring]) for ring in coordinates]
        geom = arcpy.Polygon(arcpy.Array(arrays), source_sr)

    projected = geom.projectAs(target_sr)
    return json.loads(projected.JSON)
```

The result is AGOL-compatible JSON geometry suitable for direct REST submission.

---

## Web Map (`index.html`)

### Single-File Architecture

Everything is inline:
- HTML structure
- CSS (using CSS custom properties for theming)
- JavaScript (inside `require([])` callback)
- Logo as base64 data URI

This is intentional — matches CFOR public app pattern, simplifies deployment to GitHub Pages, no build step needed.

### Module Loading

```javascript
require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/geometry/SpatialReference",
  "esri/identity/IdentityManager",
  "esri/PopupTemplate",
  "esri/config"
], function(Map, MapView, FeatureLayer, ...) { /* app */ });
```

The `<script src="https://js.arcgis.com/4.34/">` defines `require()`. We use the imperative pattern (not the `<arcgis-map>` web component) because:

- No additional script tag needed
- Promise-based readiness via `view.when()`
- Consistent with `require()` already in use

### Authentication Blocking

Public apps must reject all authentication prompts. Pattern:

```javascript
esriId.getCredential = function() {
  return Promise.reject(new Error("Public app — auth not available"));
};
```

This is called BEFORE any layer creation. If a layer somehow needs auth, the layer fails to load (rather than prompting the user with an OAuth dialog).

### Renderer Pattern

Three layers, each with `UniqueValueRenderer` keyed on `Category`:

```javascript
function buildPointRenderer() {
  return {
    type: "unique-value",
    field: "Category",
    defaultSymbol: makePointSym("#888"),
    uniqueValueInfos: Object.entries(CATEGORY_COLORS).map(([cat, color]) => ({
      value: cat,
      symbol: makePointSym(color)
    })),
    visualVariables: [{
      type: "opacity",
      field: "ProgressPercent",
      stops: [
        { value: 0,   opacity: 0.55 },
        { value: 50,  opacity: 0.80 },
        { value: 100, opacity: 1.00 }
      ]
    }]
  };
}
```

The opacity `visualVariable` provides the "progress overlay" effect — projects with low progress appear faded.

### Labeling

Per-feature progress percentage labels:

```javascript
{
  labelExpressionInfo: { expression: "Round($feature.ProgressPercent) + '%'" },
  symbol: { type: "text", color: "#1A1A1A", haloColor: "#FAF8F4", haloSize: 1.5, font: { family: "DM Sans", size: 10, weight: "bold" } },
  labelPlacement: "above-center",
  minScale: 30000  // Only shown when zoomed in past 1:30000
}
```

Labels are intentionally NOT visible at all zooms to avoid cluttering the city-wide overview.

### Direct REST for Stats and Directory

Layer rendering uses the SDK's FeatureLayer. Stats and directory population use direct REST:

```javascript
async function fetchAllFeatures(layerUrl, geomType) {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "json"
  });

  const response = await fetch(`${layerUrl}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  return (await response.json()).features || [];
}
```

Three parallel POSTs (one per layer) populate `state.allProjects`. This:

- Decouples data load from view ready timing
- Provides full geometry for client-side zoom-to logic
- Avoids any token/auth complications with the SDK

### Filter and Search

Client-side only:

```javascript
function applyFilters() {
  const f = state.filters;
  const search = f.search.toLowerCase().trim();
  state.filtered = state.allProjects.filter(p => {
    if (f.category !== "all" && p.attributes.Category !== f.category) return false;
    if (f.status !== "all" && p.attributes.Status?.toLowerCase() !== f.status) return false;
    if (search && !haystack(p).includes(search)) return false;
    return true;
  }).sort((a, b) => a.attributes.ProjectName.localeCompare(b.attributes.ProjectName));
}
```

Map filtering (separate from directory) uses `definitionExpression`:

```javascript
function applyMapFilters() {
  const where = clauses.length ? clauses.join(" AND ") : "1=1";
  Object.values(state.layers).forEach(l => {
    if (l) l.definitionExpression = where;
  });
}
```

Setting `definitionExpression` causes the layer to re-query and re-render only matching features.

### Centering with Padding

Per CFOR standard, the map centers on the jurisdictional boundary with right-padding for the directory panel:

```javascript
async function centerOnJurisdiction() {
  // Direct fetch (not SDK query) for the extent
  const params = new URLSearchParams({
    where: "1=1",
    returnExtentOnly: "true",
    outSR: "102100",
    f: "json"
  });

  const response = await fetch(`${JURISDICTIONAL_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const data = await response.json();

  if (data.extent) {
    if (window.innerWidth > 768) {
      state.view.padding = { right: 380 };
    }
    await state.view.goTo({ target: data.extent }, { duration: 600 });
  }
}
```

The right-padding shifts the centered extent to account for the 380px directory panel.

### Click-to-Zoom Logic

Different geometry types need different zoom behaviors:

```javascript
function zoomToProject(p, itemEl) {
  if (p.geomType === "point") {
    view.goTo({ target: pointGeom, zoom: 17 }, { duration: 800 });
  } else if (p.geomType === "line") {
    view.goTo({ target: polylineGeom }, { duration: 800 }).then(() => {
      view.zoom = Math.max(view.zoom - 1, 14);  // pull back slightly
    });
  } else if (p.geomType === "polygon") {
    view.goTo({ target: polygonGeom }, { duration: 800 });
  }
}
```

After zoom, the popup is opened by querying the corresponding FeatureLayer with the project's `ProjectID`.

### Mobile Responsive

CSS media query at 768px:

```css
@media (max-width: 768px) {
  #app-main {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  #directory-panel {
    border-left: none;
    border-top: 1px solid var(--line-strong);
    max-height: 50vh;
  }
  #directory-panel.collapsed {
    max-height: 56px;
  }
}
```

Mobile shows map (top) + directory (bottom, collapsible). The right-padding centering is skipped on mobile.

### Theme Customization

All colors and spacing use CSS custom properties. To re-theme:

```css
:root {
  --bg-cream: #FAF8F4;       /* Background */
  --forest-green: #1B3A2D;   /* Header / accent */
  --cat-water: #B0C1C9;      /* Category colors */
  --cat-wastewater: #192737;
  /* ... */
}
```

Change these and the entire app re-themes. The category color objects (`CATEGORY_COLORS` in JS) must also be updated to keep map symbology in sync.

---

## Configuration Reference

### Environment Variables (Optional)

For unattended sync runs, set:

```
AGOL_USERNAME=EMartz
AGOL_PASSWORD=YourPassword
```

The script reads these first, falling back to interactive prompt if missing.

### Service URLs

Hardcoded in both `sync_cleargov_cip.py` and `index.html`:

| Variable | Value |
|----------|-------|
| `AGOL_PORTAL` | `https://fairoaksranch.maps.arcgis.com` |
| `AGOL_BASE` | `https://www.arcgis.com/sharing/rest` |
| `AGOL_SERVICES_BASE` | `https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest` |
| `FEATURE_SERVICE_NAME` | `CoFORPW_CIP_Projects` |
| `PUBLIC_VIEW_URL` (in HTML) | `.../City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)/FeatureServer` |
| `JURISDICTIONAL_URL` (in HTML) | `.../FOR_Jurisdictional/FeatureServer/0` |

### Capital Plan IDs

```python
CAPITAL_PLANS = {
    "Water":      1991,
    "Wastewater": 1995,
    "Roadway":    2003,
    "Building":   2004,
    "Drainage":   2036
}
```

If a new plan is added in ClearGov, add it here AND update the category color in both the Python script and the HTML.

---

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 90+ | ✅ |
| Edge 90+ | ✅ |
| Firefox 90+ | ✅ |
| Safari 14+ | ✅ |
| Mobile Safari iOS 14+ | ✅ |
| Chrome Android | ✅ |
| IE 11 | ❌ Not supported (ArcGIS JS SDK 4.34 dropped IE) |

---

*See [`MAINTENANCE.md`](MAINTENANCE.md) for how to extend the system, [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) for current bugs.*
