# City of Fair Oaks Ranch — CIP Map

Public-facing interactive map of Capital Improvement Projects synchronized from ClearGov.

**Live URL (after deploy):** https://cofor-gis.github.io/gis-maps/CIP/

## Architecture

```
ClearGov API
    ↓ (Python sync, manual)
AGOL Authoritative — CoFORPW_CIP_Projects
    ↓ (View layer)
AGOL Public View — City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)
    ↓ (Direct REST fetch, no auth)
Web Map — index.html
```

## Files

```
CIP/
├── index.html       Main web map (single-file, all CSS+JS inline)
├── logo.svg         CFOR logo (favicon + reference copy)
└── README.md        This file
```

## Tech Stack

- **ArcGIS JS SDK 4.34** via `<arcgis-map>` web component
- **Vanilla JS** — no framework, no build step
- **Fonts:** Playfair Display (display) + DM Sans (body) — CFOR public app standard
- **No localStorage** — fully stateless

## Standing Technical Rules Applied

- ✅ Favicon: `<link rel="icon" href="logo.svg" type="image/svg+xml">`
- ✅ Logo: base64 data URI inline (~25KB)
- ✅ AMD load order: ArcGIS SDK loads last (no UMD libs in v1)
- ✅ REST queries: POST with URLSearchParams
- ✅ Authentication: blanket-reject all `getCredential` calls
- ✅ Map centering: `FOR_Jurisdictional` `queryExtent` + `view.goTo()` with `padding: { right: 380 }`
- ✅ Search/data decoupled from SDK auth via direct fetch
- ✅ Public view used (CFOR governance pattern)

## Branding

- **Background:** Cream `#FAF8F4`
- **Header:** Forest green `#1B3A2D`
- **Typography:** Playfair Display (headings) + DM Sans (body)

## Category Colors

| Category    | Color      | Hex       |
|-------------|------------|-----------|
| Water       | Light Blue | `#B0C1C9` |
| Wastewater  | Dark Blue  | `#192737` |
| Roadway     | Olive      | `#8D956C` |
| Drainage    | Dark Olive | `#717C60` |
| Building    | Red        | `#A64850` |

## Features

### Map
- 3 feature layers (Points, Lines, Polygons) styled by Category
- **Progress overlay** — opacity scales with `ProgressPercent` (faded = 0%, solid = 100%)
- **Labels** — show progress percentage when zoomed in (scale ≤ 30,000)
- **Popups** with progress bars, dual-budget display, timeline, department, description

### Right panel (380px directory)
- **Search** — full-text across name, description, department, category
- **Category filter chips** — color-coded
- **Status filter chips** — Current / Completed / Any
- **Default sort:** Project Name (alphabetical)
- **Click row** → zoom to feature + open popup

### Stats panel (top-left, collapsible)
- Total project count
- Total budget allocated + spent (with progress bar)
- Breakdown by category
- Last sync timestamp

### Mobile (≤768px)
- Stacked layout: header → map (50vh) → directory panel
- Directory collapses to 56px header bar (toggle to expand)
- Stats panel sized down

## Deployment

### One-time setup

1. **Replace placeholder logo** (one of these methods):

   **Method A — Use the extractor utility:**
   ```bash
   # From a folder containing extract_logo.py
   python extract_logo.py path/to/drainage_dashboard.html index.html
   ```
   This pulls the logo from any existing CFOR HTML and injects it into `index.html`.
   It also creates `logo.svg` for the favicon.

   **Method B — Manual:**
   1. Open one of your existing CFOR maps (e.g., Drainage Dashboard)
   2. Find the line containing `data:image/svg+xml;base64,` for the logo
   3. Copy the entire data URI string
   4. In `index.html`, find the `#logo-img` element and replace its `src` value
   5. Decode the base64 to a separate `logo.svg` file for the favicon

2. **Push to GitHub Pages:**
   ```bash
   cd path/to/cofor-gis.github.io/gis-maps
   mkdir CIP
   cp /path/to/index.html CIP/
   cp /path/to/logo.svg CIP/
   cp /path/to/README.md CIP/

   git add CIP/
   git commit -m "Add CIP map"
   git push
   ```

3. **Verify:** https://cofor-gis.github.io/gis-maps/CIP/

### Updates

- **New project data:** Run `python sync_cleargov_cip.py` (in `C:\GIS\CIP_Sync\`).
  The map auto-displays new data on next page load — no redeploy needed.
- **Map UI changes:** Edit `index.html`, push, deploy.

## Embedding in CivicPlus

Same pattern as Annexation History map:

```html
<iframe
  src="https://cofor-gis.github.io/gis-maps/CIP/"
  width="100%"
  height="800"
  frameborder="0"
  style="border:1px solid #ddd; border-radius:4px;"
  title="Capital Improvement Projects Map">
</iframe>
```

## Service URLs

**Public View (used by this map):**
```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/City_of_Fair_Oaks_Ranch_CIP_Projects_(Public_View)/FeatureServer
```

- Layer 0: Points
- Layer 1: Lines
- Layer 2: Polygons

**Authoritative (admin-only, not used by map):**
```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/CoFORPW_CIP_Projects/FeatureServer
```

**Jurisdictional boundary (centering):**
```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/FOR_Jurisdictional/FeatureServer/0
```

## Troubleshooting

### "Map failed to load" error
- Verify the public view is shared with **Everyone (public)**
- Open the public view URL with `?f=json` appended in a private browser window — should show JSON, not a login page

### Empty stats / no projects in directory
- Check browser console for fetch errors
- Verify the public view URL in `index.html` matches the actual service URL in AGOL
- Run `sync_cleargov_cip.py` to confirm data exists in the authoritative service

### Logo doesn't show
- Verify the `data:image/svg+xml;base64,…` URI in `#logo-img` is the actual CFOR logo, not the placeholder
- Run `extract_logo.py` to swap in the real logo

### Parens in URL cause issues (rare)
The public view name was auto-generated by AGOL and contains parentheses. Modern browsers handle this fine. If you ever encounter issues, replace the URL in `index.html` with the URL-encoded version (`%28` and `%29` for `(` and `)`).

## Sync Schedule

Currently **manual**. To run sync:
```bash
cd C:\GIS\CIP_Sync
python sync_cleargov_cip.py
```

To set up automation (future):
- Configure Windows Task Scheduler to run `run_cip_sync.bat` daily/weekly
- Set `AGOL_USERNAME` and `AGOL_PASSWORD` environment variables in the batch file for unattended runs

---

*City of Fair Oaks Ranch GIS — Public Works*
