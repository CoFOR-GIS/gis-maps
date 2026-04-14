# Drainage Infrastructure — Project Summary

**Date:** April 10, 2026
**Author:** Ernie Martinez, GIS Administrator
**Status:** In Progress

---

## Background

The City of Fair Oaks Ranch maintained two separate hosted feature services containing overlapping stormwater drainage line data. The legacy `CoFORPW_Drainage_Culvert_Inventory` service held 423 culvert lines collected from aerial imagery and Google Street View, while the newer `City_of_Fair_Oaks_Ranch_Drainage_Inventory` service was published from ArcGIS Pro with a multi-layer schema designed for long-term asset management. The culvert service used a point-over-line symbology pattern (`Parent_OID` linking L0 points to L1 lines) and lacked GlobalID and editor tracking, making it unsuitable for Field Maps or sync-enabled workflows. The drainage inventory service had two populated layers (DrainageStructures and DrainageChannels) and two empty layers (DrainageBasins) ready for future use.

The goal was to consolidate culvert data into the authoritative drainage inventory service, retire the legacy service, and build the operational tools needed to manage drainage infrastructure going forward.

## What Was Accomplished

### 1. Layer Consolidation

A fourth layer (L4 — DrainageCulverts, polyline) was added to the Drainage Inventory service via an `addToDefinition` JSON payload submitted to the Admin REST endpoint. The new layer schema includes FeatureID, FeatureType (Culvert/DrivCulvert/RoadCrossing), Material (CMP/Concrete/PVC/HDPE/Other), Condition, MaintenancePriority, Ownership, Width, NumberOfPipes, LastInspectionDate, GlobalID, editor tracking and attachment support.

An append script (`append_culverts.py`) mapped source fields from the legacy schema to the new target schema, including integer-to-string priority conversion and type remapping. All 423 features were successfully appended to L4 with geometry preserved in WKID 2278.

**Service structure after consolidation:**

- L1 — DrainageStructures (Point) — empty, schema ready for inlet/outlet/junction population
- L2 — DrainageChannels (Polyline) — populated with ROW-derived conveyance lines
- L3 — DrainageBasins (Polygon) — empty, ready for watershed delineation
- L4 — DrainageCulverts (Polyline) — 423 features migrated from legacy service

Two existing view layers require updating to include the new L4:

- Maintenance View (Item `bed682f22d60495297efe6a691721b97`) — shared with field crews for editing
- Public View (Item `1632e151d2ff470bbb6159da4d93c8d4`) — shared publicly for read-only access

### 2. Field Maps Configuration

A complete Field Maps configuration specification was produced for a single unified web map covering all four drainage layers. The design decision was to use one map rather than four separate maps because drainage field work follows physical paths — a crew walks a channel, encounters a culvert crossing, notes an inlet structure — and splitting layers into separate maps would force unnecessary app switching.

**Layer editability:**

- L1 DrainageStructures — editable, full form with smart defaults and Arcade auto-priority
- L2 DrainageChannels — editable by field crews and office staff
- L3 DrainageBasins — read-only reference with popup only
- L4 DrainageCulverts — editable, full form with photo attachments for field inspection

**Form design principles applied:**

- Grouped fields by workflow context (Asset Identity, Physical Attributes, Condition Assessment, Context)
- Conditional visibility rules to keep forms short for routine inspections (MaintenancePriority only appears when Condition is Fair or Poor, NumberOfPipes hidden for DrivCulvert type)
- Smart defaults (MaintenancePriority = Low, Ownership = City of Fair Oaks Ranch, LastInspectionDate = current date)
- Arcade expressions for auto-priority calculation based on condition
- Snapping rules for topological connectivity between structures and line features (10 ft tolerance)
- Offline sync configuration for field use with on-demand attachment download

The configuration also specifies symbology (culverts color-coded by condition, structures categorized by FeatureType, channels as blue dashed lines), labeling scales, search configuration across FeatureID and offline basemap caching for the jurisdictional extent.

### 3. Drainage Operations Dashboard

A public-facing single-page dashboard was built for deployment at `gis.local/Drainage/`. The dashboard provides a clear overview of the city's drainage infrastructure, inspection progress and current condition assessments for stakeholders, council members and the general public.

**Technical architecture:**

- Single HTML file, no build process, no external dependencies beyond CDN resources
- Chart.js 4.4.7 loaded before ArcGIS JS SDK 4.31 to prevent AMD `define()` conflicts
- All data queries use POST with URLSearchParams against the Public View feature service REST endpoints with 1,000-record pagination
- Address search queries the Parcels_View public view service (`ADDRESS` field) via direct REST fetch — completely decoupled from the ArcGIS SDK auth pipeline to avoid getCredential rejection interference
- Login prompts suppressed via blanket `getCredential` rejection (public layers only)
- Map initialized with center `[-98.69, 29.745]` zoom 13, then refined to jurisdictional `queryExtent()` + `view.goTo()` once both view and layer are ready
- City logo embedded as base64 data URI (~25KB) to eliminate external file loading issues across IIS, file:// and GitHub Pages contexts
- Favicon references `logo.svg` in the same deployment folder

**Dashboard sections:**

1. **KPI row** (4 cards) — Total infrastructure, culverts with material breakdown, channel mileage, structures
2. **Inspection status** (2 cards) — Animated SVG progress ring showing % inspected across all layers, per-layer horizontal breakdown bars with color coding (red <25%, amber 25–59%, green ≥60%). Based on `LastInspectionDate IS NOT NULL` count
3. **Condition overview** (3 pills) — Good/Fair/Poor with count and percentage, aggregated across L1, L2, L4
4. **Charts** (2 cards) — Stacked bar (condition by asset type), horizontal bar (culvert material distribution)
5. **Map** — gray-vector basemap, FEMA NFHL flood zones at 35% opacity (MapImageLayer sublayer 28), condition-coded culvert symbology, structure type symbology, dashed channel lines, context layers (jurisdictional boundary, parcels at 1:18k, roads with labels at 1:8k)
6. **Address search** — Queries `ADDRESS` field on Parcels_View public view service via direct REST fetch, click-to-zoom to parcel centroid with popup

**Design decisions:**

- Public color profile: cream `#FAF8F4` background, forest green `#1B3A2D` accents, Playfair Display + DM Sans typography
- Maintenance priority data excluded from public view — internal operational information
- FEMA National Flood Hazard Layer included as context for drainage-flood relationship visibility
- Disclaimer footer for public data distribution

**Layer endpoints consumed:**

| Layer | Source | Purpose |
|-------|--------|---------|
| DrainageStructures (L1) | Public View FeatureServer/1 | KPI count, condition stats, inspection stats, map symbology |
| DrainageChannels (L2) | Public View FeatureServer/2 | Mileage via `Shape__Length`, condition stats, inspection stats |
| DrainageBasins (L3) | Public View FeatureServer/3 | Map reference layer (transparent fill) |
| DrainageCulverts (L4) | Public View FeatureServer/4 | KPI count, material stats, condition stats, inspection stats, map symbology |
| Jurisdictional Boundary | FOR_Jurisdictional/FeatureServer | Map extent initialization, boundary outline |
| Parcels | Portal Item bd5079b30310433998c6a54652074dd6 L0 | Map context at 1:18k |
| Parcels (search) | Parcels_View/FeatureServer/0 | Address search via direct REST (field: `ADDRESS`) |
| Roads | CoFORPW_Road_Public/FeatureServer/0 | Map context with labels at 1:8k |
| FEMA NFHL | hazards.fema.gov/.../NFHL/MapServer (sublayer 28) | Flood zone overlay at 35% opacity |

## Deliverables

| # | Deliverable | Format | Deploy Location | Status |
|---|------------|--------|----------------|--------|
| 1 | Layer Consolidation Summary | Markdown | Project documentation | Complete |
| 2 | addToDefinition JSON payload | JSON | Admin REST endpoint | Executed |
| 3 | append_culverts.py | Python (ArcGIS Pro) | One-time migration script | Executed — 423 features appended |
| 4 | Field Maps Configuration Spec | Markdown | Reference for AGOL web map setup | Complete — pending implementation |
| 5 | Drainage Operations Dashboard | HTML | gis.local/Drainage/index.html | Complete — pending view layer update |
| 6 | Dashboard Technical Reference | Markdown (README.md) | gis.local/Drainage/ | Complete |
| 7 | Dashboard Continuation Summary | Markdown | Project documentation | Complete |

## Prerequisites Before Deployment

1. **Update Public View service** — Add L4 (DrainageCulverts) to the Public View (Item `1632e151d2ff470bbb6159da4d93c8d4`). Without this, the dashboard culvert queries and map layer will return 404 errors.

2. **Update Maintenance View service** — Add L4 to the Maintenance View (Item `bed682f22d60495297efe6a691721b97`) with editing enabled. Hide `Created_User` and `Cost_Code` on L4 in the Public View per governance standards.

3. **Expose LastInspectionDate on Public View** — The inspection metrics query `LastInspectionDate IS NOT NULL` on each sublayer. If this field is hidden in the view definition, inspection counts will return 0.

4. **Verify L2 field names** — The Field Maps configuration was built from the consolidation summary schema. Confirm actual field names on DrainageChannels (L2) match the spec, since the layer was published from ArcGIS Pro and field names may differ from the documented schema.

5. **Deploy favicon** — Copy the city `logo.svg` file to `gis.local/Drainage/` alongside `index.html`. The favicon `<link>` tag references this file.

6. **Retire legacy service** — Rename `CoFORPW_Drainage_Culvert_Inventory` to include "(Legacy)" in the title. Remove from active web maps. The culvert point layer (L0, Parent_OID pattern) can be deprecated — use scale-dependent rendering on L4 instead.

## Next Steps

### Short-Term

- **Implement Field Maps web map** — Create the web map in AGOL following the configuration spec, configure forms with conditional visibility and Arcade expressions, share to maintenance crew group, test offline sync and attachment capture on mobile devices
- **Populate DrainageStructures (L1)** — Generate start/end points from channel and culvert line endpoints, classify as Inlet, Outlet, Culvert endpoint or Junction using the existing FeatureType domain
- **Create IIS deployment** — Copy `index.html` and `logo.svg` to `gis.local/Drainage/` on the IIS server

### Medium-Term

- **Populate DrainageBasins (L3)** — Delineate watershed/drainage area polygons to support MS4 reporting, relating each basin to the channels and structures within it
- **MS4 integration** — Connect the consolidated drainage service to the MS4 stormwater mapping work. The 2018 outfall layer remains the highest-priority MS4 seed geometry. A separate MS4-specific application at `gis.local/Stormwater/` could reference the drainage layers for compliant symbology and reporting while keeping asset management separate from regulatory compliance
- **Internal operations dashboard** — Build a separate PW-themed (dark, #1F1E1A/#D49A4E) version of the dashboard at a staff-only URL for maintenance priority tracking, inspection currency monitoring and work order integration. The public dashboard intentionally excludes this operational detail
- **Inspection history tracking** — Extend the Field Maps form to log inspection events in the L1 Inspection table pattern (similar to the hydrant maintenance app's `FACILITYKEY→FACILITYID` join), enabling inspection frequency analysis and overdue alerts

### Long-Term

- **Condition trend analysis** — Once inspection data accumulates over multiple cycles, add time-series charts showing condition trajectory by asset type and geographic area
- **Capital planning integration** — Link drainage condition data to ClearGov capital improvement categories for budget justification of rehabilitation and replacement projects
- **Public notification** — If the dashboard URL is embedded via iframe into the CivicPlus website (following the established `<iframe>` pattern from the Annexation History map), residents can view drainage infrastructure in their area directly from the city website
