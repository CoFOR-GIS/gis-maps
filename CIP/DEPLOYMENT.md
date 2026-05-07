# Deployment Guide

How to publish the web map and embed it in the city website.

For initial setup of the sync system, see [`QUICKSTART.md`](QUICKSTART.md).
For day-to-day operation, see [`OPERATIONS.md`](OPERATIONS.md).

---

## Deployment Targets

The web map deploys to **two locations**:

1. **GitHub Pages** (canonical) — `https://cofor-gis.github.io/gis-maps/CIP/`
2. **CivicPlus iframe embed** — Embedded into the city's main website

The iframe references the GitHub Pages URL — there's only one source of truth.

---

## Initial Deployment

### Prerequisites

- Write access to `cofor-gis/gis-maps` GitHub repository
- Git installed locally
- The sync has been run at least once (so the public view exists)
- Logo has been swapped in via `extract_logo.py` (see [`QUICKSTART.md`](QUICKSTART.md) Step 8)

### Steps

#### 1. Clone the repository (one-time)

```
cd C:\GIS\
git clone https://github.com/cofor-gis/gis-maps.git
```

This creates `C:\GIS\gis-maps\`.

#### 2. Create the CIP folder

```
cd C:\GIS\gis-maps
mkdir CIP
```

#### 3. Copy the web map files

```
copy C:\GIS\CIP_Sync\webmap\index.html C:\GIS\gis-maps\CIP\
copy C:\GIS\CIP_Sync\webmap\logo.svg C:\GIS\gis-maps\CIP\
```

#### 4. Add a deployment-specific README

Create `C:\GIS\gis-maps\CIP\README.md` with the deployment-facing docs (see template below).

#### 5. Commit and push

```
cd C:\GIS\gis-maps
git add CIP/
git commit -m "Add CIP map"
git push
```

#### 6. Wait for GitHub Pages

GitHub Pages deployments take 1-3 minutes. Watch the status at:

```
https://github.com/cofor-gis/gis-maps/actions
```

#### 7. Verify

Open in a private browser window (one that's NOT signed into AGOL):

```
https://cofor-gis.github.io/gis-maps/CIP/
```

Expected behavior:

- Map loads with topo basemap
- Centers on Fair Oaks Ranch jurisdiction
- Stats panel populates
- Directory lists projects
- Click a row → zoom + popup
- Filters and search work

If anything fails, check the browser console (F12) for errors.

---

## Deployment-Facing README Template

Create this as `gis-maps/CIP/README.md` for visitors to the GitHub repo (not for the local development copy):

```markdown
# CIP Map — City of Fair Oaks Ranch

Interactive map of Capital Improvement Projects.

**Live:** https://cofor-gis.github.io/gis-maps/CIP/

## What this is

Auto-synced from ClearGov, displays all Capital Improvement Projects across
five categories: Water, Wastewater, Roadway, Drainage, Building.

## How updates work

Project data is synced from ClearGov to ArcGIS Online by a Python script.
The map reads from a public AGOL view. Changes in ClearGov flow to the
map after the next sync run.

## Tech

- ArcGIS JS SDK 4.34
- Vanilla JS, no framework, no build
- Single-file HTML deployment

For detail, see [project documentation](https://github.com/cofor-gis/cip-sync-docs).

---

City of Fair Oaks Ranch · Public Works
```

---

## Updating the Live Map

For routine updates (HTML edits, styling changes, bug fixes):

```
# Make your edits to C:\GIS\CIP_Sync\webmap\index.html

# Copy to the deployment folder
copy C:\GIS\CIP_Sync\webmap\index.html C:\GIS\gis-maps\CIP\

# Commit and push
cd C:\GIS\gis-maps
git add CIP\index.html
git commit -m "CIP map: [describe change]"
git push
```

The change is live within 1-3 minutes.

> **Tip:** Test locally first by opening `index.html` directly in your browser. There's no functional difference between local and deployed besides the URL.

---

## CivicPlus Embed

The map is embedded into the city's main website (CivicPlus CMS) via iframe. This pattern matches the Annexation History map embed.

### Embed Code

```html
<iframe
  src="https://cofor-gis.github.io/gis-maps/CIP/"
  width="100%"
  height="800"
  frameborder="0"
  style="border:1px solid #ddd; border-radius:4px;"
  title="Capital Improvement Projects Map"
  allowfullscreen>
</iframe>
```

### Where to Embed

Likely candidate pages:

- Public Works → Capital Improvement Projects (new page)
- Government → Transparency
- Residents → Project Updates

Coordinate with the city web administrator to determine final placement.

### Considerations for Embed

- **Mobile:** The map is responsive and works at any width, but the iframe should be at least 600px tall for usability
- **HTTPS:** GitHub Pages serves HTTPS, so embedding in CivicPlus (also HTTPS) is fine
- **Cross-origin:** No special headers needed — public read-only fetch only

---

## Rollback

If a deployed version is broken, roll back to the last good commit:

```
cd C:\GIS\gis-maps
git log --oneline CIP/index.html
# Find the SHA of the last good version, e.g., a3f5c91

git checkout a3f5c91 -- CIP/index.html
git commit -m "Rollback CIP map to last good version"
git push
```

---

## Custom Domain (Optional)

If a city-branded domain is desired (e.g., `cip.fairoaksranchtx.gov`):

1. Configure DNS CNAME record pointing to `cofor-gis.github.io`
2. In the repo, add a `CNAME` file at the root with the domain name
3. In repo settings → Pages → set the custom domain
4. Wait for HTTPS provisioning (15-60 minutes)

This is optional — the GitHub Pages URL works fine for embedding.

---

## File Structure on Deploy

```
cofor-gis.github.io/gis-maps/         (GitHub repo)
├── ...other maps...
└── CIP/
    ├── index.html                    (the web map)
    ├── logo.svg                      (favicon)
    └── README.md                     (visitor-facing readme)
```

---

## Verifying Deployment

### Quick smoke test

After every deployment:

1. Open https://cofor-gis.github.io/gis-maps/CIP/ in private browser window
2. Open DevTools (F12) → Console tab
3. Confirm no red errors
4. Confirm map renders, directory populates, filters work

### Full smoke test

1. Run a fresh sync (`python sync_cleargov_cip.py`)
2. Reload the deployed map
3. Confirm new/changed projects appear in the directory
4. Confirm popup shows updated budget/progress data
5. Verify the "Last sync" timestamp in the stats panel reflects the recent sync

---

## Deployment Checklist

Before pushing a change:

- [ ] Tested locally (opened HTML directly in browser)
- [ ] Browser console has no errors
- [ ] Logo is the real CFOR logo (not the placeholder)
- [ ] Service URLs in code match current AGOL service URLs
- [ ] Mobile layout works (resize browser to <768px)
- [ ] Filters and search work
- [ ] Click-to-zoom works for points, lines, AND polygons (different code paths)
- [ ] Popups display correctly with all sections (badges, progress, budget, timeline, description)
- [ ] Stats panel shows expected counts and totals

---

*See [`MAINTENANCE.md`](MAINTENANCE.md) for handling code changes, [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) for current bugs.*
