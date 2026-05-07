# Operations Guide

Day-to-day operation of the CIP Map system.

For initial setup, see [`QUICKSTART.md`](QUICKSTART.md).
For making code changes, see [`MAINTENANCE.md`](MAINTENANCE.md).

---

## Running a Manual Sync

### When to Sync

Run a sync whenever you want the map to reflect the current state of ClearGov:

- After a project's status, budget, or progress is updated in ClearGov
- After new projects are added to a capital plan
- After a project is removed from a capital plan
- Before major stakeholder meetings (council, public events)

The sync is idempotent and safe to run any number of times.

### How to Sync

1. Open **ArcGIS Pro Python Command Prompt** (Start menu → ArcGIS folder)
2. Navigate to the script folder:
   ```
   cd C:\GIS\CIP_Sync
   ```
3. Run the sync:
   ```
   python sync_cleargov_cip.py
   ```
4. When prompted:
   ```
   AGOL Username (for https://fairoaksranch.maps.arcgis.com): EMartz
   AGOL Password: ********
   ```
5. Wait ~30-90 seconds. Watch for the final block:
   ```
   ============================================================
   SYNC COMPLETE
   ============================================================
   Item ID:      36bae75e157a4e43a7242ce958f2cbc7
   Service URL:  https://services6.arcgis.com/.../FeatureServer
   ```

### What Happens During a Sync

```
1. Authenticate to AGOL                    [~1 sec]
2. Fetch capital plans from ClearGov       [~1 sec]
3. For each plan:
   - Fetch projects                        [~2 sec each, 5 plans = 10 sec]
   - Extract geometry and attributes
   - Project coordinates
4. Find or create CoFORPW_CIP_Projects     [~3 sec for create]
5. Truncate existing features (if update)  [~5 sec]
6. Add features in batches of 250          [~10 sec]
   - Layer 0 (Points)
   - Layer 1 (Lines)
   - Layer 2 (Polygons)
7. Log summary
```

Total: 30-90 seconds depending on whether it's a create or update.

### Verifying the Sync Worked

1. **Watch for the SYNC COMPLETE banner** in the terminal
2. **Check the log file** at `C:\GIS\CIP_Sync\logs\cip_sync_YYYYMMDD_HHMMSS.log`
3. **Open AGOL** and verify feature counts:
   - https://fairoaksranch.maps.arcgis.com → My Content → CoFORPW_CIP_Projects
   - Click into each layer (0, 1, 2) and check feature count
4. **Open the web map** (after deployment) and check the directory shows expected projects

### Expected Counts (as of last successful sync)

| Layer | Geometry | Count |
|-------|----------|-------|
| 0 | Points | ~9 |
| 1 | Lines | ~8 |
| 2 | Polygons | ~2 |
| **Total** | | ~19 |

These counts will change as projects are added/removed/updated in ClearGov. ~28 total projects exist; ~19 have map geometry, ~9 don't.

---

## Running a Diagnostic Dump

Use when something seems off (zero projects, geometry not matching expectations, ClearGov structure changed):

```
cd C:\GIS\CIP_Sync
python dump_cleargov_structure.py
```

Output:
- `logs/cleargov_dump_YYYYMMDD_HHMMSS.json` — full raw API response
- `logs/cleargov_structure_YYYYMMDD_HHMMSS.txt` — human-readable summary

The summary file shows:

- Aggregate stats (project counts, geometry counts)
- Per-project field structure
- The structure of the first project that has geometry (raw JSON)

If geometry counts don't match expectations, share the summary file with whoever maintains the parsing logic.

---

## Reading the Logs

### Log File Locations

```
C:\GIS\CIP_Sync\logs\
├── cip_sync_20260507_093015.log         ← One per sync run
├── cleargov_dump_20260507_093015.json   ← Diagnostic raw dump
└── cleargov_structure_20260507_093015.txt  ← Diagnostic summary
```

Logs are never deleted automatically. Periodically prune the folder if it grows large.

### What to Look For

**Successful sync log starts with:**
```
INFO - CLEARGOV CIP SYNC TO AGOL (REST mode)
INFO - Started: ...
```

**Healthy processing:**
```
INFO - Processing Water projects (Plan ID: 1991)
INFO - Retrieved 8 projects for plan 1991
INFO -   ✓ Line: Rolling Acres Trail Waterline Rehabilitation (28R)
```

**Multi-geometry indicator:**
```
INFO -   ► Wastewater Treatment Plant Phase 1 Expansion (2S): 3 geometries
INFO -   ✓ Point: ... (#1)
INFO -   ✓ Point: ... (#2)
INFO -   ✓ Poly:  ... (#3)
```

**Final summary:**
```
INFO - PROCESSING SUMMARY
INFO - Total projects:               28
INFO - Projects with geometry:       16
INFO - Projects without geometry:    12
INFO - Multi-geometry projects:      2
INFO - Total features created:
INFO -   Points:                     9
INFO -   Lines:                      8
INFO -   Polygons:                   2
INFO - Errors:                       0
```

If you see `Errors: > 0` or `Projects with geometry: 0`, investigate further.

### Common Warning Messages (Safe to Ignore)

- `Geometry extraction error for 'X': 'NoneType' object has no attribute 'get'`
  → A project has `mapSettings: null` (no map data entered in ClearGov). Expected for some projects.
- `Field update failed for layer N: field not found`
  → CFOR-standard hidden field doesn't exist in our schema. Expected.

### Concerning Messages

- `Authentication failed`
  → Check username/password
- `Source service 'CoFORPW_CIP_Projects' not found`
  → Service was deleted; sync will recreate it on next run
- `REST error: Unable to add feature service definition`
  → AGOL service operation failed; see [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md)

---

## Updating the Web Map

After making changes to `index.html`:

```
cd path\to\cofor-gis.github.io\gis-maps\CIP\
copy C:\GIS\CIP_Sync\webmap\index.html .
git add index.html
git commit -m "Update CIP map: [describe change]"
git push
```

Changes are live on `https://cofor-gis.github.io/gis-maps/CIP/` within 1-3 minutes (GitHub Pages deployment time).

For full deployment instructions, see [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Routine Health Checks

Suggested monthly routine:

### 1. ClearGov API Health

```
python dump_cleargov_structure.py
```

Compare aggregate stats to last month's. Big drops in geometry count may indicate ClearGov API changes.

### 2. AGOL Service Health

- Open https://fairoaksranch.maps.arcgis.com
- Check that `CoFORPW_CIP_Projects` and the public view both still exist
- Verify public view sharing is still **Everyone (Public)**

### 3. Web Map Health

- Open https://cofor-gis.github.io/gis-maps/CIP/
- Verify map loads
- Verify directory populates
- Try a search ("water" should match Water-category projects)
- Try a filter (click a category chip)
- Click a project row, verify zoom + popup

### 4. Sync Test

```
python sync_cleargov_cip.py
```

Run a sync to confirm credentials still work. The sync log should show no errors.

---

## Permissions and Access

### Who Can Run Syncs

Anyone with **publishing permissions** in `fairoaksranch.maps.arcgis.com`. As of project start, this is:

- EMartz (primary)
- LMuniz
- JWilliams

### Who Can Edit the Web Map

Anyone with write access to the `cofor-gis/gis-maps` GitHub repository.

### Who Can View the Web Map

Everyone. The public view is intentionally accessible without authentication. The web map is on GitHub Pages, also publicly accessible.

---

## When to Escalate

Contact the GIS administrator (or whoever maintains this) if:

- Sync fails repeatedly after credentials are verified working
- ClearGov API returns unexpected structure (run dump script first)
- AGOL feature service shows wrong feature counts after sync
- Web map shows error on load that isn't covered in [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md)
- Public view sharing was changed (intentionally or not)

---

## Future: Automated Sync (Phase 4)

When automation is implemented:

1. Open Windows Task Scheduler
2. Find task "CIP ClearGov Sync"
3. Right-click → Run (test) or History (review past runs)

The Task Scheduler will run `run_cip_sync.bat`, which calls the sync script with credentials from environment variables. See [`MAINTENANCE.md`](MAINTENANCE.md) for setup instructions when the time comes.

---

*See [`MAINTENANCE.md`](MAINTENANCE.md) for code changes and feature additions.*
