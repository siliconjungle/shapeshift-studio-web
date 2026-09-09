import {omitDerivedVectors} from '../scene3d/core/portable.js';

// A rendered reference owns ordinary runtime data, never another snapshot or
// authoring source links. Controllers and their executable data stay intact.
export function renderSnapshot(project){
 const {preview,library,actions,environmentSource,...source}=project,p=structuredClone(source);
 for(const d of [p,p.scene3d].filter(Boolean)){
  for(const n of d.nodes??d.joints??[]){delete n.librarySource;delete n.facialSource;}
  for(const c of d.clips??[]){delete c.actionSource;delete c.libraryOrigins;for(const l of c.tools?.layers??[])delete l.expressionSource;for(const e of [...(c.events??[]),...(c.cues??[]),...(c.fx?.emitters??[])])delete e.librarySource;}
  for(const e of d.fx?.emitters??[])delete e.librarySource;
 }
 return p;
}

export async function freezeReference(project,{baseURL=document.baseURI,fetcher=fetch}={}){
 const p=omitDerivedVectors(renderSnapshot(project)),cache=new Map();
 const embed=src=>{if(src.startsWith('data:'))return Promise.resolve(src);const url=new URL(src,baseURL).href;if(!cache.has(url))cache.set(url,(async()=>{const r=await fetcher(url);if(!r.ok)throw Error('Cannot save reference asset: '+url);const blob=await r.blob();return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});})());return cache.get(url);};
 // A small concurrency bound avoids issuing hundreds of requests at once.
 const jobs=[];for(const d of [p,p.scene3d].filter(Boolean)){
  for(const a of [...(d.assets??[]),...(d.resources??[]),...(d.fx?.models??[])]){jobs.push(async()=>{a.src=await embed(a.src);});if(a.frames)jobs.push(async()=>{a.frames=await Promise.all(a.frames.map(embed));});}
  for(const c of d.clips??[])for(const model of c.fx?.models??[])jobs.push(async()=>{model.src=await embed(model.src);});
 }
 let next=0;await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{while(next<jobs.length)await jobs[next++]();}));return p;
}
