/* ZoLa Backup HY: shared GIS request manager
   Bounded concurrent requests, cancellation, short-lived LRU cache, and retry for transient failures.
   Only successful responses are cached; feature data remains sourced from public agencies. */
(function(){
 'use strict';
 const LIMIT=5,MAX_CACHE=40,TTL=60000,DEFAULT_TIMEOUT=14000;
 const queue=[],cache=new Map(),stats={network:0,cacheHits:0,failures:0,retries:0,peakActive:0};
 let active=0;
 class TimeoutError extends Error{constructor(){super('Request timed out');this.name='TimeoutError'}}
 function cacheGet(key){
  const hit=cache.get(key);
  if(!hit)return null;
  if(hit.expires<=Date.now()){cache.delete(key);return null}
  cache.delete(key);cache.set(key,hit);
  stats.cacheHits++;
  return hit.value;
 }
 function cacheSet(key,value){
  cache.delete(key);cache.set(key,{value,expires:Date.now()+TTL});
  while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
 }
 function pump(){
  while(active<LIMIT&&queue.length){
   const job=queue.shift();
   if(job.signal?.aborted){job.reject(new DOMException('Request aborted','AbortError'));continue}
   active++;stats.peakActive=Math.max(stats.peakActive,active);
   run(job).then(job.resolve,job.reject).finally(()=>{active--;pump()});
  }
 }
 function wait(ms,signal){
  return new Promise((resolve,reject)=>{
   if(signal?.aborted)return reject(new DOMException('Request aborted','AbortError'));
   const t=setTimeout(()=>{signal?.removeEventListener('abort',onAbort);resolve()},ms);
   function onAbort(){clearTimeout(t);reject(new DOMException('Request aborted','AbortError'))}
   signal?.addEventListener('abort',onAbort,{once:true});
  });
 }
 async function run(job){
  const {url,signal,timeout,cacheable}=job;
  const cached=cacheable?cacheGet(url):null;
  if(cached!==null)return cached;
  for(let attempt=0;attempt<2;attempt++){
   if(signal?.aborted)throw new DOMException('Request aborted','AbortError');
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),timeout);
   function abort(){controller.abort()}
   signal?.addEventListener('abort',abort,{once:true});
   let retry=false;
   try{
    stats.network++;
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok){
     retry=[429,500,502,503,504].includes(response.status);
     throw new Error('GIS service returned HTTP '+response.status);
    }
    const data=await response.json();
    if(data?.error){
     retry=[429,500,502,503,504].includes(Number(data.error.code));
     throw new Error('GIS service error: '+String(data.error.message||data.error.code));
    }
    // Avoid retaining exceptionally large map responses in phone memory.
    if(cacheable&&(!Array.isArray(data.features)||data.features.length<=2000))cacheSet(url,data);
    return data;
   }catch(error){
    if(signal?.aborted)throw new DOMException('Request aborted','AbortError');
    if(controller.signal.aborted){retry=true;error=new TimeoutError()}
    if(attempt===0&&retry){
     stats.retries++;await wait(350,signal);
     continue;
    }
    stats.failures++;throw error;
   }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',abort);
   }
  }
 }
 function request(url,params={},signal,opts={}){
  const u=new URL(url,location.href);
  for(const [key,value] of Object.entries(params))if(value!==undefined&&value!==null)u.searchParams.set(key,String(value));
  const href=u.href;
  return new Promise((resolve,reject)=>{
   if(signal?.aborted)return reject(new DOMException('Request aborted','AbortError'));
   const job={url:href,signal,resolve,reject,timeout:opts.timeout||DEFAULT_TIMEOUT,cacheable:opts.cache!==false};
   // Interactive parcel lookups jump ahead of queued background map tiles/geometry.
   if(opts.priority>0)queue.unshift(job);else queue.push(job);
   pump();
  });
 }
 window.ZOLA_GIS={request,stats,cacheSize:()=>cache.size,clearCache:()=>cache.clear(),config:{concurrency:LIMIT,timeoutMs:DEFAULT_TIMEOUT,cacheTtlMs:TTL,maxCacheEntries:MAX_CACHE}};
})();