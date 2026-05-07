# Known Issues

Current bugs, limitations, and workarounds for the CIP Map project.

Last reviewed: May 2026.

---

## 🔴 Active Issues (Need Resolution)

### 1. Web map currently fails to load

**Symptom:**

```
⚠ Map failed to load
[error message varies — see browser console]
```

**Most recent error:** `Timed out waiting for <arcgis-map>. view=false, map=false`

**Root cause:** The original web map used the `<arcgis-map>` web component which requires an additional script tag (`arcgis-map-components.esm.js`) that wasn't loaded.

**Workaround applied:** Switched from web component to imperative `new Map()` + `new MapView()` pattern in JS. This was implemented in the latest version of `index.html`.

**Status:** Fix is in place but not yet verified working end-to-end. The new chat session will need to re-test the web map.

**Next steps:**
1. Confirm latest `index.html` has the imperative pattern (search for `new Map(` and `new MapView(` — should both be present)
2. Open `index.html` locally in browser
3. Check DevTools console for any remaining errors
4. If errors persist, verify:
   - Public view URL is accessible (test with `?f=json` appended in private browser)
   - Public view sharing is set to **Everyone (Public)**
   - `FOR_Jurisdictional` service is reachable

---

### 2. REST-based public view creation script doesn't work

**Symptom:**

```
REST error: Unable to add feature service definition. (code 400)
```

When running `create_public_view.py` after creating the empty service shell.

**Root cause:** The REST API for creating linked view layers is finicky and Esri's documentation is sparse. The `addToDefinition` payload format works for normal feature services but not for views — there's some additional parameter or structure required for the view-layer linkage that wasn't found.

**Workaround applied:** Created the public view via AGOL UI instead. This works reliably.

**Status:** Workaround is acceptable. View creation is a one-time task — it's fine to do via UI.

**Decision:** Don't fix the REST script. If a view ever needs recreation, use the AGOL UI workflow documented in [`QUICKSTART.md`](QUICKSTART.md) Step 6.

---

### 3. Logo placeholder still in deployed map

**Symptom:**
The `index.html` ships with a generic placeholder logo (a simple SVG showing "FOR" on a colored circle).

**Root cause:**
The CFOR logo is ~25KB of base64-encoded SVG. Embedding it directly in the source code makes the file large and clutters version diffs. The placeholder is intentional — staff swap in the real logo via the `extract_logo.py` utility.

**Workaround:**
Run `extract_logo.py` to pull the real logo from any other CFOR HTML map (Drainage Dashboard, Road Information Map):

```
python extract_logo.py "C:\path\to\drainage_dashboard.html" webmap\index.html
```

**Status:** Working as designed. Just needs to be done once per deployment.

---

## 🟡 Known Limitations

### 1. Sync is one-way only

**Limitation:** ClearGov → AGOL only. There's no way to edit project info through the map and have changes propagate back to ClearGov.

**Why:** ClearGov's API is read-only for capital projects. Edits must be done in the ClearGov UI directly.

**Impact:** None — staff can continue using ClearGov as the editing interface, which is what they already do.

---

### 2. Sync is destructive

**Limitation:** Each sync truncates and re-populates. Any manual edits made directly in AGOL between syncs will be lost.

**Why:** Truncate-and-replace is simpler than diff-and-merge for this scale (~30 features).

**Impact:** Don't make manual edits to `CoFORPW_CIP_Projects` in AGOL. Always edit in ClearGov.

---

### 3. ~12 projects don't appear on map

**Limitation:** As of last sync, ~12 projects exist in ClearGov but have no map geometry. They don't appear on the map at all.

**Why:** ClearGov's `mapSettings` field is null for these projects — staff didn't enter a map location.

**Impact:** These projects are invisible on the map. They DO appear in ClearGov's transparency portal.

**Solution:** Coordinate with the staff who maintain ClearGov to add map locations for these projects. They'll appear on the map after the next sync.

**Affected projects (most recent):**
- RDWY: Reconstruct Battle Intense near Trailside
- Community Center
- Gateway Feature
- Drainage 8402 Battle Intense LWC (#23)
- Drainage 8045 Flagstone Hill (#63)
- Drainage 7644 Pimlico Lane (#46)
- Drainage 31988 Scarteen (#44)
- Drainage 32030 Scarteen (#53)
- Drainage 8312 Triple Crown (#43)
- Drainage 8426 Triple Crown (#41)
- Drainage 8040 Rolling Acres Trail (#4)
- Drainage 8472 Rolling Acres Trail (#2)

---

### 4. No automated sync (yet)

**Limitation:** Sync is manual. Map data is only as fresh as the last manual sync.

**Why:** Phase 4 (automation) was intentionally deferred per project decision.

**Impact:** Staff must remember to run sync after major ClearGov updates.

**Solution:** When ready, set up Windows Task Scheduler per [`MAINTENANCE.md`](MAINTENANCE.md).

---

### 5. AGOL service name has parentheses

**Limitation:** The public view's actual service name auto-generated by AGOL is:

```
City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)
```

The parentheses are valid in URLs but can occasionally cause issues with strict URL parsers.

**Why:** AGOL auto-generates service names from the title, replacing spaces with underscores. Parentheses get preserved as-is.

**Impact:** Modern browsers handle this fine. Tested in Chrome, Firefox, Edge, Safari.

**Workaround if needed:** URL-encode the parentheses (`%28` and `%29`) in service URLs.

---

## 🟢 Resolved Issues

### ✅ Pandas/numpy binary incompatibility (RESOLVED)

**Was:** Python sync script crashed on `import arcgis.gis.GIS` with:
```
ValueError: numpy.dtype size changed, may indicate binary incompatibility.
```

**Resolution:** Rewrote sync script to use pure REST API (via `requests`) instead of the `arcgis` Python package. The `arcpy` library still works fine for geometry projection — it's only the `arcgis` package that has the conflict.

**Documented in:** [`TECHNICAL.md`](TECHNICAL.md) §1 "Pure REST AGOL Operations"

---

### ✅ ClearGov API structure change (RESOLVED)

**Was:** Sync was successfully fetching projects but extracting 0 geometries.

**Root cause:** ClearGov changed their geometry structure. Markers used to have nested `coordinates.lat`/`coordinates.lng`; now they have flat `lat`/`lng`. Polygons used to have top-level `type`/`coordinates`; now they're wrapped in GeoJSON Features with `geometry.type` and `geometry.coordinates`.

**Resolution:** Updated `extract_geometries()` to handle the new GeoJSON Feature wrapper. Also added support for multi-geometry projects (a single project can have multiple markers and/or polygons).

**Documented in:** [`TECHNICAL.md`](TECHNICAL.md) §2 "Multi-Geometry Extraction"

---

### ✅ `__file__` not defined error (RESOLVED)

**Was:** Script crashed when run from ArcGIS Pro's interactive Python window:
```
NameError: name '__file__' is not defined
```

**Resolution:** Added `_args` class fallback pattern that detects exec mode and uses `os.getcwd()` as a substitute for `__file__`'s directory.

**Documented in:** [`TECHNICAL.md`](TECHNICAL.md) §3 "Exec Mode Fallback"

---

### ✅ Conda environment cloning fails (RESOLVED via workaround)

**Was:** Attempting to clone the `arcgispro-py3` conda environment to install fresh packages failed:
```
CondaHTTPError: HTTP 404 NOT FOUND for url
<https://conda.anaconda.org/esri-build/win-64/vc-14.38-0.conda>
```

**Resolution:** Stopped trying to fix the conda env. Wrote sync script to avoid the broken `arcgis` package entirely (resolves issue #5 above).

---

## Operational Quirks (Not Bugs, but Surprising)

### Multi-geometry projects produce duplicate directory entries

A project with 2 markers + 1 polygon produces 3 features. Each shows separately on the map AND as 3 rows in the directory.

**Example:** `Wastewater Treatment Plant Phase 1 Expansion` appears 3 times in the directory.

This is intentional — each geometry represents a different location/aspect of the project, and showing them separately provides better spatial context. If you want one row per project, you'd need to deduplicate by `ProjectID` in the directory rendering logic.

### "0%" labels on projects with no progress data

Some projects show `0%` labels because ClearGov returns `progress.percentage = 0` (not null). On the map this looks like the project hasn't started, when really it's just no data.

**Fix if needed:** In `extract_attributes()`, treat 0 differently:

```python
'ProgressPercent': float(progress.get('percentage') or 0)
```

becomes

```python
pct = progress.get('percentage')
'ProgressPercent': float(pct) if pct is not None else None
```

Then in the web map, hide labels when `ProgressPercent` is null.

### Reset View centering is approximate on resize

The reset view button centers on jurisdictional boundary with right-padding. If the user resizes the browser between init and reset, the padding amount may not match the current panel width.

**Fix:** Re-calculate padding based on `window.innerWidth` and panel state at click time. Currently uses a hardcoded 380.

---

## Reporting New Issues

When something breaks:

1. **Capture the error** — full text, browser console output, screenshot if visual
2. **Check this file** — see if it's already known
3. **Run diagnostics:**
   - For sync: review the latest log file in `logs/`
   - For map: check browser DevTools console
4. **If new and reproducible:** add it here under "Active Issues" with:
   - Symptom
   - Root cause (if known)
   - Workaround (if known)
   - Status

---

*See [`MAINTENANCE.md`](MAINTENANCE.md) for general bug-fixing procedures.*
