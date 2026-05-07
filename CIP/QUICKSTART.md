# Quickstart

Get the CIP sync running on a new machine in 15 minutes.

This guide assumes you're picking this project up fresh. For deeper context, see [`OVERVIEW.md`](OVERVIEW.md) or [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Prerequisites

- ✅ ArcGIS Pro 3.x installed
- ✅ AGOL account with publishing permissions in `fairoaksranch.maps.arcgis.com`
- ✅ Git installed (for deployment to GitHub Pages)
- ✅ Internet connection

---

## Step 1 — Set Up Working Folder (2 min)

Create the working folder and copy in scripts:

```
C:\GIS\CIP_Sync\
├── sync_cleargov_cip.py
├── dump_cleargov_structure.py
├── extract_logo.py
├── run_cip_sync.bat
└── requirements.txt
```

You can keep `webmap/` files in the same folder or in a separate location — they're independent.

## Step 2 — Install Python Dependencies (2 min)

The only non-stdlib package needed is `requests`.

1. Open **ArcGIS Pro Python Command Prompt** (Start menu → ArcGIS folder)
2. The prompt should show `(arcgispro-py3)` at the start
3. Run:
   ```
   pip install requests
   ```

> ⚠️ **Don't use the regular Windows Command Prompt** — it won't have ArcGIS Pro's Python on the PATH and you'll get a "Python was not found" error.

## Step 3 — Verify ClearGov API (1 min)

Before syncing to AGOL, confirm ClearGov is reachable and returning expected data:

```
cd C:\GIS\CIP_Sync
python dump_cleargov_structure.py
```

Expected output:
```
AGGREGATE STATS
  Total projects:                ~28
  Have markers (points):         ~8
  Have polygons (lines/polys):   ~10
```

If you see this, the API is up and the script is working. If you see zero geometries, see [`MAINTENANCE.md`](MAINTENANCE.md) — ClearGov may have changed their API again.

## Step 4 — First Sync (3 min)

```
python sync_cleargov_cip.py
```

Enter your AGOL credentials when prompted:
```
AGOL Username (for https://fairoaksranch.maps.arcgis.com): EMartz
AGOL Password: ********  (hidden as you type)
```

Expected output ends with:
```
SYNC COMPLETE
Item ID:      36bae75e157a4e43a7242ce958f2cbc7
Service URL:  https://services6.arcgis.com/.../CoFORPW_CIP_Projects/FeatureServer
```

If this is the first sync ever, the script creates the feature service. Subsequent runs will truncate and re-populate.

## Step 5 — Verify in AGOL (2 min)

1. Browse to https://fairoaksranch.maps.arcgis.com
2. Sign in
3. Click **Content** → **My Content**
4. Find **CoFORPW_CIP_Projects** (Feature Service)
5. Click it, scroll to the **Data** tab
6. Confirm 3 layers exist (Points, Lines, Polygons) with feature counts

You should see something like:
- Layer 0 (Point): 9 features
- Layer 1 (Line): 8 features
- Layer 2 (Polygon): 2 features

## Step 6 — Confirm Public View Exists (2 min)

If a public view already exists, skip to Step 7. To check:

1. In **My Content**, search for "CIP Projects (Public View)"
2. If found, click it, verify **Sharing** is set to **Everyone (Public)**

If the public view does NOT exist, create it via AGOL UI (the REST script we wrote previously had issues — the UI is more reliable):

1. Open `CoFORPW_CIP_Projects` item details page
2. Click **Create View Layer** (top-right action button)
3. Wizard:
   - **Step 1:** Keep all 3 layers checked. In field visibility, uncheck `Created_User` and `Cost_Code` if present (they aren't in our schema, but check anyway)
   - **Step 2:** Skip spatial filter
   - **Step 3:** Title = `City of Fair Oaks Ranch CIP Projects (Public View)`, tags as listed in [CFOR_STANDARDS.md](CFOR_STANDARDS.md)
4. After creation, click **Share** → check **Everyone (Public)** → **Save**
5. Copy the URL from the bottom of the item page

## Step 7 — Test the Web Map Locally (2 min)

The web map is a single HTML file with everything inline.

1. Open `webmap/index.html` in your browser (double-click or `start index.html`)
2. The map should load and center on Fair Oaks Ranch
3. Stats panel should populate with project counts and budget totals
4. Directory should list all projects

Open browser DevTools (F12) and check the Console for any errors. See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) for known problems and workarounds.

## Step 8 — Swap In the Real Logo (1 min)

The `index.html` ships with a placeholder logo. Replace it with the real CFOR logo:

```
python extract_logo.py "C:\path\to\drainage_dashboard.html" webmap\index.html
```

This pulls the base64 logo from any existing CFOR HTML file and injects it into the new map. It also writes `logo.svg` for the favicon.

## You're Done

To run a sync going forward, just open ArcGIS Pro Python Command Prompt and run:

```
cd C:\GIS\CIP_Sync
python sync_cleargov_cip.py
```

For deployment to GitHub Pages, see [`DEPLOYMENT.md`](DEPLOYMENT.md).
For day-to-day operation, see [`OPERATIONS.md`](OPERATIONS.md).

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| `Python was not found` | Use **ArcGIS Pro Python Command Prompt**, not regular cmd |
| `numpy.dtype size changed` | The sync script bypasses the broken `arcgis` package — make sure you're using the latest version |
| `'NoneType' object has no attribute 'get'` | Run `dump_cleargov_structure.py` to inspect API changes |
| Map shows blank | Check public view sharing is set to **Everyone (Public)** |
| Map fails to load | Open browser console (F12), check for errors. See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) |

---

*See [`OPERATIONS.md`](OPERATIONS.md) for routine operations and [`MAINTENANCE.md`](MAINTENANCE.md) for fixing things.*
