/* Build 44: desktop sidebar toggle works independently of map initialization. */
(function(){
 'use strict';
 function install(){
  const button=document.getElementById('desktop-menu-toggle');
  const panel=document.getElementById('mobile-sheet');
  const label=document.getElementById('desktop-menu-label');
  const icon=document.getElementById('desktop-menu-icon');
  if(!button||!panel)return;
  const desktop=window.matchMedia('(min-width: 741px)');
  let open=true;
  function resizeMap(){
   // Leaflet observes window resize. This works even when the main app did not initialize.
   window.requestAnimationFrame(()=>{
    window.dispatchEvent(new Event('resize'));
    window.setTimeout(()=>window.dispatchEvent(new Event('resize')),120);
   });
  }
  function setOpen(next){
   open=next||!desktop.matches;
   const hidden=desktop.matches&&!open;
   panel.hidden=hidden;
   document.body.classList.toggle('desktop-menu-hidden',hidden);
   button.setAttribute('aria-expanded',String(!hidden));
   button.setAttribute('aria-label',hidden?'Show sidebar':'Hide sidebar');
   button.title=hidden?'Show sidebar':'Hide sidebar';
   if(label)label.textContent=hidden?'Show menu':'Hide menu';
   if(icon)icon.textContent=hidden?'❮':'❯';
   if(hidden){
    panel.setAttribute('aria-hidden','true');
    if('inert' in panel)panel.inert=true;
   }else{
    panel.removeAttribute('aria-hidden');
    if('inert' in panel)panel.inert=false;
   }
   resizeMap();
  }
  button.addEventListener('click',()=>{if(desktop.matches)setOpen(!open)});
  if(typeof desktop.addEventListener==='function'){
   desktop.addEventListener('change',()=>setOpen(true));
  }else if(typeof desktop.addListener==='function'){
   desktop.addListener(()=>setOpen(true));
  }
  window.ZOLA_SHOW_DESKTOP_MENU=()=>{if(desktop.matches&&!open)setOpen(true)};
  setOpen(true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})();
