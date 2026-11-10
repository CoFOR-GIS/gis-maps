# Land Use Assumptions Viewer

Public web app for the City of Fair Oaks Ranch showing water and sewer
connection status and build-out projections for every parcel, by utility
provider.

- **Live app:** https://cofor-gis.github.io/gis-maps/LUA/
- **Data source:** Parcels public view (AGOL item `3413d6379752460ab3f52b946a6e9095`),
  read-only. Data edits happen on the authoritative layer; this app reflects
  them on load or via the Refresh button. No configuration changes are needed
  here for data updates.
- **User guide:** [USER_GUIDE.md](USER_GUIDE.md)
- **Private wells (D-017, 2026-11-02):** parcels with `Private_Well = Yes` keep their
  map class but are counted in "Private Well / No Provider" and left out of the FORU
  connection rows. `NULL` means not flagged.
  The two well fields are used for counting only and are not shown in the public popup.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire application (ArcGIS JS SDK 4.31, no build step) |
| `logo.svg`   | City logo, used as the favicon |
| `USER_GUIDE.md` | Public-facing guide to the viewer |

## Maintenance

All display configuration (tables, filters, symbology, popups) lives in the
`CONFIG` block at the top of `index.html`. Structural changes are one-object
edits; see the internal staff guide (kept on gis.local, not in this repo)
for recipes, stat definitions, and troubleshooting.

Maintained by Engineering Services / GIS, City of Fair Oaks Ranch.

## Embedding on fairoaksranch.gov (exception to the CivicPlus standard)

Approved by Ernie Martz, 2026-11-10 (under CIVICPLUS-STD-20261110, section 4c).
The standard side-by-side layout made the two LUA tables scroll inside a narrow
panel and repeated the page title. When the app detects it is inside an iframe
it switches to an embedded layout:

- no title bar (the City page already shows the title); filters and Refresh stay
- map on top (440 px; 320 px on phones), both tables below, side by side on
  desktop and stacked on phones, with no scrolling inside the panel
- opened directly (not in a frame) the app looks exactly as before

CivicPlus Custom HTML widget on page 684:

```html
<iframe src="https://cofor-gis.github.io/gis-maps/LUA/" title="City of Fair Oaks Ranch Land Use Assumptions Map" width="100%" height="1100" style="border:none; border-radius:8px;"></iframe>
```

Height 1100 fits the desktop layout exactly; on phones the frame scrolls a little.
