# CoFOR Emergency Notification Landing Page

Public-facing emergency status page for the **City of Fair Oaks Ranch, TX**.
Shows a live condition banner, active notifications with protective-action
instructions, road closures, and affected areas on an interactive map.

**Live page:** https://cofor-gis.github.io/Emergency/ (also mirrored on the
city web server)

## Contents

| File | Purpose |
|---|---|
| `emergency_landing_page.html` | The entire application — single file, no build step, no backend, no API key |
| `CoFOREM_Emergency_Operations_Guide.md` | Full deployment & incident operations reference |

## How it works

The page reads the **public read-only view**
`CoFOREM_Emergency_Operations_public` (Query-only; staff usernames hidden)
every 60 seconds:

- **Condition banner** = highest severity among all non-resolved
  incidents: green All Clear → Advisory (amber) → Watch (orange) →
  Warning (red) → Emergency (crimson, pulsing).
- **Notification cards** show location, effective time, status, last
  updated, and a highlighted "What to do" block. Clicking zooms the map.
- Incidents disappear automatically when EOC staff set
  `Status = Resolved` — no code deploys during an event, ever.

Reference layers from existing CoFOR public services: city limits
(`FOR_Jurisdictional`), active water leaks (`ActiveLeak_(public_view)`),
FEMA flood hazard (`FEMA_NFHL_view`), and city facilities
(`Facilities_view`).

## Configuration

All settings are in `APP_CONFIG` at the top of the HTML file: layer URLs,
map center/zoom, refresh interval, and the active-incident filter
(`Status <> 'RESOLVED'`).

## Hosting & updates

Static file — GitHub Pages plus a mirror on the city IIS server. Edit,
commit, push; Pages redeploys. Content updates (incidents) never require
touching this repo — they flow from the EOC editor app / Field Maps.

## Do not

- Point this page at the editable source service — only the `_public` view.
- Add anything requiring credentials; this page must load anonymously.
