import {validateJoysticks,remapJoysticks} from '../joysticks/model.js';
import {validateSolos} from '../solos/model.js';
import {remapDrawOrder,validateDrawOrder} from '../draw-order/model.js';
import {captureConstraints,constraintBindings,bindConstraints} from '../constraints/transfer.js';
import {validateConstraints} from '../constraints/model.js';
import {cleanActionTemplate,mergeActionEdits} from './actions.js';
const copy=x=>structuredClone(x),check=(v,m)=>{if(!v)throw Error('Library motion: '+m);};
const doc=(p,d)=>d===3?p.scene3d:p;
const select=(values,ids)=>Object.fromEntries(Object.entries(values??{}).filter(([id])=>ids.has(id)));
const refs=['node','joint','root','mid','receiver','targetNode','sourceNode','target','source'];
function scopedClip(source,dimension,ids,whole){
 const c=cleanActionTemplate(source);
 c.tracks=dimension===3?c.tracks.filter(t=>ids.has(t.node)):select(c.tracks,ids);
 for(const key of ['effects','controllerActions','resolvedTracks','lightingTracks','noodleTracks','meshTracks','illustrationTracks','drawOrderTracks','soloTracks','joystickTracks'])if(c[key])c[key]=c[key].filter(t=>ids.has(t.node??t.joint));
 if(c.controllerParameters)c.controllerParameters=select(c.controllerParameters,ids);
 if(c.ik){c.ik=select(c.ik,ids);for(const chain of Object.values(c.ik))check(ids.has(chain.root)&&ids.has(chain.mid),'include the whole IK chain in the character');}
 if(c.tools){for(const key of ['constraints','follow'])if(c.tools[key]){c.tools[key]=c.tools[key].filter(t=>ids.has(t.joint));for(const t of c.tools[key])for(const id of [t.target,t.source,t.chain?.root,t.chain?.mid].filter(Boolean))check(ids.has(id),'include the character’s constraint targets when saving it');}for(const l of c.tools.layers??[]){l.values=select(l.values,ids);if(l.joints)l.joints=l.joints.filter(id=>ids.has(id));}if(c.tools.layers)c.tools.layers=c.tools.layers.filter(l=>Object.keys(l.values).length||l.joints?.length);}
 for(const key of ['events','cues'])if(c[key]){c[key]=c[key].filter(e=>e.node||e.joint?ids.has(e.node??e.joint):whole);for(const e of c[key])if(e.receiver&&!ids.has(e.receiver))delete e.receiver;}
 // Clip-local particles belong to a complete character; scene-wide systems do not.
 if(!whole)delete c.fx;
 for(const key of ['backdropTracks','gradingTracks','cameraTracks'])delete c[key];
 return c;
}
export function captureComponentMotion(p,dimension,nodes,{clipBindings,reverse,origin,origins,constraintIds={}}={}){
 const d=doc(p,dimension),ids=new Set(nodes.map(n=>n.id)),whole=ids.size===(dimension===3?d.nodes:p.joints).length;
 for(const n of nodes)if(n.skin)for(const b of n.skin.bones)check(ids.has(b.id),'include all bound skeleton bones in the character');
 for(const n of nodes)if(n.bodyJoin)check(ids.has(n.bodyJoin.targetNode),'include the joined body when saving this character');
 const clips=(clipBindings?Object.entries(clipBindings).map(([id,dest])=>{const c=d.clips.find(c=>c.id===dest);check(c,'restore the removed character clip before publishing');return {...c,id};}):d.clips).map(c=>scopedClip(c,dimension,ids,whole||!!clipBindings));
 const drawOrder=copy((d.drawOrder??[]).filter(e=>ids.has(e.node)));for(const e of drawOrder)for(const r of e.rules)check(ids.has(r.target),'include draw-order targets when saving the character');
 const constraints=captureConstraints(d,nodes),alive=new Set(constraints.map(c=>c.id)),reverseConstraints=Object.fromEntries(Object.entries(constraintIds).map(([a,b])=>[b,a]));for(const c of clips)for(const kind of ['constraintWeights','constraintTracks'])if(c[kind])c[kind]=c[kind].filter(t=>alive.has(t.constraint));
 if(whole&&dimension===2&&p.fx)for(const c of clips)if(!c.fx)c.fx=copy(p.fx);
 if(reverse){const reverseClips=Object.fromEntries(Object.entries(clipBindings).map(([a,b])=>[b,a]));for(let i=0;i<clips.length;i++){clips[i]=bindComponentClip(clips[i],dimension,reverse,reverseClips,{constraints:reverseConstraints});const actualRoot=nodes.find(n=>reverse[n.id]===origin?.id),delta=origin&&actualRoot?(dimension===3?origin.position.map((v,j)=>v-actualRoot.position[j]):[origin.rest.x-actualRoot.rest.x,origin.rest.y-actualRoot.rest.y]):null;if(delta)for(const [j,n]of (origins??[origin]).entries())offsetClip(clips[i],dimension,n.id,delta,j===0);}}
 return {version:1,clips,drawOrder:reverse?remapDrawOrder(drawOrder,reverse):drawOrder,constraints:reverse?bindConstraints(constraints,reverse,reverseConstraints):constraints};
}
export function bindComponentClip(source,dimension,bindings,clipBindings,maps){
 const c=copy(source),assets=maps.assets??{};
 const walk=o=>{if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){if(['program','parameters','controllerParameters','vector','overLife'].includes(k))continue;if(refs.includes(k)&&typeof v==='string'&&bindings[v])o[k]=bindings[v];else if(['asset','impactAsset','contour'].includes(k)&&assets[v])o[k]=assets[v];else if(v&&typeof v==='object')walk(v);}if(o.audio?.library)o.audio.library=maps.audioLibraries?.[o.audio.library]??o.audio.library;if(o.effect?.library)o.effect.library=maps.effectLibraries?.[o.effect.library]??o.effect.library;};walk(c);for(const t of c.soloTracks??[])for(const k of t.keys)k.value=bindings[k.value]??k.value;
 const keys=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[bindings[k]??k,v]));
 if(dimension===2){c.tracks=keys(c.tracks);if(c.ik)c.ik=keys(c.ik);}
 if(c.controllerParameters)c.controllerParameters=keys(c.controllerParameters);
 for(const l of c.tools?.layers??[]){l.values=keys(l.values);if(l.joints)l.joints=l.joints.map(id=>bindings[id]??id);if(l.sourceClip)l.sourceClip=clipBindings[l.sourceClip]??l.sourceClip;}
 for(const t of [...(c.constraintWeights??[]),...(c.constraintTracks??[])])t.constraint=maps.constraints?.[t.constraint]??t.constraint;c.id=clipBindings[c.id]??c.id;return c;
}
export function captureMotionDependencies(p,dimension,motion,dependencies){
 const d=doc(p,dimension),assets=new Set(dependencies.assets.map(a=>a.id));
 function visit(o){if(!o||typeof o!=='object')return;for(const [key,v]of Object.entries(o)){if(['program','parameters','vector','overLife'].includes(key))continue;if(['asset','impactAsset','contour'].includes(key)&&typeof v==='string')assets.add(v);else if(v&&typeof v==='object')visit(v);}for(const [key,kind]of [['audio','audioLibraries'],['effect','effectLibraries']])if(o[key]?.library){const id=o[key].library,value=d[kind]?.[id]??(kind==='audioLibraries'?p.scene3d?.audioLibraries?.[id]:null);check(value,'missing '+kind+' '+id);dependencies[kind][id]=copy(value);}}
 visit(motion.clips);for(const id of assets)if(!dependencies.assets.some(a=>a.id===id)){const a=p.assets.find(a=>a.id===id);check(a,'missing motion artwork '+id);dependencies.assets.push(copy(a));}return dependencies;
}
function placedClip(item,source,link,maps,root){
 const c=bindComponentClip(source,item.dimension,link.bindings,link.motion.bindings,{...maps,constraints:link.motion.constraintBindings}),origin=item.nodes.find(n=>n.id===item.root),delta=item.dimension===3?root.position.map((v,i)=>v-origin.position[i]):[root.rest.x-origin.rest.x,root.rest.y-origin.rest.y];
 for(const [i,n]of item.nodes.filter(n=>!n.parent).entries())offsetClip(c,item.dimension,link.bindings[n.id]??n.id,delta,i===0);
 return c;
}
function offsetClip(c,dimension,rootId,delta,worldTargets=true){
 if(dimension===3){for(const t of [...c.tracks,...(c.resolvedTracks??[])])if(t.node===rootId&&t.channel==='position'&&!t.program)for(const k of t.keys)k.value=k.value.map((v,i)=>v+delta[i]);}
 else{if(worldTargets)for(const id of Object.keys(c.ik??{}))for(const k of c.tracks[id]??[]){k.value.x+=delta[0];k.value.y+=delta[1];}for(const t of c.resolvedTracks??[])if(t.node===rootId&&['x','y'].includes(t.channel))for(const k of t.keys)k.value+=delta[t.channel==='x'?0:1];}
 if(worldTargets)for(const t of c.tools?.constraints??[])if(!t.target){t.point=t.point.map((v,i)=>v+delta[i]);for(const k of t.pointKeys??[])k.value=k.value.map((v,i)=>v+delta[i]);}
}
export function placeComponentMotion(p,item,root,maps){
 if(!item.motion)return;const d=doc(p,item.dimension),link=root.librarySource,used=new Set(d.clips.map(c=>c.id)),bindings={};
 for(const source of item.motion.clips){const base=root.id.slice(0,42)+'-'+source.id.replace(/[^\w.-]/g,'-').slice(0,24);let id=base,i=2;while(used.has(id))id=base+'-'+i++;used.add(id);bindings[source.id]=id;}
 if(item.dimension===2){const ids=new Set(Object.values(link.bindings));remapJoysticks(p.joints.filter(j=>ids.has(j.id)),[],{},bindings);remapJoysticks(link.baseline,[],{},bindings);}
 const ids=constraintBindings(item.motion.constraints??[],d,root.id),constraints=bindConstraints(item.motion.constraints??[],link.bindings,ids);d.constraints??=[];d.constraints.push(...constraints);const order=remapDrawOrder(item.motion.drawOrder??[],link.bindings);if(order.length){d.drawOrder??=[];d.drawOrder.push(...order);}link.motion={bindings,baseline:[],drawOrderBaseline:copy(order),constraintBindings:ids,constraintBaseline:copy(constraints)};for(const source of item.motion.clips){const clip=placedClip(item,source,link,maps,root);clip.name=root.name+' · '+source.name;link.motion.baseline.push(copy(clip));d.clips.push(clip);}
}
export function updateComponentMotion(p,item,root,maps){
 const link=root.librarySource;if(!item.motion||!link.motion)return;const d=doc(p,item.dimension),baseline=[];
 const nextOrder=remapDrawOrder(item.motion.drawOrder??[],link.bindings),oldOrder=link.motion.drawOrderBaseline??[];if(nextOrder.length||oldOrder.length){d.drawOrder??=[];for(const old of oldOrder)if(!nextOrder.some(e=>e.node===old.node))d.drawOrder=d.drawOrder.filter(e=>e.node!==old.node);for(const e of nextOrder){const i=d.drawOrder.findIndex(v=>v.node===e.node),old=oldOrder.find(v=>v.node===e.node);if(i>=0&&old)d.drawOrder[i]=mergeActionEdits(old,d.drawOrder[i],e);else if(!old)d.drawOrder.push(e);}link.motion.drawOrderBaseline=copy(nextOrder);}
 const ids=constraintBindings(item.motion.constraints??[],d,root.id,link.motion.constraintBindings),nextConstraints=bindConstraints(item.motion.constraints??[],link.bindings,ids),oldConstraints=link.motion.constraintBaseline??[],alive=new Set(nextConstraints.map(c=>c.id));d.constraints??=[];for(const old of oldConstraints)if(!alive.has(old.id)){d.constraints=d.constraints.filter(c=>c.id!==old.id);for(const clip of d.clips)for(const kind of ['constraintWeights','constraintTracks'])if(clip[kind])clip[kind]=clip[kind].filter(t=>t.constraint!==old.id);}for(const next of nextConstraints){const old=oldConstraints.find(c=>c.id===next.id),index=d.constraints.findIndex(c=>c.id===next.id);if(index>=0&&old)d.constraints[index]=mergeActionEdits(old,d.constraints[index],next);else if(!old)d.constraints.push(next);}link.motion.constraintBindings=ids;link.motion.constraintBaseline=copy(nextConstraints);
 for(const source of item.motion.clips){const next=placedClip(item,source,link,maps,root),old=link.motion.baseline.find(c=>c.id===next.id),index=d.clips.findIndex(c=>c.id===next.id);if(index<0||!old)continue;next.name=old.name;d.clips[index]=mergeActionEdits(old,d.clips[index],next);baseline.push(next);}link.motion.baseline=baseline;
}
export function validateComponentMotion(item){if(!item.motion)return;check(item.motion.version===1&&Array.isArray(item.motion.clips)&&item.motion.clips.length<=100,'invalid character motion bundle');if(item.dimension===2)validateJoysticks({joints:item.nodes,clips:item.motion.clips});if(item.dimension===2)validateSolos({joints:item.nodes,clips:item.motion.clips});if(item.dimension===2)validateDrawOrder({drawOrder:item.motion.drawOrder??[],joints:item.nodes,clips:item.motion.clips});validateConstraints({assets:item.dependencies?.assets??[],constraints:item.motion.constraints??[],clips:item.motion.clips,...(item.dimension===3?{nodes:item.nodes}:{joints:item.nodes})},item.dimension);const ids=new Set();for(const c of item.motion.clips){check(typeof c.id==='string'&&!ids.has(c.id)&&Number.isFinite(c.duration)&&c.duration>0&&c.tracks,'invalid character clip');ids.add(c.id);}for(const c of item.motion.clips)for(const l of c.tools?.layers??[])if(l.sourceClip)check(ids.has(l.sourceClip),'missing layered character animation');}
