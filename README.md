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
- A searchable **ZoLa-style grouped layer catalog** with dozens of public service choices: zoning districts, tax lots and land use coloring, filtered C/M districts and C1/C2 overlays, zoning map index, adopted/certified map amendments, special districts, MIH, IH, limited height, lower-density growth management, transit zones, designated industrial areas, environmental designations, flood hazards, historic resource screening layers, public access areas, and administrative boundaries.
- Additional layers include NYC community districts, Council districts, State Senate and Assembly districts, 2020 NTAs, census tracts, and subway lines/stations. Disabled catalog entries clearly identify missing service integrations; unavailable layers cannot be toggled.
- Three selectable basemaps: minimal OpenStreetMap, NYC cartographic tiles, and labeled historic 2018 NYC aerial orthophotography. Click any optional data feature to inspect its available attributes and source link.
- Select **noncontiguous** tax lots by clicking, drawing polygons, or drawing rectangles. Tax lots are identified by their full NYC BBL.
- Summarize total mapped lot area and primary zoning districts; zoom to the selected lots; export complete selection to CSV.
- Enter an assumed FAR for a **purely illustrative** aggregate floor-area calculation. This is not a zoning entitlement or valid bulk analysis.
- Share a parcel link with `?bbl=1000477501`.
- Browser diagnostics that independently test each live data service.

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

Base URL: `https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/`

Address search: `https://geosearch.planninglabs.nyc/v2/`

Basemap: OpenStreetMap public tile service, with attribution. This is suited to modest usage, **not a high-traffic hosted deployment**. At scale, use a production tile provider or self-hosted tiles.

## Technical design

Zero-build static site designed for GitHub Pages:

- `index.html`: Accessible semantic interface and dependency loading.
- `styles.css`: Responsive ZoLa-inspired styling.
- `app.js`: GIS queries, parcel lookup, core interactive layers, drawing, exports, and scenario calculation.
- `layer-explorer.js`: Grouped layer catalog with on-demand public ArcGIS viewport queries, per-layer state, metadata links, and basemap selection.
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
