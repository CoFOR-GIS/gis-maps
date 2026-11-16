# StreetWorkHistory — Street Work History Map (City of Fair Oaks Ranch, Public Works)

## 1. Purpose

A public, read-only map of completed street maintenance (chip seal, fog seal, micro seal, reconstruction and similar) for every street segment. Segments are coloured by how long ago they were last treated. Choosing a street, on the map, in search or in the street directory, lists every treatment on record for each of its segments. Filters by treatment and year range highlight the streets that had that work.

## 2. Location

| What | Where |
|---|---|
| Live map | https://cofor-gis.github.io/gis-maps/StreetWorkHistory/ (after merge, and only once the public view is shared with Everyone) |
| Files | `StreetWorkHistory/index.html` (single-file app, ArcGIS Maps SDK 4.34 map components), `StreetWorkHistory/logo.svg` (official seal, D-007; also the favicon), this README |
| Design reference | `_design/README.md` (CoFOR GIS design system, D-050) |
| Work order | WO-0016 (Pavement Treatment History), Ref PAVHIST-SDK-PROP-20261116 |

## 3. Data sources

| Layer | Use |
|---|---|
| `FOR_Jurisdictional/FeatureServer/0` | Extent of the city, used to centre the map |
| `CoFORPW_PavementTreatment_Public/FeatureServer` (item `1c715100f896408697119d73def08461`) | Public view of `CoFORPW_PavementTreatment_History`. The app finds its layers by name: `Segments` (lines, renderer by `Last_Treatment_Year`), `Treatment_Events` (table, completed work only; joined by `CG_SegmentID` and `Poly_OID`), `Treatment_Area` (historic traced work areas, off by default) |

Both are on `services6.arcgis.com/Cnwpb7mZuifVHE6A`.

Parties: treatment records come from Cartegraph, the City's system of record, maintained by Legacy (engineering consultant), plus historic program maps traced by City GIS. Requested by the GIS Administrator; owned by Public Works.

Public wording: the view's `Source` values are shown as "City work order record" (Cartegraph) and "Historic program map" (polygon snapshot). The view hides internal fields (planned work, review flags, costs, work orders, notes); the app reads only the fields it lists in `SEG_FIELDS` and `EV_FIELDS`.

## 4. Procedure

- **Edit:** change `StreetWorkHistory/index.html` on a branch. Follow `_design/README.md`, including the public title bar in section 4.2. Open a pull request under GITHUB-PROP-STD-20261110 (D-051).
- **Design-system CSS:** the first `<style>` block in `index.html` is a copy of `_design/components.css` followed by `_design/tokens.css` (taken from `Roads/index.html`). To update it, copy both files in again; don't edit the copy.
- **Data refresh:** nothing to do in the app. The layer is refreshed once a year (after council approves the program) by `build_history_layer.py`; the map reads the view live. The age classes move with the newest `DataAsOf` date.
- **Embed:** use the CivicPlus embed standard in the repository README (an iframe of `https://cofor-gis.github.io/gis-maps/StreetWorkHistory/`, width 100%, height 800, title "City of Fair Oaks Ranch Street Work History Map").
- **Go-live order:** (1) street-name fixes (Axis Run, Firebird Drive) in the layer; (2) check that no `History_Summary` text lists planned work; (3) GIS Administrator shares the public view with Everyone; (4) merge; (5) CivicPlus page.

## 5. Verification

- Before merge (done 2026-11-16 by Claude against a local mock of the view built from the public road centerlines, because the view is still private): page loads with no console errors; 4 age classes plus "No record"; filters update the street and treatment counts; directory, search and map click open the street detail; a street name with an apostrophe works; title stays on one line at 298 px (231 px of 234 px).
- With live data (after the view is shared, or signed in as staff): street count matches the number of distinct streets in `Segments`; treatment count with no filter equals the completed rows in `Treatment_Events` (1,950 on 2026-11-16); spot-check segments 18 and 435 against the internal lookup map.
- Check the title bar at desktop width, at 390 px, in a 990×800 frame and in a ~298 px frame.

## 6. Rollback

Revert the pull request that added or changed the map. The map holds no data and writes nothing. Unsharing the public view also takes the data offline without touching the app.

## 7. Change log

- 2026-11-16 Map added (WO-0016, Ref PAVHIST-SDK-PROP-20261116), built by Claude (Cowork) from the Roads map pattern and the design system. Pending: live-data check and the go-live order in section 4.
