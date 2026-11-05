/* Spatial Analysis: preliminary FAR utilization and subway-entry access, build 35.
 * Independent overlay: never replaces MapPLUTO geometry, click handlers or inspected-lot highlight. */
(function(){
'use strict';
const MTA_URL='https://data.ny.gov/resource/i9wp-a4ja.json';
const MTA_SOURCE='https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja';
const MILES_TO_METERS=1609.344;
const MOBILE_MAX_RENDER=180;
const DESKTOP_MAX_RENDER=650;
const BATCH_SIZE=24;
const mobile=()=>window.matchMedia('(max-width: 740px)').matches;
const renderLimit=()=>mobile()?MOBILE_MAX_RENDER:DESKTOP_MAX_RENDER;
const MAX_ENTRANCES=5000;
const id=name=>document.getElementById(name);
const state={map:null,lots:null,overlay:null,mode:'off',features:[],clipped:false,entrances:null,loading:null,controller:null,loadError:'',requestSequence:0,renderSequence:0,renderTimer:null,debounceTimer:null};
function status(text,kind='info'){
 const out=id('spatial-analysis-status');
 if(!out)return;
 out.textContent=text;out.dataset.kind=kind;
}
function getConfig(){
 const field=id('spatial-far-use')?.value||'ResidFAR';
 const custom=Number(id('spatial-far-custom')?.value);
 return {
  mode:id('spatial-analysis-mode')?.value||'off',
  farField:field,
  customFar:custom,
  threshold:Number(id('spatial-far-threshold')?.value)||50,
  distance:Number(id('spatial-distance')?.value)||0.25
 };
}
function representativePoint(feature){
 // Bounding-box center is an explicit, repeatable reference point; not the nearest frontage.
 const geometry=feature?.geometry;if(!geometry)return null;
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:null;
 if(!polygons)return null;
 let minLat=Infinity,minLon=Infinity,maxLat=-Infinity,maxLon=-Infinity;
 for(const poly of polygons)for(const ring of poly)for(const xy of ring){
  const lon=Number(xy[0]),lat=Number(xy[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
  minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat);
  minLon=Math.min(minLon,lon);maxLon=Math.max(maxLon,lon);
 }
 return Number.isFinite(minLat)?[(minLat+maxLat)/2,(minLon+maxLon)/2]:null;
}
function metersBetween(a,b){
 const r=Math.PI/180,lat1=a[0]*r,lat2=b[0]*r,dLat=(b[0]-a[0])*r,dLon=(b[1]-a[1])*r;
 const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
function makeEligibleEntrances(rows){
 if(!Array.isArray(rows))throw new Error('MTA response was not an array');
 const seen=new Set(),out=[];
 for(const row of rows){
  const allowed=String(row.entry_allowed??'').trim().toLowerCase();
  if(!['yes','y','true','1'].includes(allowed))continue;
  if(String(row.division||'').trim().toUpperCase()==='SIR')continue;
  const lat=Number(row.entrance_latitude),lon=Number(row.entrance_longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<40.45||lat>41.1||lon< -74.4||lon> -73.55)continue;
  const key=lat.toFixed(6)+','+lon.toFixed(6);
  if(!seen.has(key)){seen.add(key);out.push([lat,lon])}
 }
 if(!out.length)throw new Error('No entry-permitted subway coordinates were found in the MTA dataset');
 return out;
}
async function loadEntrances(){
 if(state.entrances)return state.entrances;
 if(state.loading)return state.loading;
 const controller=new AbortController();state.controller=controller;
 const params=new URLSearchParams({
  '$select':'division,entry_allowed,entrance_latitude,entrance_longitude',
  '$limit':String(MAX_ENTRANCES)
 });
 state.loading=(async()=>{
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(MTA_URL+'?'+params.toString(),{signal:controller.signal,mode:'cors',cache:'default'});
   if(!response.ok)throw new Error('MTA endpoint returned HTTP '+response.status);
   const rows=await response.json();
   if(rows.length>=MAX_ENTRANCES)throw new Error('MTA dataset exceeded the safe row limit; analysis canceled to avoid incomplete coverage');
   const entrances=makeEligibleEntrances(rows);
   state.entrances=entrances;state.loadError='';
   return entrances;
  }finally{
   clearTimeout(timeout);
   if(state.controller===controller){
    state.controller=null;
    state.loading=null;
   }
  }
 })();
 return state.loading;
}
function farResults(features,config){
 const matches=[];let missing=0,examined=0;
 const field=config.farField;
 for(const f of features){
  const p=f.properties||{},built=Number(p.BuiltFAR);
  const allowed=field==='custom'?config.customFar:Number(p[field]);
  if(p.BuiltFAR==null||p.BuiltFAR===''||(field!=='custom'&&(p[field]==null||p[field]===''))||
     !Number.isFinite(built)||built<0||!Number.isFinite(allowed)||allowed<=0){missing++;continue}
  examined++;
  if((built/allowed)*100<config.threshold)matches.push(f);
 }
 return {matches,missing,examined};
}
function transitResults(features,config,entrances){
 const matches=[],threshold=config.distance*MILES_TO_METERS;
 let missing=0,examined=0;
 // Only points close enough to the visible viewport to change the classification
 // need to be considered; a 1-mile pad also handles edge-of-view parcels.
 const bounds=state.map.getBounds(),latPad=.03,lonPad=.045;
 const candidates=entrances.filter(([lat,lon])=>
  lat>=bounds.getSouth()-latPad&&lat<=bounds.getNorth()+latPad&&
  lon>=bounds.getWest()-lonPad&&lon<=bounds.getEast()+lonPad);
 for(const f of features){
  const center=representativePoint(f);
  if(!center){missing++;continue}
  examined++;
  // Coarse bounding-box filter avoids evaluating costly trigonometry for all stations.
  const latLimit=threshold/111000+.001;
  const lonLimit=threshold/(111000*Math.max(.5,Math.cos(center[0]*Math.PI/180)))+.001;
  let within=false;
  for(const pt of candidates){
   if(Math.abs(pt[0]-center[0])>latLimit||Math.abs(pt[1]-center[1])>lonLimit)continue;
   if(metersBetween(center,pt)<=threshold){within=true;break}
  }
  if(!within)matches.push(f);
 }
 return {matches,missing,examined,candidates:candidates.length};
}
// Invalidate queued drawing immediately on any subsequent change or viewport update.
function cancelRender(){
 ++state.renderSequence;
 if(state.renderTimer!==null){clearTimeout(state.renderTimer);state.renderTimer=null}
 if(state.debounceTimer!==null){clearTimeout(state.debounceTimer);state.debounceTimer=null}
}
function scheduleRender(delay=120){
 cancelRender();
 const seq=state.renderSequence;
 state.debounceTimer=setTimeout(()=>{
  state.debounceTimer=null;
  if(seq===state.renderSequence)render();
 },delay);
}
function render(){
 if(!state.overlay)return;
 cancelRender();
 const seq=state.renderSequence;
 state.overlay.clearLayers();
 const config=getConfig();
 if(config.mode==='off'){status('Analysis is off. Enable a method to highlight parcels.');return}
 if(state.map.getZoom()<16){
  status('Zoom to level 16 or closer to analyze visible MapPLUTO lots.','warn');return;
 }
 if(!state.features.length){
  status('No visible MapPLUTO parcels are loaded yet. Pan or zoom closer.','warn');return;
 }
 if(config.mode==='transit'&&!state.entrances){
  if(state.loadError){status('Subway analysis unavailable: '+state.loadError,'error');return}
  status('Retrieving official MTA subway entrance coordinates…');return;
 }
 if(config.mode==='far'&&config.farField==='custom'&&!(config.customFar>0)){
  status('Enter a custom allowable FAR greater than zero.','warn');return;
 }
 const result=config.mode==='far'?farResults(state.features,config):
  transitResults(state.features,config,state.entrances);
 const limit=renderLimit();
 const highlighted=result.matches.slice(0,limit);
 const count=result.matches.length;
 const label=config.mode==='far'?'below '+config.threshold+'% of selected use FAR':
  'farther than '+config.distance+' mile'+(config.distance===1?'':'s')+' from a subway entrance';
 const notes=[count+' of '+result.examined+' evaluated parcels '+label+'.'];
 if(result.missing)notes.push(result.missing+' missing or invalid values skipped.');
 if(count>limit)notes.push('Showing '+highlighted.length+' of '+count+' matches to protect '+(mobile()?'mobile':'map')+' performance. Zoom in to see more.');
 if(state.clipped)notes.push('MapPLUTO extent results were capped; zoom in for fuller coverage.');
 notes.push('Visible area only.');
 if(!highlighted.length){status(notes.join(' '),'good');return}
 status('Drawing '+highlighted.length+' of '+count+' matching parcels…');
 const style={color:'#99551c',weight:0,opacity:0,fillColor:config.mode==='far'?'#ed9b35':'#d95b66',fillOpacity:.63};
 // Batch geometry creation with a yield between slices, keeping scrolling and panning responsive.
 let offset=0;
 function nextBatch(){
  if(seq!==state.renderSequence||state.mode!==config.mode)return;
  const end=Math.min(offset+BATCH_SIZE,highlighted.length);
  const fragment={type:'FeatureCollection',features:highlighted.slice(offset,end)};
  state.overlay.addData(fragment);
  offset=end;
  if(offset<highlighted.length){
   state.renderTimer=setTimeout(nextBatch,16);
  }else{
   state.renderTimer=null;
   state.overlay.setStyle(style);
   // Maintain selected parcel's purple border above analysis highlights.
   window.ZOLA_RESTORE_PARCEL_HIGHLIGHTS?.();
   status(notes.join(' '),'good');
  }
 }
 // Apply the correct style before any geometry is added, rather than restyling all features.
 state.overlay.options.style=style;
 state.renderTimer=setTimeout(nextBatch,0);
}
function stopTransitRequest(){
 if(state.controller){state.controller.abort();state.controller=null}
 state.loading=null;
}
function onChange(){
 const config=getConfig(),prior=state.mode;
 state.mode=config.mode;
 if(prior==='transit'&&config.mode!=='transit'){
  ++state.requestSequence;
  stopTransitRequest();
 }
 id('spatial-far-options').hidden=config.mode!=='far';
 id('spatial-transit-options').hidden=config.mode!=='transit';
 if(config.mode==='off'){
  stopTransitRequest();
  cancelRender();state.overlay?.clearLayers();
  status('Analysis off. Choose a method to highlight parcels.');
  if(prior!=='off')window.ZOLA_RELOAD_CORE?.('lots');
  return;
 }
 if(config.mode==='transit'&&!state.entrances){
  state.loadError='';
  const seq=++state.requestSequence;
  status('Retrieving official MTA subway entrance coordinates…');
  loadEntrances().then(()=>{
   if(seq===state.requestSequence&&getConfig().mode==='transit')scheduleRender(80);
  }).catch(e=>{
   if(seq!==state.requestSequence)return;
   state.loadError=e.name==='AbortError'?'Request canceled':e.message;
   if(getConfig().mode==='transit')scheduleRender(80);
  });
 }
 if(prior==='off')window.ZOLA_RELOAD_CORE?.('lots');
 scheduleRender(90);
}
function setup(map,groups){
 state.map=map;
 state.lots=groups.lots;
 // Use the Canvas renderer created with the pane by app.js. Explicit ownership
 // prevents Safari from lazily detaching a custom-pane renderer while a batch
 // of analysis paths is being cleared or replaced.
 state.overlay=L.geoJSON(null,{pane:'spatialAnalysisPane',renderer:window.ZOLA_PANE_RENDERERS?.spatialAnalysis,interactive:false,style:{color:'#99551c',weight:0,fillOpacity:.63}}).addTo(map);
 for(const idName of ['spatial-analysis-mode','spatial-far-use','spatial-distance']){
  id(idName)?.addEventListener('change',onChange);
 }
 id('spatial-far-threshold')?.addEventListener('input',()=>{
  id('spatial-far-threshold-value').textContent=id('spatial-far-threshold').value+'%';
  scheduleRender(180);
 });
 id('spatial-far-custom')?.addEventListener('input',()=>scheduleRender(240));
 id('spatial-far-use')?.addEventListener('change',()=>{
  id('spatial-custom-far-row').hidden=id('spatial-far-use').value!=='custom';
 });
 const source=id('spatial-mta-source');if(source)source.href=MTA_SOURCE;
 state.map.on('movestart',()=>{
  if(state.mode!=='off'){
   cancelRender();state.overlay.clearLayers();
   status('Updating analysis for the new map view…');
  }
 });
 // Map movement triggers a fresh MapPLUTO download; do not redraw stale polygons on zoomend.
 state.map.on('zoomend',()=>{if(state.mode!=='off')status('Updating analysis for the new map view…')});
 // Starting state is off and never triggers a subway service call.
 render();
}
window.setupSpatialAnalysis=setup;
window.ZOLA_SPATIAL_ACTIVE=()=>state.mode!=='off';
window.ZOLA_SPATIAL_ON_LOTS=(features,clipped,error)=>{
 state.features=features||[];
 state.clipped=Boolean(clipped);
 if(error){state.overlay?.clearLayers();status(error,'error');return}
 scheduleRender(40);
};
window.ZOLA_SPATIAL_TEST={representativePoint,metersBetween,farResults,makeEligibleEntrances,transitResults};
})();
