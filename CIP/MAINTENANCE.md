# Maintenance Guide

Future maintenance, fixing bugs, adding features, and handling external changes.

For current bugs, see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).
For initial development, see [`TECHNICAL.md`](TECHNICAL.md).

---

## When ClearGov Changes Their API

ClearGov has changed their geometry structure once already during this project. They likely will again. The diagnostic-first workflow:

### 1. Run the diagnostic dump

```
cd C:\GIS\CIP_Sync
python dump_cleargov_structure.py
```

### 2. Compare to expected structure

Open `logs/cleargov_structure_*.txt`. Look for:

- **`AGGREGATE STATS`** — does total project count match ClearGov website?
- **Per-project structure** — do `mapSettings_keys`, `location_keys`, `value_keys`, `mapBoxFeatures_keys` match expectations?
- **`FIRST PROJECT WITH GEOMETRY (RAW STRUCTURE)`** — is geometry still in `polygons[].geometry.coordinates`?

### 3. Update the extraction logic

The geometry extractor is `extract_geometries(project)` in `sync_cleargov_cip.py`. The current implementation expects:

```
mapSettings.location.value.mapBoxFeatures
├── markers[]                    ← Points, flat structure {lat, lng}
└── polygons[]                   ← Lines + Polygons, GeoJSON Feature wrapper
    └── geometry
        ├── type: "LineString" | "Polygon"
        └── coordinates: [...]
```

If structure changes, modify the function. Keep in mind:

- ClearGov may add new geometry types (MultiLineString, MultiPolygon)
- Keys may rename (e.g., `mapBoxFeatures` → `mapboxFeatures`)
- Coordinates may move (e.g., directly under polygon instead of under `geometry`)

### 4. Use `or {}` not `.get(key, {})`

Always handle `None` values explicitly:

```python
# WRONG — fails if key exists with value None
map_settings = project.get('mapSettings', {})

# RIGHT — handles both missing keys AND null values
map_settings = project.get('mapSettings') or {}
```

### 5. Validate against the dump

Before re-deploying, run a simulation:

```python
# Quick test
import json
with open('logs/cleargov_dump_LATEST.json') as f:
    data = json.load(f)

# Iterate and call your updated extract_geometries() function
# Confirm counts match expectations
```

---

## Adding a New Capital Plan Category

If ClearGov adds a new category (e.g., "Parks"):

### 1. Find the new plan ID

Run `dump_cleargov_structure.py` — it lists all available plans.
OR fetch directly:

```python
import requests
plans = requests.get("https://cleargov.com/api/capital-projects/municipalities/605446/cp-interop/capital-plans").json()
for plan in plans:
    print(plan['id'], plan['name'])
```

### 2. Update `sync_cleargov_cip.py`

Add to `CAPITAL_PLANS`:

```python
CAPITAL_PLANS = {
    "Water":      1991,
    "Wastewater": 1995,
    "Roadway":    2003,
    "Building":   2004,
    "Drainage":   2036,
    "Parks":      2050   # NEW
}
```

Add to `CATEGORY_COLORS` (CFOR brand palette):

```python
CATEGORY_COLORS = {
    # ... existing ...
    "Parks": "#8D956C"   # Olive green or another distinct CFOR color
}
```

### 3. Update `index.html`

Add to JS `CATEGORY_COLORS`:

```javascript
const CATEGORY_COLORS = {
  // ... existing ...
  "Parks": "#8D956C"
};
```

Add to category filter chips in HTML:

```html
<button class="filter-chip" data-cat="Parks"><span class="chip-dot" style="background:#8D956C"></span>Parks</button>
```

Add to stats panel ordering:

```javascript
const orderedCats = ["Water", "Wastewater", "Roadway", "Drainage", "Building", "Parks"];
```

### 4. Run sync

```
python sync_cleargov_cip.py
```

The new category's projects will appear automatically.

### 5. Deploy web map

Per [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Adding a New Field

If ClearGov starts exposing a new attribute we want to display (e.g., `fundingSource`):

### 1. Update `extract_attributes()` in sync script

```python
def extract_attributes(project, category):
    # ... existing ...
    return {
        # ... existing fields ...
        'FundingSource': project.get('fundingSource') or 'Unknown'
    }
```

### 2. Update `get_field_definitions()` in sync script

```python
def get_field_definitions():
    return [
        # ... existing fields ...
        {'name': 'FundingSource', 'type': 'esriFieldTypeString',
         'alias': 'Funding Source', 'length': 100, 'nullable': True}
    ]
```

### 3. Re-run sync

The schema change requires recreating the service:

**Option A — Delete and recreate (simple but breaks public view):**
1. Delete `CoFORPW_CIP_Projects` from AGOL
2. Run `python sync_cleargov_cip.py` (creates fresh)
3. Recreate the public view (the old one is now broken)

**Option B — Add field to existing service (more involved):**
1. Use AGOL UI: Item details → Data → Layer → Fields → Add Field
2. Re-run sync (it'll populate the new field)

Option A is usually faster.

### 4. Update web map

Add to popup template in `index.html`:

```javascript
return `
  <div class="cip-popup">
    <!-- ... existing sections ... -->
    <div class="cip-section">
      <div class="cip-section-label">Funding Source</div>
      <div class="cip-meta-row">
        <span class="value">${escapeHtml(a.FundingSource || '—')}</span>
      </div>
    </div>
  </div>
`;
```

Add to directory item if desired.

### 5. Deploy

Per [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Setting Up Automated Sync (Phase 4)

When ready to automate, follow this pattern.

### 1. Set credentials as environment variables

Open Windows **System Properties** → **Environment Variables**:

Add **System Variables**:

| Name | Value |
|------|-------|
| `AGOL_USERNAME` | `EMartz` |
| `AGOL_PASSWORD` | (your password) |

Or edit `run_cip_sync.bat` to set them:

```batch
set AGOL_USERNAME=EMartz
set AGOL_PASSWORD=YourPasswordHere
```

> ⚠️ Storing passwords in batch files is convenient but not best practice. For production, consider using Windows Credential Manager via a Python wrapper.

### 2. Test the batch file

```
cd C:\GIS\CIP_Sync
run_cip_sync.bat
```

Should run sync without prompting for credentials.

### 3. Open Task Scheduler

Start menu → Task Scheduler

### 4. Create Basic Task

- **Name:** `CIP ClearGov Sync`
- **Description:** `Daily sync of Capital Improvement Projects from ClearGov to AGOL`
- **Trigger:** Daily at 6:00 AM (or weekly Mondays — your choice)
- **Action:** Start a program
- **Program:** `C:\GIS\CIP_Sync\run_cip_sync.bat`
- **Start in:** `C:\GIS\CIP_Sync`

### 5. Configure additional settings

Right-click the new task → Properties:

- ✅ Run whether user is logged on or not
- ✅ Run with highest privileges
- ✅ If task fails, restart every 1 hour, attempt 3 times

### 6. Test the scheduled task

Right-click → **Run**. Watch for completion in the task's History tab.

### 7. Verify

Check `C:\GIS\CIP_Sync\logs\` for the sync log from the scheduled run.

---

## Switching Sync Direction (Out of Scope)

The current sync is one-way: ClearGov → AGOL → Web Map.

There's no plan to support editing through the map and pushing back to ClearGov. If that ever becomes a requirement:

- ClearGov's API would need write endpoints (currently public read-only)
- AGOL public view would need to be made editable (significant security review)
- Web map would need authentication (breaks the "no login" pattern)

This would essentially be a different project.

---

## Refreshing Tokens / Credentials

AGOL tokens last 2 hours. The sync script generates a fresh token each run. You don't need to refresh anything manually.

If your **AGOL password** changes:

1. Run a manual sync to confirm it works with the new password
2. If using env vars or batch file, update them
3. If using Task Scheduler, re-test the scheduled run

---

## Updating ArcGIS JS SDK Version

The web map uses SDK 4.34. To upgrade:

### 1. Check release notes

https://developers.arcgis.com/javascript/latest/release-notes/

Look for breaking changes that affect:
- `FeatureLayer` (renderers, popup templates)
- `Map`, `MapView` constructors
- `IdentityManager`

### 2. Update the script tag in `index.html`

```html
<!-- Before -->
<link rel="stylesheet" href="https://js.arcgis.com/4.34/esri/themes/light/main.css">
<script src="https://js.arcgis.com/4.34/"></script>

<!-- After -->
<link rel="stylesheet" href="https://js.arcgis.com/4.35/esri/themes/light/main.css">
<script src="https://js.arcgis.com/4.35/"></script>
```

### 3. Test thoroughly

- Map rendering
- Popups
- Renderers (especially `visualVariables` for opacity)
- Filtering via `definitionExpression`
- Mobile layout
- Browser console for deprecation warnings

### 4. Update dependent code if needed

Some upgrades require code changes. Check release notes for:

- Removed APIs
- Renamed properties
- Changed default values

### 5. Deploy

Per [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Adding the Chrome Browser Tour (Shepherd.js)

If you want to add a guided tour like the Drainage Dashboard has:

### 1. Add Shepherd.js BEFORE the ArcGIS SDK

```html
<!-- BEFORE the ArcGIS script tag -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/css/shepherd.css">
<script src="https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/js/shepherd.min.js"></script>

<!-- THEN ArcGIS -->
<link rel="stylesheet" href="https://js.arcgis.com/4.34/esri/themes/light/main.css">
<script src="https://js.arcgis.com/4.34/"></script>
```

> ⚠️ Shepherd MUST load before ArcGIS to avoid Dojo AMD hijacking. This is a CFOR standard rule (see [CFOR_STANDARDS.md](CFOR_STANDARDS.md)).

### 2. Define the tour after init

```javascript
const tour = new Shepherd.Tour({
  defaultStepOptions: {
    cancelIcon: { enabled: true },
    classes: 'cfor-tour-step',
    scrollTo: { behavior: 'smooth', block: 'center' }
  },
  useModalOverlay: true
});

tour.addStep({
  id: 'welcome',
  title: 'Welcome to the CIP Map',
  text: 'This map shows all current and completed Capital Improvement Projects.',
  attachTo: { element: '#app-header', on: 'bottom' },
  buttons: [{ text: 'Next', action: tour.next }]
});

// ... more steps ...

tour.start();
```

---

## Performance Optimization

If feature counts grow significantly (e.g., 1000+ projects), consider:

### Server-side filtering for the directory

Instead of fetching all features then filtering client-side, query AGOL with `where` clauses tied to filter UI state.

### Pagination

Currently the directory shows all matching projects. With 1000+ items, add pagination or virtualized scrolling.

### Lazy popup data

Currently the map fetches all geometry on init. Could defer geometry loading until a project is clicked.

For the current ~30 project scale, none of these optimizations are needed.

---

## Removing the Project

If this project is ever decommissioned:

1. **Take down the web map:**
   - Delete `CIP/` folder from `gis-maps` repo
   - Or 301 redirect to a "decommissioned" page

2. **Remove CivicPlus embed:**
   - Coordinate with city web admin
   - Replace iframe with text or alternate resource

3. **Optionally delete AGOL services:**
   - Public view first
   - Then authoritative service
   - Logs and scripts can be archived locally

4. **Archive scripts:**
   - Tag the GitHub repo with `archive-cip-2026` or similar
   - Move local scripts to `C:\GIS\Archive\CIP_Sync_YYYYMMDD\`

---

## Disaster Scenarios

| Scenario | Recovery |
|----------|----------|
| Sync script lost | Re-pull from GitHub repo |
| AGOL service deleted | Re-run sync (creates fresh) |
| Public view deleted | Recreate via AGOL UI from authoritative service, re-share publicly |
| Web map repo deleted | Re-create from local copy + re-deploy |
| ClearGov municipality removed | Confirm with finance/admin; if intentional, decommission project |
| ArcGIS Pro license lost | Sync stops working; renew license or migrate to AGOL Notebook |

The system has no irreplaceable state. Everything reproducible from ClearGov + scripts.

---

*For current known issues, see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).*
