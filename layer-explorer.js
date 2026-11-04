/* Extended ZoLa-inspired layer explorer; all data from publicly listed NYC GIS services. */
(function(){
'use strict';
const ROOT='https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/';
// The five top-level sections and every nested item follow the supplied ZoLa screenshots.
const N=(id,name,opts={})=>({id,name,...opts});
const Z=(id,name,opts={})=>N(id,name,{minZoom:13,...opts});
const S=(id,name,opts={})=>N(id,name,{minZoom:12,...opts});
const A=(id,name,opts={})=>N(id,name,{minZoom:11,...opts});
const range=(prefix,labels)=>labels.map(s=>N(prefix+'-'+s,s,{checked:true,kind:'filter'}));
const zones=(kind,from,to)=>range('zone',Array.from({length:to-from+1},(_,i)=>kind+(from+i)));
const overlays=(kind)=>range('overlay',Array.from({length:5},(_,i)=>kind+'-'+(i+1)));
const GROUPS=[
 {name:'Zoning and Land Use',count:8,items:[
  Z('lots','Tax Lots',{core:'lots',source:'MAPPLUTO',minZoom:16,checked:true,swatch:'#c77f4e'}),
  Z('landuse','Show Land Use Colors',{core:'landuse',source:'MAPPLUTO',minZoom:16,swatch:'#9ca3af'}),
  Z('zoning','Zoning Districts',{core:'zoning',source:'nyzd',checked:true,swatch:'#db954f',expanded:true,children:[
   N('commercial-districts','Commercial Districts',{checked:true,filterGroup:true,swatch:'#e88d94',expanded:true,children:zones('C',1,8)}),
   N('manufacturing-districts','Manufacturing Districts',{checked:true,filterGroup:true,swatch:'#b6a0cf',expanded:true,children:zones('M',1,3)}),
   N('residence-districts','Residence Districts',{checked:true,filterGroup:true,swatch:'#ecd081',expanded:true,children:zones('R',1,10)}),
   N('parks','Parks',{checked:true,kind:'filter',swatch:'#a5d09c'}),
   N('battery-park-city','Battery Park City',{kind:'filter',checked:true,available:false,note:'The standalone Battery Park City boundary is not yet connected.',swatch:'#ababab'})
  ]}),
  Z('commercial','Commercial Overlays',{core:'commercial',source:'nyco',minZoom:14,swatch:'#e16a90',expanded:true,children:[
   N('overlay-c1','C1-1 through C1-5',{checked:true,filterGroup:true,expanded:true,children:overlays('C1')}),
   N('overlay-c2','C2-1 through C2-5',{checked:true,filterGroup:true,expanded:true,children:overlays('C2')})
  ]}),
  Z('zoning-index','Zoning Map Index',{source:'Zoning_Index_Map',minZoom:11,color:'#536cb2',swatch:'#8489ad',outline:true}),
  Z('zma','Zoning Map Amendments',{source:'nyzma',minZoom:12,color:'#ed8a38',swatch:'#99b27d',outline:true,timeline:true}),
  Z('pending-zma','Pending Zoning Map Amendments',{available:false,swatch:'#e27370',note:'A verified current pending-application map feed has not yet been connected.'}),
  Z('special','Special Purpose Districts',{core:'special',source:'nysp',swatch:'#617849',color:'#795ca8'}),
  Z('subdistrict','Special Purpose Subdistricts',{core:'subdistrict',source:'nysp_sd',swatch:'#8eaf39',color:'#a07ebc'})
 ]},
 {name:'Supporting Zoning Layers',count:17,items:[
  S('mih','Mandatory Inclusionary Housing Areas',{core:'mih',source:'nycmih',swatch:'#d56a55',color:'#2d997e'}),
  S('inclusionary','Inclusionary Housing Designated Areas',{source:'nyih',swatch:'#dbb49a',color:'#4a9875'}),
  S('accessibility','Zoning for Accessibility',{available:false,swatch:'#f0bb85',note:'A public feature layer for the precise ZoLa geography has not been verified.'}),
  S('greater-transit','Greater Transit Zone',{source:'Greater_Transit_Zone',swatch:'#ef987c',color:'#329fbc'}),
  S('transit-parking','Transit Zones Parking Geographies',{source:'ZoLa_TransitZones',swatch:'#e5b59c',color:'#4d98bf',expanded:true,children:[
   N('parking-mn-lic','MN Core and LIC Parking Areas',{kind:'filter',checked:true,swatch:'#ddc5e3'}),
   N('parking-inner','Inner Transit Zone',{kind:'filter',checked:true,swatch:'#a8bed5'}),
   N('parking-outer','Outer Transit Zone',{kind:'filter',checked:true,swatch:'#b5dfec'}),
   N('parking-special','Special 25-241 Parking Provisions',{kind:'filter',checked:true,swatch:'#d7ece5'}),
   N('parking-beyond','Beyond the Greater Transit Zone',{kind:'filter',checked:true,swatch:'#90c9cc'})
  ],note:'Subarea category filtering requires validation against the layer fields.'}),
  S('fresh-zones','FRESH Zones',{available:false,swatch:'#e4ceac',expanded:true,note:'FRESH geographic service is not yet verified.',children:[
   N('fresh-zoning','Zoning incentives',{available:false,swatch:'#c2ebe3'}),
   N('fresh-both','Zoning and discretionary tax incentives',{available:false,swatch:'#b7dbc7'}),
   N('fresh-tax','Discretionary tax incentives',{available:false,swatch:'#dceab5'})
  ]}),
  S('limited-height','Limited Height Districts',{source:'nylh',swatch:'#c6b6a9',color:'#bb7a63'}),
  S('low-density','Lower Density Growth Management Areas',{source:'nyldgma',swatch:'#debf9b',color:'#c5a854'}),
  S('coastal','Coastal Zone Boundary',{source:'WRP_Final',swatch:'#91cbd8',color:'#4d97b7',outline:true,note:'Uses Waterfront Revitalization Program boundary; coastal equivalence requires verification.'}),
  S('waterfront','Waterfront Access Plan',{source:'nywap',swatch:'#a4d2e3',color:'#3988ab'}),
  S('historic','Historic Districts',{source:'v_GFT_Historic_Districts',swatch:'#a9d4b6',color:'#8e6ba7',note:'Planning screening data; confirm with LPC.'}),
  S('landmarks','Landmarks',{source:'v_GFT_Historic_Resources',swatch:'#ac9fd1',color:'#9865a6',expanded:true,note:'Historic-resource screening data; exact landmark-type subtype mapping is provisional.',children:[
   N('landmark-individual','Individual Landmarks',{kind:'filter',checked:true,swatch:'#9be0bf'}),
   N('landmark-interior','Interior Landmarks',{kind:'filter',checked:true,swatch:'#c6a0ee'}),
   N('landmark-scenic','Scenic Landmarks',{kind:'filter',checked:true,swatch:'#a5a3e8'})
  ]}),
  S('firm2007','Effective Flood Insurance Rate Maps 2007',{source:'2007_Effective_FIRMs',swatch:'#9bc6da',color:'#5f87bb',expanded:true,note:'Historic 2007 flood layer; do not use for current FEMA determinations.',children:[
   N('flood07-v','V (1% floodplain)',{kind:'filter',checked:true,swatch:'#4ebbd0'}),
   N('flood07-a','A (1% floodplain)',{kind:'filter',checked:true,swatch:'#84d9c9'}),
   N('flood07-x','Shaded X (0.2% floodplain)',{kind:'filter',checked:true,swatch:'#5bd6c5'})
  ]}),
  S('pfirms2015','Preliminary Flood Insurance Rate Maps 2015',{available:false,swatch:'#c5e0e9',expanded:true,note:'A validated preliminary 2015 FIRM feature service has not yet been connected.',children:[
   N('flood15-v','V (1% floodplain)',{available:false,swatch:'#48b9cf'}),
   N('flood15-a','A (1% floodplain)',{available:false,swatch:'#83d4c4'}),
   N('flood15-x','Shaded X (0.2% floodplain)',{available:false,swatch:'#52d8c1'})
  ]}),
  S('edesignations','Environmental Designations',{source:'nyedesignations',swatch:'#eab08c',color:'#d68e3a',children:[
   N('edesignation-item','Environmental Designations',{kind:'filter',checked:true,swatch:'#b29aca'})
  ]}),
  S('appendix-i','Appendix I',{available:false,swatch:'#e9b9af',note:'No validated standalone Appendix I map service.'}),
  S('appendix-j','Appendix J Designated M Districts',{available:false,swatch:'#be96a4',note:'No validated Appendix J mapped district service.'})
 ]},
 {name:'Other Supporting Layers',count:2,items:[
  S('bids','Business Improvement Districts',{source:'BIDs',swatch:'#e6bb9e',color:'#a06dad'}),
  S('ibz','Industrial Business Zones',{source:'Industry_in_NYC_WFL',layer:0,swatch:'#d9b48b',color:'#9273b3'})
 ]},
 {name:'Administrative Boundaries',count:6,items:[
  A('boroughs','Boroughs',{source:'NYC_Borough_Boundary',swatch:'#d1a15b',color:'#596f93',outline:true,minZoom:9}),
  A('community','Community Districts',{source:'NYC_Community_Districts',swatch:'#abc462',color:'#ad6a56',outline:true,minZoom:10}),
  A('council','NYC Council Districts',{source:'NYC_City_Council_Districts',swatch:'#beadcf',color:'#8e68a6',outline:true,minZoom:10,expanded:true,children:[
    N('council-old','2013-2023',{available:false,swatch:'#609cc6',note:'Historic Council district version not yet linked.'}),
    N('council-new','2024-2033',{kind:'filter',checked:true,swatch:'#f28ea8'})
  ]}),
  A('senate','NY State Senate Districts',{source:'NYC_State_Senate_Districts',swatch:'#ab8bc2',color:'#377c94',outline:true,minZoom:10}),
  A('assembly','NY State Assembly Districts',{source:'NYC_State_Assembly_Districts',swatch:'#ce93b9',color:'#578f68',outline:true,minZoom:10}),
  A('ntas','Neighborhood Tabulation Areas',{source:'NYC_Neighborhood_Tabulation_Areas_2020',swatch:'#c39cb6',color:'#a87349',outline:true,minZoom:11})
 ]}
];
const ITEMS=GROUPS.flatMap(g=>g.items.map(item=>({...item,group:g.name})));
const YEAR_OPTIONS=['2024','2022','2020','2018','2016','2014','2012','2010','2008','2006','2004','2001-2','1996','1951','1924'];
const VERIFIED_YEARS=new Set(['2018','2016','2014','2012','2010','2008','2006','2004','2001-2','1996','1951','1924']);
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