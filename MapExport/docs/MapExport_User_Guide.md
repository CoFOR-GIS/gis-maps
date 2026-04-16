# Map Export Tool — City of Fair Oaks Ranch

## Purpose

The Map Export Tool is a browser-based application that allows City of Fair Oaks Ranch staff to create professional map products without needing GIS desktop software. Users can compose maps by selecting layers and basemaps, annotate them with drawings and labels, and export the results as print-ready PDFs with a full title block or clean PNGs for digital use, presentations, and social media.

The tool requires no login, no software installation, and no ArcGIS API key. It runs entirely in the browser from a single HTML file hosted on the city's local IIS server or GitHub Pages.

---

## Access

- **Internal (IIS):** `http://gis.local/MapExport/`
- **External (GitHub Pages):** `https://cofor-gis.github.io/gis-maps/MapExport/`

Open the URL in any modern browser (Chrome, Edge, Firefox, Safari). No login is required — the tool accesses only publicly shared data from the City's ArcGIS Online organization.

---

## First-Time Use — Guided Tour

The first time you open the tool, a welcome card appears in the side panel inviting you to take a guided tour. The tour walks through the full five-step export workflow in about a minute, spotlighting each control as you go.

- **Take the tour** — steps through 12 highlighted controls from export mode through export button.
- **No thanks** — dismisses the welcome card and won't show it again.

You can replay the tour at any time by clicking the **Help** button in the top-right corner of the header. The Help button is always available, whether or not you've seen the tour before.

The auto-prompt is suppressed on narrow screens (under 800 pixels wide), since the side panel becomes a bottom drawer on mobile and the tour tooltips position awkwardly. The Help button still works on mobile if you want to trigger it manually.

---

## Interface Layout

The interface is split into two areas:

- **Side Panel (left):** Controls for export mode, basemap selection, map details, layer management, drawing tools, and export actions.
- **Map Area (right):** Interactive map with the current layers, drawings, extent overlay, and legend.

The top header bar contains the city logo, the app title, a coordinate system badge, and the Help button.

On screens narrower than 800px, the side panel becomes a bottom drawer.

---

## Features

### Basemap Selection

A grid of six basemap options appears near the top of the side panel. Click any option to change the background map. The default is OpenStreetMap (Streets). Options include satellite imagery, hybrid (satellite with labels), topographic, and light/dark canvas styles.

### Layers

#### Default Layers

Three layers load automatically: Property Boundaries (Parcels), Road Centerlines, and Jurisdictional Boundaries. These appear in the active layer list with visibility toggles and opacity sliders. The map centers on the city limits at startup.

#### Searching and Adding Layers

The search bar at the top of the Map Layers section queries all public Feature Services published to the City's ArcGIS Online organization. Type any part of a layer name to see matching results. As you type, matching text is highlighted in the dropdown. Click a result to add it to the map.

If a service contains multiple sublayers (e.g. a Zoning service with polygon zones and line frontages), each sublayer is added as a separate entry with independent controls.

**Themed layers:** Layers that use unique-value or class-breaks symbology (e.g. Zoning colored by designation, Future Land Use colored by classification) render with their full themed symbology from ArcGIS Online. The tool automatically resolves field name and value mismatches that can occur with hosted view layers, so the colors and categories match what you see in the ArcGIS Online Map Viewer.

#### Layer Controls

Each layer card in the active layer list provides:

- **Visibility toggle** — Switch the layer on or off.
- **Opacity slider** — Adjust transparency from 0% (invisible) to 100% (fully opaque).
- **Style controls** — For layers with simple symbology, click the color swatch button (▾) to expand fill color, outline color, and stroke width controls. Layers with themed symbology show a "Themed" badge and cannot have their symbology overridden — only opacity is adjustable.
- **Rename** — Double-click the layer name to edit it. Press Enter to confirm or Escape to cancel. The new name appears in the legend.
- **Remove (✕)** — Remove the layer from the map and the list.
- **Clear All Layers** — Remove every layer at once.

### Drawing Tools

Toggle the Drawing Tools switch to reveal annotation controls. Available tools:

- **Point** — Click the map to place a marker.
- **Line** — Click to create vertices, double-click to finish.
- **Rectangle** — Click and drag to draw a rectangle.
- **Polygon** — Click to create vertices, double-click to close the shape.
- **Text** — Click the map to place a text label. A text input field and font size selector appear when the text tool is active. Click multiple locations to place several labels, then click Cancel to stop.

Before drawing, adjust these settings:

- **Color** — Click the color swatch to pick a drawing color.
- **Fill** — Controls the fill transparency of polygons and rectangles (0% = fully transparent fill, 100% = solid fill).
- **Opacity** — Controls the overall opacity of the entire shape including its outline.

Use **Cancel** to stop the current drawing action or **Clear All** to erase every drawing from the map.

#### Editing Placed Shapes

Click any drawn shape on the map to open an editing popup near the click point. The popup provides:

- **Color** — Change the shape's color.
- **Fill** — Adjust fill transparency (polygons only).
- **Opacity** — Adjust overall transparency.
- **Text / Size** — Edit text content and font size (text graphics only).
- **Label** — Add or change a text annotation that appears at the center of the shape. This label is separate from the shape itself and appears in the legend.
- **Delete Shape** — Remove the shape and its label from the map.

Click empty map space or the ✕ to close the popup.

### Legend

Click **Show Legend** above the export frame toggle to display a floating legend panel on the map. The legend lists all visible layers and drawings with their colors. Layers with themed symbology (like Zoning) show each category as a separate entry with its own color swatch.

The legend updates automatically when layers are toggled, renamed, or restyled, and when drawings are added, removed, or labeled.

When the legend is visible, it is included in both PDF and PNG exports.

### Exporting

#### Step 1 — Configure the Map

Pan and zoom to the area of interest. Add or remove layers, adjust symbology, and place any drawings or annotations.

#### Step 2 — Set Export Options

Choose an export mode at the top of the side panel:

- **Print PDF** — Select paper size (Letter or Tabloid) and orientation (Portrait or Landscape). The exported PDF includes a professional title block with the city logo, map title, subtitle, department, date, north arrow, scale bar, coordinate system label, and disclaimer.
- **Digital PNG** — Select a dimension preset: 1:1 Square, 16:9 Landscape Banner, or 4:5 Portrait Social. The exported PNG includes a small logo watermark in the corner.

Set the map title, subtitle, and department in the Map Details section.

#### Step 3 — Enable the Export Frame

Click **Show Export Frame** to display the export extent overlay on the map. This gold-bordered rectangle shows exactly what area will be captured. The area outside the frame is dimmed.

- **Move the frame** by dragging its edges.
- **Resize the frame** by dragging its corner handles (aspect ratio stays locked to the selected paper/preset size).
- The map underneath remains fully interactive — you can still pan, zoom, and click through the overlay.

The PDF and PNG export buttons are disabled until the frame is visible.

#### Step 4 — Export

Click **Export PDF** or **Export PNG**. The file downloads automatically with a filename like `CoFOR_Map_4-16-2026.pdf`.

---

## Tips

- **Zoom level** is controllable from the bottom of the side panel with +/− buttons or by typing a value directly.
- **Parcel popups** — Click any parcel on the map to see its address number, situs address, owner, subdivision, and acreage.
- **Layer order** — Layers render in the order they were added. Base layers (Parcels, Roads, Boundaries) are at the bottom. Dynamically added layers appear above them. Drawings are always on top.
- **Legend in exports** — The legend only appears in exports when it is toggled on in the map view. Hide it before exporting if you don't want it in the output.
- **Drawings in exports** — All drawn shapes, text labels, and annotations are captured in the export screenshot. They appear exactly as shown on screen.
- **Replay the tour anytime** — Click the **Help** button in the header to walk through the tour again. Useful if you haven't used the tool in a while or want to refresh a specific step.
- **No login required** — The tool accesses only publicly shared layers. Private or organization-only layers will not appear in search results. An authenticated version for organizational layers may be built in the future if demand warrants it; see `MapExport_OAuth_Brief.md` for specifics.

---

## Deployment

The tool is a single HTML file with no server-side dependencies. The deployment folder contains:

```
MapExport/
  index.html       — the application itself
  logo.svg         — favicon source (also embedded as base64 inside index.html)
  README.md        — deployment and usage reference
  web.config       — IIS deployment only: SVG MIME type registration
```

To deploy or update:

1. Copy `index.html` and `logo.svg` to the target directory.
2. The in-app logos (header, loading screen) use a base64 data URI embedded in `index.html` — no external file is needed at runtime for those.
3. The browser tab favicon reads `logo.svg` from the deployment folder, so that file must be present.
4. All external resources load from CDNs: Google Fonts, jsPDF (cdnjs), Shepherd.js (jsdelivr), ArcGIS JS SDK 4.31 (js.arcgis.com).
5. To update the embedded logo, re-encode with `base64 -w 0 logo.svg` and replace the `LOGO_DATA_URI` string inside `index.html`. Update `logo.svg` on disk at the same time so the favicon stays in sync.
6. For IIS deployments only, ensure `web.config` registers the SVG MIME type (`image/svg+xml`) so the favicon loads correctly.

### Customization

All department-level settings are in the `APP_CONFIG` object near the top of the `<script>` block. To create a variant for another department, duplicate the file and change:

- `department` — Name shown in the title block
- `mapCenter` / `mapZoom` — Default map position
- Title and subtitle defaults in the HTML inputs
- Optionally add an `apiKey` to enable vector basemaps

### Resetting the Tour for All Users

The guided tour marks itself as seen in each user's browser via a `localStorage` key. If a major UI update is released and you want every returning user to see the new tour, edit `index.html` and change the constant near the top of the tour script:

```javascript
const TOUR_STORAGE_KEY = 'cofor_mapexport_tour_seen_v1';
// bump to 'cofor_mapexport_tour_seen_v2' to re-prompt all users
```

Bumping the version number means every browser's existing "seen" flag is ignored, and the welcome card appears again on the next visit. Old keys are harmless leftovers in localStorage.

---

## Requirements

- Modern browser with JavaScript enabled (Chrome 90+, Edge 90+, Firefox 90+, Safari 15+)
- Network access to `js.arcgis.com`, `fonts.googleapis.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, and `services6.arcgis.com`
- No ArcGIS account, API key, or desktop software required
