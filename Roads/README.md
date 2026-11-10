# Roads — Road Information Map (City of Fair Oaks Ranch, Public Works)

## 1. Purpose

A public, read-only map of the city's roads. Each segment shows its classification, maintenance responsibility, county, speed limit, road and right-of-way width, and length. A road directory beside the map lists every road and can be filtered and sorted.

## 2. Location

| What | Where |
|---|---|
| Live map | https://cofor-gis.github.io/gis-maps/Roads/ |
| Files | `Roads/index.html` (single-file app, ArcGIS Maps SDK 4.34 map components), `Roads/logo.svg` (official seal, D-007; also the favicon), this README |
| Design reference | `_design/README.md` (CoFOR GIS design system, D-050) |

## 3. Data sources

Public, query-only hosted layers (ArcGIS Online, no sign-in):

| Layer | Use |
|---|---|
| `FOR_Jurisdictional/FeatureServer/0` | Extent of the city, used to centre the map |
| `CoFORPW_Road_Public/FeatureServer/0` | Road centerlines: renderer by `RdType`, segment popup |
| `CoFORPW_Road_Dissolved/FeatureServer/0` | One feature per road name: search, the road directory and the road summary popup |

All three are on `services6.arcgis.com/Cnwpb7mZuifVHE6A`. The full URLs are in `index.html`.

## 4. Procedure

- **Edit:** change `Roads/index.html` on a branch. Follow `_design/README.md`, including the public title bar in section 4.2. Open a pull request under GITHUB-PROP-STD-20261110 (D-051); only the GIS Administrator merges.
- **Design-system CSS:** the first `<style>` block in `index.html` is a copy of `_design/components.css` followed by `_design/tokens.css`. To update it, copy both files in again; don't edit the copy.
- **Embed:** use the CivicPlus embed standard in the repository README (an iframe of `https://cofor-gis.github.io/gis-maps/Roads/`, width 100%, height 800).

## 5. Verification

- The road directory loads every road (263 on 2026-11-10), and the count shows above the list.
- Clicking a segment opens its details popup; clicking a directory row or a search result opens the road summary.
- Check the title bar at desktop width, at 390 px, in a 990×800 frame and in a ~298 px frame. The title stays on one line.

## 6. Rollback

Revert the pull request that made the change. The map holds no data and writes nothing.

## 7. Change log

- 2026-04-16 Map added (commit dc2873b).
- 2026-11-10 Moved to the CoFOR GIS design system (D-050, WO-0020 step 5, Ref DESIGN-SYSTEM-PROP-20261110):
  - Playfair Display + DM Sans replace Montserrat + Open Sans, including in the popups.
  - The navy header is now the forest-green `#1b3a2d` title bar with the 2px gold rule (`.cfr-masthead--admin`). Its eyebrow reads "City of Fair Oaks Ranch · Public Works", and the Public Works badge is removed.
  - The inline seal SVG is replaced by the local `logo.svg`, which is also added as the favicon (D-007).
  - The title "Road Information Map" (20 characters) is kept; it fits the ~298 px phone frame.
  - No change to data, layers, queries or behaviour.
  - This README is new.
