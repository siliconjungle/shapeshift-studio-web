import {styledAssets} from './authoring/appearance.js';
import {equalsJson} from './frontier-vendor.js';
// Change classification is computed once per authored transaction, never per frame.
// Unknown/imported edits fall back to rebuilding; no command may hide a mutation.
export function projectChanges(before,after,patch){
  const scopes=new Set();for(const op of patch){if(!op[1].length){for(const k of new Set([...Object.keys(before),...Object.keys(after)]))if(!equalsJson(before[k]??null,after[k]??null))scopes.add(k);}else scopes.add(String(op[1][0]));}
  const styleAssets=scopes.has('appearance')&&!equalsJson(styledAssets(before),styledAssets(after));
  const result={scopes:[...scopes],assets:scopes.has('assets')||styleAssets,scene3d:null};
  const puppetChanged=['joints','clips','fx','lighting','assets','appearance'].some(k=>scopes.has(k))&&(after.scene3d?.nodes??[]).some(n=>n.type==='puppet');if(!scopes.has('scene3d')&&!scopes.has('assets')&&!puppetChanged&&!scopes.has('grading')&&!scopes.has('appearance')&&!scopes.has('backdrop'))return result;
  const a=before.scene3d,b=after.scene3d;if(!a&&!b)return result;
  if(!a||!b){result.scene3d={full:true,geometry:true,animation:true,appearance:true,effects:true,camera:true,nodeIds:b?.nodes.map(n=>n.id)??[]};return result;}
  const changed=(x,y)=>!equalsJson(x??null,y??null),oldNodes=new Map(a.nodes.map(n=>[n.id,n])),nodeIds=[];
  let geometry=changed(a.nodes.map(n=>n.id),b.nodes.map(n=>n.id)),appearance=scopes.has('backdrop')||scopes.has('grading')||scopes.has('appearance')||changed(a.materials,b.materials)||changed(a.environment,b.environment);
  const geometryFields=['type','parent','variant','dimensions','radius','segments','material','svg','profile','castShadow','receiveShadow','illustration'];
  const surfaceShape=s=>Object.fromEntries(Object.entries(s).map(([face,v])=>[face,{...v,...(v.eye?{eye:{...v.eye,open:0,gaze:[0,0],tilt:0}}:{})}]));
  for(const n of b.nodes){const old=oldNodes.get(n.id);if(!old){geometry=true;nodeIds.push(n.id);continue;}if(changed(old,n))nodeIds.push(n.id);if(geometryFields.some(k=>changed(old[k],n[k]))||changed(surfaceShape(old.surfaces),surfaceShape(n.surfaces)))geometry=true;}
  const oldMats=new Map(a.materials.map(m=>[m.id,m]));
  if(a.materials.length!==b.materials.length)geometry=true;
  for(const m of b.materials){const old=oldMats.get(m.id);if(!old||['map','heightMap','roughnessMap','repeat','flat'].some(k=>changed(old[k],m[k])))geometry=true;}
  // Only a used asset can invalidate scene resources. Unrelated library imports do not.
  let assets=false;if(result.assets){const refs=new Set();for(const n of b.nodes){if(n.svg)refs.add(n.svg);for(const surface of Object.values(n.surfaces))for(const k of ['asset','iris','heightMap','roughnessMap','irisHeightMap','irisRoughnessMap'])if(surface[k])refs.add(surface[k]);}for(const m of b.materials)for(const k of ['map','heightMap','roughnessMap'])if(m[k])refs.add(m[k]);const previous=new Map(before.assets.map(x=>[x.id,[x.src,!!x.vector?.tracks.length]]));for(const asset of after.assets)if(refs.has(asset.id)&&(previous.get(asset.id)?.[0]!==asset.src||previous.get(asset.id)?.[1]!==!!asset.vector?.tracks.length))assets=true;}
  const libraryStyles=p=>(p.appearance?.variants??[]).map(v=>[v.id,v.effects,v.voices]);const styleLibraries=scopes.has('appearance')&&(changed(libraryStyles(before),libraryStyles(after))||(before.appearance?.active!==after.appearance?.active&&(after.appearance?.variants??[]).some(v=>v.effects||v.voices)));
  const events=s=>s.clips.map(c=>({id:c.id,events:c.events}));
  result.scene3d={full:false,geometry:geometry||assets||styleAssets||changed(a.rendering,b.rendering)||changed(a.resources,b.resources)||changed(a.controllerLibraries,b.controllerLibraries)||changed(a.nodes.map(n=>n.controller?.presentation??null),b.nodes.map(n=>n.controller?.presentation??null))||changed(a.nodes.map(n=>n.controller?.library??null),b.nodes.map(n=>n.controller?.library??null)),appearance,animation:changed(a.clips,b.clips),effects:result.assets||styleLibraries||changed(events(a),events(b))||changed(a.effectLibraries,b.effectLibraries)||changed(a.audioLibraries,b.audioLibraries),camera:changed(a.camera,b.camera),nodeIds};
  return result;
}
