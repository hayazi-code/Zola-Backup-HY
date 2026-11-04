/* Extended ZoLa-inspired layer explorer; all data from publicly listed NYC GIS services. */
(function(){
'use strict';
const ROOT='https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/';
const Z=(id,name,opts={})=>({id,name,group:'Zoning and land use',minZoom:13,...opts});
const S=(id,name,opts={})=>({id,name,group:'Supporting zoning layers',minZoom:12,...opts});
const O=(id,name,opts={})=>({id,name,group:'Other supporting layers',minZoom:12,...opts});
const A=(id,name,opts={})=>({id,name,group:'Administrative boundaries',minZoom:11,...opts});
const T=(id,name,opts={})=>({id,name,group:'Transportation',minZoom:13,...opts});
const ITEMS=[
 Z('lots','Tax lots',{core:'lots',source:'MAPPLUTO',minZoom:16,checked:true}),
 Z('landuse','Show land use colors',{core:'landuse',source:'MAPPLUTO',minZoom:16}),
 Z('zoning','Zoning districts',{core:'zoning',source:'nyzd',checked:true,color:'#f7d88c'}),
 Z('c-zones','Commercial zoning districts',{source:'nyzd',where:"ZONEDIST LIKE 'C%'",field:'ZONEDIST',color:'#e78c93',minZoom:12}),
 Z('m-zones','Manufacturing zoning districts',{source:'nyzd',where:"ZONEDIST LIKE 'M%'",field:'ZONEDIST',color:'#ab90c4',minZoom:12}),
 Z('commercial','Commercial overlays',{core:'commercial',source:'nyco',minZoom:14,color:'#ce4f75'}),
 Z('c1-overlays','C1 commercial overlays',{source:'nyco',where:"OVERLAY LIKE 'C1-%'",field:'OVERLAY',color:'#f09caa',minZoom:14}),
 Z('c2-overlays','C2 commercial overlays',{source:'nyco',where:"OVERLAY LIKE 'C2-%'",field:'OVERLAY',color:'#de608d',minZoom:14}),
 Z('zoning-index','Zoning map index',{source:'Zoning_Index_Map',layer:0,field:'',minZoom:11,color:'#536cb2',outline:true}),
 Z('zma','Zoning map amendments',{source:'nyzma',minZoom:12,color:'#ed8a38',outline:true}),
 Z('certified-zma','Certified (pending) map amendments',{source:'nyzma',where:"STATUS = 'Certified'",field:'PROJECT_NAME',minZoom:11,color:'#e86136',outline:true}),
 Z('special','Special purpose districts',{core:'special',source:'nysp',color:'#795ca8'}),
 Z('subdistrict','Special purpose subdistricts',{core:'subdistrict',source:'nysp_sd',color:'#a07ebc'}),
 Z('open-spaces','Open spaces (planning screening)',{source:'v_GFT_Open_Spaces',minZoom:13,color:'#7ab885',note:'Planning screening layer, not a formal NYC Parks boundary.'}),
 Z('park-city','Battery Park City',{available:false,note:'Specific boundary source not yet integrated.'}),
 S('mih','Mandatory Inclusionary Housing areas',{core:'mih',source:'nycmih',color:'#2d997e'}),
 S('inclusionary','Inclusionary Housing designated areas',{source:'nyih',color:'#4a9875'}),
 S('greater-transit','Greater Transit Zone',{source:'Greater_Transit_Zone',color:'#329fbc'}),
 S('transit-zones','Transit zones',{source:'ZoLa_TransitZones',color:'#4d98bf'}),
 S('accessibility','Zoning for Accessibility',{available:false,note:'No validated public polygon dataset connected.'}),
 S('fresh-zones','FRESH zones',{available:false,note:'No verified FRESH eligibility-zone service connected.'}),
 S('limited-height','Limited Height Districts',{source:'nylh',color:'#bb7a63'}),
 S('low-density','Lower Density Growth Management Areas',{source:'nyldgma',color:'#c5a854'}),
 S('coastal','Waterfront Revitalization Program boundary',{source:'WRP_Final',color:'#4d97b7',outline:true,note:'WRP boundary; not equivalent to every ZoLa coastal-zone sublayer.'}),
 S('waterfront','Waterfront Access Plan',{source:'nywap',color:'#3988ab'}),
 S('historic','Historic districts (planning screening)',{source:'v_GFT_Historic_Districts',color:'#8e6ba7',note:'DCP screening data. Confirm designation with LPC.'}),
 S('landmarks','Historic resources (planning screening)',{source:'v_GFT_Historic_Resources',color:'#9865a6',note:'Not a substitute for an official LPC search.'}),
 S('flood','FEMA flood hazard areas',{source:'S_FLD_HAZ_AR',color:'#639bca'}),
 S('firm2007','2007 effective flood insurance maps',{source:'2007_Effective_FIRMs',minZoom:12,color:'#5f87bb',note:'Historic 2007 FIRM geography; check current FEMA maps for official flood determinations.'}),
 S('pfirms2015','2015 preliminary flood insurance maps',{available:false,note:'Dedicated preliminary FIRM polygon source not yet verified.'}),
 S('edesignations','Environmental designations',{source:'nyedesignations',color:'#d68e3a'}),
 S('appendix-i','Appendix I',{available:false,note:'Appendix I designation dataset not yet verified.'}),
 S('appendix-j','Appendix J designated M districts',{available:false,note:'Dedicated source not yet verified.'}),
 O('bids','Business Improvement Districts',{source:'BIDs',color:'#a06dad'}),
 O('industrial','Designated industrial areas',{source:'Designated_Industrial_Areas_Final',color:'#9273b3',note:'Planning industrial-area layer; IBZ designations need separate validation.'}),
 O('water-access','Waterfront public access areas',{source:'nywpaa',color:'#4c96bd'}),
 A('boroughs','Borough boundaries',{source:'NYC_Borough_Boundary',color:'#596f93',outline:true,minZoom:9}),
 A('community','NYC community districts',{source:'NYC_Community_Districts',color:'#ad6a56',outline:true,minZoom:10}),
 A('council','NYC Council districts',{source:'NYC_City_Council_Districts',color:'#8e68a6',outline:true,minZoom:10}),
 A('senate','NY State Senate districts',{source:'NYC_State_Senate_Districts',color:'#377c94',outline:true,minZoom:10}),
 A('assembly','NY State Assembly districts',{source:'NYC_State_Assembly_Districts',color:'#578f68',outline:true,minZoom:10}),
 A('ntas','Neighborhood Tabulation Areas 2020',{source:'NYC_Neighborhood_Tabulation_Areas_2020',color:'#a87349',outline:true,minZoom:11}),
 A('census','2020 census tracts',{source:'NYC_Census_Tracts_for_2020_US_Census',color:'#8796ac',outline:true,minZoom:13}),
 T('subway-lines','Subway lines',{source:'SubwayLines_share',color:'#3377a2',minZoom:11}),
 T('subway-stations','Subway stations',{source:'SubwayStations_share',color:'#3377a2',minZoom:13}),
 T('rail-lines','Other active rail lines',{source:'NYNJ_Active_Rail_Lines',color:'#71616c',minZoom:11})
];
const state={map:null,active:new Map(),abort:new Map(),layers:new Map(),metadata:new Map(),tiles:null,loaded:0};
const el=id=>document.getElementById(id),sr=(a)=>String(a??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const baseOptions={
  minimal:{name:'Minimal grayscale',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors',className:'base-minimal',maxNativeZoom:19},
  nyc:{name:'NYC cartographic',url:'https://maps.nyc.gov/xyz/1.0.0/carto/basemap/{z}/{x}/{y}.jpg',labelUrl:'https://maps.nyc.gov/xyz/1.0.0/carto/label/{z}/{x}/{y}.png8',attribution:'&copy; City of New York',className:'base-nyc',maxNativeZoom:19},
  aerial:{name:'NYC aerial (2018)',url:'https://maps.nyc.gov/xyz/1.0.0/photo/2018/{z}/{x}/{y}.png8',labelUrl:'https://maps.nyc.gov/xyz/1.0.0/carto/label-lt/{z}/{x}/{y}.png8',attribution:'&copy; City of New York, 2018 orthophotography',className:'base-aerial',maxNativeZoom:19}
};
function smallState(item,value,kind=''){
 const s=el('extra-status-'+item.id);
 if(s){s.textContent=value;s.dataset.kind=kind;}
}
function groups(){
 const out=new Map();for(const i of ITEMS){if(!out.has(i.group))out.set(i.group,[]);out.get(i.group).push(i)}return out;
}
function build(){
 const host=el('layer-tree');if(!host)return;
 host.replaceChildren();
 const quick=document.createElement('div');quick.className='layer-explorer-tools';
 quick.innerHTML='<div class="eyebrow">Show zoning and related data on map</div><input id="layer-search" type="search" placeholder="Filter map layers…" aria-label="Filter map layers" autocomplete="off"><div class="layer-options"><label><input type="checkbox" id="labels-on" checked> Zoning labels</label><button id="layers-clear" type="button">Hide optional layers</button></div>';
 host.appendChild(quick);
 for(const [group,items] of groups()){
  const details=document.createElement('details');details.className='layer-group';details.open=group==='Zoning and land use'||group==='Supporting zoning layers';
  const summary=document.createElement('summary');summary.textContent=group;const count=document.createElement('small');count.textContent=items.length;summary.append(count);details.append(summary);
  const body=document.createElement('div');body.className='layer-group-items';
  for(const item of items){
   const row=document.createElement('div');row.className='catalog-row';row.dataset.search=(item.name+' '+group).toLowerCase();
   const label=document.createElement('label');label.className='catalog-label';
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id=item.core?'layer-'+item.core:'extra-'+item.id;checkbox.checked=Boolean(item.checked);checkbox.disabled=item.available===false;
   const title=document.createElement('span');title.textContent=item.name;label.append(checkbox,title);row.append(label);
   const info=document.createElement('span');info.className='catalog-meta';
   if(item.available===false){const badge=document.createElement('span');badge.className='catalog-unavailable';badge.textContent='Not linked';badge.title=item.note;info.append(badge)}
   else if(item.core){const status=document.createElement('em');status.id='state-'+item.core;status.textContent=item.checked?'Loading…':'Off';info.append(status);}
   else {const status=document.createElement('em');status.id='extra-status-'+item.id;status.textContent='Off';info.append(status);}
   if(item.source){const a=document.createElement('a');a.textContent='ⓘ';a.className='catalog-source';a.title='Open service metadata';a.target='_blank';a.rel='noopener';a.href=ROOT+encodeURIComponent(item.source)+'/FeatureServer/'+(item.layer||0);info.append(a)}
   row.append(info);if(item.note)row.title=item.note;
   body.append(row);
  }
  details.append(body);host.append(details);
 }
 const basemaps=document.createElement('details');basemaps.className='layer-group';basemaps.open=true;
 basemaps.innerHTML='<summary>Basemaps <small>3</small></summary><div class="layer-group-items"></div>';
 const body=basemaps.querySelector('div');
 for(const [id,def] of Object.entries(baseOptions)){
  const row=document.createElement('label');row.className='catalog-row catalog-label';
  const radio=document.createElement('input');radio.type='radio';radio.name='basemap';radio.value=id;radio.checked=id==='minimal';
  row.append(radio,document.createTextNode(def.name));body.append(row);
  radio.addEventListener('change',()=>{if(radio.checked)setBasemap(id)});
 }
 host.append(basemaps);
 const missing=ITEMS.filter(i=>i.available===false).length;
 const footer=document.createElement('p');footer.className='catalog-footer';
 footer.textContent=(ITEMS.length-missing)+' mapped layer choices, '+missing+' visibly unlinked. Layer availability depends on the source service and map zoom.';
 host.append(footer);
 for(const item of ITEMS){if(item.core||item.available===false)continue;const checkbox=el('extra-'+item.id);checkbox.onchange=()=>{if(checkbox.checked)activate(item);else deactivate(item)};}
 el('layer-search').oninput=filter;
 el('layers-clear').onclick=()=>{
  for(const item of ITEMS){if(!item.core){const cb=el('extra-'+item.id);if(cb?.checked){cb.checked=false;deactivate(item)}}else if(!['zoning','lots'].includes(item.core)){const cb=el('layer-'+item.core);if(cb?.checked){cb.checked=false;cb.dispatchEvent(new Event('change'))}}}
 };
 el('labels-on').onchange=()=>{if(state.map)state.map.getContainer().classList.toggle('hide-zoning-labels',!el('labels-on').checked)};
}
function filter(){
 const q=el('layer-search').value.trim().toLowerCase();
 for(const row of document.querySelectorAll('.catalog-row[data-search]'))row.hidden=!row.dataset.search.includes(q);
 for(const group of document.querySelectorAll('.layer-group')){
  const rows=[...group.querySelectorAll('.catalog-row[data-search]')];
  if(!rows.length)continue;
  const found=rows.some(row=>!row.hidden);
  group.hidden=q!==''&&!found;
  if(q&&found)group.open=true;
 }
}
function setBasemap(id){
 const def=baseOptions[id];if(!def||!state.map)return;
 const map=state.map;
 // Remove the initial tile layer or any previous selected basemap without touching overlays.
 map.eachLayer(l=>{if(l instanceof L.TileLayer){map.removeLayer(l)}});
 const layer=L.tileLayer(def.url,{attribution:def.attribution,maxZoom:20,maxNativeZoom:def.maxNativeZoom,updateWhenIdle:true}).addTo(map);
 layer.bringToBack();
 if(def.labelUrl)L.tileLayer(def.labelUrl,{attribution:def.attribution,maxNativeZoom:def.maxNativeZoom,maxZoom:20,updateWhenIdle:true}).addTo(map);
 map.getContainer().dataset.basemap=id;
 const key=document.querySelector('.map-key');if(key)key.style.background=id==='aerial'?'#ffffffed':'';
 state.tiles=layer;
}
function styleFor(item,f){
 const col=item.color||'#7e6a99', geom=f.geometry?.type||'';
 if(geom.includes('Line'))return {color:col,weight:2,opacity:.82,dashArray:item.outline?'5 4':null};
 return {color:col,weight:item.outline?2:1,fillColor:col,fillOpacity:item.outline?.03:.16,opacity:.95,dashArray:item.outline?'5 5':null};
}
function activeLayersOnTop(){
 // Let core parcel highlight and selected lot outlines remain visible.
 const map=state.map;let high=null;
 map.eachLayer(l=>{if(l instanceof L.GeoJSON && l.options?.interactive===false)high=l});
 if(high)high.bringToFront();
}
function makeLayer(item){
 return L.geoJSON(null,{
   style:f=>styleFor(item,f),
   pointToLayer:(f,latlng)=>L.circleMarker(latlng,{radius:4.5,color:item.color||'#7e6a99',weight:1,fillColor:'#fff',fillOpacity:.9}),
   onEachFeature:(f,l)=>{
    const p=f.properties||{};
    const values=item.field?[p[item.field]]:Object.entries(p).filter(([k,v])=>v!=null&&typeof v!=='object'&&!/^(objectid|shape|globalid)/i.test(k)).slice(0,3).map(([k,v])=>k+': '+v);
    const text=values.filter(Boolean).map(String).join(' · ')||item.name;
    l.bindTooltip(sr(text.slice(0,250)),{sticky:true});
    const rows=Object.entries(p).filter(([k,v])=>v!==null&&v!==undefined&&v!==''&&!/^(OBJECTID|GlobalID|Shape|FID)/i.test(k)&&typeof v!=='object').slice(0,12);
    const content='<div class="feature-inspector"><strong>'+sr(item.name)+'</strong>'+
       '<div class="feature-properties">'+rows.map(([k,v])=>'<div><span>'+sr(k)+'</span><b>'+sr(String(v).slice(0,150))+'</b></div>').join('')+'</div>'+
       '<a target="_blank" rel="noopener" href="'+source(item)+'">Source metadata</a></div>';
    l.bindPopup(content,{maxWidth:330,maxHeight:290,autoPanPadding:[20,20]});
   }
 });
}
function source(item){return ROOT+item.source+'/FeatureServer/'+(item.layer||0)}
function onVisibleViewport(){clearTimeout(state.loaded);state.loaded=setTimeout(()=>{for(const item of ITEMS){if(state.active.has(item.id))load(item)}},420)}
async function fetchJSON(url,params={},signal){
 const u=new URL(url);for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));
 const response=await fetch(u,{signal});if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();if(data.error)throw Error(data.error.message||'ArcGIS error');return data;
}
async function load(item){
 const entry=state.active.get(item.id);if(!entry||!state.map)return;
 if(entry.abort)entry.abort.abort();
 const ac=new AbortController();entry.abort=ac;
 const group=entry.layer;
 if(state.map.getZoom()<item.minZoom){group.clearLayers();smallState(item,'Zoom '+item.minZoom+'+');return}
 smallState(item,'Loading…');
 const b=state.map.getBounds();
 const geo=JSON.stringify({xmin:b.getWest(),ymin:b.getSouth(),xmax:b.getEast(),ymax:b.getNorth(),spatialReference:{wkid:4326}});
 const params={f:'geojson',where:item.where||'1=1',outFields:'*',geometry:geo,geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:4326,outSR:4326,resultOffset:0,resultRecordCount:1000};
 try{
  const all=[];let exceeded=false;
  for(let i=0;i<3;i++){
   if(ac.signal.aborted)return;
   params.resultOffset=i*1000;
   const res=await fetchJSON(source(item)+'/query',params,ac.signal);
   const batch=res.features||[];all.push(...batch);
   exceeded=Boolean(res.exceededTransferLimit);
   if(batch.length<1000&&!exceeded)break;
  }
  if(ac.signal.aborted||!state.active.has(item.id))return;
  group.clearLayers();group.addData({type:'FeatureCollection',features:all});
  if(item.id==='zma')group.bringToFront();
  activeLayersOnTop();
  smallState(item,all.length>=3000?'Zoom for detail':all.length+' shown',all.length>=3000?'warn':'good');
 }catch(e){if(ac.signal.aborted||e.name==='AbortError')return;group.clearLayers();smallState(item,'Unavailable','error');console.warn('ZoLa layer error',item.id,e)}
}
function activate(item){
 if(state.active.has(item.id))return;
 const layer=makeLayer(item);layer.addTo(state.map);
 state.active.set(item.id,{layer,abort:null});load(item);
}
function deactivate(item){
 const entry=state.active.get(item.id);if(!entry)return;
 entry.abort?.abort();state.map.removeLayer(entry.layer);state.active.delete(item.id);smallState(item,'Off');
}
function setup(map){
 state.map=map;build();map.on('moveend',onVisibleViewport);
 map.getContainer().dataset.basemap='minimal';
 document.body.classList.add('layer-catalog-active');
}
window.setupLayerExplorer=setup;
window.ZOLA_LAYER_CATALOG=ITEMS.map(({id,name,group,source,available})=>({id,name,group,source,available:available!==false}));
})();