import {assertProjectReferences} from '../references/catalog.js';
import {omitDerivedVectors} from '../scene3d/core/portable.js';
const dataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
// Freeze resource documents only. Arbitrary component values are opaque game data.
export async function portableProject(project,{baseURL=document.baseURI,fetcher=fetch,encode=dataURL}={}){
 assertProjectReferences(project);const out=structuredClone(project);omitDerivedVectors(out);
 const cache=new Map(),jobs=[];
 const embed=src=>{if(src.startsWith('data:'))return Promise.resolve(src);const url=new URL(src,baseURL).href;if(!cache.has(url))cache.set(url,(async()=>{const response=await fetcher(url);if(!response.ok)throw Error('Could not embed project resource: '+url);return encode(await response.blob())})());return cache.get(url)};
 function visit(value){if(!value||typeof value!=='object')return;for(const key of ['src','originalSrc'])if(typeof value[key]==='string')jobs.push(async()=>{value[key]=await embed(value[key])});if(Array.isArray(value.frames))jobs.push(async()=>{value.frames=await Promise.all(value.frames.map(embed))});for(const [key,child]of Object.entries(value))if(!['program','parameters','frames'].includes(key)&&child&&typeof child==='object')visit(child)}
 for(const resources of [out.assets,out.scene3d?.resources,out.fx?.models,out.library?.items])visit(resources);
 let cursor=0;await Promise.all(Array.from({length:Math.min(4,jobs.length)},async()=>{while(cursor<jobs.length)await jobs[cursor++]()}));return out;
}
