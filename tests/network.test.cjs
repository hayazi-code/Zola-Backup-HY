/* Offline regression checks for GIS network module.
   Run: node --test tests/network.test.cjs */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','gis-network.js'),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function fixture(mockFetch){
 const window={};
 const context={window,fetch:mockFetch,URL,location:{href:'https://example.test/'},setTimeout,clearTimeout,Date,DOMException,Promise,Map,AbortController};
 vm.runInNewContext(source,context,{filename:'gis-network.js'});
 return window.ZOLA_GIS;
}
test('Caches successful GIS responses for repeated URL queries',async()=>{
 let calls=0;
 const api=fixture(async()=>{calls++;return {ok:true,json:async()=>({features:[{id:1}]})}});
 const [a,b]=await Promise.all([
  api.request('https://example.test/query',{f:'geojson',where:'1=1'}),
  api.request('https://example.test/query',{f:'geojson',where:'1=1'})
 ]);
 assert.equal(a.features.length,1);
 assert.equal(b.features.length,1);
 const c=await api.request('https://example.test/query',{f:'geojson',where:'1=1'});
 assert.equal(c.features.length,1);
 assert.ok(calls<=2,'Cached replay should not issue a third network call');
 assert.ok(api.stats.cacheHits>=1);
});
test('Concurrency is bounded for many geographic requests',async()=>{
 let inFlight=0,maximum=0;
 const api=fixture(async()=>{inFlight++;maximum=Math.max(maximum,inFlight);await sleep(12);inFlight--;return {ok:true,json:async()=>({type:'FeatureCollection',features:[]})}});
 await Promise.all(Array.from({length:24},(_,n)=>api.request('https://example.test/query',{key:n},null,{cache:false})));
 assert.ok(maximum<=api.config.concurrency);
 assert.ok(maximum>1);
});
test('Retries transient HTTP 503 and recovers',async()=>{
 let calls=0;
 const api=fixture(async()=>{calls++;if(calls===1)return {ok:false,status:503};return {ok:true,json:async()=>({ok:true})}});
 const response=await api.request('https://example.test/retry',{},null,{cache:false});
 assert.equal(response.ok,true);
 assert.equal(calls,2);
 assert.equal(api.stats.retries,1);
});
test('Propagates ArcGIS JSON errors instead of caching them',async()=>{
 let calls=0;
 const api=fixture(async()=>{calls++;return {ok:true,json:async()=>({error:{code:400,message:'Invalid field'}})}});
 await assert.rejects(api.request('https://example.test/failure'),/Invalid field/);
 await assert.rejects(api.request('https://example.test/failure'),/Invalid field/);
 assert.equal(calls,2);
});
test('Aborted queued requests never initiate fetch',async()=>{
 let calls=0;
 const api=fixture(async()=>{calls++;await sleep(30);return {ok:true,json:async()=>({ok:true})}});
 const running=Array.from({length:5},(_,n)=>api.request('https://example.test/active',{n}));
 const controller=new AbortController();
 const queued=api.request('https://example.test/queued',{},controller.signal).then(()=>false,e=>e.name==='AbortError');
 controller.abort();
 assert.equal(await queued,true);
 await Promise.all(running);
 assert.equal(calls,5);
});
