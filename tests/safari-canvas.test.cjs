/* Regression guard for Safari custom-pane Canvas handling.
   Run: node --test tests/*.test.cjs */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const spatial=fs.readFileSync(path.join(root,'spatial-analysis.js'),'utf8');

test('custom analysis panes own explicit Canvas renderers',()=>{
 assert.match(app,/L\.canvas\(\{pane:name,padding:\.25\}\)\.addTo\(map\)/);
 assert.match(app,/ZOLA_PANE_RENDERERS=\{spatialAnalysis:spatialRenderer,analysisHighlight:highlightRenderer\}/);
 assert.match(spatial,/renderer:window\.ZOLA_PANE_RENDERERS\?\.spatialAnalysis/);
});

test('parcel selection updates one Path without clearing GeoJSON children',()=>{
 const highlight=app.slice(app.indexOf('function highlightParcel'),app.indexOf('function cancelParcelLookup'));
 assert.match(highlight,/inspectPath\.setLatLngs\(latlngs\)/);
 assert.match(highlight,/inspectPath=L\.polygon\(latlngs/);
 assert.doesNotMatch(highlight,/clearLayers\(\)/);
});
