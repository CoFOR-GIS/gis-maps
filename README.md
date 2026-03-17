# CoFOR GIS Maps

Public-facing interactive map viewers for the City of Fair Oaks Ranch. Every app in this repository runs without authentication — no AGOL login, no OAuth, no API key required.

> **Live URL:** [cofor-gis.github.io/gis-maps](https://cofor-gis.github.io/gis-maps/)  
> **Organization:** [fairoaksranch.maps.arcgis.com](https://fairoaksranch.maps.arcgis.com)

---

## Repository vs gis-apps

| Repository | Purpose | Auth Required |
|---|---|---|
| **gis-maps** (this repo) | Read-only public map viewers | None |
| [gis-apps](https://github.com/cofor-gis/gis-apps) | Editing tools and admin utilities | AGOL OAuth |

If the app writes data or requires a login, it belongs in `gis-apps`. If it only queries public feature services for display, it belongs here.

---

## Maps

| Map | Path | Description |
|---|---|---|
| Annexation History | [`/AnnexationHistory`](https://cofor-gis.github.io/gis-maps/AnnexationHistory/) | Era-based annexation viewer with time slider, ordinance document links, and address search |

---

## Adding a New Map

1. Create a folder at the repository root using PascalCase (e.g. `DrainageInventory/`)
2. Place a single `index.html` file inside — no build step, no bundler
3. Update the table above
4. Push to `main` — GitHub Pages deploys automatically

### Technical Standards

- **SDK:** ArcGIS JS SDK 4.31 (CDN, no local install)
- **Fonts:** Playfair Display (headings) + DM Sans (body) via Google Fonts
- **Coordinate System:** WKID 2278, NAD83 TX South Central, US Survey Feet
- **Logo:** City logo embedded as base64 data URI (do not reference external files)
- **Basemap:** `gray-vector` default with satellite toggle
- **Mobile:** Responsive at 860px breakpoint
- **Single file:** Each map is one self-contained HTML file with inline CSS and JS

### Data Requirements

All feature services consumed by maps in this repo must be:
- Shared publicly (no token required)
- Hosted views, not authoritative editing layers
- Query-only (no editing capabilities exposed)

---

## CivicPlus Embedding

Maps are designed to be embedded on [fairoaksranchtx.org](https://www.fairoaksranchtx.org) via iframe. CivicPlus strips inline JavaScript from HTML widgets, so all maps must be hosted externally and loaded via iframe.

```html
<iframe
  src="https://cofor-gis.github.io/gis-maps/{MapName}/"
  title="City of Fair Oaks Ranch — {Map Title}"
  width="100%"
  height="800"
  style="border:none; border-radius:8px;"
  loading="lazy"
  allow="fullscreen">
</iframe>
```

Adjust `height` to fit the page layout. If the CivicPlus content column is narrow (< 860px), the map will switch to its mobile layout automatically.

---

## Local Preview

No build tools are needed. Open any `index.html` directly in a browser, or use a local server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then navigate to `http://localhost:8000/{MapName}/`.

---

## Contact

GIS Administrator — City of Fair Oaks Ranch Public Works
