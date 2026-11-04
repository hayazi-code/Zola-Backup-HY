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
- The layer menu mirrors the provided **ZoLa section order and nesting**: Zoning and Land Use, Supporting Zoning Layers, Other Supporting Layers, Administrative Boundaries, and Basemaps. Child menus include C1–C8, M1–M3, R1–R10, C1/C2 overlays, flood-zone types, FRESH incentive types, landmark classes, Council district years, and aerial imagery years.
- C1/C2 and district subtype checkboxes actually filter the core zoning geometry. FRESH uses DCP's `FRESH_Food_Stores` service with published Name categories. Pending map amendments use `nyzma` features with `STATUS = 'Certified'`, not all applications in earlier pre-certification stages.
- The amendment timeline uses its `EFFECTIVE` field where present. The current `nyzma` dataset documents changes from 2002 onward, despite the ZoLa-style slider running from 1970-01 to 2028-11.
- The **Basemaps and transit** section now uses independent checkboxes, not mutually exclusive radio buttons. Transit overlays (NYC subway routes and stations), **Building Footprints** (actual NYC OTI building polygons), and **Aerial Imagery** can be toggled on and off separately over a persistent minimal OpenStreetMap base. Subway routes and station markers start enabled by default, with additional independent controls for each. Subway data are queried from the public `New_York_City_Region_Transit_Layers/FeatureServer` (routes layer 6, stations layer 0). 3D Buildings remains unavailable. Esri World Imagery provides current aerial imagery; older NYC imagery may fall back if public tiles fail. Years 2020, 2022, and 2024 are disabled until a usable keyless source is verified.
- Nonworking/specialized layers are **explicitly labeled Not linked**. Some connected category filters, such as the precise parking subareas and landmark classifications, still require validation against published feature fields.
- Select **noncontiguous** tax lots by clicking, drawing polygons, or drawing rectangles. Tax lots are identified by their full NYC BBL.
- Summarize total mapped lot area and primary zoning districts; zoom to the selected lots; export complete selection to CSV.
- Enter an assumed FAR for a **purely illustrative** aggregate floor-area calculation. This is not a zoning entitlement or valid bulk analysis.
- Share a parcel link with `?bbl=1000477501`.
- Browser diagnostics that independently test each live data service.

- All nested filter labels are displayed as independent wrapping rows to remain readable on narrow sidebars. **Deselect all layers** at the top of the map-layer list switches off core and optional overlays together, without clearing selected tax lots or changing the basemap.

## Mobile interface

The same GitHub Pages URL adapts automatically to phones (screen width 740px or less). The map occupies the screen with a collapsible bottom sheet. A short bar at the bottom offers **Search**, **Layers**, **Lots**, and **Map** actions; tap or swipe the sheet handle to expand or collapse controls.

- **Search** opens the panel and focuses the address/BBL field. Tapping or searching a property opens MapPLUTO details in the panel.
- **Layers** reveals the full ZoLa layer catalog; long sublayer names use individual wrapping rows.
- **Lots** displays the selection workflow and data export. Starting polygon/rectangle drawing collapses the sheet to free the map; completing a selection opens the results.
- **Map** collapses the panel without changing layer visibility, selected tax lots, or the current location.
- Larger touch targets, independently scrolling sidebar, mobile search inputs, safe-area padding, and orientation-change map resizing are included.
- Desktop layout remains the map with a right-hand sidebar; there is no separate mobile codebase or domain.

The mobile layout has been structurally checked but still requires device-level visual and gesture testing across mobile browsers.

## How to use

Click a property to inspect it. Open **Selected lots**, choose **Select by click** to add or remove many lots, or use Draw polygon or Draw rectangle. Zoom to level 16 or higher to view parcel boundaries. The selection need not be contiguous.

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
- `app.js`: GIS queries, parcel lookup, core interactive layers, drawing, exports, and scenario calculation.
- `layer-explorer.js`: Grouped layer catalog with on-demand public ArcGIS viewport queries, per-layer state, metadata links, and basemap selection.
- `mobile.js`: Phone-size bottom-sheet controls, quick navigation, mobile gestures, and responsive map resizing.
- `diagnostics.html`: Browser-based core integration tests against live APIs.
- `layer-diagnostics.html`: On-demand browser metadata and query tests for every configured ArcGIS service.

Map rendering uses Leaflet 1.9.4; geometry drawing uses Leaflet.draw 1.0.4. ArcGIS FeatureServer requests are executed directly from the browser. Spatial polygons are retrieved in GeoJSON (EPSG:4326). BBL queries treat `BBL` as a numeric field because MapPLUTO stores it as a double.

## Known limitations and important caveats

**The code has passed static JavaScript parsing and ID wiring checks. Live browser functionality against external APIs has not yet been comprehensively confirmed.** Run `diagnostics.html` after deployment, then test a real BBL and selection.

- The layer catalog is a **partial feature match, not guaranteed full ZoLa parity**. Several specialized overlays are intentionally marked Not linked. A catalog checkbox whose source fails is shown as Unavailable, not silently claimed to succeed.
- This is not affiliated with the NYC Department of City Planning and is not an official zoning determination.
- It depends on third-party hosted **live** GIS and GeoSearch services. The site itself is independently deployed, but it is **not an offline data backup**. Offline resilience requires permission-appropriate, versioned locally hosted GIS datasets and an update process.
- FeatureServer data may be delayed, and available layers need not perfectly match a given effective-date zoning map. Confirm with the official Zoning Resolution and city records.
- MapPLUTO tax lots are not the same thing as legally established zoning lots. Selecting adjacent or nonadjacent mapped lots does not establish zoning lot assemblage.
- Geometry drawing has a 15,000-result safety threshold **per drawn area** for browser responsiveness. Selections can accumulate across multiple drawings.
- Map rendering has a 6,000-feature safety budget per layer per viewport and warns to zoom in if coverage is incomplete.
- FAR demonstration does not account for zoning-district rules, special districts, MIH, overlays, mixed-use deductions, bulk, height, yards, floor-area exclusions, conditions, or zoning lot status.
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

The base street map stays visible when all optional layers are turned off. **Deselect all layers** also disables subway, aerial, and building overlays without deleting previously selected tax lots. Turning Transit back on re-enables routes and stations if both had been deselected.

## Deployment troubleshooting

The header displays the current **BUILD** version. If the browser shows radio buttons in the Basemaps menu or an older build number, it is serving an older GitHub Pages version. Check GitHub Actions for the latest Pages deployment and hard refresh the site with a new URL query string. App controls in BUILD 18 are independent checkboxes for Transit, Building Footprints, and Aerial Imagery; sub-options for subway routes and stations. These layers query the ArcGIS regional public service and fall back to the separately hosted NYC Planning `SubwayLines_share` and `SubwayStations_share` feature services if a primary query fails or returns no features.
