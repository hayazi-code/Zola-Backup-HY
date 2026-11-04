/* Mobile map-first interaction: independent of GIS querying. */
(function(){
'use strict';
const isMobile=window.matchMedia('(max-width: 740px)');
const el=id=>document.getElementById(id);
let mapRef=null, expanded=false, startY=null, startX=null, dragMoved=false;
function invalidateMap(){try{mapRef?.invalidateSize({animate:false})}catch(e){}}
function show(expand,opts={}){
 expanded=Boolean(expand);
 document.body.classList.toggle('mobile-sheet-expanded',expanded);
 document.body.classList.toggle('mobile-sheet-collapsed',!expanded);
 const toggle=el('mobile-sheet-toggle');
 toggle?.setAttribute('aria-expanded',String(expanded));
 toggle?.setAttribute('aria-label',expanded?'Collapse controls to see the map':'Expand controls');
 const title=el('mobile-sheet-title'),tab=document.querySelector('.tabs button.active');
 if(title)title.textContent=expanded?(tab?.textContent?.trim()||'Explore NYC zoning'):'Explore NYC zoning';
 el('mobile-sheet')?.setAttribute('data-sheet-state',expanded?'expanded':'collapsed');
 if(expanded&&opts.focusSearch){setTimeout(()=>{el('search')?.focus({preventScroll:true})},120)}
 requestAnimationFrame(invalidateMap);
}
function navigate(name){
 if(!isMobile.matches)return;
 if(name==='search'){
  el('tab-explore')?.click();
  show(true,{focusSearch:true});
 }else if(name==='layers'){
  el('tab-explore')?.click();show(true);
  const tree=el('layer-tree');if(tree){el('mobile-sheet-body')?.querySelector('.side-scroll')?.scrollTo({top:0,behavior:'instant'});tree.scrollIntoView({block:'nearest',behavior:'smooth'})}
 }else if(name==='lots'){
  el('tab-selected')?.click();show(true);
 }else if(name==='scenario'){el('tab-scenario')?.click();show(true)}
 else show(false);
}
function onTab(){if(isMobile.matches&&expanded){const title=el('mobile-sheet-title');const t=document.querySelector('.tabs button.active');if(title&&t)title.textContent=t.textContent.trim()}}
function onBreakpoint(){
 if(isMobile.matches){document.body.classList.add('mobile-layout');show(false)}
 else{document.body.classList.remove('mobile-layout','mobile-sheet-expanded','mobile-sheet-collapsed');expanded=false}
 setTimeout(invalidateMap,80);
}
function install(map){
 mapRef=map;
 const bar=el('mobile-sheet-bar'),toggle=el('mobile-sheet-toggle');
 if(!bar||!toggle)return;
 toggle.addEventListener('click',()=>{if(dragMoved){dragMoved=false;return}show(!expanded)});
 el('mobile-search')?.addEventListener('click',()=>navigate('search'));
 el('mobile-layers')?.addEventListener('click',()=>navigate('layers'));
 el('mobile-lots')?.addEventListener('click',()=>navigate('lots'));
 el('mobile-close')?.addEventListener('click',()=>show(false));
 const actions=bar.querySelector('.mobile-quick-actions');
 actions?.addEventListener('pointerdown',e=>e.stopPropagation());
 // Swiping on the handle controls the sheet, not the map.
 toggle.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  startY=e.clientY;startX=e.clientX;dragMoved=false;
 });
 toggle.addEventListener('pointerup',e=>{
  if(startY===null)return;
  const dy=e.clientY-startY,dx=e.clientX-startX;
  if(Math.abs(dy)>38&&Math.abs(dy)>Math.abs(dx)*1.2){
   dragMoved=true;show(dy<0);
  }
  startY=null;startX=null;
 });
 toggle.addEventListener('pointercancel',()=>{startY=null;startX=null});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isMobile.matches&&expanded){const suggestions=el('suggestions');if(suggestions&&!suggestions.hidden)return;show(false)}});
 for(const tab of document.querySelectorAll('.tabs button'))tab.addEventListener('click',onTab);
 isMobile.addEventListener?.('change',onBreakpoint);
 window.addEventListener('orientationchange',()=>setTimeout(invalidateMap,350));
 window.addEventListener('resize',()=>{if(isMobile.matches)invalidateMap()});
 // Ensure the sheet is still usable if the browser text is zoomed.
 onBreakpoint();
}
window.ZOLA_MOBILE_INSTALL=install;
window.ZOLA_MOBILE_OPEN=()=>{if(isMobile.matches)show(true)};
window.ZOLA_MOBILE_COLLAPSE=()=>{if(isMobile.matches)show(false)};
window.ZOLA_MOBILE_NAVIGATE=navigate;
})();