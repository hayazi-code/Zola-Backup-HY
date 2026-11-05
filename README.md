# ZoLa Backup HY

**Independent public-data NYC zoning and land-use viewer**

- Live website: https://hayazi-code.github.io/Zola-Backup-HY/
- Core browser diagnostics: https://hayazi-code.github.io/Zola-Backup-HY/diagnostics.html
- All GIS layer service diagnostics: https://hayazi-code.github.io/Zola-Backup-HY/layer-diagnostics.html
- Source code: https://github.com/hayazi-code/Zola-Backup-HY

## Features

- Minimal neutral OpenStreetMap basemap with a ZoLa-inspired planning interface.
- **Exact NYC DCP land-use colors**, converted directly from [DCP Area Map Standard v1.7, page 3](https://www.nyc.gov/assets/planning/download/pdf/applicants/applicant-portal/area_map_standard.pdf). DCP specifies 40% transparency, implemented as Leaflet fillOpacity = 0.60. A full category legend appears when land-use coloring is enabled.
- Search for NYC properties by **10-digit BBL**, or search by address/name using NYC Planning GeoSearch.
- Click any mapped tax lot to inspect MapPLUTO address, zoning districts, overlays, lot area, land use, building information, reported FAR attributes, and source version.
- The layer menu mirrors the provided **ZoLa section order and nesting**: Zoning and Land Use, Supporting Zoning Layers, Other Supporting Layers, Administrative Boundaries, and Basemaps. Child menus include C1–C8, M1–M3, R1–R10, C1/C2 overlays, flood-zone types, FRESH incentive types, landmark classes, Council district years, and current aerial imagery.
- C1/C2 and district subtype checkboxes actually filter the core zoning geometry. FRESH uses DCP's `FRESH_Food_Stores` service with published Name categories. Pending map amendments use `nyzma` features with `STATUS = 'Certified'`, not all applications in earlier pre-certification stages.
- The amendment timeline uses its `EFFECTIVE` field where present. The current `nyzma` dataset documents changes from 2002 onward, despite the ZoLa-style slider running from 1970-01 to 2028-11.
- The **Basemaps and transit** section now uses independent checkboxes, not mutually exclusive radio buttons. Transit overlays (NYC subway routes and stations), **Building Footprints** (actual NYC OTI building polygons), and **Aerial Imagery** can be toggled on and off separately over a persistent minimal OpenStreetMap base. Subway routes and station markers start enabled by default, with additional independent controls for each. Subway data are queried from the public `New_York_City_Region_Transit_Layers/FeatureServer` (routes layer 6, stations layer 0). 3D Buildings remains unavailable. Esri World Imagery provides current aerial imagery; older NYC imagery may fall back if public tiles fail. Only current aerial imagery is offered; historical year selections have been removed.
- Nonworking/specialized layers are **explicitly labeled Not linked**. Some connected category filters, such as the precise parking subareas and landmark classifications, still require validation against published feature fields.
- A single **Explore** experience: inspect parcels, search NYC addresses/BBLs, and toggle zoning and transportation layers without multi-lot or scenario controls.
- Share a parcel link with `?bbl=1000477501`.
- Browser diagnostics that independently test each live data service.

- All nested filter labels are displayed as independent wrapping rows to remain readable on narrow sidebars. **Deselect all layers** at the top of the map-layer list switches off core and optional overlays together, without changing the basemap.

## Mobile interface

The same GitHub Pages URL adapts automatically to phones (screen width 740px or less). The map occupies the screen with a collapsible bottom sheet. A short bar at the bottom offers **Search**, **Layers**, and **Map** actions; tap or swipe the sheet handle to expand or collapse controls.

- **Search** opens the panel and focuses the address/BBL field. Tapping or searching a property opens MapPLUTO details in the panel.
- **Layers** reveals the full ZoLa layer catalog; long sublayer names use individual wrapping rows.
- **Map** collapses the panel without changing layer visibility or the current location.
- Larger touch targets, independently scrolling sidebar, mobile search inputs, safe-area padding, and orientation-change map resizing are included.
- Desktop layout remains the map with a right-hand sidebar; there is no separate mobile codebase or domain.

The mobile layout has been structurally checked but still requires device-level visual and gesture testing across mobile browsers.

## Reliability audit and regression testing

See [AUDIT.md](AUDIT.md) for the Build 21 reliability/performance audit, fixes and limits. The browser now uses a common bounded GIS queue (5 concurrent requests), 14-second per-attempt timeout with one retry for transient errors, a 60-second capped LRU cache, and interactive parcel lookup priority. Mobile dense-viewport feature budgets are lower to reduce freezing; clipped views warn to zoom in. GitHub Actions runs offline JavaScript/queue regression tests. Actual live external GIS endpoint status must be checked from the browser diagnostic pages.

In **About & data**, the app exposes GIS network requests, cache hits, retries, failures, and peak concurrency, plus a manual clear-cache button. Cache clearing does not alter the current map or layer settings.

## How to use

Click any parcel to inspect its attributes in the Property information panel. Search by address or 10-digit BBL, and zoom to level 16 or higher to show tax lot boundaries. Choose and filter GIS overlays in the layer catalog.

For a zoning search, type an NYC address or 10-digit BBL and click Search. The map zooms to the matching parcel if the parcel service returns it.

## Data services

The app uses public NYC Department of City Planning ArcGIS FeatureServer endpoints:

| Layer | Service |
| --- | --- |
| MapPLUTO parcel polygons and attributes | `MAPPLUTO/FeatureServer/0` |
| Zoning districts | `nyzd/FeatureServer/0` |
| Commercial overlays | `nyco/FeatureServer/0` |
| Special purpose districts | `nysp/FeatureServer/0` |
| Special purpose subdistricts | `nysp_sd/FeatureServer/0` |
| Mandatory Inclusionary Housing areas | `nycmih/FeatureServer/0` |
| FRESH incentives (3 categories) | `FRESH_Food_Stores/FeatureServer/0` |
| Certified zoning map amendments | `nyzma/FeatureServer/0`, `STATUS = 'Certified'` |
| Industrial Business Zones | `Industry_in_NYC_WFL/FeatureServer/0` |

Base URL: `https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/`

Address search: `https://geosearch.planninglabs.nyc/v2/`

Basemap: OpenStreetMap for transit/building context, Esri World Imagery for current aerial imagery, and experimental NYC historical XYZ imagery URLs where documented; all with provider attribution. This is suited to modest usage, **not a high-traffic hosted deployment**. At scale, use a production tile provider or self-hosted tiles.

## Technical design

Zero-build static site designed for GitHub Pages:

- `index.html`: Accessible semantic interface and dependency loading.
- `styles.css`: Responsive ZoLa-inspired styling.
- `app.js`: GIS queries, parcel lookup, core interactive layers and parcel inspection.
- `layer-explorer.js`: Grouped layer catalog with on-demand public ArcGIS viewport queries, per-layer state, metadata links, and basemap selection.
- `mobile.js`: Phone-size bottom-sheet controls, quick navigation, mobile gestures, and responsive map resizing.
- `diagnostics.html`: Browser-based core integration tests against live APIs.
- `layer-diagnostics.html`: On-demand browser metadata and query tests for every configured ArcGIS service.

Map rendering uses Leaflet 1.9.4. ArcGIS FeatureServer requests are executed directly from the browser. Spatial polygons are retrieved in GeoJSON (EPSG:4326). BBL queries treat `BBL` as a numeric field because MapPLUTO stores it as a double.

## Known limitations and important caveats

**The code has passed static JavaScript parsing and ID wiring checks. Live browser functionality against external APIs has not yet been comprehensively confirmed.** Run `diagnostics.html` after deployment, then test a real BBL and parcel inspection.

- The layer catalog is a **partial feature match, not guaranteed full ZoLa parity**. Several specialized overlays are intentionally marked Not linked. A catalog checkbox whose source fails is shown as Unavailable, not silently claimed to succeed.
- This is not affiliated with the NYC Department of City Planning and is not an official zoning determination.
- It depends on third-party hosted **live** GIS and GeoSearch services. The site itself is independently deployed, but it is **not an offline data backup**. Offline resilience requires permission-appropriate, versioned locally hosted GIS datasets and an update process.
- FeatureServer data may be delayed, and available layers need not perfectly match a given effective-date zoning map. Confirm with the official Zoning Resolution and city records.
- MapPLUTO tax lots are not equivalent to legally established zoning lots.
- Map rendering has a 6,000-feature safety budget per layer per viewport and warns to zoom in if coverage is incomplete.
- No 3D development-envelope simulator is implemented yet.
- The ZoLa-style menu is now structurally aligned with the supplied screenshots; exact service parity is not achieved. In particular: ZoLa's 3D buildings, 2015 preliminary flood maps, Zoning for Accessibility, Appendix I, Appendix J, Battery Park City polygon, and historic 2013–2023 City Council map are not all independently connected.
- Parks are represented by the publicly available `v_GFT_Open_Spaces` planning-screening service, which is not the legal inventory of NYC parklands.
- Transit remains a subdued OpenStreetMap street map, not ZoLa's official transit styling. Building Footprints now draws actual polygons from the public NYC OTI `NYC_Building_Footprint/FeatureServer/0` service. These are fetched only at zoom level 16 or closer to reduce load.
- Current aerial imagery has no fixed acquisition year. Esri World Imagery varies by location. Historic NYC aerials may require access even when archived XYZ endpoints are documented. A failed tile request automatically reverts to current imagery, but an HTTP-successful provider watermark or other provider-specific issue may still require investigation.
- Base map and zoning visual style are inspired by, not an exact reproduction of, official ZoLa.

## Official sources and references

- [NYC Planning GIS datasets](https://www.nyc.gov/content/planning/pages/resources/datasets)
- [Official ZoLa](https://zola.planning.nyc.gov/)
- [NYC Zoning Resolution](https://zr.planning.nyc.gov/)
- [NYC Planning ZoLa source](https://github.com/NYCPlanning/labs-zola)
- [NYC GeoSearch documentation](https://geosearch.planninglabs.nyc/docs/)

## Local development

Open `index.html` through a static HTTP server (for example `python -m http.server 8000`) or GitHub Pages. Modern browser, network access, and JavaScript are required. No API key is needed for the chosen public GIS endpoints.

## License

MIT. See LICENSE.

## NYC DCP standard land-use palette

These are direct hexadecimal conversions of the RGB values on page 3 of the NYC Department of City Planning's *Area Map Standard* (Version 1.7, August 14, 2019). This is an official **Area Map Standard**, but the separately maintained ZoLa renderer may use different styling.

| MapPLUTO LandUse | DCP category | RGB | Hex |
| --- | --- | --- | --- |
| 01 | One- and two-family buildings | 255, 255, 179 | `#FFFFB3` |
| 02 | Multi-family walk-up buildings | 255, 235, 138 | `#FFEB8A` |
| 03 | Multi-family elevator buildings | 255, 196, 0 | `#FFC400` |
| 04 | Mixed residential and commercial | 255, 153, 102 | `#FF9966` |
| 05 | Commercial and office | 232, 51, 51 | `#E83333` |
| 06 | Industrial and manufacturing | 171, 89, 201 | `#AB59C9` |
| 07 | Transportation and utility | 255, 204, 255 | `#FFCCFF` |
| 08 | Public facilities and institutions | 46, 109, 255 | `#2E6DFF` |
| 09 | Open space and recreation | 153, 255, 102 | `#99FF66` |
| 10 | Parking facilities | 170, 170, 170 | `#AAAAAA` |
| 11 | Vacant land | 46, 46, 46 | `#2E2E2E` |
| Other/unknown | Other or no data | 235, 235, 235 | `#EBEBEB` |

The exact hexadecimal values are used as the layer's base fill colors. The map applies 60% fill opacity (40% transparency), so visible colors are blended with the basemap. The separate zoning-district palette is unchanged.

## Subway overlay data

Subway route geometries and station points are sourced from a publicly accessible ArcGIS service: `https://services.arcgis.com/5e8P2PHwGNSRUvq3/ArcGIS/rest/services/New_York_City_Region_Transit_Layers/FeatureServer/`. The application queries routes from layer 6 and station points from layer 0, displays them above building polygons and zoning fills, and permits independent visibility switches. This is a public GIS representation, not live MTA service status or a guaranteed current route diagram.

The base street map stays visible when all optional layers are turned off. **Deselect all layers** also disables subway, aerial, and building overlays without deleting previously tax lots. Turning Transit back on re-enables routes and stations if both had been deselected.

## Deployment troubleshooting

The header displays the current **BUILD** version. If the browser shows radio buttons in the Basemaps menu or an older build number, it is serving an older GitHub Pages version. Check GitHub Actions for the latest Pages deployment and hard refresh the site with a new URL query string. App controls in BUILD 18 are independent checkboxes for Transit, Building Footprints, and Aerial Imagery; sub-options for subway routes and stations. These layers query the ArcGIS regional public service and fall back to the separately hosted NYC Planning `SubwayLines_share` and `SubwayStations_share` feature services if a primary query fails or returns no features.

## Build 19: MTA styling and map labels

The transit line color mapping follows the published [MTA Brand Colors](https://www.mta.info/document/168976) and the [New York State MTA Colors dataset](https://data.ny.gov/d/3uhz-sej2). These **current branding hex codes** differ from some historical subway signage palettes. Mapped route features use their `short_name` designator to select official color groups (A/C/E blue; B/D/F/M orange; G green; J/Z brown; L and shuttles gray; N/Q/R/W yellow; numbered routes red/green/purple). If no recognized route is available, the application uses a valid six-digit source-provided color before falling back to neutral blue-gray.

Station names are now permanent on-map Leaflet tooltip labels from zoom level 13 onward when **Subway stations** is checked; at more distant zoom levels they remain hover-visible. Nearby duplicate platform records with the same name and coordinates rounded to 0.001° are deduplicated to reduce visual clutter. The Basemaps and transit menu has explicit inner gutters on both desktop and mobile.

Transit geometry is from a historic public GIS service; route placement and service changes may not match current MTA operations. This is not live MTA service data.

## Build 20: LIRR lines and stations

The **Basemaps and transit** section includes a **Long Island Rail Road** checkbox, with independent **LIRR lines** and **LIRR stations** child switches. They start off until enabled; the subway remains independent. The data come from the public regional `New_York_City_Region_Transit_Layers/FeatureServer`: line layer **7** and stop layer **1**. The track colors use the data provider's per-route `color` field (validated six-character RGB hex) with a default teal only where no valid color is provided. The station markers display permanent names at neighborhood zoom 13+, with duplicate platform coordinates deduplicated to reduce clutter. Controls work with the existing mobile bottom sheet. The diagnostics page includes source checks for both LIRR layers. This is public GIS data, not live MTA train status or service schedules.

## Build 22: focused Explore interface

The previous **Selected lots** and **Scenario** tabs and their supporting drawing/CSV/FAR workflows were removed from the active application. Desktop now shows search, parcel information, and zoning layer controls in one scrollable sidebar. Mobile now has only Search, Layers, and Map quick actions. These are intentional scope reductions, not hidden features; multi-lot selection or zoning scenario analysis would need to be implemented afresh if requested later.

## Build 23: current aerial imagery only

The Basemaps and transit section now has a single **Aerial Imagery** checkbox that shows or hides current Esri World Imagery. The historical imagery year selector and associated tile-loading logic have been removed. Other map overlays remain independent.

## Build 27: independent fill opacity controls

The **Zoning Districts** and **Show Land Use Colors** entries now have separate live fill-opacity sliders from 0% to 100%. Zoning starts at 59% and land use at 60% to retain the previous visual appearance. The land-use default is NYC DCP Area Map Standard v1.7's 40% transparency. These sliders affect *polygon fill only*: district outlines, parcel outlines, labels, and parcel-click inspection remain fully visible and interactive, even at 0% opacity. Changes call Leaflet `setStyle` directly on existing geometry rather than making new GIS requests. These are viewing preferences, not modifications to the published DCP colors or underlying data.

## Build 28: parcel outline controls

The **Tax Lots** layer now includes a separate **Parcel outlines** group with a Show checkbox, Red/Purple/Dark gray color selector, and a 1–5 px line-width slider. Outlines use the exact MapPLUTO geometry already retrieved for tax lots, with no simplified or rectangular substitute. The controls call Leaflet `setStyle` on the existing parcel layer without network requests or replacing polygons. Hiding the line sets stroke opacity to zero but retains the interactive polygon and any active land-use fill. The inspected lot remains visually identifiable using its separate purple highlight. Existing zoning and land-use fill-opacity sliders are unaffected. The Deselect all layers button turns map layers off without changing parcel-outline display preferences.

## Build 29: map-anchored parcel quick preview

Clicking a MapPLUTO tax lot on the map now opens a compact Leaflet popup at the clicked location showing the **actual MapPLUTO address, BBL, zoning districts, land-use category, lot area, and built FAR**. The visible parcel feature is reused without a duplicate API request. A click on a zoning or other non-parcel layer performs the existing point-based parcel lookup first, then opens the same preview. **View full details** opens the existing property panel, including the mobile bottom sheet. Address and BBL searches continue to open full details. The inspected parcel's purple highlight, independent zoning/land-use fill opacity, parcel stroke options, and map layer controls are preserved. Popup fields are rendered as text nodes to avoid interpreting parcel data as HTML.

## Build 30: current device location

A **Locate me** button is available on desktop and mobile. Location is **opt-in**: the app never asks for location permission automatically when it loads. Pressing Locate me invokes the browser's `navigator.geolocation.watchPosition` API over HTTPS. After permission is granted, a blue position dot and translucent accuracy-radius circle appear, and the map centers on the first fix. As the user moves, the dot and circle update without automatically panning away from what the user is studying. A separate recenter button returns to the last known position. **Stop locating** ends the geolocation watch and removes both indicators. Permission denial, unavailable positioning, unsupported browsers, and timeouts produce readable status messages.

The application itself does not transmit, persist, or put the coordinates into its URL or GIS requests. As with any web map, centering on a location can cause the third-party basemap tile provider to learn which general map area is viewed. Device/browser location permissions determine whether the feature works and how precise it is; blue accuracy circles are estimates rather than guaranteed boundaries. The map still works normally if permission is denied.

## Build 31: collapsible map legend

The map legend now has a visible **Legend** button that toggles its content open and closed without affecting zoning or land-use layers. The toggle is keyboard accessible and exposes its state through `aria-expanded`. On mobile, the legend starts collapsed to avoid crowding the map and location controls; on desktop it starts expanded. The compact legend button remains available to reopen it, and subsequent land-use and zoning legend redraws preserve its collapsed/expanded state. This is a display-only control, with no new GIS requests.

## Build 32: mobile map control layout

The collapsible map legend is now anchored below the top map toolbar rather than beside the bottom geolocation controls. Expanded legend content scrolls inside a height-limited panel on narrow screens. The Locate me button is now a compact, 44 px square icon-only control, preserving its accessible text, permission flow, current-location display, Stop locating state, and separate recenter button. The map's zoning, parcel, and layer logic is unchanged.

## Build 34: rotation and compass orientation

Map rotation is implemented through the pinned MIT-licensed `@tomickigrzegorz/leaflet-rotate@0.3.0` Leaflet extension, loaded before the application's scripts. The Leaflet map itself rotates so that tiles, GIS feature polygons, and pointer-to-map coordinate conversion share the same rotated view. Map default remains **north-up**.

Open the **🧭 orientation button** for a bearing slider, **North up** reset, and an optional **Follow compass** control. Two-finger twist gestures work on touchscreens; desktop users can right-drag or use Shift+wheel. The manual slider and reset stop heading-follow mode, and manually starting a rotation gesture also stops heading-follow mode.

Compass following uses `DeviceOrientationEvent` and, when needed, Apple's `DeviceOrientationEvent.requestPermission()` in response to the user tapping the compass button. Only a north-referenced device heading is accepted (`webkitCompassHeading` on iOS, or explicitly absolute orientation values elsewhere). Arbitrary relative `alpha` values are rejected. Valid headings are rate-limited and passed to the extension's smoothed `map.setHeading()` interface. Missing permissions, unsupported sensors, and unavailable accurate readings leave manual map rotation usable. No compass or heading data is transmitted or stored by application code.

**Validation limitations:** Static JavaScript parsing and integration checks do not prove rotated GIS hit-testing on real Safari devices or confirm that the pinned CDN plugin loads on the user's network. Test manually with MapPLUTO parcel clicks, zoning boundaries, polygon highlights, imagery, labels, and the GPS dot at nonzero bearings on desktop and iPhone before relying on the feature for fieldwork.
