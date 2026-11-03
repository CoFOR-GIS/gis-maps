# CIP Map — public build (City of Fair Oaks Ranch Capital Improvement Projects)

| Field | Value |
|---|---|
| App | Capital Improvement Projects map, public read-only viewer |
| Public URL | https://cofor-gis.github.io/gis-maps/CIP/ |
| Version | `v2.2-PUBLIC-R1` (2026-11-03) |
| Built from | Internal IIS beta `v2.2-IIS-BETA-R1` at `gis.local/CIP/beta/` (internal only, not reachable from the internet) |
| Owner | Ernie Martz, GIS Administrator, Engineering Services |
| Project lead | City Project Manager (CIP), Public Works |
| Stack | Single-file static HTML, ArcGIS Maps SDK for JavaScript 4.34 (CDN), no sign-in |
| Status | Live. Functionality mirrors the IIS beta; internal links removed |
| Replaces | The 12 ClearGov-era documents formerly in this folder (removed 2026-11-03; still in git history) |

## 1. Purpose
A public map of the City's capital improvement projects (water, wastewater, roadway, drainage, building). Residents can see where each project is, its phase, status, progress, budget and timeline.

What the viewer does:
- Map of all mapped projects (points, lines, areas), colored by category, with "NN% milestones" labels.
- **Project Directory** with search, category chips, lifecycle chips (All lifecycles / Active / Completed / Unspecified; Active is the default), and Phase and Project status dropdowns.
- **Project Statistics** panel showing filtered project count, filtered allocated budget, amount spent and a count by category.
- Popups show category, phase, status, status update, progress, next milestone, budget and timeline. A "project page" link appears only for projects whose City web page has been marked live.
- Data bar: "NN mapped projects · Data loaded HH:MM Central", plus **Reload data** and **Reset View** buttons.
- Phone layout: stacked map and directory, with a collapsible statistics panel.

This public build is the IIS beta with three differences:
1. No **GIS Hub** or **PM guide** buttons.
2. Uses the CFOR public palette and fonts (Playfair Display / DM Sans) instead of the shared gis.local theme.
3. Shows a plain public data notice instead of the beta's QA text.

## 2. Location
| What | Where |
|---|---|
| Public page | `CoFOR-GIS/gis-maps` → `CIP/index.html`, served at https://cofor-gis.github.io/gis-maps/CIP/ |
| Logo / favicon | `CIP/logo.svg` (copy of the root `logo.svg` on gis.local; lowercase name required, because GitHub Pages is case-sensitive) |
| This document | `CIP/README.md` (the only document in this folder) |
| Functional source of truth | Internal IIS beta `gis.local/CIP/beta/`. Change features there first, then rebuild this public copy (Procedure 4.1) |
| PM how-to guide | Internal IIS (`gis.local/CIP/beta/guide/`). Never linked from the public build |
| Sync job and its records | Ernie's workstation, `C:\GIS\CIP_Sync\` (internal) |
| Cross-agent records | `CoFOR-GIS/gis-ops` (private): `log/AI_COORDINATION.md`, `log/CLOUD_CHANGES.md` |

## 3. Data sources
| Source | Detail |
|---|---|
| Project features | ArcGIS Online public view `City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)`, item `21fc714233ec409b9445bede04b3daa4`. Layers: 0 `CoFORPW_CIP_Projects_Point`, 1 `CoFORPW_CIP_Projects_Line`, 2 `CoFORPW_CIP_Projects_Polygon` (6 / 5 / 3 features on 2026-11-03) |
| Authoritative layer | `CoFORPW_CIP_Projects` (editable, internal). The public view exposes it read-only |
| Fields the viewer uses | `ProjectName, Category, Lifecycle, Phase, HealthStatus, Overview, StatusNarrative, ProjectManager, Consultant, Contractor, ProgressPercent, MilestonesTotal, MilestonesComplete, NextMilestone, NextMilestoneDate, BudgetAllocated, BudgetSpent, ProjectStart, ProjectEnd, ProjectURL, LastSynced` |
| Map extent | `FOR_Jurisdictional/FeatureServer/0`, using `queryExtent()` then `view.goTo()` |
| Upstream | Public Works Project Status Reports (PSRs, one Excel file per project). The internal script `cip_psr_sync.py` copies PSR changes to the authoritative layer hourly at :15, 6:15 AM–7:15 PM, Monday–Friday. Locations are drawn once by PMs in the internal CIP Locator. ClearGov is no longer a source (removed October 2026) |

The viewer reads the public view only. It holds no credentials, and nothing internal appears in the page.

## 4. Procedure

### 4.1 Rebuild the public build after the IIS beta changes
1. Get the current beta source (`gis.local/CIP/beta/index.html`) and note its version tag (e.g. `v2.2-IIS-BETA-R1`).
2. Apply only these edits:
   - Fonts: keep the public Google Fonts link (Playfair Display + DM Sans) from the current public `index.html`.
   - Delete the `<link rel="stylesheet" href="/branding.css…">` line.
   - Delete the shared-theme `:root{…}` override in the beta's "shared gis.local chrome" CSS block. Keep the rest of that block, which is layout and accessibility. Remove the `#app-header` gold border. Change the focus outline color to `var(--olive)`.
   - Header logo: change `src="/logo.svg?v=…"` to `src="logo.svg"`.
   - In `#header-actions`, remove the `GIS Hub` and `PM guide` links. Keep **Reload data** and **Reset View**.
   - Data notice: change the initial text to `Loading project data…`. In `showDataNotice()`, use: `${n} mapped projects · Data loaded HH:MM Central. Active projects shown by default; use the filters to see others.`
   - Version comments: change them to `vX.Y-PUBLIC-Rn (date, mirrors IIS beta <beta tag>)`.
3. Check the result: no `gis.local`, `branding.css`, `GIS Hub`, `PM guide` or `IIS beta` text outside comments, and no root-relative (`/…`) `src` or `href`.

### 4.2 Deploy
1. Signed in to GitHub as CoFOR-GIS, open `https://github.com/CoFOR-GIS/gis-maps/upload/main/CIP`.
2. Upload `index.html` (and `logo.svg` if the logo changed). Commit directly to `main` with the message `CIP vX.Y-PUBLIC-Rn: mirror IIS beta <beta tag>`.
3. Wait for the Actions run "pages build and deployment" to finish (about 1–2 minutes).

### 4.3 Record it
- Add a `DONE` entry to the coordination log (local `C:\GIS\_system\AI_COORDINATION.md`, mirrored to gis-ops `log/AI_COORDINATION.md`) using the header `## YYYY-MM-DD HH:MM CT | Claude -> All | DONE | <Ref>`.
- Add a row to `CLOUD_CHANGES.md` that gives the commit SHA.
- Add a line to section 7 of this document.

### 4.4 Paste-ready prompt for Claude
```
Rebuild the public CIP map from the IIS beta. Read gis.local/CIP/beta/ in my browser,
apply CoFOR-GIS/gis-maps CIP/README.md section 4.1, test it with live data,
deploy per 4.2, verify per section 5, and record per 4.3.
```

### 4.5 Embedding on www.fairoaksranch.gov
The page can be embedded in the CivicPlus custom HTML widget with an `<iframe src="https://cofor-gis.github.io/gis-maps/CIP/" width="100%" height="800" title="Capital Improvement Projects Map">`. Embedding has not been approved yet, so don't add it until it is.

## 5. Verification
Run these checks on the live page after every deploy, using a hard reload or `?v=<sha>`:
| Check | Expected |
|---|---|
| Commit | The file in `main` is byte-identical to the tested build |
| Version | Page source contains the new `PUBLIC` version tag |
| Data | Data bar reads "NN mapped projects · Data loaded …" and NN matches the public view's total feature count. The directory lists the Active projects |
| Header | Only **Reload data** and **Reset View**. No GIS Hub or PM guide |
| Links | No `gis.local` or root-relative links |
| Logo | Header logo renders. `CIP/logo.svg` returns 200 (favicon) |
| Console | No JavaScript errors on load |
| Phone | At phone width, map and directory both usable, with no horizontal scroll |

## 6. Rollback
1. In `CoFOR-GIS/gis-maps`, open the history of `CIP/index.html` and find the last good commit (before 2026-11-03 this was `430ddef`, v2.1.2).
2. Open that version → **Raw** → save it as `index.html`, then upload it via the 4.2 steps with the message `CIP rollback to <sha>`.
3. Verify (section 5) and record it (4.3).
The data layer is not touched by this repo, so a rollback affects only the page.

## 7. Change log
| Date | Version | Change | By |
|---|---|---|---|
| 2026-11-03 | v2.2-PUBLIC-R1 (commit `add746e`) | Public build now mirrors the IIS beta v2.2-IIS-BETA-R1: lifecycle/phase/status filters, filtered totals, data bar with Reload data, milestone-based progress labels, phone layout. GIS Hub / PM guide links and the gis.local theme removed. Added lowercase `logo.svg`, which fixes the favicon 404 | Claude (at Ernie's direction) |
| 2026-11-03 | docs | Replaced the 12 ClearGov-era documents with this single README in the standard 7-section format; removed the unused `Logo.svg` | Claude |
| 2026-10-26 | v2.1.2 (`430ddef`) | Zoom to project from directory; label placement | — |
| 2026-10-26 | v2.1.1 (`34a2366`) | Zoom before opening popup | — |
