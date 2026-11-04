# ZoLa Backup HY

**Independent public-data NYC zoning and land-use viewer**

- Live website: https://hayazi-code.github.io/Zola-Backup-HY/
- Browser diagnostics: https://hayazi-code.github.io/Zola-Backup-HY/diagnostics.html
- Source code: https://github.com/hayazi-code/Zola-Backup-HY

## Features

- Minimal neutral OpenStreetMap basemap with a ZoLa-inspired planning interface.
- Search for NYC properties by **10-digit BBL**, or search by address/name using NYC Planning GeoSearch.
- Click any mapped tax lot to inspect MapPLUTO address, zoning districts, overlays, lot area, land use, building information, reported FAR attributes, and source version.
- Enable/disable NYC Planning public feature layers: zoning districts, tax lot boundaries, MapPLUTO land use, commercial overlays, special districts, subdistricts, and MIH.
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
- `app.js`: GIS queries, parcel lookup, interactive layers, drawing, exports, and scenario calculation.
- `diagnostics.html`: Browser-based integration tests against live APIs.

Map rendering uses Leaflet 1.9.4; geometry drawing uses Leaflet.draw 1.0.4. ArcGIS FeatureServer requests are executed directly from the browser. Spatial polygons are retrieved in GeoJSON (EPSG:4326). BBL queries treat `BBL` as a numeric field because MapPLUTO stores it as a double.

## Known limitations and important caveats

**The code has passed static JavaScript parsing and ID wiring checks. Live browser functionality against external APIs has not yet been comprehensively confirmed.** Run `diagnostics.html` after deployment, then test a real BBL and selection.

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
