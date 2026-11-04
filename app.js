/* ZoLa Backup HY — standalone, public-data client */
'use strict';
const DOM=id=>document.getElementById(id);
const SERVICE_ROOT='https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/';
const GEOSEARCH='https://geosearch.planninglabs.nyc/v2/';
const URLS={
  zoning:'nyzd',commercial:'nyco',special:'nysp',subdistrict:'nysp_sd',
  mih:'nycmih',lots:'MAPPLUTO'
};
const FIELDS={
  zoning:'ZONEDIST', commercial:'OVERLAY',special:'SDNAME,SDLBL',
  subdistrict:'SPNAME,SPLBL,SUBDIST,SUBSUB',mih:'*',
  lots:'BBL,Borough,BoroCode,Block,Lot,Address,ZoneDist1,ZoneDist2,ZoneDist3,ZoneDist4,Overlay1,Overlay2,SPDist1,SPDist2,LandUse,LotArea,BldgArea,NumBldgs,NumFloors,UnitsRes,UnitsTotal,YearBuilt,YearAlter1,OwnerName,ResidFAR,CommFAR,FacilFAR,BuiltFAR,SplitZone,Version'
};
const BASE={zoning:13,commercial:14,special:12,subdistrict:14,mih:12,lots:16};
const LOT_USES={
 '01':'One- and two-family buildings','02':'Multi-family walk-up buildings',
 '03':'Multi-family elevator buildings','04':'Mixed residential and commercial',
 '05':'Commercial and office buildings','06':'Industrial and manufacturing',
 '07':'Transportation and utility','08':'Public facilities and institutions',
 '09':'Open space and outdoor recreation','10':'Parking facilities','11':'Vacant land'
};
// Source: NYC DCP Area Map Standard v1.7, page 3, 14 August 2019.
// Exact HEX equivalents of DCP's published RGB land-use color codes.
// 40% transparency in the specification equals CSS/Leaflet fillOpacity 0.60.
const LOT_COLORS=Object.freeze({
 '01':'#FFFFB3', // One & Two Family Buildings: RGB(255,255,179)
 '02':'#FFEB8A', // Multi-Family Walk-Up Buildings: RGB(255,235,138)
 '03':'#FFC400', // Multi-Family Elevator Buildings: RGB(255,196,0)
 '04':'#FF9966', // Mixed Residential & Commercial Buildings: RGB(255,153,102)
 '05':'#E83333', // Commercial & Office Buildings: RGB(232,51,51)
 '06':'#AB59C9', // Industrial & Manufacturing: RGB(171,89,201)
 '07':'#FFCCFF', // Transportation & Utility: RGB(255,204,255)
 '08':'#2E6DFF', // Public Facilities & Institutions: RGB(46,109,255)
 '09':'#99FF66', // Open Space & Outdoor Recreation: RGB(153,255,102)
 '10':'#AAAAAA', // Parking Facilities: RGB(170,170,170)
 '11':'#2E2E2E'  // Vacant Land: RGB(46,46,46)
});
const UNKNOWN_LANDUSE_COLOR='#EBEBEB'; // All Others / No Data: RGB(235,235,235)
const LANDUSE_FILL_OPACITY=0.60;
const LANDUSE_STANDARD_URL='https://www.nyc.gov/assets/planning/download/pdf/applicants/applicant-portal/area_map_standard.pdf';
const FORMAT=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fmt=v=>Number.isFinite(Number(v))&&v!==''&&v!=null?FORMAT.format(Number(v)):'Not available';
const bblOf=f=>{const p=f?.properties||f||{};if(p.BBL==null)return '';return String(Math.trunc(Number(p.BBL))).padStart(10,'0')};
const boroughOf=b=>({'1':'Manhattan','2':'Bronx','3':'Brooklyn','4':'Queens','5':'Staten Island'})[String(b)[0]]||'NYC';
const apiLayer=key=>SERVICE_ROOT+URLS[key]+'/FeatureServer/0/query';
let map,mode='inspect',drawTool=null,drawHighlight,inspectLayer;
const visibleLayers={},layerGroups={},requests={};
let currentParcel=null,selected=new Map(),searchTimer=null,searchSeq=0,loadTimer=null,selectionBusy=false;
const flags={zoning:true,commercial:false,special:false,subdistrict:false,mih:false,lots:true,landuse:false};
let toggleToken=0;

function notice(message,kind='info'){
 const n=DOM('status');n.textContent=message;n.dataset.kind=kind;
}
function signalLight(key,text,kind=''){
 const n=DOM('state-'+key);if(!n)return;n.textContent=text;n.dataset.kind=kind;
}
async function request(url,params={},signal){
 const u=new URL(url);for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null)u.searchParams.set(key,String(value));
 const response=await fetch(u.toString(),{signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const json=await response.json();if(json.error)throw new Error(json.error.message||'GIS service error');
 return json;
}
function extent(){const b=map.getBounds();return JSON.stringify({xmin:b.getWest(),ymin:b.getSouth(),xmax:b.getEast(),ymax:b.getNorth(),spatialReference:{wkid:4326}})}
function gisParams(geometry,geometryType){
 return {f:'geojson',where:'1=1',geometry,geometryType,inSR:4326,outSR:4326,spatialRel:'esriSpatialRelIntersects',returnGeometry:true};
}
const zoneColor=z=>{z=String(z||'');return z.startsWith('R')?'#f7d88c':z.startsWith('C')?'#eca3a6':z.startsWith('M')?'#b9a0cd':'#b6d8cd'};
const layerStyles={
 zoning:f=>({color:'#957d89',weight:.8,fillColor:zoneColor(f.properties?.ZONEDIST),fillOpacity:.59}),
 commercial:()=>({color:'#ce4f75',weight:1.4,fillColor:'#f18eb4',fillOpacity:.24,dashArray:'4 3'}),
 special:()=>({color:'#544091',weight:2,fillColor:'#c8b9e8',fillOpacity:.08,dashArray:'6 4'}),
 subdistrict:()=>({color:'#8e55b1',weight:1.4,fillColor:'#d7b5e8',fillOpacity:.08,dashArray:'2 5'}),
 mih:()=>({color:'#2d997e',weight:2.2,fillColor:'#80d8ba',fillOpacity:.13,dashArray:'6 3'}),
 lots:f=>({color:flags.landuse?'#928a94':'#99929b',weight:map.getZoom()>=18?.9:.6,fillColor:flags.landuse?(LOT_COLORS[String(f.properties?.LandUse??'').padStart(2,'0')]||UNKNOWN_LANDUSE_COLOR):'#fff',fillOpacity:flags.landuse?LANDUSE_FILL_OPACITY:0})
};
const titles={zoning:'Zoning district',commercial:'Commercial overlay',special:'Special district',subdistrict:'Special subdistrict',mih:'Mandatory Inclusionary Housing',lots:'Tax lot'};
const featureLabel=(key,p)=>({
 zoning:p.ZONEDIST,commercial:p.OVERLAY,special:p.SDNAME,
 subdistrict:[p.SPNAME,p.SUBDIST,p.SUBSUB].filter(Boolean).join(' · '),
 mih:'MIH area',lots:p.Address||'BBL '+p.BBL
})[key]||titles[key];

function createLayers(){
 for(const key of Object.keys(URLS)){
  layerGroups[key]=L.geoJSON(null,{
   style:layerStyles[key],
   onEachFeature:(f,l)=>{
    if(key!=='lots')l.bindTooltip(safe(featureLabel(key,f.properties||{})),{sticky:!(key==='zoning'&&map.getZoom()>=15),permanent:key==='zoning'&&map.getZoom()>=15,direction:key==='zoning'?'center':'top',className:key==='zoning'?'zoning-label':'district-tip'});
    if(key==='lots')l.on('click',e=>{L.DomEvent.stopPropagation(e.originalEvent);inspect(f,{add:mode==='select'})});
    else l.on('click',e=>{L.DomEvent.stopPropagation(e.originalEvent);inspectAt(e.latlng)});
   }
  });
 }
 // Ordering matters: zoning below thematic overlays and selectable lot outlines.
 for(const key of Object.keys(URLS))layerGroups[key].addTo(map);
 inspectLayer=L.geoJSON(null,{style:{color:'#4b277e',weight:3,fillColor:'#8b6bb7',fillOpacity:.16},interactive:false}).addTo(map);
 visibleLayers.selected=L.geoJSON(null,{style:{color:'#e77620',weight:2.6,fillColor:'#fba952',fillOpacity:.35},interactive:false}).addTo(map);
 drawHighlight=L.featureGroup().addTo(map);
}
function bringHighlights(){layerGroups.lots.bringToFront();visibleLayers.selected.bringToFront();inspectLayer.bringToFront();drawHighlight.bringToFront()}
function checkLayer(key){return key==='lots'?(flags.lots||flags.landuse):flags[key]}
async function refreshLayer(key){
 const group=layerGroups[key],prior=requests[key];if(prior)prior.abort();
 const ac=new AbortController();requests[key]=ac;
 if(!checkLayer(key)){group.clearLayers();signalLight(key,'Off');return}
 if(map.getZoom()<BASE[key]){group.clearLayers();signalLight(key,'Zoom in');return}
 signalLight(key,'Loading…');
 const query={...gisParams(extent(),'esriGeometryEnvelope'),outFields:FIELDS[key],resultRecordCount:2000,resultOffset:0};
 const features=[];
 try{
  // Map rendering has a bounded result budget; a tighter map extent loads more.
  for(let i=0;i<3;i++){
   query.resultOffset=i*2000;
   const data=await request(apiLayer(key),query,ac.signal);
   const batch=data.features||[];features.push(...batch);
   if(batch.length<2000&&!data.exceededTransferLimit)break;
  }
  if(ac.signal.aborted)return;
  const visible=features.filter(f=>!window.ZOLA_VISIBLE_FEATURE||window.ZOLA_VISIBLE_FEATURE(key,f));
  group.clearLayers();group.addData({type:'FeatureCollection',features:visible});
  if(key==='lots')group.setStyle(layerStyles.lots);
  bringHighlights();
  const clipped=features.length>=6000;
  signalLight(key,clipped?'Zoom in for complete coverage':FORMAT.format(visible.length)+' shown',clipped?'warn':'good');
 }catch(e){
  if(e.name==='AbortError')return;
  group.clearLayers();signalLight(key,'Unavailable','error');
  notice(titles[key]+' layer: '+e.message,'error');
 }
}
window.ZOLA_RELOAD_CORE=key=>{if(Object.hasOwn(URLS,key))refreshLayer(key)};
function refreshMap(){
 clearTimeout(loadTimer);loadTimer=setTimeout(()=>{
  for(const key of Object.keys(URLS))refreshLayer(key);
 },260);
}
function updateMapLegend(){
 const host=DOM('map-key-content');if(!host)return;
 if(flags.landuse){
  host.innerHTML='<strong>Land Use · NYC DCP Standard</strong>'+
   '<div class="landuse-key-grid">'+
   Object.entries(LOT_COLORS).map(([code,hex])=>
    '<span><i class="key-swatch" style="background:'+hex+'"></i><span>'+
    safe(code+' · '+LOT_USES[code])+'</span></span>').join('')+
   '<span><i class="key-swatch" style="background:'+UNKNOWN_LANDUSE_COLOR+'"></i><span>Other / No Data</span></span>'+
   '</div><small class="legend-source">DCP Area Map Standard v1.7 · 40% transparency · '+
   '<a href="'+LANDUSE_STANDARD_URL+'" target="_blank" rel="noopener">Official color specification</a></small>';
 } else if(flags.zoning){
  host.innerHTML='<strong>Zoning districts</strong><div class="key-items">'+
   '<span><i class="key-swatch" style="background:#f7d88c"></i> Residential</span>'+
   '<span><i class="key-swatch" style="background:#eca3a6"></i> Commercial</span>'+
   '<span><i class="key-swatch" style="background:#b9a0cd"></i> Manufacturing</span></div>';
 } else {
  host.innerHTML='<strong>Map layers</strong><small class="legend-source">Enable land use or zoning districts to show a color legend.</small>';
 }
}
function onFlagsChange(){
 for(const key of Object.keys(flags)){
  const ch=DOM('layer-'+key);if(ch)flags[key]=ch.checked;
 }
 layerGroups.lots.setStyle(layerStyles.lots);
 window.ZOLA_SYNC_CHILDREN?.();
 updateMapLegend();
 refreshMap();
}
function selectMode(value){mode=value;DOM('inspect-mode').classList.toggle('active',mode==='inspect');DOM('select-mode').classList.toggle('active',mode==='select');notice(mode==='select'?'Selection mode: click lots to add or remove them.':'Inspect mode: click a lot to see its details.')}
function showPanel(tab){
 for(const name of ['explore','selected','scenario']){DOM('tab-'+name).classList.toggle('active',name===tab);DOM('panel-'+name).hidden=(name!==tab)}
 if(tab==='selected')renderSelected();
}
function toggleLot(f){const b=bblOf(f);if(!b)return notice('This feature has no BBL identifier.','warn');if(selected.has(b))selected.delete(b);else selected.set(b,f);renderSelected()}
function inspect(f,{add=false}={}){
 currentParcel=f;
 const p=f.properties||{},b=bblOf(f),zones=[p.ZoneDist1,p.ZoneDist2,p.ZoneDist3,p.ZoneDist4].filter(Boolean);
 inspectLayer.clearLayers();inspectLayer.addData(f);bringHighlights();
 if(add)toggleLot(f);
 const row=(title,value)=>'<div class="detail-row"><span>'+safe(title)+'</span><strong>'+safe(value==null||value===''?'Not available':value)+'</strong></div>';
 let html='<div class="parcel-heading"><span class="eyebrow">Selected tax lot</span><h2>'+safe(p.Address||'Unnamed tax lot')+'</h2><div>'+safe(boroughOf(b))+' · BBL '+safe(b)+'</div></div>';
 html+='<div class="chips">'+zones.map(z=>'<span class="chip">'+safe(z)+'</span>').join('');
 if(p.Overlay1)html+='<span class="chip overlay">'+safe(p.Overlay1)+'</span>';html+='</div>';
 html+='<h4>Zoning and land use</h4>'+row('Zoning districts',zones.join(', '))+row('Commercial overlays',[p.Overlay1,p.Overlay2].filter(Boolean).join(', '))+row('Special districts',[p.SPDist1,p.SPDist2].filter(Boolean).join(', '))+row('Split zoning',p.SplitZone==='Y'?'Yes':p.SplitZone==='N'?'No':p.SplitZone)+row('Land use',LOT_USES[String(p.LandUse||'').padStart(2,'0')]||p.LandUse);
 html+='<h4>Tax lot and buildings</h4>'+row('BBL',b)+row('Block / lot',p.Block+' / '+p.Lot)+row('Lot area (sq ft)',fmt(p.LotArea))+row('Building area (sq ft)',fmt(p.BldgArea))+row('Buildings',fmt(p.NumBldgs))+row('Floors',p.NumFloors)+row('Residential units',fmt(p.UnitsRes))+row('Total units',fmt(p.UnitsTotal))+row('Year built',p.YearBuilt);
 html+='<h4>Reported FAR values (MapPLUTO)</h4>'+row('Built FAR',p.BuiltFAR)+row('Residential FAR',p.ResidFAR)+row('Commercial FAR',p.CommFAR)+row('Community facility FAR',p.FacilFAR);
 html+='<p class="small-note">FAR fields are MapPLUTO attributes, not a definitive zoning entitlement. Verify district rules and special conditions.</p>';
 html+='<div class="action-row"><button id="property-toggle" class="primary">'+(selected.has(b)?'Remove from selection':'+ Add to selection')+'</button><button id="property-zoom">Zoom to lot</button><button id="property-share">Share</button></div>';
 html+='<p class="source-line">MapPLUTO version: '+safe(p.Version||'unspecified')+' · <a target="_blank" rel="noopener" href="https://zola.planning.nyc.gov/bbl/'+encodeURIComponent(b)+'">Official ZoLa</a></p>';
 DOM('property-info').innerHTML=html;
 DOM('property-toggle').onclick=()=>{toggleLot(f);inspect(f,{add:false})};
 DOM('property-zoom').onclick=()=>focusFeatures([f]);
 DOM('property-share').onclick=()=>shareLot(b);
 if(!add){showPanel('explore');window.ZOLA_MOBILE_OPEN?.();if(window.matchMedia('(max-width: 740px)').matches){requestAnimationFrame(()=>DOM('property-info')?.scrollIntoView({block:'start',behavior:'smooth'}))}}
}
function renderSelected(){
 const features=[...selected.values()],count=features.length;
 DOM('selection-count').textContent=FORMAT.format(count);
 const area=features.reduce((n,f)=>n+(Number(f.properties?.LotArea)||0),0);
 DOM('selection-area').textContent=FORMAT.format(area)+' sq ft';
 const zoning={};for(const f of features){const z=f.properties?.ZoneDist1||'Unknown';zoning[z]=(zoning[z]||0)+1}
 DOM('selection-zones').textContent=Object.keys(zoning).length||'0';
 const list=DOM('selected-list');list.innerHTML='';
 for(const f of features.slice(0,250)){
  const b=bblOf(f),p=f.properties||{},row=document.createElement('div');
  row.className='selection-entry';row.innerHTML='<div><strong>'+safe(p.Address||b)+'</strong><small>BBL '+safe(b)+' · '+safe(p.ZoneDist1||'Zone unavailable')+'</small></div>';
  const btn=document.createElement('button');btn.type='button';btn.textContent='Remove';btn.onclick=()=>{selected.delete(b);renderSelected()};
  row.appendChild(btn);row.firstChild.onclick=()=>{inspect(f);focusFeatures([f])};list.appendChild(row);
 }
 if(count>250)list.insertAdjacentHTML('beforeend','<p class="small-note">Showing first 250 of '+FORMAT.format(count)+' lots. CSV includes all.</p>');
 visibleLayers.selected.clearLayers();if(count)visibleLayers.selected.addData({type:'FeatureCollection',features});bringHighlights();
 DOM('selection-summary').textContent=count?Object.entries(zoning).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([z,n])=>z+': '+n).join(' · '):'No lots selected';
 updateScenario();
 if(currentParcel){
  const btn=DOM('property-toggle');if(btn)btn.textContent=selected.has(bblOf(currentParcel))?'Remove from selection':'+ Add to selection';
 }
}
function focusFeatures(features){if(!features.length)return;const b=L.geoJSON({type:'FeatureCollection',features}).getBounds();if(b.isValid())map.fitBounds(b.pad(.5),{maxZoom:18})}
async function inspectAt(latlng){
 if(selectionBusy)return;notice('Looking up tax lot…');
 try{
  const geom=JSON.stringify({x:latlng.lng,y:latlng.lat,spatialReference:{wkid:4326}});
  const data=await request(apiLayer('lots'),{f:'geojson',where:'1=1',outFields:'*',returnGeometry:true,outSR:4326,inSR:4326,geometry:geom,geometryType:'esriGeometryPoint',spatialRel:'esriSpatialRelIntersects',resultRecordCount:10});
  if(!data.features?.length)return notice('No mapped tax lot at this location.','warn');
  inspect(data.features[0],{add:mode==='select'});notice('Parcel information loaded.','good');
 }catch(e){notice('Parcel lookup failed: '+e.message,'error')}
}
async function lookupBBL(value){
 const b=String(value).trim();if(!/^[1-5]\d{9}$/.test(b))return notice('Enter a 10-digit NYC BBL starting with 1–5.','warn');
 notice('Searching for BBL '+b+'…');
 try{
  // MapPLUTO BBL is stored as a numeric field, not a string.
  const data=await request(apiLayer('lots'),{f:'geojson',where:'BBL = '+Number(b),outFields:'*',returnGeometry:true,outSR:4326,resultRecordCount:10});
  if(!data.features?.length)return notice('No MapPLUTO parcel found for this BBL.','warn');
  inspect(data.features[0]);focusFeatures(data.features);notice('Found BBL '+b,'good');
 }catch(e){notice('BBL search failed: '+e.message,'error')}
}
function bblFromGeosearch(f){
 const p=f.properties||{},a=p.addendum||{};
 const candidates=[a.pad?.bbl,a.bbl,p.pad_bbl,p.bbl];
 return candidates.find(v=>/^[1-5]\d{9}$/.test(String(v)))||null;
}
async function geocode(term,autocomplete=false,signal){
 return request(GEOSEARCH+(autocomplete?'autocomplete':'search'),{text:term,size:autocomplete?7:10},signal);
}
let autoController=null;
async function autocomplete(){
 const term=DOM('search').value.trim();const box=DOM('suggestions');
 if(autoController)autoController.abort();
 if(term.length<3||/^[0-9]{1,10}$/.test(term)){box.hidden=true;return}
 const id=++searchSeq;autoController=new AbortController();
 try{
  const data=await geocode(term,true,autoController.signal);
  if(id!==searchSeq)return;box.innerHTML='';
  for(const f of (data.features||[]).slice(0,7)){
   const btn=document.createElement('button');btn.type='button';btn.className='suggestion';
   btn.textContent=f.properties?.label||f.properties?.name||'Unnamed address';
   btn.onclick=()=>pickAddress(f);
   box.appendChild(btn);
  }
  box.hidden=!box.children.length;
 }catch(e){if(e.name!=='AbortError'){box.hidden=true;notice('Address suggestions unavailable; try searching a full address.','warn')}}
}
async function pickAddress(f){
 const label=f.properties?.label||f.properties?.name||'Address';
 DOM('search').value=label;DOM('suggestions').hidden=true;
 const coords=f.geometry?.coordinates;if(!coords)return;
 map.setView([coords[1],coords[0]],18);
 const b=bblFromGeosearch(f);if(b)await lookupBBL(String(b));
 else await inspectAt(L.latLng(coords[1],coords[0]));
}
async function runSearch(){
 const term=DOM('search').value.trim();DOM('suggestions').hidden=true;
 if(!term)return notice('Enter an address, place, or 10-digit BBL.','warn');
 if(/^\d{10}$/.test(term))return lookupBBL(term);
 notice('Searching NYC addresses…');
 try{
  const data=await geocode(term,false);
  if(!data.features?.length)return notice('No matching NYC address was found.','warn');
  await pickAddress(data.features[0]);
 }catch(e){notice('Address search failed: '+e.message,'error')}
}
function startDraw(type){
 if(!window.L.Draw)return notice('Drawing library did not load. Refresh and try again.','error');
 if(drawTool)drawTool.disable();
 const options={shapeOptions:{color:'#e77825',weight:2,fillColor:'#f9b273',fillOpacity:.18}};
 drawTool=type==='rectangle'?new L.Draw.Rectangle(map,options):new L.Draw.Polygon(map,{...options,showArea:true,allowIntersection:false});
 drawTool.enable();window.ZOLA_MOBILE_COLLAPSE?.();notice('Draw a '+(type==='rectangle'?'rectangle':'polygon')+' on the map. Double-click to finish a polygon.','info');
}
async function selectByGeometry(feature){
 if(selectionBusy)return;
 selectionBusy=true;DOM('selection-progress').textContent='Finding intersecting lots…';
 const geom=feature.geometry;
 const esri={rings:geom.coordinates,spatialReference:{wkid:4326}};
 const filter={where:'1=1',geometry:JSON.stringify(esri),geometryType:'esriGeometryPolygon',spatialRel:'esriSpatialRelIntersects',inSR:4326};
 try{
  const ids=await request(apiLayer('lots'),{f:'json',...filter,returnIdsOnly:true,returnGeometry:false});
  const all=ids.objectIds||[];
  if(!all.length){notice('No tax lots intersect the drawn area.','warn');return}
  if(all.length>15000){notice(FORMAT.format(all.length)+' lots intersect the drawing. Divide the area for browser performance.','warn');return}
  DOM('selection-progress').textContent='Loading '+FORMAT.format(all.length)+' lots…';
  const batches=[];for(let i=0;i<all.length;i+=150)batches.push(all.slice(i,i+150));
  let completed=0;
  for(let i=0;i<batches.length;i+=4){
   const result=await Promise.all(batches.slice(i,i+4).map(ids=>request(apiLayer('lots'),{f:'geojson',where:'1=1',objectIds:ids.join(','),outFields:'*',outSR:4326,returnGeometry:true})));
   for(const data of result)for(const f of data.features||[]){const b=bblOf(f);if(b)selected.set(b,f)}
   completed+=result.reduce((n,d)=>n+(d.features?.length||0),0);
   DOM('selection-progress').textContent='Loaded '+FORMAT.format(completed)+' / '+FORMAT.format(all.length)+' lots';
  }
  renderSelected();showPanel('selected');window.ZOLA_MOBILE_OPEN?.();notice(FORMAT.format(completed)+' tax lots added to your selection.','good');
 }catch(e){notice('Area selection failed: '+e.message,'error')}
 finally{selectionBusy=false;DOM('selection-progress').textContent=''}
}
function csvCell(v){
 let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function exportSelection(){
 if(!selected.size)return notice('Select one or more lots before exporting.','warn');
 const headers=['BBL','Address','Borough','Block','Lot','LotArea','ZoneDist1','ZoneDist2','Overlay1','SPDist1','LandUse','BldgArea','BuiltFAR','ResidFAR','CommFAR','FacilFAR','UnitsRes','Version'];
 const lines=[headers.join(','),...[...selected.values()].map(f=>headers.map(k=>csvCell(k==='BBL'?bblOf(f):f.properties?.[k])).join(','))];
 const u=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=u;a.download='zola-backup-selected-lots.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);
 notice('CSV exported with '+FORMAT.format(selected.size)+' lots.','good');
}
function updateScenario(){
 const area=[...selected.values()].reduce((n,f)=>n+(Number(f.properties?.LotArea)||0),0);
 const far=Number(DOM('assumed-far')?.value||0);
 DOM('scenario-area').textContent=fmt(area)+' sq ft';
 DOM('scenario-floor').textContent=Number.isFinite(far)&&far>=0?fmt(area*far)+' sq ft':'Enter a valid FAR';
 DOM('scenario-count').textContent=selected.size;
}
async function shareLot(b){
 const u=new URL(location.href);u.searchParams.set('bbl',b);
 try{await navigator.clipboard.writeText(u.href);notice('Property link copied.','good')}
 catch(e){window.prompt('Copy property link',u.href)}
}
function bindControls(){
 for(const key of Object.keys(flags)){const input=DOM('layer-'+key);if(input)input.onchange=onFlagsChange}
 DOM('search-button').onclick=runSearch;DOM('search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runSearch()}if(e.key==='Escape')DOM('suggestions').hidden=true};
 DOM('search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(autocomplete,350)};
 DOM('tab-explore').onclick=()=>showPanel('explore');DOM('tab-selected').onclick=()=>showPanel('selected');DOM('tab-scenario').onclick=()=>showPanel('scenario');
 DOM('inspect-mode').onclick=()=>selectMode('inspect');DOM('select-mode').onclick=()=>selectMode('select');
 DOM('draw-polygon').onclick=()=>startDraw('polygon');DOM('draw-rectangle').onclick=()=>startDraw('rectangle');
 DOM('export').onclick=exportSelection;DOM('clear').onclick=()=>{selected.clear();renderSelected();notice('Selection cleared.','info')};
 DOM('zoom-selection').onclick=()=>focusFeatures([...selected.values()]);
 DOM('assumed-far').oninput=updateScenario;
 DOM('home').onclick=()=>map.fitBounds([[40.49,-74.27],[40.94,-73.68]]);
 const boroughs={manhattan:[40.756,-73.98,14],bronx:[40.846,-73.888,13],brooklyn:[40.674,-73.95,14],queens:[40.736,-73.81,13],staten:[40.584,-74.148,13]};
 for(const [name,[lat,lng,zoom]] of Object.entries(boroughs))DOM('goto-'+name).onclick=()=>map.setView([lat,lng],zoom);
 document.addEventListener('click',e=>{if(!e.target.closest('.search-field'))DOM('suggestions').hidden=true});
 DOM('info-button').onclick=()=>DOM('about-modal').showModal();DOM('about-close').onclick=()=>DOM('about-modal').close();
}
function start(){
 map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([40.674,-73.955],14);
 L.control.zoom({position:'topleft'}).addTo(map);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OpenStreetMap contributors · NYC DCP public GIS data',
  maxNativeZoom:19,maxZoom:20,updateWhenIdle:true
 }).addTo(map);
 createLayers();window.setupLayerExplorer?.(map);bindControls();window.ZOLA_MOBILE_INSTALL?.(map);updateMapLegend();selectMode('inspect');renderSelected();
 map.on('moveend',refreshMap);
 map.on('click',e=>{if(drawTool?.enabled?.()||selectionBusy)return;inspectAt(e.latlng)});
 map.on('draw:created',e=>{if(drawTool)drawTool.disable();drawHighlight.clearLayers();drawHighlight.addLayer(e.layer);selectByGeometry(e.layer.toGeoJSON())});
 const url=new URL(location.href),bbl=url.searchParams.get('bbl');if(bbl)lookupBBL(bbl);
 refreshMap();
 notice('Ready. Search an address or click a tax lot. Zoom in for lot boundaries.','good');
}
window.addEventListener('DOMContentLoaded',start);
