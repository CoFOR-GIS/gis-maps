# CoFOR CIP Map Project — Overview

**Project Name:** Capital Improvement Projects (CIP) Interactive Map
**Department:** Public Works
**City:** Fair Oaks Ranch, Texas
**Status:** Phase 3 of 5 (Web Map Build — In Progress)
**Last Updated:** May 2026

---

## What This Project Does

The CIP Map is a public-facing interactive web map that displays all of the City of Fair Oaks Ranch's Capital Improvement Projects on a single map. It pulls project data automatically from the city's existing **ClearGov municipal transparency portal** so staff don't have to maintain a duplicate data set, and makes that data available to residents, council members, and city staff in a more visual, geographic format.

## Why This Project Exists

The city already publishes CIP data on ClearGov, but ClearGov's interface is form-and-list driven — there's no map view that lets a resident see "what's happening near my house" or that lets staff quickly answer "show me all current Roadway projects." This map fills that gap.

It also avoids one of the most common GIS failure modes — a map that's accurate on launch day and stale six months later. Because the map syncs from ClearGov rather than being manually edited, project information stays current as long as ClearGov stays current.

## Who Uses This

| Audience | What They Use It For |
|----------|----------------------|
| Residents | "What's happening near my home? Why is that road being torn up?" |
| Council & city leadership | High-level view of capital spending across categories |
| Public Works staff | Quick reference for project boundaries, status, and progress |
| External partners (engineers, contractors) | Visual coordination with other in-progress work |

## What's On The Map

- **All five CIP categories:** Water, Wastewater, Roadway, Drainage, Building/Other
- **Three geometry types:** Points (facility locations), Lines (linear infrastructure), Polygons (project areas)
- **Per-project details:** Status (current/completed), progress percentage, allocated and spent budget, start and end dates, department, and description
- **Interactive features:** Search, category filters, status filters, sortable directory, click-to-zoom, popups with full project details
- **Stats summary:** Total project count, total budget, breakdown by category

## Architecture (Plain English)

```
ClearGov (cleargov.com)        ← city already publishes here
       ↓
Python sync script              ← fetches data on demand, runs in ArcGIS Pro
       ↓
ArcGIS Online (admin)           ← authoritative copy of project data
       ↓
ArcGIS Online (public view)     ← read-only, public-shared version
       ↓
Web Map (GitHub Pages)          ← what residents see
```

The map is a static HTML file hosted free on GitHub Pages. There's no server to maintain. The only "moving part" is the Python sync, which runs manually for now (automation is Phase 4).

## What This Project Replaces / Avoids

- **Manual map maintenance** — no more updating a feature class every time a project status changes
- **Duplicate data entry** — staff enter project data once in ClearGov, not twice
- **A Hub site or Experience Builder app** — the lightweight static HTML approach is faster, free to host, and matches established CFOR patterns

## Cost

- **AGOL credits:** Negligible (a tiny hosted feature service)
- **Hosting:** Free (GitHub Pages)
- **Software licensing:** Already covered by existing ArcGIS Pro and AGOL licenses
- **Staff time:** ~1 day initial setup, ~5 minutes per manual sync

## Project Phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Python sync script | ✅ Complete |
| 2 | AGOL configuration & public view | ✅ Complete |
| 3 | Web map build | 🟡 In progress |
| 4 | Task Scheduler automation | ⚪ Not started (intentionally deferred) |
| 5 | Deployment to GitHub Pages + CivicPlus embed | ⚪ Not started |

## Open Items

- Web map currently hangs on initialization — most recent error is being debugged
- CFOR logo not yet swapped in (still showing placeholder)
- Sync runs manually only — Task Scheduler setup deferred until web map ships

## Documentation Index

| Document | Audience | Purpose |
|----------|----------|---------|
| `README.md` | Anyone | Quick orientation, what's in this folder |
| `OVERVIEW.md` (this file) | Stakeholders | Project executive summary |
| `QUICKSTART.md` | New technical staff | Get running in 15 minutes |
| `ARCHITECTURE.md` | Developers | System design and data flow |
| `TECHNICAL.md` | Developers | Implementation details, code patterns |
| `OPERATIONS.md` | GIS admin | Day-to-day operation, sync runs, troubleshooting |
| `DEPLOYMENT.md` | GIS admin | How to publish to GitHub Pages |
| `MAINTENANCE.md` | Future maintainers | Updating, extending, future fixes |
| `CFOR_STANDARDS.md` | All technical staff | Organizational coding/naming conventions |
| `KNOWN_ISSUES.md` | All | Current bugs, limitations, workarounds |

---

*Maintained by City of Fair Oaks Ranch GIS — Public Works*
