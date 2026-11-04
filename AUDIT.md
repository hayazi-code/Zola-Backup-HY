# Reliability and performance audit — Build 21
Date: 2026-11-04

## Scope
Reviewed core map interactions, GIS fetch pipeline, optional zoning overlays, public transit and LIRR layers, phone experience, and browser diagnostics. Source code in this repository is publicly deployed through GitHub Pages.

## Findings and committed fixes

| Severity | Finding | Resolution |
| --- | --- | --- |
| High | Every pan could launch a large burst of core, optional, transit, and rail GIS fetches. | Introduced a shared queue with at most **5 simultaneous network requests**; requests still abort when a layer or viewport changes. |
| High | No consistent timeout or transient-error retry for live GIS. | **14-second per-attempt timeout**, **one retry** for HTTP 429 and 5xx or timeout, cancellation-aware behavior, and clear errors. |
| High | A delayed parcel click could overwrite a newer click or BBL search. | Shared lookup generation counter and AbortController; only most recent active result may update parcel information. |
| Medium | Revisiting an unchanged view re-downloaded already retrieved geometry. | **60-second, 40-entry LRU response cache**, with large feature responses excluded and failures never cached. |
| Medium | Interactive parcel lookups could wait behind background layer requests. | Interactive click and BBL queries now get higher queue priority. |
| Medium | Mobile phones could attempt to render up to 6,000 features per core layer. | Core viewport cap reduced to **2,000 features per layer on mobile** while desktop retains 6,000; viewport status indicates incomplete coverage and recommends zooming. |
| Medium | No regression tests for queue/caching/abort/retry behavior. | Added deterministic offline Node tests and a GitHub Actions workflow on every push and pull request. |
| Medium | Incident diagnosis depends on inspecting many remote services manually. | Existing core and layer-level browser diagnostics remain accessible from the map and tests now include subway and LIRR GIS endpoints. |

## Automated checks

- `node --check app.js layer-explorer.js mobile.js gis-network.js` (run one script at a time).
- `node --test tests/network.test.cjs`.
- Workflow: `.github/workflows/reliability.yml`, runs on pushes and pull requests to `main`.
- Basic static HTML script reference checks.

Automated tests use mocked network responses and **do not prove** that NYC hosted services are currently reachable, complete, or accurate.

## Live integration validation needed

This execution environment did not permit direct outbound requests to the public ArcGIS endpoints. **Do not interpret a successful GitHub commit or static test as a live service pass.** Use:
- [Core diagnostics](https://hayazi-code.github.io/Zola-Backup-HY/diagnostics.html)
- [All optional GIS layer diagnostics](https://hayazi-code.github.io/Zola-Backup-HY/layer-diagnostics.html)
- [GitHub Actions workflow runs](https://github.com/hayazi-code/Zola-Backup-HY/actions)

Suggested manual acceptance checks on current deployed BUILD 21:
1. Search known BBL, verify its polygon, address and MapPLUTO values.
2. Quickly click several lots; only the final clicked parcel should populate details.
3. Pan and zoom rapidly with zoning, tax lots, subway routes/stations and LIRR enabled; ensure stale features do not render.
4. Toggle every optional overlay off and on; check station labels and selected lot highlights stay visible.
5. On mobile, rapidly pan and select a lot, use the bottom sheet and rectangle selection.
6. Run the live diagnostics pages; note any missing services, HTTP/CORS failures, or timeouts.
7. Test a 1,000+ parcel selection and export on both mobile and desktop.

## Deliberate limits and remaining risks

- The app is *not* an offline backup: NYC Planning and transit data endpoints can fail independently of GitHub Pages.
- Caching reduces redundant requests but is short-lived and not a source-of-truth dataset snapshot.
- Some optional layer catalog choices still represent incomplete ZoLa parity and are intentionally marked unavailable.
- Zoning map polygons, MapPLUTO, and selected tax lots do not certify legal zoning-lot status or development entitlement.
- At low zoom or dense viewports, map layers may be truncated to protect memory; the app warns that the view may be incomplete. This is a performance safety mechanism, not a substitute for tiled vector datasets.
- External tile providers and historic imagery may fail separately; do not depend on them for official analysis.
- GIS datasets are not real-time MTA operational status.

## Next architectural steps
1. Host versioned NYC zoning, MAPPLUTO and transit extracts under a controlled and documented update process to reduce external service dependencies.
2. Move high-density zoning and tax-lot rendering to tiled vector layers with parcel attribute requests on demand.
3. Add browser E2E smoke tests (Playwright) against a staging deployment, including touch gestures and cross-layer visibility.
4. Monitor upstream schema changes and service health with scheduled GitHub Actions.
