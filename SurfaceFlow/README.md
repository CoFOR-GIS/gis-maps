# Surface Flow Explorer (proof of concept)

| Field | Value |
|---|---|
| Folder | `gis-maps/SurfaceFlow/` |
| URL once merged | https://cofor-gis.github.io/gis-maps/SurfaceFlow/ |
| Status | **Proof of concept.** Not linked from any public page. Not an engineering product. |
| Owner | Ernie Martz, GIS Administrator (records: `CoFOR-GIS/gis-ops` WO-0009, `handoff/SurfaceFlow/README.md`) |
| Built | 2026-11-03, Claude (Claude Code), at Ernie's direction |

## 1. Purpose
Show residents and staff, in a Google Earth–style 3D view, **roughly which way rainwater flows**: flow paths with downhill arrows, low spots where water collects, a "drop a raindrop" trace, and a "rising water" slider that shades ground relatively close to creek level.

It is **approximate by design**. It uses ground elevation only. It ignores storm drains (except city culverts, see below), buildings, fences, soils and rainfall amount. It is **not** a flood model, a flood study or a flood determination. The page says so in a banner, and links FEMA's map service center.

The project ladder discussed with Ernie (2026-11-03):

| Level | What it shows | In this app? |
|---|---|---|
| 0 Flow direction | Flow paths and arrows | Yes |
| 1 Ponding | Low spots ("fill and spill") | Yes |
| 2 HAND | Relative inundation slider (height above nearest drainage) | Yes |
| 3 2D hydraulic model | Depth and velocity for a design storm | No. Reuse existing studies (FEMA, SARA, TWDB Region 12) instead. |

## 2. Location
| Item | Path |
|---|---|
| App (single file) | `SurfaceFlow/index.html` |
| Logo / favicon | `SurfaceFlow/logo.svg` (copy of `Drainage/logo.svg`) |
| Engine test (Node) | `SurfaceFlow/tests/engine_test.js` |
| Browser test (Node + Playwright, SDK stand-in) | `SurfaceFlow/tests/browser_test.js`, `SurfaceFlow/tests/mock_sdk.js` |

No server, build step or sign-in. Everything runs in the visitor's browser.

## 3. Data sources
All public, no token. Item and service URLs are in the `CONFIG` block at the top of the main script.

| Data | Source | Use |
|---|---|---|
| Elevation | Esri World Elevation `WorldElevation3D/Terrain3D/ImageServer` (USGS 3DEP; lidar-derived where available) | 3D ground, and sampled into the analysis grid |
| City limits | `FOR_Jurisdictional/FeatureServer/0` | Default "Whole city" extent and outline |
| Culverts | `City_of_Fair_Oaks_Ranch_Drainage_Inventory_(Public_View)/FeatureServer/4` | Carved into the grid so water passes under roads; optional display |
| FEMA NFHL | `hazards.fema.gov/.../NFHL/MapServer`, sublayer 28 | Regulatory flood zones for context (toggle) |
| Basemap | Esri `hybrid` (imagery + labels) | Visual context |

### How the analysis works (all in a Web Worker in the page)
1. **Grid.** The analysis area is either the city limits plus 600 m, or a box of up to 6 km around the view center. It is sampled from the elevation layer at 3, 5 or 10 m. The cell size is coarsened automatically above about 2.6 million cells.
2. **Culverts (optional, on by default).** Each culvert line is extended 2 cells at each end. A straight channel 1 m below its end elevations is cut along it. Culvert direction is not needed.
3. **Fill.** Priority-Flood+ε (Barnes et al., 2014) creates two surfaces. The ε-filled one drains everywhere and is used for directions. The plain-filled one gives low-spot depth: filled minus original.
4. **Directions.** D8 steepest descent on the ε-filled surface. There are no loops; every cell drains to the grid edge.
5. **Accumulation.** Each cell gets the number of upstream cells (area), in topological order.
6. **Flow paths.** Cells draining more than the slider area (1–500 acres, default 5) are traced into segments between junctions. Segments are smoothed (Chaikin) and cut into 90 m pieces so arrows repeat. They are drawn in four width classes: under 25, 25–250, 250–2,500 and over 2,500 acres.
7. **HAND.** Each cell's height above the creek cell it drains to, where "creek" means draining more than the second slider (25–5,000 acres, default about 250). The rising-water slider (0–25 ft) shades cells whose HAND is below the slider value.
8. **Raindrop.** Follows the D8 directions from the clicked cell. It reports distance, drop and the deepest low spot passed through.

Speed: on a 1600 × 1600 grid the engine takes about 2 s in Node. Expect a few seconds more in the browser to sample elevation.

## 4. Procedure
### Use
1. Open the page. It starts tilted over the city.
2. Click **Whole city**, or move the view and click **Current view**. Wait for "Done".
3. Adjust **Show paths draining at least** to show more or fewer paths.
4. Click **Drop a raindrop**, then click the map. Press Esc to cancel.
5. Tick **Show rising water** and move the slider.
6. Optionally tick the FEMA zones, culverts and terrain exaggeration (2× by default; the analysis always uses true elevations).

### Run the tests (developer, optional)
Prerequisites: Node 18 or later. For the browser test, also Playwright with Chromium (`npm i playwright`, then `npx playwright install chromium`). No ArcGIS access is needed; the SDK is stubbed.
```bash
node SurfaceFlow/tests/engine_test.js
```
```bash
node SurfaceFlow/tests/browser_test.js
```
Expected: every line of the engine test starts with `PASS`. The browser test prints `Done:` statuses, raindrop text, `mobile scrollWidth 390`, and only a font-loading error. Screenshots are saved to `tests/` (or `SHOT_DIR`); they are not committed.

### Deploy
Merging the PR to `main` publishes it on GitHub Pages. Ernie merges. Not linked from CivicPlus or gis.local until accepted.

## 5. Verification
- **Done (2026-11-03, offline):** the engine test passed on synthetic terrain. Checks covered:
  - no loops;
  - pit depth matches the hand calculation (0.72 m);
  - an embankment ponds 1.63 m until water spills round its end;
  - HAND is 0 in the valley;
  - the threshold slider reduces segment count;
  - a 2.56M-cell grid finishes in about 2 s.
- **Done (2026-11-03, offline):** the browser test with an SDK stand-in passed. Checks covered:
  - whole-city and current-view runs;
  - culvert carving reduces the pond behind the embankment;
  - raindrop text;
  - HAND slider, both re-threshold sliders;
  - 390 px mobile layout with no horizontal scroll.
- **Not yet done:** a live test against the real ArcGIS SDK and services. The build sandbox could not reach `js.arcgis.com` or the elevation service. Ernie's checklist (also in WO-0009):
  1. The page loads with no sign-in prompt, and the 3D terrain shows with imagery.
  2. **Whole city** finishes in under about 30 s. Flow paths follow known creeks (for example Cibolo Creek and its tributaries) and known drainage swales.
  3. Arrows point downhill. A raindrop dropped on a known hillside goes where staff expect.
  4. Low spots appear at known ponds and detention areas. With culverts on, ponds upstream of road crossings shrink.
  5. The rising-water shading at 5–10 ft roughly resembles the FEMA zone shape along creeks. It is not expected to match.
  6. A phone layout is usable.

## 6. Rollback
The app is self-contained and reads public data only; it writes nothing. To remove it, revert the merge commit, or delete `SurfaceFlow/` and its row in the repo README in a PR. Nothing in ArcGIS Online changes.

## 7. Change log
- 2026-11-03 v0.1 proof of concept: levels 0–2, client-side engine, culvert carving, FEMA context, offline tests (Claude, for Ernie).
- Ideas for the next version (not done):
  - Weight accumulation by imperviousness, using building footprints and roads.
  - Cache a precomputed city-wide result as a hosted layer for faster loads.
  - Add a link to existing regional model depth grids (SARA / TWDB Region 12) if they are available.
  - Use a lidar DEM processed in ArcGIS Pro where better detail is needed.
