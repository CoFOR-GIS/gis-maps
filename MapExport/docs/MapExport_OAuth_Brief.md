# MapExport OAuth — Future Authenticated Variant (gis-apps)

> **Status:** Deferred. Not implemented in current deployment.
>
> The active MapExport deployments at `http://gis.local/MapExport/` (IIS) and `https://cofor-gis.github.io/gis-maps/MapExport/` (GitHub Pages, public `gis-maps` repo) are public-only and will remain so. This document outlines the path to an optional authenticated variant that would live in the `gis-apps` repo if org-shared and group-shared layers become needed.

## Objective

If a future need arises, create an authenticated variant of `index.html` for a new GitHub Pages deployment at `https://cofor-gis.github.io/gis-apps/MapExport/`. When a user signs in with their ArcGIS Online credentials, the app would expand beyond public layers to include all layers visible to their AGOL role — org-shared, group-shared, and layers authored by other users.

Unauthenticated users would still get the current public-only experience. Authentication would be optional, not required.

---

## Architecture

### Deployment Targets (hypothetical)

| Variant | Repo | URL | Auth |
|---------|------|-----|------|
| Current (public-only) | `gis-maps` | `https://cofor-gis.github.io/gis-maps/MapExport/` | None |
| Future (authenticated) | `gis-apps` | `https://cofor-gis.github.io/gis-apps/MapExport/` | OAuth (optional) |
| IIS internal | — | `http://gis.local/MapExport/` | None (HTTP-only) |

GitHub Pages serves HTTPS, which satisfies the OAuth redirect requirement. The IIS deployment is HTTP-only and will always use the public variant.

### OAuth Pattern (redirect-based, no popup)

Follow the same pattern used by the Parcel Editor app:

- **OAuth App ID:** Register a new OAuth App in the CoFOR AGOL org (or reuse `DhZk7VoirUPP4Sa2` if scopes allow).
- **Redirect URI:** `https://cofor-gis.github.io/gis-apps/MapExport/`
- **Flow:** Implicit grant (token in URL hash). No popup, no callback page.
- **Token persistence:** `sessionStorage` (cleared on tab close).

### SDK Integration

Replace the blanket `getCredential` rejection with conditional logic:

```javascript
// If user has authenticated, register the OAuthInfo so the SDK
// carries the token automatically on all portal/service requests.
// If not authenticated, reject getCredential to suppress login dialogs.

var oAuthInfo = new OAuthInfo({
  appId: APP_CONFIG.oauthAppId,
  portalUrl: APP_CONFIG.portalUrl,
  popup: false  // redirect-based flow
});
esriId.registerOAuthInfos([oAuthInfo]);

// Check if we already have a credential (returning from redirect)
esriId.checkSignInStatus(APP_CONFIG.portalUrl + "/sharing")
  .then(function(credential) {
    // User is signed in — store credential, update UI
    state.credential = credential;
    updateAuthUI(true);
  })
  .catch(function() {
    // Not signed in — suppress further prompts
    state.credential = null;
    updateAuthUI(false);
    // Override getCredential to prevent dialogs for public-only mode
    esriId.getCredential = function() {
      return Promise.reject(new Error("Login suppressed — click Sign In to authenticate"));
    };
  });
```

### UI Changes

Add a **Sign In / Sign Out** button to the header bar. Positioning should match the existing Help button style for consistency.

| State | Button Text | Action |
|-------|-------------|--------|
| Not signed in | `Sign In` | Calls `esriId.getCredential(portalUrl + "/sharing")` which triggers OAuth redirect |
| Signed in | `Sign Out (username)` | Calls `esriId.destroyCredentials()`, clears sessionStorage token, reloads page |

The Help button and guided tour should remain present in both authenticated and unauthenticated states. A tour step noting the Sign In button could be added when `oauthEnabled` is true.

### Layer Search Changes

When authenticated, modify the portal search query:

```javascript
// Public-only (not signed in):
var q = 'orgid:' + oid + ' type:"Feature Service"';
// Filter: i.access === "public"

// Authenticated (signed in):
var q = 'orgid:' + oid + ' type:"Feature Service"';
// No access filter — portal search respects the user's token and returns
// everything visible to their role (public + org + group-shared)
```

The search result cards should show an access badge:

| `item.access` | Badge |
|---------------|-------|
| `public` | (none) |
| `org` | `Org` |
| `shared` | `Shared` |
| `private` | `Private` |

### Layer Loading Changes

When authenticated, the SDK automatically attaches the token to FeatureServer requests. No change to `addLayerFromService()` is needed — the `FeatureLayer` constructor handles token injection via the registered `OAuthInfo`.

The `fixRendererFields()` function continues to operate on all dynamically added layers regardless of auth status, since the view field/value mismatch issue affects any hosted view layer.

---

## APP_CONFIG Additions

```javascript
const APP_CONFIG = {
  // ... existing fields ...

  // ── OAuth (gis-apps deployment only) ──
  oauthAppId: "",           // Set to OAuth App ID for authenticated mode
  oauthEnabled: false,      // Set true on gis-apps, false on gis-maps and IIS
};
```

When `oauthEnabled` is false, the app behaves exactly as it does now (blanket `getCredential` rejection, public layers only). This keeps the existing deployments unchanged.

---

## File Structure (authenticated variant)

```
gis-apps/MapExport/
  index.html          — Authenticated variant (forked from gis-maps version)
  logo.svg            — Favicon source
  README.md           — Deployment and usage reference
```

No additional files needed. The OAuth redirect returns to the same page; the token is extracted from the URL hash by the SDK automatically.

Maintenance consideration: forking creates two `index.html` files to keep in sync. A template-based build step (or a shared JS module loaded via `<script src>`) could eliminate the duplication, but introduces build tooling that the current single-file approach avoids. For now, the public version is the source of truth — any UX change gets made there first and ported to the authenticated variant.

---

## Scope

### In Scope (if built)

- Optional OAuth sign-in button in the header
- Redirect-based implicit OAuth flow (no popup)
- Expanded layer search when authenticated (org + group-shared layers)
- Access badge on search results
- Sign out button with username display
- `oauthEnabled` flag in APP_CONFIG to toggle behavior per deployment
- Token persistence in sessionStorage
- Guided tour step introducing the Sign In button (only shown when `oauthEnabled: true`)

### Out of Scope

- Editing or saving features from the export tool
- User-specific layer favorites or bookmarks
- Role-based UI changes (e.g. admin vs viewer)
- OAuth PKCE flow (implicit grant is sufficient for client-side apps with no backend)
- Automatic fork/sync between `gis-maps` and `gis-apps` variants

---

## Key References

- **Existing OAuth pattern:** Parcel Editor at `https://cofor-gis.github.io/gis-apps/ParcelEditor/` (OAuth ID: `DhZk7VoirUPP4Sa2`, Item `4e596e6f2c1d437f841f0af65598c07a`)
- **AGOL Org:** `fairoaksranch.maps.arcgis.com`
- **GitHub Pages bases:** `https://cofor-gis.github.io/gis-maps/` (public viewers) and `https://cofor-gis.github.io/gis-apps/` (OAuth/editing tools)
- **Current public-only source:** `index.html` (~3,258 lines) in the `gis-maps/MapExport/` folder
- **Dev summary:** `MapExport_Dev_Summary.md`
- **User guide:** `MapExport_User_Guide.md`
- **ArcGIS JS SDK OAuthInfo docs:** `https://developers.arcgis.com/javascript/latest/api-reference/esri-identity-OAuthInfo.html`

---

## Acceptance Criteria (if built)

1. Opening the app without signing in works identically to the current public-only version.
2. Clicking "Sign In" redirects to the AGOL OAuth page, authenticates, and returns to the app with a token.
3. After sign-in, the layer search returns org-shared and group-shared layers in addition to public layers.
4. Adding an org-only layer loads and renders correctly (including themed symbology via `fixRendererFields()`).
5. Clicking "Sign Out" destroys the credential, clears the token, and reloads to the public-only state.
6. The IIS deployment at `gis.local` and the public GitHub Pages deployment at `gis-maps/MapExport/` are unaffected (both `oauthEnabled: false`).
7. The guided tour continues to function, with one additional step introducing the Sign In button when `oauthEnabled: true`.

---

## Triggers That Would Justify Building This

This variant is worth the maintenance overhead (two source files to keep in sync) only if one of the following becomes true:

- A consistent operational need to include non-public layers in exported maps (e.g. internal asset layers, pre-release planning data).
- Staff frequently asking "why can't I see the [internal] layer in Map Export?" after the tool becomes widely adopted.
- A department requests a map export workflow that includes layers shared only to their group.

Until then, staff who need maps with internal layers can continue to use ArcGIS Pro print layouts or request GIS staff assistance.
