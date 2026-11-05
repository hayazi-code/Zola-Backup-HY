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
// Independent, fill-only display controls; lines, labels, and pointer hit-testing are unchanged.
const layerFillOpacity={zoning:0.59,landuse:0.60};
const lotOutlineSettings={visible:true,color:'gray',weight:1};
const LOT_OUTLINE_COLORS=Object.freeze({red:'#dc3545',purple:'#7543a0',gray:'#55525b'});
const LANDUSE_STANDARD_URL='https://www.nyc.gov/assets/planning/download/pdf/applicants/applicant-portal/area_map_standard.pdf';
const FORMAT=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fmt=v=>Number.isFinite(Number(v))&&v!==''&&v!=null?FORMAT.format(Number(v)):'Not available';
const bblOf=f=>{const p=f?.properties||f||{};if(p.BBL==null)return '';return String(Math.trunc(Number(p.BBL))).padStart(10,'0')};
const boroughOf=b=>({'1':'Manhattan','2':'Bronx','3':'Brooklyn','4':'Queens','5':'Staten Island'})[String(b)[0]]||'NYC';
const apiLayer=key=>SERVICE_ROOT+URLS[key]+'/FeatureServer/0/query';
let map,inspectLayer;
const layerGroups={},requests={};
let currentParcel=null,searchTimer=null,searchSeq=0,loadTimer=null,parcelPreview=null;
let parcelLookupSeq=0,parcelLookupController=null;
const flags={zoning:true,commercial:false,special:false,subdistrict:false,mih:false,lots:true,landuse:false};
let toggleToken=0;

function notice(message,kind='info'){
 const n=DOM('status');n.textContent=message;n.dataset.kind=kind;
}
function signalLight(key,text,kind=''){
 const n=DOM('state-'+key);if(!n)return;n.textContent=text;n.dataset.kind=kind;
}
async function request(url,params={},signal,options={}){
 return window.ZOLA_GIS.request(url,params,signal,{cache:true,...options});
}

function extent(){const b=map.getBounds();return JSON.stringify({xmin:b.getWest(),ymin:b.getSouth(),xmax:b.getEast(),ymax:b.getNorth(),spatialReference:{wkid:4326}})}
function gisParams(geometry,geometryType){
 return {f:'geojson',where:'1=1',geometry,geometryType,inSR:4326,outSR:4326,spatialRel:'esriSpatialRelIntersects',returnGeometry:true};
}
const zoneColor=z=>{z=String(z||'');return z.startsWith('R')?'#f7d88c':z.startsWith('C')?'#eca3a6':z.startsWith('M')?'#b9a0cd':'#b6d8cd'};
const layerStyles={
 zoning:f=>({color:'#957d89',weight:.8,fillColor:zoneColor(f.properties?.ZONEDIST),fillOpacity:layerFillOpacity.zoning}),
 commercial:()=>({color:'#ce4f75',weight:1.4,fillColor:'#f18eb4',fillOpacity:.24,dashArray:'4 3'}),
 special:()=>({color:'#544091',weight:2,fillColor:'#c8b9e8',fillOpacity:.08,dashArray:'6 4'}),
 subdistrict:()=>({color:'#8e55b1',weight:1.4,fillColor:'#d7b5e8',fillOpacity:.08,dashArray:'2 5'}),
 mih:()=>({color:'#2d997e',weight:2.2,fillColor:'#80d8ba',fillOpacity:.13,dashArray:'6 3'}),
 lots:f=>({color:LOT_OUTLINE_COLORS[lotOutlineSettings.color],weight:lotOutlineSettings.weight,opacity:(flags.lots||flags.landuse)&&lotOutlineSettings.visible?1:0,fillColor:flags.landuse?(LOT_COLORS[String(f.properties?.LandUse??'').padStart(2,'0')]||UNKNOWN_LANDUSE_COLOR):'#fff',fillOpacity:flags.landuse?layerFillOpacity.landuse:0})
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
    if(key==='lots')l.on('click',e=>{L.DomEvent.stopPropagation(e.originalEvent);showParcelPreview(f,e.latlng)});
    else l.on('click',e=>{L.DomEvent.stopPropagation(e.originalEvent);inspectAt(e.latlng)});
   }
  });
 }
 // Ordering matters: zoning below thematic overlays and selectable lot outlines.
 for(const key of Object.keys(URLS))layerGroups[key].addTo(map);
 map.createPane('spatialAnalysisPane');map.getPane('spatialAnalysisPane').style.zIndex='425';map.getPane('spatialAnalysisPane').style.pointerEvents='none';
 map.createPane('analysisHighlightPane');map.getPane('analysisHighlightPane').style.zIndex='445';map.getPane('analysisHighlightPane').style.pointerEvents='none';
 inspectLayer=L.geoJSON(null,{pane:'analysisHighlightPane',style:{color:'#4b277e',weight:3,fillColor:'#8b6bb7',fillOpacity:.16},interactive:false}).addTo(map);
}
// Update rendered feature styles in place: no network fetch, geometry replacement or click-handler change.
window.ZOLA_SET_FILL_OPACITY=(type,percent)=>{
 if(!Object.prototype.hasOwnProperty.call(layerFillOpacity,type))return;
 const value=Number(percent);
 if(!Number.isFinite(value))return;
 layerFillOpacity[type]=Math.max(0,Math.min(100,value))/100;
 if(type==='zoning')layerGroups.zoning?.setStyle(layerStyles.zoning);
 else layerGroups.lots?.setStyle(layerStyles.lots);
};
// Fill and stroke styling is independent of parcel geometry and its inspection click events.
window.ZOLA_SET_LOT_OUTLINE=(patch={})=>{
 if(Object.hasOwn(patch,'visible'))lotOutlineSettings.visible=Boolean(patch.visible);
 if(Object.hasOwn(patch,'color')&&Object.hasOwn(LOT_OUTLINE_COLORS,patch.color))lotOutlineSettings.color=patch.color;
 if(Object.hasOwn(patch,'weight')){
  const weight=Number(patch.weight);
  if(Number.isFinite(weight))lotOutlineSettings.weight=Math.max(1,Math.min(5,weight));
 }
 layerGroups.lots?.setStyle(layerStyles.lots);
 bringHighlights();
};
function bringHighlights(){layerGroups.lots.bringToFront();inspectLayer.bringToFront()}
window.ZOLA_RESTORE_PARCEL_HIGHLIGHTS=()=>bringHighlights();
function checkLayer(key){return key==='lots'?(flags.lots||flags.landuse||Boolean(window.ZOLA_SPATIAL_ACTIVE?.())):flags[key]}
async function refreshLayer(key){
 const group=layerGroups[key],prior=requests[key];if(prior)prior.abort();
 const ac=new AbortController();requests[key]=ac;
 if(!checkLayer(key)){group.clearLayers();if(key==='lots')window.ZOLA_SPATIAL_ON_LOTS?.([],false);signalLight(key,'Off');return}
 if(map.getZoom()<BASE[key]){group.clearLayers();if(key==='lots')window.ZOLA_SPATIAL_ON_LOTS?.([],false);signalLight(key,'Zoom in');return}
 signalLight(key,'Loading…');
 const query={...gisParams(extent(),'esriGeometryEnvelope'),outFields:FIELDS[key],resultRecordCount:2000,resultOffset:0};
 const features=[];
 try{
  // Map rendering has a bounded result budget; a tighter map extent loads more.
  const pages=window.matchMedia('(max-width: 740px)').matches?1:3;
  for(let i=0;i<pages;i++){
   query.resultOffset=i*2000;
   const data=await request(apiLayer(key),query,ac.signal);
   const batch=data.features||[];features.push(...batch);
   if(batch.length<2000&&!data.exceededTransferLimit)break;
  }
  if(ac.signal.aborted)return;
  const visible=features.filter(f=>!window.ZOLA_VISIBLE_FEATURE||window.ZOLA_VISIBLE_FEATURE(key,f));
  group.clearLayers();group.addData({type:'FeatureCollection',features:visible});
  if(key==='lots'){group.setStyle(layerStyles.lots);window.ZOLA_SPATIAL_ON_LOTS?.(visible,features.length>=pages*2000)}
  bringHighlights();
  window.ZOLA_BRING_TRANSIT_FORWARD?.();
  const clipped=features.length>=pages*2000;
  signalLight(key,clipped?'Zoom in for complete coverage':FORMAT.format(visible.length)+' shown',clipped?'warn':'good');
 }catch(e){
  if(e.name==='AbortError')return;
  group.clearLayers();if(key==='lots')window.ZOLA_SPATIAL_ON_LOTS?.([],false,'Parcel data unavailable');signalLight(key,'Unavailable','error');
  notice(titles[key]+' layer: '+e.message,'error');
 }
}
window.ZOLA_RELOAD_CORE=key=>{if(Object.hasOwn(URLS,key))refreshLayer(key)};
function refreshMap(){
 clearTimeout(loadTimer);loadTimer=setTimeout(()=>{
  for(const key of Object.keys(URLS))refreshLayer(key);
 },260);
}
// The legend's visibility is independent of map layers and survives legend-content rebuilds.
function setLegendExpanded(expanded){
 const legend=DOM('map-key'),button=DOM('map-key-toggle'),content=DOM('map-key-content');
 if(!legend||!button||!content)return;
 legend.classList.toggle('is-collapsed',!expanded);
 content.hidden=!expanded;
 button.setAttribute('aria-expanded',String(expanded));
 button.setAttribute('aria-label',expanded?'Hide map legend':'Show map legend');
 const icon=button.querySelector('.map-key-chevron');
 if(icon)icon.textContent=expanded?'⌃':'⌄';
}
function setupLegendToggle(){
 const button=DOM('map-key-toggle');
 if(!button)return;
 // On small screens start compact to avoid covering the map and location controls.
 setLegendExpanded(!window.matchMedia('(max-width: 740px)').matches);
 button.addEventListener('click',()=>setLegendExpanded(button.getAttribute('aria-expanded')!=='true'));
}
function updateMapLegend(){
 const host=DOM('map-key-content');if(!host)return;
 if(flags.landuse){
  host.innerHTML='<strong>Land Use · NYC DCP Standard</strong>'+
   '<div class="landuse-key-grid">'+
   Array.from({length:11},(_,i)=>String(i+1).padStart(2,'0')).map(code=>[code,LOT_COLORS[code]]).map(([code,hex])=>
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
// A lightweight map preview uses the already-loaded MapPLUTO feature for direct parcel clicks.
// Other map layers can still request a parcel by point. Escaped text avoids HTML injection.
function highlightParcel(f){
 currentParcel=f;
 inspectLayer.clearLayers();
 inspectLayer.addData(f);
 bringHighlights();
}
function cancelParcelLookup(){
 ++parcelLookupSeq;
 parcelLookupController?.abort();
 parcelLookupController=null;
}
function showParcelPreview(f,latlng,{fromLookup=false}={}){
 if(!fromLookup)cancelParcelLookup();
 if(!f?.properties)return;
 highlightParcel(f);
 const p=f.properties,b=bblOf(f);
 const card=document.createElement('div');
 card.className='parcel-preview-card';
 const heading=document.createElement('div');heading.className='parcel-preview-eyebrow';heading.textContent='MAPPLUTO · QUICK PREVIEW';
 const name=document.createElement('h3');name.textContent=p.Address||'Unnamed tax lot';
 const number=document.createElement('p');number.className='parcel-preview-bbl';number.textContent='BBL '+(b||'Unavailable')+' · '+boroughOf(b);
 const grid=document.createElement('dl');grid.className='parcel-preview-grid';
 const landuse=String(p.LandUse??'').padStart(2,'0');
 const zone=[p.ZoneDist1,p.ZoneDist2,p.ZoneDist3,p.ZoneDist4].filter(Boolean).join(', ')||'Not available';
 const values=[
  ['Zoning',zone],
  ['Land use',LOT_USES[landuse]?landuse+' · '+LOT_USES[landuse]:'Not available'],
  ['Lot area',p.LotArea==null||p.LotArea===''?'Not available':fmt(p.LotArea)+' sq ft'],
  ['Built FAR',p.BuiltFAR==null||p.BuiltFAR===''?'Not available':String(p.BuiltFAR)]
 ];
 for(const [label,value] of values){
  const cell=document.createElement('div');
  const dt=document.createElement('dt');dt.textContent=label;
  const dd=document.createElement('dd');dd.textContent=value;
  cell.append(dt,dd);grid.append(cell);
 }
 const action=document.createElement('button');action.type='button';action.className='parcel-preview-details';action.textContent='View full details';
 action.addEventListener('click',()=>{
  map.closePopup(parcelPreview);
  inspect(f);
 });
 card.append(heading,name,number,grid,action);
 if(parcelPreview)map.closePopup(parcelPreview);
 // Anchor at the clicked location, not at a fabricated parcel centroid.
 parcelPreview=L.popup({className:'parcel-quick-popup',maxWidth:310,minWidth:255,autoPan:true,
  autoPanPaddingTopLeft:[18,65],autoPanPaddingBottomRight:[18,window.matchMedia('(max-width: 740px)').matches?115:25]})
  .setLatLng(latlng||L.geoJSON(f).getBounds().getCenter()).setContent(card);
 parcelPreview.openOn(map);
 notice('Parcel preview loaded. Choose View full details to open the property panel.','good');
}
function inspect(f){
 highlightParcel(f);
 const p=f.properties||{},b=bblOf(f),zones=[p.ZoneDist1,p.ZoneDist2,p.ZoneDist3,p.ZoneDist4].filter(Boolean);
 const row=(title,value)=>'<div class="detail-row"><span>'+safe(title)+'</span><strong>'+safe(value==null||value===''?'Not available':value)+'</strong></div>';
 let html='<div class="parcel-heading"><span class="eyebrow">Selected tax lot</span><h2>'+safe(p.Address||'Unnamed tax lot')+'</h2><div>'+safe(boroughOf(b))+' · BBL '+safe(b)+'</div></div>';
 html+='<div class="chips">'+zones.map(z=>'<span class="chip">'+safe(z)+'</span>').join('');
 if(p.Overlay1)html+='<span class="chip overlay">'+safe(p.Overlay1)+'</span>';html+='</div>';
 html+='<h4>Zoning and land use</h4>'+row('Zoning districts',zones.join(', '))+row('Commercial overlays',[p.Overlay1,p.Overlay2].filter(Boolean).join(', '))+row('Special districts',[p.SPDist1,p.SPDist2].filter(Boolean).join(', '))+row('Split zoning',p.SplitZone==='Y'?'Yes':p.SplitZone==='N'?'No':p.SplitZone)+row('Land use',LOT_USES[String(p.LandUse||'').padStart(2,'0')]||p.LandUse);
 html+='<h4>Tax lot and buildings</h4>'+row('BBL',b)+row('Block / lot',p.Block+' / '+p.Lot)+row('Lot area (sq ft)',fmt(p.LotArea))+row('Building area (sq ft)',fmt(p.BldgArea))+row('Buildings',fmt(p.NumBldgs))+row('Floors',p.NumFloors)+row('Residential units',fmt(p.UnitsRes))+row('Total units',fmt(p.UnitsTotal))+row('Year built',p.YearBuilt);
 html+='<h4>Reported FAR values (MapPLUTO)</h4>'+row('Built FAR',p.BuiltFAR)+row('Residential FAR',p.ResidFAR)+row('Commercial FAR',p.CommFAR)+row('Community facility FAR',p.FacilFAR);
 html+='<p class="small-note">FAR fields are MapPLUTO attributes, not a definitive zoning entitlement. Verify district rules and special conditions.</p>';
 html+='<div class="action-row"><button id="property-zoom">Zoom to lot</button><button id="property-share">Share</button></div>';
 html+='<p class="source-line">MapPLUTO version: '+safe(p.Version||'unspecified')+' · <a target="_blank" rel="noopener" href="https://zola.planning.nyc.gov/bbl/'+encodeURIComponent(b)+'">Official ZoLa</a></p>';
 DOM('property-info').innerHTML=html;
 DOM('property-zoom').onclick=()=>focusFeatures([f]);
 DOM('property-share').onclick=()=>shareLot(b);
 window.ZOLA_MOBILE_OPEN?.();
 if(window.matchMedia('(max-width: 740px)').matches)requestAnimationFrame(()=>DOM('property-info')?.scrollIntoView({block:'start',behavior:'smooth'}));
}
function focusFeatures(features){if(!features.length)return;const b=L.geoJSON({type:'FeatureCollection',features}).getBounds();if(b.isValid())map.fitBounds(b.pad(.5),{maxZoom:18})}
async function inspectAt(latlng){
 const seq=++parcelLookupSeq;
 parcelLookupController?.abort();
 const controller=new AbortController();parcelLookupController=controller;
 notice('Looking up tax lot…');
 try{
  const geom=JSON.stringify({x:latlng.lng,y:latlng.lat,spatialReference:{wkid:4326}});
  const data=await request(apiLayer('lots'),{f:'geojson',where:'1=1',outFields:'*',returnGeometry:true,outSR:4326,inSR:4326,geometry:geom,geometryType:'esriGeometryPoint',spatialRel:'esriSpatialRelIntersects',resultRecordCount:10},controller.signal,{priority:2});
  if(controller.signal.aborted||seq!==parcelLookupSeq)return;
  if(!data.features?.length)return notice('No mapped tax lot at this location.','warn');
  showParcelPreview(data.features[0],latlng,{fromLookup:true});
 }catch(e){if(e.name!=='AbortError'&&seq===parcelLookupSeq)notice('Parcel lookup failed: '+e.message,'error')}
}
async function lookupBBL(value){
 const b=String(value).trim();
 if(!/^[1-5]\d{9}$/.test(b))return notice('Enter a 10-digit NYC BBL starting with 1–5.','warn');
 const seq=++parcelLookupSeq;
 parcelLookupController?.abort();
 const controller=new AbortController();parcelLookupController=controller;
 notice('Searching for BBL '+b+'…');
 try{
  const data=await request(apiLayer('lots'),{f:'geojson',where:'BBL = '+Number(b),outFields:'*',returnGeometry:true,outSR:4326,resultRecordCount:10},controller.signal,{priority:2});
  if(controller.signal.aborted||seq!==parcelLookupSeq)return;
  if(!data.features?.length)return notice('No MapPLUTO parcel found for this BBL.','warn');
  inspect(data.features[0]);focusFeatures(data.features);notice('Found BBL '+b,'good');
 }catch(e){if(e.name!=='AbortError'&&seq===parcelLookupSeq)notice('BBL search failed: '+e.message,'error')}
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
async function shareLot(b){
 const u=new URL(location.href);u.searchParams.set('bbl',b);
 try{await navigator.clipboard.writeText(u.href);notice('Property link copied.','good')}
 catch(e){window.prompt('Copy property link',u.href)}
}
function updateNetworkMetrics(){
 const api=window.ZOLA_GIS,host=DOM('network-metrics');
 if(!api||!host)return;
 const m=api.stats;
 host.textContent=m.network+' network requests · '+m.cacheHits+' cache hits · '+m.retries+' retries · '+m.failures+' failed · '+api.cacheSize()+' cached responses · peak '+m.peakActive+'/'+api.config.concurrency+' concurrent';
}
// Location remains in the browser's memory. It is never placed in a URL or submitted to GIS services.
// Geolocation is requested only after the user presses Locate me.
const userLocation={watchId:null,marker:null,accuracy:null,point:null,firstFix:true};
function updateLocateUI(active){
 const button=DOM('locate-me'),label=DOM('locate-me-label'),center=DOM('recenter-me');
 if(!button||!label)return;
 button.setAttribute('aria-pressed',String(active));
 button.setAttribute('aria-label',active?'Stop showing my location':'Show my current location on the map');
 button.classList.toggle('is-active',active);
 label.textContent=active?'Stop locating':'Locate me';
 if(center)center.hidden=!(active&&userLocation.point);
}
function stopLocation(message){
 if(userLocation.watchId!==null){
  navigator.geolocation?.clearWatch(userLocation.watchId);
  userLocation.watchId=null;
 }
 if(userLocation.marker){map.removeLayer(userLocation.marker);userLocation.marker=null}
 if(userLocation.accuracy){map.removeLayer(userLocation.accuracy);userLocation.accuracy=null}
 userLocation.point=null;userLocation.firstFix=true;
 updateLocateUI(false);
 if(message)notice(message,'info');
}
function onLocationFix(position){
 const {latitude,longitude,accuracy}=position.coords;
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return;
 const point=L.latLng(latitude,longitude);
 userLocation.point=point;
 const radius=Number.isFinite(accuracy)?Math.max(0,accuracy):0;
 if(!userLocation.accuracy){
  userLocation.accuracy=L.circle(point,{radius,color:'#2f7de1',weight:1,opacity:.42,fillColor:'#4c9fff',fillOpacity:.12,interactive:false}).addTo(map);
 }else userLocation.accuracy.setLatLng(point).setRadius(radius);
 if(!userLocation.marker){
  userLocation.marker=L.marker(point,{icon:L.divIcon({className:'user-location-icon',html:'<span class="user-location-dot"></span>',iconSize:[24,24],iconAnchor:[12,12]}),keyboard:false,interactive:false,zIndexOffset:900}).addTo(map);
 }else userLocation.marker.setLatLng(point);
 userLocation.marker.bringToFront?.();
 if(userLocation.firstFix){
  userLocation.firstFix=false;
  map.setView(point,Math.max(map.getZoom(),16));
 }
 updateLocateUI(true);
 notice('Location shown (approximately ±'+Math.round(radius)+' m). Tap the center button to return to it.','good');
}
function onLocationError(error){
 const reason=error.code===1?'Location permission denied. Enable location access for this site in your browser settings.':
  error.code===2?'Your device could not determine its location.':
  error.code===3?'Location request timed out. Try again.':
  'Location could not be obtained.';
 stopLocation();
 notice(reason,'warn');
}
function toggleLocation(){
 if(userLocation.watchId!==null){stopLocation('Location tracking stopped.');return}
 if(!window.isSecureContext){notice('Location requires HTTPS or a secure browser context.','warn');return}
 if(!navigator.geolocation){notice('This browser does not support location access.','warn');return}
 userLocation.firstFix=true;
 notice('Requesting permission to show your location…');
 updateLocateUI(true);
 try{
  userLocation.watchId=navigator.geolocation.watchPosition(onLocationFix,onLocationError,{enableHighAccuracy:true,maximumAge:12000,timeout:20000});
 }catch(e){
  stopLocation();notice('Could not start location tracking: '+e.message,'error');
 }
}
// Build 34: rotate the Leaflet map itself, so GeoJSON parcel geometry and click hit-testing
// share the same coordinate transform as tiles and labels. No DOM-only map transforms.
const orientationState={heading:false,lastHeading:null,lastSensorAt:0,previousAt:0,sensorTimer:null};
const normalizeBearing=n=>(Math.round(n)%360+360)%360;
function setOrientationMessage(message){const n=DOM('orientation-message');if(n)n.textContent=message}
function updateOrientationBearing(){
 const angle=typeof map.getBearing==='function'?normalizeBearing(map.getBearing()):0;
 const output=DOM('orientation-bearing'),slider=DOM('orientation-angle');
 if(output)output.textContent=angle+'°';
 if(slider&&document.activeElement!==slider)slider.value=String(angle);
}
function stopCompassHeading(message){
 if(!orientationState.heading)return;
 orientationState.heading=false;
 window.removeEventListener('deviceorientation',onCompassOrientation);
 window.removeEventListener('deviceorientationabsolute',onCompassOrientation);
 if(orientationState.sensorTimer){clearTimeout(orientationState.sensorTimer);orientationState.sensorTimer=null}
 map.stopHeadingUp?.();
 const b=DOM('orientation-heading-toggle');
 if(b){b.setAttribute('aria-pressed','false');b.textContent='Follow compass'}
 if(message)setOrientationMessage(message);
}
function onCompassOrientation(event){
 if(!orientationState.heading)return;
 // iOS webkitCompassHeading is a north-referenced bearing. Non-absolute
 // alpha values have an arbitrary origin and must not be mistaken for true north.
 let heading=null;
 if(Number.isFinite(event.webkitCompassHeading)){
  if(Number.isFinite(event.webkitCompassAccuracy)&&event.webkitCompassAccuracy<0)return;
  heading=event.webkitCompassHeading;
 }else if(event.absolute===true&&Number.isFinite(event.alpha)){
  // Absolute alpha is counterclockwise from North; compensate for screen rotation.
  const screenAngle=Number(screen.orientation?.angle)||0;
  heading=(360-event.alpha+screenAngle)%360;
 }
 if(heading===null)return;
 const now=Date.now();
 if(now-orientationState.previousAt<80)return; // cap updates to limit GIS redraw work
 orientationState.previousAt=now;
 orientationState.lastSensorAt=now;
 orientationState.lastHeading=normalizeBearing(heading);
 map.setHeading?.(orientationState.lastHeading,{ease:0.12,deadzone:1.5});
 setOrientationMessage('Following compass · '+orientationState.lastHeading+'° · tap North up to stop');
}
async function toggleCompassHeading(){
 if(orientationState.heading){stopCompassHeading('Compass stopped. Rotate manually with two fingers or slider.');return}
 if(typeof map.setHeading!=='function'){setOrientationMessage('Rotation extension unavailable; compass mode cannot start.');return}
 if(!window.isSecureContext||typeof window.DeviceOrientationEvent==='undefined'){
  setOrientationMessage('Device orientation requires HTTPS and a supported motion sensor. Manual rotation remains available.');return;
 }
 // iPhone Safari only permits requestPermission in direct response to a user tap.
 const EventType=window.DeviceOrientationEvent;
 if(typeof EventType.requestPermission==='function'){
  try{
   const permission=await EventType.requestPermission();
   if(permission!=='granted'){setOrientationMessage('Compass permission denied. You can still rotate manually.');return}
  }catch(err){setOrientationMessage('Compass access was blocked. Check Safari motion permissions or rotate manually.');return}
 }
 orientationState.heading=true;orientationState.previousAt=0;orientationState.lastSensorAt=0;
 const b=DOM('orientation-heading-toggle');
 if(b){b.setAttribute('aria-pressed','true');b.textContent='Stop compass'}
 // Listen to both, but throttle duplicate events and refuse non-absolute headings.
 window.addEventListener('deviceorientation',onCompassOrientation);
 window.addEventListener('deviceorientationabsolute',onCompassOrientation);
 setOrientationMessage('Waiting for an accurate compass heading…');
 orientationState.sensorTimer=setTimeout(()=>{
  if(orientationState.heading&&!orientationState.lastSensorAt){
   stopCompassHeading('No north-referenced compass readings available. Use manual rotation.');
  }
 },6500);
}
function bindOrientationControls(){
 const trigger=DOM('orientation-toggle'),panel=DOM('orientation-panel');
 if(!trigger||!panel)return;
 const supported=typeof map.setBearing==='function'&&typeof map.getBearing==='function';
 if(!supported){
  trigger.disabled=true;trigger.title='Map rotation could not load';
  return;
 }
 trigger.onclick=()=>{
  panel.hidden=!panel.hidden;
  trigger.setAttribute('aria-expanded',String(!panel.hidden));
 };
 DOM('orientation-angle').addEventListener('input',e=>{
  stopCompassHeading('Manual rotation active.');
  map.setBearing(Number(e.target.value));
  updateOrientationBearing();
 });
 DOM('orientation-north').onclick=()=>{
  stopCompassHeading('North is up.');
  map.setBearing(0);
  updateOrientationBearing();
 };
 DOM('orientation-heading-toggle').onclick=toggleCompassHeading;
 map.on('rotate',updateOrientationBearing);
 map.on('rotatestart',()=>stopCompassHeading('Manual rotation active.'));
 updateOrientationBearing();
}
function bindControls(){
 DOM('locate-me').onclick=toggleLocation;
 DOM('recenter-me').onclick=()=>{if(userLocation.point)map.setView(userLocation.point,Math.max(16,map.getZoom()))};
 for(const key of Object.keys(flags)){const input=DOM('layer-'+key);if(input)input.onchange=onFlagsChange}
 DOM('search-button').onclick=runSearch;DOM('search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runSearch()}if(e.key==='Escape')DOM('suggestions').hidden=true};
 DOM('search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(autocomplete,350)};
 DOM('home').onclick=()=>map.fitBounds([[40.49,-74.27],[40.94,-73.68]]);
 const boroughs={manhattan:[40.756,-73.98,14],bronx:[40.846,-73.888,13],brooklyn:[40.674,-73.95,14],queens:[40.736,-73.81,13],staten:[40.584,-74.148,13]};
 for(const [name,[lat,lng,zoom]] of Object.entries(boroughs))DOM('goto-'+name).onclick=()=>map.setView([lat,lng],zoom);
 document.addEventListener('click',e=>{if(!e.target.closest('.search-field'))DOM('suggestions').hidden=true});
 DOM('info-button').onclick=()=>{updateNetworkMetrics();DOM('about-modal').showModal()};
 DOM('clear-gis-cache').onclick=()=>{window.ZOLA_GIS?.clearCache();updateNetworkMetrics();notice('Temporary GIS cache cleared. New map requests will fetch fresh public data.','good')};
 DOM('about-close').onclick=()=>DOM('about-modal').close();
}
function start(){
 map=L.map('map',{zoomControl:false,preferCanvas:true,rotate:true,touchRotate:true,dragRotate:true,shiftKeyRotate:true,rotateControl:false,bearing:0}).setView([40.674,-73.955],14);
 L.control.zoom({position:'topleft'}).addTo(map);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OpenStreetMap contributors · NYC DCP public GIS data',
  maxNativeZoom:19,maxZoom:20,updateWhenIdle:true
 }).addTo(map);
 createLayers();window.setupSpatialAnalysis?.(map,layerGroups);window.setupLayerExplorer?.(map);bindControls();bindOrientationControls();setupLegendToggle();window.ZOLA_MOBILE_INSTALL?.(map);updateMapLegend();
 map.on('moveend',refreshMap);
 map.on('click',e=>inspectAt(e.latlng));
 const url=new URL(location.href),bbl=url.searchParams.get('bbl');if(bbl)lookupBBL(bbl);
 refreshMap();
 notice('Ready. Search an address or click a tax lot. Zoom in for lot boundaries.','good');
}
window.addEventListener('DOMContentLoaded',start);
