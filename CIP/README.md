# City of Fair Oaks Ranch — CIP Map

Interactive map of Capital Improvement Projects auto-synced from ClearGov.

**Project Status:** 🟡 In progress (web map debugging)
**Live URL (after deploy):** `https://cofor-gis.github.io/gis-maps/CIP/`
**ClearGov Source:** https://cleargov.com/texas/comal/city/fair-oaks-ranch/capital-projects

---

## What's In This Repository

```
CIP_Sync/
├── README.md                           ← You are here
├── docs/
│   ├── OVERVIEW.md                     ← Executive summary
│   ├── QUICKSTART.md                   ← 15-minute setup
│   ├── ARCHITECTURE.md                 ← System design
│   ├── TECHNICAL.md                    ← Implementation details
│   ├── OPERATIONS.md                   ← Day-to-day usage
│   ├── DEPLOYMENT.md                   ← Publishing the map
│   ├── MAINTENANCE.md                  ← Future updates
│   ├── CFOR_STANDARDS.md               ← Organizational standards
│   └── KNOWN_ISSUES.md                 ← Bugs & limitations
│
├── scripts/
│   ├── sync_cleargov_cip.py            ← Main sync script
│   ├── dump_cleargov_structure.py      ← Diagnostic / API inspection
│   ├── extract_logo.py                 ← Logo swap utility
│   ├── run_cip_sync.bat                ← Windows scheduler runner
│   └── requirements.txt                ← Python dependencies
│
├── webmap/
│   ├── index.html                      ← The web map
│   └── logo.svg                        ← Favicon
│
└── logs/                               ← Created at runtime
    ├── cip_sync_YYYYMMDD_HHMMSS.log
    └── cleargov_dump_YYYYMMDD_HHMMSS.json
```

## I Just Want To...

| Goal | Read This |
|------|-----------|
| Understand what this project is | [`OVERVIEW.md`](docs/OVERVIEW.md) |
| Get it running on a new machine | [`QUICKSTART.md`](docs/QUICKSTART.md) |
| Understand how it works under the hood | [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Modify the code | [`TECHNICAL.md`](docs/TECHNICAL.md) |
| Run a sync | [`OPERATIONS.md`](docs/OPERATIONS.md) |
| Deploy the web map | [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Fix a bug or add a feature | [`MAINTENANCE.md`](docs/MAINTENANCE.md) |
| Match CFOR coding standards | [`CFOR_STANDARDS.md`](docs/CFOR_STANDARDS.md) |
| Find out what's broken | [`KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) |

## At a Glance

**Stack:**
- Python 3.x (ArcGIS Pro environment) — sync script
- ArcGIS Online — hosted feature service
- HTML/CSS/Vanilla JS — web map
- ArcGIS JS SDK 4.34 — map rendering
- GitHub Pages — hosting

**Key Constraints:**
- No server-side code (static hosting only)
- Read-only public access (no editing through the map)
- No authentication required to view the map
- Sync requires AGOL credentials (manual or env var)

**Current State:**
- ✅ Sync script working (creates 9 points, 8 lines, 2 polygons)
- ✅ Public view created and shared
- 🟡 Web map currently failing on init — see [`KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)

## Service URLs

**Public View (used by web map):**
```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)/FeatureServer
```

**Authoritative (admin only):**
```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/CoFORPW_CIP_Projects/FeatureServer
```

**Jurisdictional Boundary (centering):**
```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/FOR_Jurisdictional/FeatureServer/0
```

## ClearGov API

- **Municipality ID:** 605446
- **Base URL:** `https://cleargov.com/api/capital-projects/municipalities/605446/cp-interop/capital-plans`
- **Plan IDs:** Water (1991), Wastewater (1995), Roadway (2003), Building (2004), Drainage (2036)

## Contact

- **Department:** City of Fair Oaks Ranch — Public Works
- **AGOL Org:** https://fairoaksranch.maps.arcgis.com
- **GitHub Repo:** https://github.com/cofor-gis/gis-maps

---

*City of Fair Oaks Ranch GIS · Public Works · 2026*
