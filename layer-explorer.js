/* Extended ZoLa-inspired layer explorer; all data from publicly listed NYC GIS services. */
(function(){
'use strict';
const ROOT='https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/';
// The five top-level sections and every nested item follow the supplied ZoLa screenshots.
const N=(id,name,opts={})=>({id,name,...opts});
const Z=(id,name,opts={})=>N(id,name,{minZoom:13,...opts});
const S=(id,name,opts={})=>N(id,name,{minZoom:12,...opts});
const A=(id,name,opts={})=>N(id,name,{minZoom:11,...opts});
const range=(prefix,labels)=>labels.map(s=>N(prefix+'-'+s,s,{checked:true,kind:'filter',swatch:s.startsWith('C')?'#e88d94':s.startsWith('M')?'#b6a0cf':s.startsWith('R')?'#ecd081':'#e16a90'}));
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
   N('parks','Parks',{checked:true,kind:'filter',source:'v_GFT_Open_Spaces',color:'#78b57a',minZoom:13,swatch:'#a5d09c',note:'Open-space planning screening layer; not a legally authoritative parks inventory.'}),
   N('battery-park-city','Battery Park City',{kind:'filter',checked:true,available:false,note:'The standalone Battery Park City boundary is not yet connected.',swatch:'#ababab'})
  ]}),
  Z('commercial','Commercial Overlays',{core:'commercial',source:'nyco',minZoom:14,swatch:'#e16a90',expanded:true,children:[
   N('overlay-c1','C1-1 through C1-5',{checked:true,filterGroup:true,expanded:true,children:overlays('C1')}),
   N('overlay-c2','C2-1 through C2-5',{checked:true,filterGroup:true,expanded:true,children:overlays('C2')})
  ]}),
  Z('zoning-index','Zoning Map Index',{source:'Zoning_Index_Map',minZoom:11,color:'#536cb2',swatch:'#8489ad',outline:true}),
  Z('zma','Zoning Map Amendments',{source:'nyzma',minZoom:12,color:'#ed8a38',swatch:'#99b27d',outline:true,timeline:true}),
  Z('pending-zma','Pending Zoning Map Amendments',{source:'nyzma',where:"STATUS = 'Certified'",field:'PROJECT_NAME',minZoom:11,color:'#e97870',swatch:'#e27370',outline:true,note:'Certified rezoning boundaries reported by the nyzma GIS service; not all pending applications.'}),
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
  S('fresh-zones','FRESH Zones',{source:'FRESH_Food_Stores',field:'Name',color:'#81b263',swatch:'#e4ceac',expanded:true,note:'DCP published FRESH eligibility geographies, by incentive type.',children:[
   N('fresh-zoning','Zoning incentives',{kind:'filter',checked:true,swatch:'#89cd66'}),
   N('fresh-both','Zoning and discretionary tax incentives',{kind:'filter',checked:true,swatch:'#5c8944'}),
   N('fresh-tax','Discretionary tax incentives',{kind:'filter',checked:true,swatch:'#b2b2b2'})
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
const state={map:null,active:new Map(),abort:new Map(),layers:new Map(),metadata:new Map(),tiles:null,loaded:0,mode:'transit',overlays:{transit:true,lirr:false,buildings:false,aerial:false},subway:{routes:true,stations:true},lirr:{routes:true,stations:true},lirrLayers:{},lirrAborts:{},lirrLoadToken:0,transitLayers:{},transitAborts:{},transitLoadToken:0,buildingLayer:null,buildingAbort:null,buildingToken:0,baseLoadToken:0,baseLayer:null,aerialLayer:null};
const el=id=>document.getElementById(id),sr=(a)=>String(a??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const baseOptions={
 transit:{name:'Transit',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors',maxNativeZoom:19},
 buildings:{name:'Building Footprints',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; OpenStreetMap contributors · NYC OTI building footprints',maxNativeZoom:19},
 aerial:{name:'Aerial Imagery',url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',attribution:'Tiles &copy; Esri, Maxar, Earthstar Geographics and GIS User Community',maxNativeZoom:19}
};
const BUILDINGS_URL='https://services2.arcgis.com/IsDCghZ73NgoYoz5/ArcGIS/rest/services/NYC_Building_Footprint/FeatureServer/0/query';
function smallState(item,value,kind=''){
 const s=el('extra-status-'+item.id);
 if(s){s.textContent=value;s.dataset.kind=kind;}
}
function groups(){
 const out=new Map();for(const i of ITEMS){if(!out.has(i.group))out.set(i.group,[]);out.get(i.group).push(i)}return out;
}
function build(){
 const host=el('layer-tree');if(!host)return;host.replaceChildren();
 const quick=document.createElement('div');quick.className='layer-explorer-tools';
 quick.innerHTML='<div class="eyebrow">Show zoning and related data on map</div>'+
  '<input id="layer-search" type="search" placeholder="Filter map layers…" aria-label="Filter map layers" autocomplete="off">'+
  '<div class="layer-options"><label><input type="checkbox" id="labels-on" checked> Zoning labels</label>'+
  '<button id="layers-clear" type="button" aria-label="Deselect all map layers">Deselect all layers</button></div>';
 host.appendChild(quick);
 for(const group of GROUPS){
  const details=document.createElement('details');details.className='layer-group';details.open=group.name==='Zoning and Land Use'||group.name==='Supporting Zoning Layers';
  const summary=document.createElement('summary');summary.append(document.createTextNode(group.name));
  const count=document.createElement('small');count.textContent=String(group.count);summary.append(count);details.append(summary);
  const body=document.createElement('div');body.className='layer-group-items';
  for(const item of group.items)body.append(renderItem(item,0,item));
  details.append(body);host.append(details);
 }
 host.append(buildBasemaps());
 const unlinked=allNodes().filter(n=>n.available===false).length;
 const footer=document.createElement('p');footer.className='catalog-footer';
 footer.textContent='Layers follow the official ZoLa menu hierarchy. '+unlinked+' entries are explicitly marked Not linked. Source-dependent categories need verification for exact styling and subarea filters.';
 host.append(footer);
 el('layer-search').oninput=filter;
 el('layers-clear').onclick=deselectAllLayers;
 el('labels-on').onchange=()=>{if(state.map)state.map.getContainer().classList.toggle('hide-zoning-labels',!el('labels-on').checked)};
}
function deselectAllLayers(){
 // All map data toggles, including those initially enabled, are turned off.
 // Keep the basemap and current inspected parcel. No multi-lot selection workflow is active.
 // The catalog is generated dynamically, so clear actual DOM checkboxes,
 // not just a subset of items in the data model.
 for(const cb of document.querySelectorAll('#layer-tree input[type="checkbox"]:not(#lot-outline-visible)')){
  cb.checked=false;
  cb.indeterminate=false;
 }
 for(const item of ITEMS){
  if(item.core){
   const cb=el('layer-'+item.core);
   if(cb)cb.dispatchEvent(new Event('change'));
  }
 }
 for(const entry of [...state.active.values()]){
  if(entry.item)deactivate(entry.item);
 }
 // Keep the master reset synchronized with independently toggleable basemap overlays.
 for(const id of ['transit','lirr','buildings','aerial'])toggleOverlay(id,false);
 state.subway.routes=false;state.subway.stations=false;
 state.lirr.routes=false;state.lirr.stations=false;
 const labels=el('labels-on');
 if(labels){labels.checked=false;state.map?.getContainer().classList.add('hide-zoning-labels')}
 window.ZOLA_SYNC_CHILDREN?.();
 const notice=el('status');
 if(notice){notice.textContent='All map layers deselected. Your basemap and current inspected parcel are unchanged.';notice.dataset.kind='good'}
}
function allNodes(){const out=[];function walk(list){for(const n of list){out.push(n);if(n.children)walk(n.children)}}for(const g of GROUPS)walk(g.items);return out}
function findInput(item,depth){return el((depth===0?(item.core?'layer-':'extra-'):'sub-')+item.id)}
function renderItem(item,depth,top){
 const wrapper=document.createElement('div');wrapper.className='catalog-node';wrapper.dataset.search=(item.name+' '+(top.group||'')).toLowerCase();wrapper.dataset.layerId=item.id;
 const row=document.createElement('div');row.className='catalog-row';row.classList.add('catalog-depth-'+Math.min(depth,3));
 const label=document.createElement('label');label.className='catalog-label';
 const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id=(depth===0?(item.core?'layer-':'extra-'):'sub-')+item.id;
 checkbox.checked=Boolean(item.checked);checkbox.disabled=item.available===false;
 const swatch=document.createElement('i');swatch.className='catalog-swatch';swatch.style.background=item.swatch||top.swatch||'#b7a6c4';
 const title=document.createElement('span');title.textContent=item.name;
 label.append(checkbox,swatch,title);row.append(label);
 const meta=document.createElement('span');meta.className='catalog-meta';
 if(item.available===false){const badge=document.createElement('span');badge.className='catalog-unavailable';badge.textContent='Not linked';badge.title=item.note||'No source connected';meta.append(badge)}
 else if(item.core){const status=document.createElement('em');status.id='state-'+item.core;status.textContent=item.checked?'Loading…':'Off';meta.append(status)}
 else if(depth===0&&item.source){const status=document.createElement('em');status.id='extra-status-'+item.id;status.textContent='Off';meta.append(status)}
 if(item.source){const a=document.createElement('a');a.textContent='ⓘ';a.className='catalog-source';a.title='Open mapped data source';a.href=source(item);a.target='_blank';a.rel='noopener';meta.append(a)}
 if(item.children?.length){const exp=document.createElement('button');exp.type='button';exp.className='catalog-expand';exp.textContent=item.expanded?'▴':'▾';exp.setAttribute('aria-label','Expand '+item.name);
 exp.setAttribute('aria-expanded',item.expanded?'true':'false');meta.append(exp);
 exp.onclick=()=>{const open=children.hidden;children.hidden=!open;exp.textContent=open?'▴':'▾';exp.setAttribute('aria-expanded',String(open))};
 }
 row.append(meta);wrapper.append(row);
 if(depth===0&&(item.core==='zoning'||item.core==='landuse')){
  const isZoning=item.core==='zoning', initial=isZoning?59:60;
  const control=document.createElement('div');control.className='fill-opacity-control';
  const controlLabel=document.createElement('label');controlLabel.className='fill-opacity-label';
  const input=document.createElement('input');input.type='range';
  input.id='opacity-'+item.core;input.min='0';input.max='100';input.step='1';input.value=String(initial);
  const value=document.createElement('output');value.id='opacity-'+item.core+'-value';value.htmlFor=input.id;value.textContent=initial+'%';
  controlLabel.htmlFor=input.id;controlLabel.textContent='Fill opacity';
  controlLabel.append(value);control.append(controlLabel,input);
  const hint=document.createElement('small');hint.textContent=isZoning?'District borders and labels stay visible.':'DCP standard default: 60% opacity. Lot borders stay visible.';
  control.append(hint);
  input.addEventListener('input',()=>{
   value.textContent=input.value+'%';
   window.ZOLA_SET_FILL_OPACITY?.(item.core,Number(input.value));
  });
  wrapper.append(control);
 }
 if(depth===0&&item.core==='lots'){
  const controls=document.createElement('div');controls.className='lot-outline-controls';
  const heading=document.createElement('div');heading.className='lot-outline-heading';
  const title=document.createElement('strong');title.textContent='Parcel outlines';
  const toggleLabel=document.createElement('label');toggleLabel.className='lot-outline-toggle';
  const toggle=document.createElement('input');toggle.type='checkbox';toggle.id='lot-outline-visible';toggle.checked=true;
  toggleLabel.append(toggle,document.createTextNode('Show'));heading.append(title,toggleLabel);controls.append(heading);
  const colorLabel=document.createElement('label');colorLabel.className='lot-outline-field';colorLabel.htmlFor='lot-outline-color';
  const colorText=document.createElement('span');colorText.textContent='Outline color';
  const select=document.createElement('select');select.id='lot-outline-color';
  for(const [value,label] of [['red','Red'],['purple','Purple'],['gray','Dark gray']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;
   if(value==='gray')option.selected=true;select.append(option);
  }
  colorLabel.append(colorText,select);controls.append(colorLabel);
  const weightLabel=document.createElement('label');weightLabel.className='lot-outline-field';weightLabel.htmlFor='lot-outline-weight';
  const widthText=document.createElement('span');widthText.textContent='Line thickness';
  const thicknessValue=document.createElement('output');thicknessValue.id='lot-outline-weight-value';thicknessValue.htmlFor='lot-outline-weight';thicknessValue.textContent='1 px';
  const widthHeading=document.createElement('span');widthHeading.className='lot-outline-width-heading';widthHeading.append(widthText,thicknessValue);
  const range=document.createElement('input');range.type='range';range.id='lot-outline-weight';range.min='1';range.max='5';range.step='1';range.value='1';
  weightLabel.append(widthHeading,range);controls.append(weightLabel);
  const hint=document.createElement('small');hint.textContent='Applies to MapPLUTO lot geometry. The purple inspected-parcel highlight is unaffected.';controls.append(hint);
  const update=()=>window.ZOLA_SET_LOT_OUTLINE?.({visible:toggle.checked,color:select.value,weight:Number(range.value)});
  toggle.addEventListener('change',update);
  select.addEventListener('change',update);
  range.addEventListener('input',()=>{thicknessValue.textContent=range.value+' px';update()});
  wrapper.append(controls);
 }
 if(item.note){row.title=item.note;title.title=item.note}
 checkbox.onchange=()=>{
  if(item.children?.length)for(const child of descendants(item)){const check=el('sub-'+child.id);if(check&&!check.disabled)check.checked=checkbox.checked}
  if(depth===0){if(item.core){ /* app.js binds the core change callback */ }
   else if(item.available!==false){checkbox.checked?activate(item):deactivate(item)}}
  else{
   if(item.source&&item.available!==false){checkbox.checked?activate(item):deactivate(item)}
   if(top.id==='zoning')syncZoningChildren();
   updateParentCheckState(top);if(top.core)window.ZOLA_RELOAD_CORE?.(top.core);
   else if(top.available!==false&&state.active.has(top.id))load(top);
  }
 };
 let children;
 if(item.children?.length){
  children=document.createElement('div');children.className='catalog-children';
  // Render every nested option as a complete row. Never put long checkbox labels in a fixed-column grid.
  children.classList.add('catalog-vertical-children');
  children.hidden=!item.expanded;
  for(const child of item.children)children.append(renderItem(child,depth+1,top));
  wrapper.append(children);
 }
 if(depth>0&&item.source&&item.checked&&item.available!==false)activate(item);
 if(depth===0&&item.timeline)wrapper.append(makeTimeline(item));
 return wrapper;
}
function descendants(item){const out=[];for(const c of item.children||[]){out.push(c);out.push(...descendants(c))}return out}
function updateParentCheckState(top){
 function update(n){
  if(!n.children?.length)return;
  for(const child of n.children)update(child);
  const box=el('sub-'+n.id)||el((n.core?'layer-':'extra-')+n.id);
  const enabled=n.children.map(ch=>el('sub-'+ch.id)).filter(ch=>ch&&!ch.disabled);
  if(box&&enabled.length){const count=enabled.filter(ch=>ch.checked).length;box.indeterminate=count>0&&count<enabled.length;box.checked=count>0}
 }
 update(top);
}
function makeTimeline(item){
 const container=document.createElement('div');container.className='zoning-timeline';
 const row=document.createElement('div');row.className='timeline-sliders';
 const left=document.createElement('input'),right=document.createElement('input');
 for(const x of [left,right]){x.type='range';x.min='0';x.max='706';x.step='1';x.setAttribute('aria-label','Zoning amendment '+(x===left?'start':'end')+' month')}
 left.value='0';right.value='706';row.append(left,right);container.append(row);
 const labels=document.createElement('div');labels.className='timeline-dates';container.append(labels);
 const monthString=value=>{const n=Number(value);return String(1970+Math.floor(n/12))+'-'+String(n%12+1).padStart(2,'0')};
 const update=()=>{if(+left.value>+right.value){if(document.activeElement===left)right.value=left.value;else left.value=right.value}
  labels.innerHTML='<span>'+monthString(left.value)+'</span><span>'+monthString(right.value)+'</span>';
  window.ZOLA_ZMA_DATE_RANGE={start:monthString(left.value),end:monthString(right.value)};
  if(state.active.has(item.id))load(item);
 };
 left.oninput=update;right.oninput=update;update();
 const note=document.createElement('small');note.textContent='Date filtering uses adoption dates when supplied by the source';note.className='timeline-note';container.append(note);
 return container;
}
function buildBasemaps(){
 const group=document.createElement('details');group.className='layer-group';group.open=true;
 const summary=document.createElement('summary');summary.textContent='Basemaps and transit';
 const count=document.createElement('small');count.textContent='5';summary.append(count);group.append(summary);
 const body=document.createElement('div');body.className='layer-group-items basemap-controls-body';group.append(body);
 const explanation=document.createElement('p');explanation.className='basemap-note';
 explanation.textContent='Independent checkboxes. Street map stays underneath; switch transit, building footprints, and aerial imagery on or off together or separately.';
 body.append(explanation);
 const choices=[
  {id:'transit',name:'Transit (routes and stations)',swatch:'#d06d60',checked:true,note:'NYC subway lines and stations from a public ArcGIS dataset'},
  {id:'lirr',name:'Long Island Rail Road',swatch:'#006983',checked:false,note:'LIRR route geometry and station locations with independent switches'},
  {id:'buildings',name:'Building Footprints',swatch:'#97949b',checked:false,note:'NYC OTI building polygons, visible at zoom 16+'},
  {id:'3d',name:'3D Buildings',swatch:'#b8b8be',available:false,note:'3D model rendering is not yet implemented'},
  {id:'aerial',name:'Aerial Imagery',swatch:'#a6bdce',checked:false,note:'Esri imagery under zoning and transit overlays'}
 ];
 for(const option of choices){
  const row=document.createElement('label');row.className='catalog-row catalog-label basemap-row';
  const input=document.createElement('input');input.type='checkbox';input.id='toggle-'+option.id;input.checked=Boolean(option.checked);input.disabled=option.available===false;
  const swatch=document.createElement('i');swatch.className='catalog-swatch';swatch.style.background=option.swatch;
  const title=document.createElement('span');title.textContent=option.name;row.append(input,swatch,title);
  if(option.available===false){const badge=document.createElement('span');badge.className='catalog-unavailable';badge.textContent='Not linked';row.append(badge)}
  row.title=option.note;
  if(option.available!==false)input.onchange=()=>toggleOverlay(option.id,input.checked);
  body.append(row);
  if(option.id==='transit'){
   const children=document.createElement('div');children.className='basemap-child-options';
   for(const [name,title] of [['routes','Subway routes'],['stations','Subway stations']]){
    const child=document.createElement('label');child.className='catalog-label basemap-child';
    const check=document.createElement('input');check.type='checkbox';check.id='transit-'+name;check.checked=true;
    check.onchange=()=>{state.subway[name]=check.checked;syncTransitVisibility()};
    child.append(check,document.createTextNode(title));children.append(child);
   }
   const indicator=document.createElement('span');indicator.id='transit-layer-status';indicator.className='basemap-note';indicator.textContent='Loading NYC subway layers…';
   children.append(indicator);body.append(children);
  }
  if(option.id==='lirr'){
   const children=document.createElement('div');children.className='basemap-child-options lirr-child-options';
   for(const [name,title] of [['routes','LIRR lines'],['stations','LIRR stations']]){
    const label=document.createElement('label');label.className='catalog-label basemap-child';
    const check=document.createElement('input');check.type='checkbox';check.id='lirr-'+name;check.checked=true;
    check.onchange=()=>{state.lirr[name]=check.checked;syncLirrVisibility()};
    label.append(check,document.createTextNode(title));children.append(label);
   }
   const info=document.createElement('span');info.id='lirr-layer-status';info.className='basemap-note';info.textContent='Enable LIRR to load lines and stations.';
   children.append(info);body.append(children);
  }

 }
 const status=document.createElement('p');status.id='basemap-status';status.className='basemap-status';
 status.textContent='Minimal OpenStreetMap base map is always visible.';
 body.append(status);
 return group;
}

function filter(){
 const q=el('layer-search').value.trim().toLowerCase();
 for(const group of document.querySelectorAll('.layer-group')){
  const nodes=[...group.querySelectorAll('.catalog-node')].reverse();
  for(const n of nodes){
   const self=String(n.dataset.search||'').includes(q);
   const childMatch=!!n.querySelector('.catalog-node:not([hidden])');
   n.hidden=Boolean(q)&&!self&&!childMatch;
   if(q&&!n.hidden){const child=n.querySelector(':scope > .catalog-children');if(child)child.hidden=false}
  }
  const rows=group.querySelectorAll('.basemap-row');
  if(rows.length){for(const r of rows)r.hidden=!!q&&!r.textContent.toLowerCase().includes(q)}
  group.hidden=!!q&&![...group.querySelectorAll('.catalog-node,.basemap-row')].some(n=>!n.hidden);
  if(q&&!group.hidden)group.open=true;
 }
}
function baseStatus(message,kind=''){
 const out=el('basemap-status');if(out){out.textContent=message;out.dataset.kind=kind}
}
function dropBuildingLayer(){
 ++state.buildingToken;
 state.buildingAbort?.abort();state.buildingAbort=null;
 if(state.buildingLayer){state.map.removeLayer(state.buildingLayer);state.buildingLayer=null}
}
async function loadBuildingFootprints(){
 if(!state.overlays.buildings||!state.map)return;
 const map=state.map;
 state.buildingAbort?.abort();
 if(!state.buildingLayer){
  state.buildingLayer=L.geoJSON(null,{
   style:{color:'#746c7b',weight:1.2,fillColor:'#9a939f',fillOpacity:.62},
   onEachFeature:(f,l)=>{
    const p=f.properties||{};
    l.bindPopup('<strong>NYC building footprint</strong><div>BIN: '+sr(p.BIN??'not available')+'</div><div>BBL: '+sr(p.BASE_BBL??p.MAPPLUTO_BBL??'not available')+'</div><small>Source: NYC Office of Technology and Innovation</small>');
    l.bindTooltip('Building BIN '+sr(p.BIN||''),{sticky:true});
   }
  }).addTo(map);
 }
 if(map.getZoom()<16){
  state.buildingLayer.clearLayers();
  baseStatus('Building footprint polygons appear at zoom level 16 or closer.','');
  return;
 }
 const token=++state.buildingToken, ac=new AbortController();state.buildingAbort=ac;
 const b=map.getBounds(),g={xmin:b.getWest(),ymin:b.getSouth(),xmax:b.getEast(),ymax:b.getNorth(),spatialReference:{wkid:4326}};
 const args={f:'geojson',where:'1=1',outFields:'*',geometry:JSON.stringify(g),geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:4326,outSR:4326,resultRecordCount:1500,resultOffset:0};
 baseStatus('Loading actual NYC building footprints…');
 try{
  const features=[];let truncated=false;
  for(let i=0;i<3;i++){
   args.resultOffset=i*1500;
   const result=await fetchJSON(BUILDINGS_URL,args,ac.signal);
   const batch=result.features||[];
   features.push(...batch);
   if(batch.length<1500&&!result.exceededTransferLimit)break;
   if(i===2)truncated=true;
  }
  if(ac.signal.aborted||token!==state.buildingToken||!state.overlays.buildings)return;
  state.buildingLayer.clearLayers();
  state.buildingLayer.addData({type:'FeatureCollection',features});
  bringTransitForward();
  baseStatus(features.length.toLocaleString()+' NYC OTI building footprints shown'+(truncated?' · zoom in for complete coverage':''),truncated?'':'good');
 }catch(e){
  if(ac.signal.aborted||token!==state.buildingToken)return;
  state.buildingLayer.clearLayers();
  baseStatus('Building footprint service unavailable: '+e.message+'. Street map remains visible.','error');
 }
}
const SUBWAY_ROOT='https://services.arcgis.com/5e8P2PHwGNSRUvq3/ArcGIS/rest/services/New_York_City_Region_Transit_Layers/FeatureServer/';
const SUBWAY_API={routes:SUBWAY_ROOT+'6/query',stations:SUBWAY_ROOT+'0/query'};
const LIRR_API={routes:SUBWAY_ROOT+'7/query',stations:SUBWAY_ROOT+'1/query'};
const SUBWAY_FALLBACK={
 routes:'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/SubwayLines_share/FeatureServer/0/query',
 stations:'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/SubwayStations_share/FeatureServer/0/query'
};
// Official MTA Brand Colors (2026), not older legacy subway-signage hex codes.
// https://www.mta.info/document/168976 and https://data.ny.gov/d/3uhz-sej2
const SUBWAY_COLORS=Object.freeze({
 '1':'#D82233','2':'#D82233','3':'#D82233',
 '4':'#009952','5':'#009952','6':'#009952',
 '7':'#9A38A1',
 'A':'#0062CF','C':'#0062CF','E':'#0062CF',
 'B':'#EB6800','D':'#EB6800','F':'#EB6800','M':'#EB6800',
 'G':'#799534','J':'#8E5C33','Z':'#8E5C33',
 'L':'#7C858C','N':'#F6BC26','Q':'#F6BC26','R':'#F6BC26','W':'#F6BC26',
 'S':'#7C858C','T':'#008EB7'
});
function transitStatus(message,kind=''){
 const out=el('transit-layer-status');if(out){out.textContent=message;out.dataset.kind=kind}
}
function subwayColor(feature){
 const p=feature.properties||{};
 const raw=String(p.short_name||p.route_short_name||p.route||p.route_id||'').toUpperCase().trim();
 const first=raw.match(/^[1-7A-Z]/)?.[0]||'';
 const color=String(p.color||'').trim().replace(/^#/,'');
 const sourceColor=/^[0-9A-Fa-f]{6}$/.test(color)?'#'+color.toUpperCase():null;
 return SUBWAY_COLORS[first]||sourceColor||'#547b9d';
}
function ensureTransitLayers(){
 if(state.transitLayers.routes&&state.transitLayers.stations)return;
 const map=state.map;
 state.transitLayers.routes=L.geoJSON(null,{
  style:f=>({color:subwayColor(f),weight:map.getZoom()>=14?4.5:3.3,opacity:.9,lineCap:'round'}),
  onEachFeature:(f,l)=>{
   const p=f.properties||{},line=p.short_name||p.route_short_name||p.route_id||'Subway route';
   l.bindTooltip('NYC subway route '+sr(line),{sticky:true});
  }
 });
 state.transitLayers.stations=L.geoJSON(null,{
  pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:map.getZoom()>=15?6:4.5,color:'#25354d',weight:1.6,fillColor:'#ffffff',fillOpacity:1}),
  onEachFeature:(f,l)=>{
   const p=f.properties||{},name=String(p.stop_name||p.station_name||p.name||'Subway station').trim();
   l.bindPopup('<strong>'+sr(name)+'</strong><br>NYC subway station');
   // Permanent station names at neighborhood zooms, not hover-only tooltips.
   l.bindTooltip(sr(name),{permanent:map.getZoom()>=13,sticky:false,direction:'right',offset:[7,0],opacity:.94,className:'subway-station-label'});
  }
 });
}
function syncTransitVisibility(){
 if(!state.map)return;
 ensureTransitLayers();
 const enabled=state.overlays.transit;
 for(const kind of ['routes','stations']){
  const layer=state.transitLayers[kind];
  if(enabled&&state.subway[kind]){
   if(!state.map.hasLayer(layer))layer.addTo(state.map);
  }else{
   state.transitAborts[kind]?.abort();
   if(state.map.hasLayer(layer))state.map.removeLayer(layer);
  }
 }
 if(enabled)loadTransit();else transitStatus('Transit overlays off');
}
function bringTransitForward(){
 if(state.buildingLayer&&state.map.hasLayer(state.buildingLayer))state.buildingLayer.bringToFront();
 // Subway lines above building polygons, station markers above their lines.
 for(const kind of ['routes','stations']){
  const layer=state.transitLayers[kind];
  if(layer&&state.map.hasLayer(layer))layer.bringToFront();
 }
 // LIRR tracks and stations appear above basemap and zoning fills.
 for(const kind of ['routes','stations']){
  const layer=state.lirrLayers[kind];
  if(layer&&state.map.hasLayer(layer))layer.bringToFront();
 }
 // Keep parcel inspection highlights on top of thematic layers.
 window.ZOLA_RESTORE_PARCEL_HIGHLIGHTS?.();
}
window.ZOLA_BRING_TRANSIT_FORWARD=bringTransitForward;
async function loadTransit(){
 if(!state.overlays.transit)return;
 ensureTransitLayers();
 const zoom=state.map.getZoom();
 if(zoom<11){for(const kind of ['routes','stations'])state.transitLayers[kind].clearLayers();transitStatus('Zoom in for NYC subway routes and stations');return}
 const bounds=state.map.getBounds();
 const geometry=JSON.stringify({xmin:bounds.getWest(),ymin:bounds.getSouth(),xmax:bounds.getEast(),ymax:bounds.getNorth(),spatialReference:{wkid:4326}});
 const token=++state.transitLoadToken;
 const results={};
 await Promise.all(['routes','stations'].map(async kind=>{
  if(!state.subway[kind])return;
  const controller=new AbortController();state.transitAborts[kind]?.abort();state.transitAborts[kind]=controller;
  const layer=state.transitLayers[kind];
  if(kind==='stations'&&zoom<12){layer.clearLayers();return}
  const params={f:'geojson',where:'1=1',outFields:'*',geometry,geometryType:'esriGeometryEnvelope',inSR:4326,outSR:4326,spatialRel:'esriSpatialRelIntersects',resultOffset:0,resultRecordCount:1500};
  try{
   let features=[],source='Regional subway service',primaryError=null;
   async function queryService(endpoint){
    const found=[];
    for(let part=0;part<3;part++){
     params.resultOffset=part*1500;
     const data=await fetchJSON(endpoint,params,controller.signal);
     const batch=data.features||[];
     found.push(...batch);
     if(batch.length<1500&&!data.exceededTransferLimit)break;
    }
    return found;
   }
   try{features=await queryService(SUBWAY_API[kind])}
   catch(error){primaryError=error}
   if((primaryError||!features.length)&&!controller.signal.aborted){
    try{const fallback=await queryService(SUBWAY_FALLBACK[kind]);if(fallback.length){features=fallback;source='NYC Planning GIS fallback';primaryError=null}}
    catch(error){if(primaryError)throw Error('Regional service: '+primaryError.message+'; NYC Planning fallback: '+error.message);if(!features.length)throw error}
   }
   if(primaryError&&!features.length)throw primaryError;
   if(controller.signal.aborted||token!==state.transitLoadToken||!state.overlays.transit||!state.subway[kind])return;
   // GTFS station point feeds sometimes contain several platform stops at the same station.
   // Remove co-located duplicate labels while preserving distinct station names.
   if(kind==='stations'){
    const seen=new Set();
    features=features.filter(f=>{
     const p=f.properties||{},coords=f.geometry?.coordinates||[];
     const label=String(p.stop_name||p.station_name||p.name||'').trim().toLowerCase();
     const key=label+'|'+(Number(coords[0])||0).toFixed(3)+'|'+(Number(coords[1])||0).toFixed(3);
     if(seen.has(key))return false;seen.add(key);return true;
    });
   }
   layer.clearLayers();layer.addData({type:'FeatureCollection',features});
   results[kind]={count:features.length,source};
  }catch(e){
   if(controller.signal.aborted||e.name==='AbortError')return;
   results[kind]={error:e.message};
  }
 }));
 if(token!==state.transitLoadToken||!state.overlays.transit)return;
 bringTransitForward();
 const loaded=Object.entries(results).filter(([k,v])=>v&&typeof v.count==='number');
 const failed=Object.entries(results).filter(([k,v])=>v&&v.error);
 if(failed.length){transitStatus(failed.map(([k,v])=>k+': '+v.error).join(' · '),'error')}
 else if(loaded.length){
  const message=loaded.map(([k,v])=>v.count+' '+k+(v.source==='NYC Planning GIS fallback'?' (DCP fallback)':'')).join(' · ');
  transitStatus(message+(loaded.every(([k,v])=>v.count===0)?' · No features in the visible map area':' shown'),loaded.every(([k,v])=>v.count===0)?'':'good');
 }
}
// LIRR routes use the feature service's own hex color field where available.
// See NYC_LIRR_routes FeatureServer/7 renderer, e.g. Montauk #006983.
function lirrStatus(message,kind=''){
 const n=el('lirr-layer-status');if(n){n.textContent=message;n.dataset.kind=kind}
}
function lirrColor(f){
 const raw=String(f.properties?.color||'').replace(/^#/,'');
 return /^[0-9A-Fa-f]{6}$/.test(raw)?'#'+raw.toUpperCase():'#006983';
}
function ensureLirrLayers(){
 if(state.lirrLayers.routes&&state.lirrLayers.stations)return;
 const map=state.map;
 state.lirrLayers.routes=L.geoJSON(null,{
  style:f=>({color:lirrColor(f),weight:map.getZoom()>=14?4:3,opacity:.95,lineCap:'round'}),
  onEachFeature:(f,l)=>{
   const p=f.properties||{},name=String(p.long_name||p.short_name||'LIRR route');
   l.bindTooltip(sr(name),{sticky:true});
  }
 });
 state.lirrLayers.stations=L.geoJSON(null,{
  pointToLayer:(f,latlng)=>L.circleMarker(latlng,{radius:map.getZoom()>=15?6:4.5,color:'#006983',weight:2,fillColor:'#ffffff',fillOpacity:1}),
  onEachFeature:(f,l)=>{
   const p=f.properties||{},name=String(p.stop_name||p.station_name||p.name||'LIRR station').trim();
   l.bindPopup('<strong>'+sr(name)+'</strong><br>Long Island Rail Road');
   l.bindTooltip(sr(name),{permanent:map.getZoom()>=13,sticky:false,direction:'right',offset:[7,0],opacity:.95,className:'lirr-station-label'});
  }
 });
}
function syncLirrVisibility(){
 if(!state.map)return;
 ensureLirrLayers();
 for(const kind of ['routes','stations']){
  const layer=state.lirrLayers[kind];
  if(state.overlays.lirr&&state.lirr[kind]){
   if(!state.map.hasLayer(layer))layer.addTo(state.map);
  }else{
   state.lirrAborts[kind]?.abort();
   if(state.map.hasLayer(layer))state.map.removeLayer(layer);
  }
 }
 if(state.overlays.lirr)loadLirr();
 else lirrStatus('LIRR overlay off');
}
async function loadLirr(){
 if(!state.overlays.lirr||!state.map)return;
 ensureLirrLayers();
 const zoom=state.map.getZoom();
 if(zoom<11){
  for(const kind of ['routes','stations'])state.lirrLayers[kind].clearLayers();
  lirrStatus('Zoom in to see LIRR lines and stops');return;
 }
 const bounds=state.map.getBounds();
 const geometry=JSON.stringify({xmin:bounds.getWest(),ymin:bounds.getSouth(),xmax:bounds.getEast(),ymax:bounds.getNorth(),spatialReference:{wkid:4326}});
 const token=++state.lirrLoadToken,results={};
 await Promise.all(['routes','stations'].map(async kind=>{
  if(!state.lirr[kind])return;
  const controller=new AbortController();state.lirrAborts[kind]?.abort();state.lirrAborts[kind]=controller;
  const layer=state.lirrLayers[kind];
  const params={f:'geojson',where:'1=1',outFields:'*',geometry,geometryType:'esriGeometryEnvelope',inSR:4326,outSR:4326,spatialRel:'esriSpatialRelIntersects',resultOffset:0,resultRecordCount:1500};
  try{
   let features=[];
   for(let page=0;page<3;page++){
    params.resultOffset=page*1500;
    const data=await fetchJSON(LIRR_API[kind],params,controller.signal);
    const batch=data.features||[];
    features.push(...batch);
    if(batch.length<1500&&!data.exceededTransferLimit)break;
   }
   if(controller.signal.aborted||token!==state.lirrLoadToken||!state.overlays.lirr||!state.lirr[kind])return;
   if(kind==='stations'){
    const seen=new Set();
    features=features.filter(f=>{
     const p=f.properties||{},xy=f.geometry?.coordinates||[];
     const key=String(p.stop_name||p.station_name||p.name||'').toLowerCase()+'|'+(Number(xy[0])||0).toFixed(3)+'|'+(Number(xy[1])||0).toFixed(3);
     if(seen.has(key))return false;seen.add(key);return true;
    });
   }
   layer.clearLayers();layer.addData({type:'FeatureCollection',features});
   results[kind]=features.length;
  }catch(e){
   if(controller.signal.aborted||e.name==='AbortError')return;
   results[kind]='Error: '+e.message;
  }
 }));
 if(token!==state.lirrLoadToken||!state.overlays.lirr)return;
 bringTransitForward();
 const errors=Object.entries(results).filter(([k,v])=>typeof v==='string');
 if(errors.length)lirrStatus(errors.map(([k,v])=>k+' '+v).join(' · '),'error');
 else lirrStatus(Object.entries(results).map(([k,v])=>v+' '+k).join(' · ')+' shown','good');
}
function updateOverlayStatus(){
 const active=['transit','lirr','buildings','aerial'].filter(id=>state.overlays[id]);
 baseStatus('Street basemap · '+(active.length?active.join(' + ')+' enabled':'no optional overlays'));
}
function toggleOverlay(id,enabled){
 if(!state.map||!['transit','lirr','buildings','aerial'].includes(id))return;
 state.overlays[id]=Boolean(enabled);
 if(id==='transit'){
  if(enabled&&!state.subway.routes&&!state.subway.stations){
   state.subway.routes=true;state.subway.stations=true;
   for(const name of ['routes','stations']){const cb=el('transit-'+name);if(cb)cb.checked=true}
  }
  syncTransitVisibility();
 }
 if(id==='lirr'){
  if(enabled&&!state.lirr.routes&&!state.lirr.stations){
   state.lirr.routes=true;state.lirr.stations=true;
   for(const kind of ['routes','stations']){const cb=el('lirr-'+kind);if(cb)cb.checked=true}
  }
  syncLirrVisibility();
 }
 if(id==='buildings'){
  if(enabled)loadBuildingFootprints();else dropBuildingLayer();
 }
 if(id==='aerial'){if(enabled)loadAerial();else removeAerial()}
 state.map.getContainer().dataset.basemap=state.overlays.aerial?'aerial':'transit';
 updateOverlayStatus();
}
function removeAerial(){
 ++state.baseLoadToken;
 if(state.aerialLayer){state.map.removeLayer(state.aerialLayer);state.aerialLayer=null}
}
function loadAerial(){
 if(!state.overlays.aerial||!state.map)return;
 removeAerial();
 const token=++state.baseLoadToken;
 const overlay=L.tileLayer(baseOptions.aerial.url,{attribution:baseOptions.aerial.attribution,maxNativeZoom:19,maxZoom:20,opacity:.82,updateWhenIdle:true});
 state.aerialLayer=overlay;
 overlay.addTo(state.map);
 let loaded=0,errors=0,reported=false;
 overlay.on('tileload',()=>{loaded++;if(!reported&&token===state.baseLoadToken){reported=true;baseStatus('Current aerial imagery loaded','good')}});
 overlay.on('tileerror',()=>{
  if(token!==state.baseLoadToken)return;
  errors++;
  if(errors>=2&&errors>loaded){
   removeAerial();
   state.overlays.aerial=false;
   const checkbox=el('toggle-aerial');if(checkbox)checkbox.checked=false;
   baseStatus('Current aerial imagery unavailable. Street map remains visible.','error');
  }
 });
}
function checked(id){const input=el('sub-'+id);return input?(!input.disabled&&input.checked):true}
function visibleCore(key,feature){
 const p=feature.properties||{};
 if(key==='zoning'){
  const z=String(p.ZONEDIST||'').toUpperCase().trim();
  const m=z.match(/^([RCM])(\d{1,2})/);
  if(m){
   const type=m[1],district=type+m[2];
   const groupId=type==='R'?'residence-districts':type==='C'?'commercial-districts':'manufacturing-districts';
   return checked(groupId)&&checked('zone-'+district);
  }
  if(/PARK/i.test(z))return checked('parks');
  return true;
 }
 if(key==='commercial'){
  const overlay=String(p.OVERLAY||'').toUpperCase().trim();
  const m=overlay.match(/^(C[12])-(\d+)/);
  if(!m)return true;
  return checked('overlay-'+m[1].toLowerCase())&&checked('overlay-'+m[1]+'-'+m[2]);
 }
 return true;
}
function optionalVisible(item,f){
 const p=f.properties||{};
 const enabled=id=>checked(id);
 if(item.id==='council')return enabled('council-new');
 if(item.id==='edesignations')return enabled('edesignation-item');
 if(item.id==='fresh-zones'){
  const label=String(p.Name||'').toLowerCase();
  if(label==='zoning incentives')return enabled('fresh-zoning');
  if(label==='zoning and discretionary tax incentives')return enabled('fresh-both');
  if(label==='discretionary tax incentives')return enabled('fresh-tax');
  return true;
 }
 if(item.id==='firm2007'){
  const zone=String(p.FLD_ZONE||p.ZONE||p.FLD_ZONE1||'').toUpperCase();
  if(!zone)return true;
  if(zone.startsWith('V'))return enabled('flood07-v');
  if(zone.startsWith('A'))return enabled('flood07-a');
  if(zone.startsWith('X'))return enabled('flood07-x');
  return true;
 }
 if(item.id==='landmarks'||item.id==='transit-parking'){
  // When a service lacks reliable subtype attributes, display its full geometry rather than silently misclassifying it.
  // The UI marks these subtype filters as provisional in the parent layer's metadata tooltip.
  return true;
 }
 if(item.id==='zma'&&window.ZOLA_ZMA_DATE_RANGE){
  const r=window.ZOLA_ZMA_DATE_RANGE;
  const field=Object.entries(p).find(([k,v])=>/^(ADOPT_DATE|ADOPTION_DATE|EFFECTIVE_DATE|EFFECTDATE|EFFECTIVE|REZ_DATE)$/i.test(k)&&v!=null);
  if(field){
   const time=Number(field[1])>1000000000?new Date(Number(field[1])):new Date(field[1]);
   if(!Number.isNaN(time.getTime())){
    const val=time.getUTCFullYear()+'-'+String(time.getUTCMonth()+1).padStart(2,'0');
    return val>=r.start&&val<=r.end;
   }
  }
 }
 return true;
}
function syncZoningChildren(){
 const zoning=GROUPS[0].items.find(item=>item.id==='zoning');
 const parks=zoning?.children?.find(item=>item.id==='parks');
 if(!parks||!state.map)return;
 const active=!!el('layer-zoning')?.checked&&!!el('sub-parks')?.checked;
 if(active&&!state.active.has(parks.id))activate(parks);
 if(!active&&state.active.has(parks.id))deactivate(parks);
}
window.ZOLA_SYNC_CHILDREN=syncZoningChildren;
window.ZOLA_VISIBLE_FEATURE=visibleCore;
function styleFor(item,f){
 let col=item.color||'#7e6a99';const geom=f.geometry?.type||'';
 if(item.id==='fresh-zones'){
  const name=String(f.properties?.Name||'');
  col=name==='Zoning incentives'?'#89CD66':name==='Zoning and discretionary tax incentives'?'#5C8944':name==='Discretionary tax incentives'?'#B2B2B2':col;
 }
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
function onVisibleViewport(){clearTimeout(state.loaded);state.loaded=setTimeout(()=>{for(const entry of state.active.values())if(entry.item)load(entry.item);if(state.overlays.buildings)loadBuildingFootprints();if(state.overlays.transit)loadTransit();if(state.overlays.lirr)loadLirr()},420)}
async function fetchJSON(url,params={},signal){
 return window.ZOLA_GIS.request(url,params,signal,{cache:true});
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
  const shown=all.filter(f=>optionalVisible(item,f));
  group.clearLayers();group.addData({type:'FeatureCollection',features:shown});
  if(item.id==='zma')group.bringToFront();
  activeLayersOnTop();
  bringTransitForward();
  smallState(item,all.length>=3000?'Zoom for detail':shown.length+' shown',all.length>=3000?'warn':'good');
 }catch(e){if(ac.signal.aborted||e.name==='AbortError')return;group.clearLayers();smallState(item,'Unavailable','error');console.warn('ZoLa layer error',item.id,e)}
}
function activate(item){
 if(state.active.has(item.id))return;
 const layer=makeLayer(item);layer.addTo(state.map);
 state.active.set(item.id,{item,layer,abort:null});load(item);
}
function deactivate(item){
 const entry=state.active.get(item.id);if(!entry)return;
 entry.abort?.abort();state.map.removeLayer(entry.layer);state.active.delete(item.id);smallState(item,'Off');
}
function setup(map){
 state.map=map;build();map.on('moveend',onVisibleViewport);
 ensureTransitLayers();syncTransitVisibility();
 map.getContainer().dataset.basemap='transit';
 document.body.classList.add('layer-catalog-active');
}
window.setupLayerExplorer=setup;
window.ZOLA_LAYER_CATALOG=ITEMS.map(({id,name,group,source,available})=>({id,name,group,source,available:available!==false}));
})();