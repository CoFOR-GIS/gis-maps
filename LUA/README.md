# Land Use Assumptions Viewer

Public web app for the City of Fair Oaks Ranch showing water and sewer
connection status and build-out projections for every parcel, by utility
provider.

- **Live app:** https://cofor-gis.github.io/gis-maps/lua-dashboard/
- **Data source:** Parcels public view (AGOL item `3413d6379752460ab3f52b946a6e9095`),
  read-only. Data edits happen on the authoritative layer; this app reflects
  them on load or via the Refresh button. No configuration changes are needed
  here for data updates.
- **User guide:** [USER_GUIDE.md](USER_GUIDE.md)

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
