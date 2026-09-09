import {capturePuppetDependencies,importPuppetDependencies,remapPuppetNodes} from './library-puppets.js';
const copy=x=>structuredClone(x),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const check=(v,m)=>{if(!v)throw Error('Library: '+m);};
const assetKeys=['asset','svg','iris','heightMap','roughnessMap','irisHeightMap','irisRoughnessMap','map'];
const unique=(ids,base)=>{let id=base,i=2;while(ids.includes(id))id=base+'-'+i++;return id;};
function arrayImport(target,values,prefix,transform=x=>copy(x)){
 const map={};for(const source of values??[]){const value=transform(source),equal=target.find(v=>same({...v,id:undefined},{...value,id:undefined}));const id=equal?.id??(!target.some(v=>v.id===value.id)?value.id:unique(target.map(v=>v.id),prefix+'-'+Object.keys(map).length));if(!equal)target.push({...value,id});map[source.id]=id;}return map;
}
function objectImport(target,values,prefix,transform=x=>copy(x)){
 const map={};for(const [source,definition]of Object.entries(values??{})){const value=transform(definition),equal=Object.entries(target).find(([,v])=>same(v,value)),id=equal?.[0]??(!Object.hasOwn(target,source)?source:unique(Object.keys(target),prefix+'-'+Object.keys(map).length));if(!equal)target[id]=value;map[source]=id;}return map;
}
function mapAssets(object,map){const out=copy(object);for(const key of assetKeys)if(typeof out?.[key]==='string'&&map[out[key]])out[key]=map[out[key]];return out;}

// Capture only dependencies used by this component. Runtime controller programs
// are opaque data: their variable names and literal strings must never be remapped.
export function captureComponentDependencies(p,dimension,nodes){
 const assets=new Set(),materialIds=new Set(),audioIds=new Set(),effectIds=new Set(),controllerIds=new Set(),vectorIds=new Set();let ground=false;
 const collect=o=>{for(const key of assetKeys)if(typeof o?.[key]==='string')assets.add(o[key]);};
 for(const n of nodes){collect(n);collect(n.sprite);for(const s of Object.values(n.surfaces??{}))collect(s);if(n.material)materialIds.add(n.material);if(n.illustration?.ground){ground=true;if(n.illustration.ground.paletteMaterial)materialIds.add(n.illustration.ground.paletteMaterial);}if(n.illustration?.vectorLibrary)vectorIds.add(n.illustration.vectorLibrary);if(n.controller){controllerIds.add(n.controller.library);const d=n.controller.presentation;if(d?.audioLibrary)audioIds.add(d.audioLibrary);if(d?.effectLibrary)effectIds.add(d.effectLibrary);collect(d?.landing);}}
 const doc=dimension===3?p.scene3d:p,take=(ids,table,label)=>Object.fromEntries([...ids].map(id=>{check(table?.[id],'missing '+label+' '+id);return[id,copy(table[id])];}));
 const materials=(doc.materials??[]).filter(m=>materialIds.has(m.id)).map(m=>{collect(m);return copy(m);});check(materials.length===materialIds.size,'missing component material');
 const packet={version:1,assets:[],materials,audioLibraries:take(audioIds,doc.audioLibraries,'audio'),effectLibraries:take(effectIds,doc.effectLibraries,'effects'),controllerLibraries:take(controllerIds,doc.controllerLibraries,'controller')};
 if(vectorIds.size||ground){packet.rendering=copy(doc.rendering);check(packet.rendering,'missing illustrated rendering profile');packet.rendering.vectorLibraries=take(vectorIds,doc.rendering.vectorLibraries,'vector library');for(const v of Object.values(packet.rendering.vectorLibraries))for(const id of Object.values(v.sources??{}))assets.add(id);packet.resources=copy(doc.resources??[]);const resourceIds=new Set(packet.resources.map(r=>r.id));packet.rendering.resources=Object.fromEntries(Object.entries(packet.rendering.resources??{}).filter(([,id])=>resourceIds.has(id)));}
 if(dimension===3&&nodes.some(n=>n.type==='puppet'))packet.puppets=capturePuppetDependencies(p,nodes);
 for(const id of assets){const a=p.assets.find(a=>a.id===id);check(a,'missing component artwork '+id);packet.assets.push(copy(a));}return packet;
}
export function importComponentDependencies(p,item){
 const b=item.dependencies;if(!b)return{assets:{},materials:{},audioLibraries:{},effectLibraries:{},controllerLibraries:{},vectorLibraries:{}};
 const doc=item.dimension===3?p.scene3d:p,prefix=item.id.slice(0,40),maps={};check(doc,'create a destination scene first');maps.assets=arrayImport(p.assets,b.assets,prefix+'-art');
 maps.materials=b.materials?.length?arrayImport(doc.materials??(doc.materials=[]),b.materials,prefix+'-mat',m=>mapAssets(m,maps.assets)):{};
 for(const kind of ['audioLibraries','effectLibraries','controllerLibraries'])maps[kind]=Object.keys(b[kind]??{}).length?objectImport(doc[kind]??(doc[kind]={}),b[kind],prefix+'-'+kind):{};
 maps.vectorLibraries={};if(b.rendering){
  const source=b.rendering;
  if(doc.rendering)check(same(doc.rendering.inputs,source.inputs),'component and scene use different illustrated shader inputs');
  else{const {resources,vectorLibraries,...settings}=source;doc.rendering=copy(settings);}
  const profile=doc.rendering;profile.resources??={};profile.vectorLibraries??={};maps.resources=arrayImport(doc.resources??(doc.resources=[]),b.resources,prefix+'-resource');
  const urls=Object.entries(source.resources??{}),collides=urls.some(([url,id])=>Object.hasOwn(profile.resources,url)&&profile.resources[url]!==maps.resources[id]);let namespace='';
  if(collides){let n=1;do{namespace=prefix+'-'+n+++'/';}while(urls.some(([url,id])=>Object.hasOwn(profile.resources,namespace+url)&&profile.resources[namespace+url]!==maps.resources[id]));}
  maps.resourcePrefix=namespace;for(const [url,id]of urls){check(maps.resources[id],'missing illustrated resource '+id);profile.resources[namespace+url]=maps.resources[id];}
  maps.vectorLibraries=objectImport(profile.vectorLibraries,source.vectorLibraries,prefix+'-vectors',v=>({...copy(v),manifest:namespace+v.manifest,base:namespace+v.base,sources:Object.fromEntries(Object.entries(v.sources??{}).map(([key,id])=>[key,maps.assets[id]??id]))}));
 }
 maps.puppets=importPuppetDependencies(p,item);return maps;
}
export function componentDependencyNodes(nodes,maps){return remapPuppetNodes(nodes,maps.puppets??{}).map(source=>{
 const n=mapAssets(source,maps.assets);if(n.sprite)n.sprite=mapAssets(n.sprite,maps.assets);if(n.material)n.material=maps.materials[n.material]??n.material;
 if(n.surfaces)n.surfaces=Object.fromEntries(Object.entries(n.surfaces).map(([face,s])=>[face,mapAssets(s,maps.assets)]));
 if(n.controller){const c=n.controller;c.library=maps.controllerLibraries[c.library]??c.library;if(c.presentation){const d=c.presentation;if(d.audioLibrary)d.audioLibrary=maps.audioLibraries[d.audioLibrary]??d.audioLibrary;if(d.effectLibrary)d.effectLibrary=maps.effectLibraries[d.effectLibrary]??d.effectLibrary;if(d.landing)d.landing=mapAssets(d.landing,maps.assets);}}
 if(n.illustration){const i=n.illustration;if(i.vectorLibrary)i.vectorLibrary=maps.vectorLibraries[i.vectorLibrary]??i.vectorLibrary;if(i.ground){i.ground.paletteMaterial=maps.materials[i.ground.paletteMaterial]??i.ground.paletteMaterial;for(const key of ['manifest','maps','paint'])if(i.ground[key])i.ground[key]=(maps.resourcePrefix??'')+i.ground[key];}}
 return n;
});}
