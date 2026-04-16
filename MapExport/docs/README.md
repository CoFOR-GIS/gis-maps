# MapExport

Browser-based map composition and export tool for the City of Fair Oaks Ranch. Built as a single self-contained HTML file that runs entirely in the browser with no backend, no build step, and no login required.

**Live:** <https://cofor-gis.github.io/gis-maps/MapExport/>

## What it does

Lets city staff compose a map by picking layers and a basemap, annotate it with drawings and labels, and export the result as a print-ready PDF with a full title block or a clean PNG sized for presentations and social media. Accesses only publicly shared layers from the City's ArcGIS Online organization.

## Folder contents

| File | Purpose |
|------|---------|
| `index.html` | The application — single self-contained file, ~3,258 lines |
| `logo.svg` | City of Fair Oaks Ranch logo, used as the browser tab favicon |
| `README.md` | This file |
| `web.config` | IIS deployment only — SVG MIME type registration; unused on GitHub Pages |

`index.html` also embeds `logo.svg` as a base64 data URI for the in-app header and loading screen, so the app renders its own logo even if `logo.svg` is missing. The favicon is the only feature that actually reads `logo.svg` from disk.

## Dependencies

All loaded from CDN at runtime. No package manager, no install step.

| Library | Version | CDN | Purpose |
|---------|---------|-----|---------|
| ArcGIS JS SDK | 4.31 | `js.arcgis.com` | Map, layers, widgets, projection |
| jsPDF | 2.5.1 | `cdnjs.cloudflare.com` | PDF export |
| Shepherd.js | 11.2.0 | `cdn.jsdelivr.net` | Guided user tour |
| Google Fonts | — | `fonts.googleapis.com` | Playfair Display, DM Sans |

**Load order matters.** jsPDF and Shepherd must both load *before* the ArcGIS SDK. The ArcGIS SDK ships with Dojo's AMD loader, which hijacks any UMD library loaded after it. If you add a new UMD dependency, put its `<script>` tag above the ArcGIS tag in `<head>`.

## Deployment

### GitHub Pages (current)

This folder publishes automatically as part of the `gis-maps` repository's Pages deployment. Changes pushed to `main` appear at the live URL within a minute or two.

### IIS (internal copy at `gis.local/MapExport/`)

The same `index.html` works on IIS. Two additional requirements:

1. `logo.svg` must be deployed alongside `index.html` for the favicon to load.
2. `web.config` must register the SVG MIME type:

   ```xml
   <configuration>
     <system.webServer>
       <staticContent>
         <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
       </staticContent>
     </system.webServer>
   </configuration>
   ```

The IIS deployment is HTTP-only. GitHub Pages is HTTPS.

## Configuration

Department-level settings live in the `APP_CONFIG` object near the top of the `<script>` block inside `index.html`:

```javascript
const APP_CONFIG = {
  portalUrl: "https://fairoaksranch.maps.arcgis.com",
  mapCenter: [-98.69, 29.745],
  mapZoom: 14,
  apiKey: "",                          // set to enable vector basemaps
  basemap: "streets-navigation-vector",
  dpi: 150,
  department: "Engineering Services",
  // ... layer definitions ...
};
```

To create a variant for another department, fork the file and change the relevant values. The base layers (Parcels, Roads, Jurisdictional Boundaries) are hardcoded; dynamic layers load via the in-app search.

## Guided Tour

First-time visitors see a welcome card in the side panel inviting them to take a quick tour. The tour uses Shepherd.js and walks through twelve controls tied to the five-step export workflow. Users can dismiss it, take it, or replay it anytime via the **Help** button in the header.

To force all returning users to see the tour again after a major UI update, bump the storage key version inside `index.html`:

```javascript
// change v1 -> v2 to reset all users' "seen" state
const TOUR_STORAGE_KEY = 'cofor_mapexport_tour_seen_v1';
```

## Authentication

This deployment is public-only. It accesses only publicly shared layers from the CoFOR AGOL organization. All `getCredential` calls are rejected at startup to prevent sign-in dialogs from ever appearing.

If the need arises for a variant that accesses org-shared or group-shared layers, see `MapExport_OAuth_Brief.md` for the implementation plan. That variant would live in the `gis-apps` repository, not this one.

## Updating the Logo

Two files need to stay in sync:

1. **`logo.svg`** in this folder (the favicon source).
2. **`LOGO_DATA_URI`** constant inside `index.html` (the embedded header/loading logo).

To update both:

```bash
# 1. Replace logo.svg in the folder.
# 2. Re-encode and paste into index.html:
base64 -w 0 logo.svg
# Copy the output and replace the value of LOGO_DATA_URI in index.html.
```

## Browser Support

Modern browsers with JavaScript enabled: Chrome 90+, Edge 90+, Firefox 90+, Safari 15+.

Uses `localStorage` (for the tour seen flag) and standard DOM/Canvas APIs. No browser-storage operations are critical to core functionality — if storage is disabled, the tour simply re-prompts each visit.

## Related Documentation

| Document | Scope |
|----------|-------|
| `MapExport_User_Guide.md` | End-user documentation: workflow, features, tips |
| `MapExport_Dev_Summary.md` | Architecture, resolved bugs, code map, lessons learned |
| `MapExport_OAuth_Brief.md` | Future work: authenticated variant for `gis-apps` repo |

These live in the CoFOR GIS documentation drive, not in this folder. Contact the GIS Administrator for access.

## Support

GIS Administrator, Engineering Services — City of Fair Oaks Ranch. When reporting an issue, include the browser and version, the URL you were using (gis.local vs. GitHub Pages), the layer or action that failed, and a screenshot if possible.
