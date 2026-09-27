import {pruneAppearanceTargets} from './appearance.js';
import {importLibraryPacket} from './library-transfer.js';
import {captureComponentMotion,captureMotionDependencies,placeComponentMotion,updateComponentMotion,validateComponentMotion,bindComponentClip} from './library-motion.js';
import {captureComponentDependencies,importComponentDependencies,componentDependencyNodes} from './library-dependencies.js';
import {isExpressionSource,captureExpression,validateExpressionSource,validateExpressionLinks,expressionInstances,placeExpression,unlinkExpression,updateExpressionSource,expressionPreview} from './library-expressions.js';
import {isEnvironmentSource,captureEnvironment,validateEnvironmentSource,validateEnvironmentLink,environmentInstances,placeEnvironment,updateEnvironmentSource,environmentPreview} from './library-environments.js';
import {isEventSource,captureEvents,validateEventSource,validateEventLinks,eventInstances,placeEvents,unlinkEvents,updateEventInstances,eventPreview} from './library-events.js';
import {compileAction,mergeActionEdits,applyActionCommand,cleanActionTemplate} from './actions.js';

const copy=x=>structuredClone(x);
const check=(v,m)=>{if(!v)throw Error('Library: '+m);};
const safe=v=>typeof v==='string'&&/^[a-zA-Z0-9][\w.-]{0,79}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
export const LIBRARY_CATEGORIES=['characters','props','actions','expressions','effects','sounds','environments'];
const doc=(p,d)=>d===3?p.scene3d:p;
const nodes=(p,d)=>d===3?p.scene3d?.nodes:p.joints;
function sourceContext(p,dimension,category){
 const context={assets:copy(p.assets),audioLibraries:copy({...p.scene3d?.audioLibraries,...p.audioLibraries})};if(p.fx)context.fx=copy(p.fx);for(const key of ['backdrop','grading','lighting','appearance','entityDefinitions'])if(p[key])context[key]=copy(p[key]);
 if(dimension===3){for(const key of ['joints','clips','fx','audioLibraries'])if(p[key])context[key]=copy(p[key]);context.puppetSources=copy(p.puppetSources??[]);for(const n of context.joints??[]){delete n.librarySource;delete n.facialSource;}context.scene3d=copy(p.scene3d);delete context.scene3d.sequence;for(const n of context.scene3d.nodes){delete n.librarySource;delete n.facialSource;}}
 else{context.joints=copy(p.joints);context.clips=copy(p.clips);for(const n of context.joints){delete n.librarySource;delete n.facialSource;}}
 return context;
}
export function libraryOrigin(p,item){return doc(p,item.dimension)?.clips.find(c=>c.id===item.originClip&&c.libraryOrigins?.includes(item.id));}
export function libraryItems(p,{category='',query='',dimension}={}){
 const q=query.trim().toLowerCase();
 return (p.library?.items??[]).filter(x=>(!category||x.category===category)&&(!dimension||x.dimension===dimension||['sounds','environments'].includes(x.category))&&(!q||[x.name,x.category,x.dimension+'d'].join(' ').toLowerCase().includes(q)));
}
export function validateLibrary(p){
 if(!p.library){validateEventLinks(p);validateEnvironmentLink(p);validateExpressionLinks(p);return;}check(p.library.version===1&&Array.isArray(p.library.items)&&p.library.items.length<=256,'invalid library');
 const ids=new Set();for(const item of p.library.items){check(safe(item.id)&&!ids.has(item.id),'unique source ID');ids.add(item.id);check(typeof item.name==='string'&&item.name.length>0&&item.name.length<=100,'name must be 1–100 characters');check([2,3].includes(item.dimension),'invalid dimension');check(LIBRARY_CATEGORIES.includes(item.category),'invalid category');check(Number.isInteger(item.revision)&&item.revision>=1,'invalid source revision');
  if(isExpressionSource(item))validateExpressionSource(item);else if(isEnvironmentSource(item))validateEnvironmentSource(item);else if(isEventSource(item))validateEventSource(item);else if(item.category==='actions')check(p.actions?.some(a=>a.id===item.action&&a.dimension===item.dimension),'missing action recipe');
  else{validateComponentMotion(item);check(['characters','props'].includes(item.category),'unsupported source type');check(Array.isArray(item.nodes)&&item.nodes.length>0&&item.nodes.length<=256,'invalid component');const partIds=new Set(item.nodes.map(n=>n.id));check(partIds.size===item.nodes.length&&partIds.has(item.root),'invalid component IDs');for(const n of item.nodes){check(safe(n.id),'invalid component node');check(!n.parent||partIds.has(n.parent),'component parent is outside source');}}
 }
 validateEventLinks(p);validateEnvironmentLink(p);validateExpressionLinks(p);for(const d of [2,3])for(const n of nodes(p,d)??[]){const link=n.librarySource;if(!link)continue;const source=p.library.items.find(i=>i.id===link.id);check(source&&source.dimension===d&&['characters','props'].includes(source.category),'missing component source');check(link.bindings&&typeof link.bindings==='object'&&Array.isArray(link.baseline),'invalid instance link');for(const [a,b]of Object.entries(link.bindings))check(safe(a)&&safe(b),'invalid instance binding');}
}
function subtree(p,dimension,root){const list=nodes(p,dimension);check(list?.some(n=>n.id===root),'select an object');const ids=new Set([root]);let changed=true;while(changed){changed=false;for(const n of list)if(ids.has(n.parent)&&!ids.has(n.id)){ids.add(n.id);changed=true;}}const result=copy(list.filter(n=>ids.has(n.id)));for(const n of result){delete n.librarySource;delete n.facialSource;}const first=result.find(n=>n.id===root);first.parent=null;delete first.attachment;return result;}
function remap(value,bindings){if(Array.isArray(value))return value.map(v=>remap(v,bindings));if(!value||typeof value!=='object')return value;return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,['id','parent','node','joint','root','mid','receiver','targetNode','sourceNode'].includes(k)&&typeof v==='string'&&bindings[v]?bindings[v]:remap(v,bindings)]));}
function instanceNodes(item,bindings){return item.nodes.map(n=>remap(n,bindings));}
function withoutLink(n){const v=copy(n);delete v.librarySource;return v;}
export function libraryInstances(p,item){if(isExpressionSource(item))return expressionInstances(p,item);if(isEnvironmentSource(item))return environmentInstances(p,item);if(isEventSource(item))return eventInstances(p,item);if(item.category==='actions')return (doc(p,item.dimension)?.clips??[]).filter(c=>c.actionSource?.id===item.action);return (nodes(p,item.dimension)??[]).filter(n=>n.librarySource?.id===item.id);}
export function applyLibraryCommand(p,c){
 p.library??={version:1,items:[]};if(c.op==='library.import')return importLibraryPacket(p,c.value);const list=p.library.items;let item=list.find(i=>i.id===c.id);
 if(c.op==='library.capture'){
  check(!item&&safe(c.id),'unique source ID');check(['characters','props','actions','effects','sounds','environments','expressions'].includes(c.category),'choose a supported library category');const dimension=c.dimension??2;
  item={id:c.id,name:c.name,category:c.category,dimension,revision:1,context:sourceContext(p,dimension,c.category)};
  if(isExpressionSource(item)){item.expression=captureExpression(p,{...c,dimension});if(dimension===3){const n=p.scene3d.nodes.find(n=>n.id===c.node);if(n.facial)n.facialSource={id:item.id,revision:1,mood:n.facial.expression,baseline:copy(n.facial)};}}
  else if(isEnvironmentSource(item)){item.environment=captureEnvironment(p);p.environmentSource={id:item.id,instance:'environment',revision:1,baseline:copy(item.environment.values),assets:Object.fromEntries(item.environment.assets.map(a=>[a.id,a.id]))};}
  else if(isEventSource(item)){item.packet=captureEvents(p,{...c,dimension});if(c.audio)item.audio=copy(c.audio);else{item.originClip=c.clip;item.eventIds=item.packet.events.map(e=>e.id);item.emitterIds=item.packet.emitters?.map(e=>e.id)??[];const origin=doc(p,dimension).clips.find(clip=>clip.id===c.clip);origin.libraryOrigins??=[];origin.libraryOrigins.push(item.id);}}
  else if(c.category==='actions'){const action='lib-'+c.id;applyActionCommand(p,{op:'action.capture',id:action,dimension,clip:c.clip,name:c.name});item.action=action;item.dependencies=captureComponentDependencies(p,dimension,[]);captureMotionDependencies(p,dimension,{clips:[p.actions.find(a=>a.id===action).template]},item.dependencies);item.originClip=c.clip;const origin=doc(p,dimension).clips.find(clip=>clip.id===c.clip);origin.libraryOrigins??=[];origin.libraryOrigins.push(item.id);}
  else{item.root=c.node;item.nodes=subtree(p,dimension,c.node);item.dependencies=captureComponentDependencies(p,dimension,item.nodes);if(item.category==='characters'){item.motion=captureComponentMotion(p,dimension,item.nodes);captureMotionDependencies(p,dimension,item.motion,item.dependencies);}const source=nodes(p,dimension).find(n=>n.id===c.node);source.librarySource={id:item.id,revision:1,bindings:Object.fromEntries(item.nodes.map(n=>[n.id,n.id])),baseline:copy(item.nodes)};if(item.motion)source.librarySource.motion={bindings:Object.fromEntries(item.motion.clips.map(c=>[c.id,c.id])),baseline:copy(item.motion.clips)};}list.push(item);return item.id;
 }
 check(item,'missing source');
 if(c.op==='library.soundVolume'){check(isEventSource(item)&&Object.hasOwn(item.packet.audioLibraries,c.library),'choose a sound dependency');check(Number.isFinite(c.value)&&c.value>=0&&c.value<=1,'volume must be 0–1');item.packet.audioLibraries[c.library].volume=c.value;item.revision++;updateEventInstances(p,item);return item.id;}
 if(c.op==='library.rename'){item.name=c.name;if(item.action)applyActionCommand(p,{op:'action.rename',id:item.action,name:c.name});return item.id;}
 if(c.op==='library.place'){
  if(isExpressionSource(item))return placeExpression(p,item,c);
  if(isEnvironmentSource(item))return placeEnvironment(p,item,c);
  if(isEventSource(item))return placeEvents(p,item,c);
  if(item.category==='actions')return applyActionCommand(p,{op:'action.instantiate',id:item.action,clip:c.instance,bindings:c.bindings??{},dependencies:importComponentDependencies(p,item),name:item.name});
  const target=nodes(p,item.dimension);check(target,'create a scene first');check(safe(c.instance),'invalid instance ID');const bindings=Object.fromEntries(item.nodes.map((n,i)=>[n.id,n.id===item.root?c.instance:c.instance+'-'+i]));check(Object.values(bindings).every(id=>safe(id)&&!target.some(n=>n.id===id)),'instance IDs must be unique');const dependencyMaps=importComponentDependencies(p,item),additions=componentDependencyNodes(instanceNodes(item,bindings),dependencyMaps),root=additions.find(n=>n.id===c.instance),baseline=copy(additions);root.name=c.name??item.name;
  if(c.position){check(Array.isArray(c.position)&&c.position.length===(item.dimension===3?3:2)&&c.position.every(Number.isFinite),'invalid placement');if(item.dimension===3)root.position=copy(c.position);else{root.rest.x=c.position[0];root.rest.y=c.position[1];}}
  root.librarySource={id:item.id,revision:item.revision,bindings,baseline,dependencies:dependencyMaps};target.push(...additions);placeComponentMotion(p,item,root,dependencyMaps);return root.id;
 }
 if(c.op==='library.detach'){
  if(isExpressionSource(item)){const instance=expressionInstances(p,item).find(i=>i.id===c.instance&&(!c.clip||i.clip===c.clip||i.dimension===3));check(instance,'select a placed expression');unlinkExpression(instance);return instance.id;}
  if(isEnvironmentSource(item)){check(p.environmentSource?.id===item.id,'apply this environment first');delete p.environmentSource;return c.instance;}
  const instance=libraryInstances(p,item).find(x=>x.id===c.instance&&(!isEventSource(item)||(!c.dimension||x.dimension===c.dimension)&&(!c.clip||x.clip===c.clip)));check(instance,'select a linked instance');if(isEventSource(item))unlinkEvents(instance);else if(item.category==='actions')delete instance.actionSource;else delete instance.librarySource;return instance.id;
 }
 if(c.op==='library.updateSource'){
  if(isExpressionSource(item)){updateExpressionSource(p,item,c);item.context=sourceContext(p,item.dimension,item.category);return item.id;}
  if(isEnvironmentSource(item)){updateEnvironmentSource(p,item);item.context=sourceContext(p,item.dimension,item.category);return item.id;}
  if(isEventSource(item)){let capture={dimension:item.dimension,category:item.category,clip:item.originClip,eventIds:item.eventIds,emitterIds:item.emitterIds,audio:item.audio};if(item.imported&&!item.audio){const group=eventInstances(p,item).find(g=>g.id===c.instance&&(!c.clip||g.clip===c.clip));check(group,'choose a placed bundle to publish');capture={dimension:group.dimension,category:item.category,clip:group.clip,eventIds:group.events.map(e=>e.id),emitterIds:group.emitters.map(e=>e.id)};}else if(!item.audio)check(libraryOrigin(p,item),'the original source clip was removed');const packet=captureEvents(p,capture);check(packet.events.length===item.packet.events.length&&(packet.emitters?.length??0)===(item.packet.emitters?.length??0),'source topology changed; capture a new source');item.packet=packet;item.context=sourceContext(p,item.dimension,item.category);item.revision++;updateEventInstances(p,item);return item.id;}
  if(item.category==='actions'){
   const d=doc(p,item.dimension),source=item.imported?d.clips.find(clip=>clip.id===c.instance):libraryOrigin(p,item),action=p.actions.find(a=>a.id===item.action);
   check(source,item.imported?'select an animation from this source before publishing':'the original source clip was removed; capture a new action');if(item.imported)check(source.actionSource?.id===item.action,'select an instance of this action');else check(!source.actionSource,'publish from an independent source clip');
   const old=copy(action);let template=cleanActionTemplate(source);if(item.imported){const reverse=Object.fromEntries(Object.entries(source.actionSource.bindings).map(([a,b])=>[b,a]));template=compileAction({dimension:item.dimension,template,parameters:[]},{bindings:reverse});template.id=action.template.id;for(const control of action.parameters){if(control.kind==='time'){control.default=1;if(control.start!==undefined)control.start=Math.min(control.start,Math.max(0,template.duration-.05));if(control.end!==undefined)control.end=Math.min(Math.max(control.end,(control.start??0)+.05),template.duration);}else{let value=template;for(const key of control.path)value=value?.[key];check(Number.isFinite(value),'source topology changed; capture a new action');control.default=value;control.min=Math.min(control.min,value);control.max=Math.max(control.max,value);}}}
   if(item.dimension===2&&p.fx&&!template.fx)template.fx=copy(p.fx);action.template=template;item.context=sourceContext(p,item.dimension,item.category);if(item.imported)item.previewBindings=copy(source.actionSource.bindings);item.dependencies=captureComponentDependencies(p,item.dimension,[]);captureMotionDependencies(p,item.dimension,{clips:[template]},item.dependencies);
   for(const clip of libraryInstances(p,item)){const nextSource={...copy(clip.actionSource),...(item.imported&&clip.id===source.id?{values:{}}:{}),dependencies:importComponentDependencies(p,item)},before=compileAction(old,clip.actionSource),after=compileAction(action,nextSource);before.id=after.id=clip.id;before.name=after.name=clip.name;before.actionSource=copy(clip.actionSource);after.actionSource=nextSource;d.clips[d.clips.indexOf(clip)]=mergeActionEdits(before,clip,after);}item.revision++;return item.id;
  }
  const sourceNode=nodes(p,item.dimension)?.find(n=>n.id===c.instance),link=sourceNode?.librarySource;check(link?.id===item.id,'select an instance of this source');
  const selected=subtree(p,item.dimension,c.instance),reverse=Object.fromEntries(Object.entries(link.bindings).map(([a,b])=>[b,a]));
  check(selected.length===item.nodes.length&&selected.every(n=>reverse[n.id]),'source topology changed; capture this as a new source');
  const next=selected.map(n=>remap(n,reverse)),root=next.find(n=>n.id===item.root),oldRoot=item.nodes.find(n=>n.id===item.root);
  // Placement belongs to the instance. Publishing changes never teleports peers.
  for(const k of item.dimension===3?['position','rotation','scale','mirror']:['rest']){if(oldRoot[k]!==undefined)root[k]=copy(oldRoot[k]);else delete root[k];}
  const peers=libraryInstances(p,item),target=nodes(p,item.dimension);if(item.motion&&link.motion){const names=new Map(item.motion.clips.map(c=>[c.id,c.name]));item.motion=captureComponentMotion(p,item.dimension,selected,{clipBindings:link.motion.bindings,reverse,origin:oldRoot});for(const c of item.motion.clips)c.name=names.get(c.id)??c.name;}item.nodes=next;item.dependencies=captureComponentDependencies(p,item.dimension,next);if(item.motion)captureMotionDependencies(p,item.dimension,item.motion,item.dependencies);item.revision++;item.context=sourceContext(p,item.dimension,item.category);
  for(const peer of peers){const s=peer.librarySource,dependencyMaps=importComponentDependencies(p,item),updates=componentDependencyNodes(instanceNodes(item,s.bindings),dependencyMaps);for(const update of updates){const index=target.findIndex(n=>n.id===update.id),old=s.baseline.find(n=>n.id===update.id);if(index<0||!old)continue;const current=withoutLink(target[index]);target[index]=mergeActionEdits(old,current,update);}
   const current=target.find(n=>n.id===peer.id);current.librarySource={...s,revision:item.revision,baseline:copy(updates),dependencies:dependencyMaps};updateComponentMotion(p,item,current,dependencyMaps);
  }return item.id;
 }
 if(c.op==='library.remove'){
  if(isEnvironmentSource(item)&&p.environmentSource?.id===item.id)delete p.environmentSource;
  for(const instance of libraryInstances(p,item))if(isExpressionSource(item))unlinkExpression(instance);else if(isEventSource(item))unlinkEvents(instance);else if(item.category==='actions')delete instance.actionSource;else delete instance.librarySource;
  for(const source of p.puppetSources??[])if(source.library?.id===item.id)delete source.library;
  if(item.action)applyActionCommand(p,{op:'action.remove',id:item.action});const origin=libraryOrigin(p,item);if(origin)origin.libraryOrigins=origin.libraryOrigins.filter(id=>id!==item.id);p.library.items=list.filter(i=>i!==item);return item.id;
 }
 throw Error('Unknown library command '+c.op);
}
// Preview documents contain rendered snapshots, not links into the authoring shelf.
function finishPreview(result){const p=result.project;pruneAppearanceTargets(p);delete p.environmentSource;for(const d of [p,p.scene3d].filter(Boolean)){for(const n of d.nodes??d.joints??[]){delete n.librarySource;delete n.facialSource;}for(const c of d.clips??[]){delete c.libraryOrigins;delete c.actionSource;for(const l of c.tools?.layers??[])delete l.expressionSource;for(const e of [...(c.events??[]),...(c.cues??[]),...(c.fx?.emitters??[])])delete e.librarySource;}for(const e of d.fx?.emitters??[])delete e.librarySource;}return result;}
export function libraryPreviewProject(p,item){const {library,preview,...base}=p;const out=copy(base);if(item.context){for(const key of ['fx','backdrop','grading','lighting','appearance','puppetSources','audioLibraries','scene3d'])delete out[key];Object.assign(out,copy(item.context));}if(isExpressionSource(item))return finishPreview(expressionPreview(out,item));if(isEnvironmentSource(item))return finishPreview(environmentPreview(out,item));if(isEventSource(item))return finishPreview(eventPreview(out,item));if(item.category==='actions'){const action=p.actions.find(a=>a.id===item.action),clip=compileAction(action,{bindings:item.previewBindings??{}});const d=doc(out,item.dimension),at=d.clips.findIndex(c=>c.id===clip.id);if(at>=0)d.clips[at]=clip;else d.clips.push(clip);return finishPreview({project:out,clip:clip.id});}
 const maps=importComponentDependencies(out,item),componentNodes=componentDependencyNodes(item.nodes,maps),d=doc(out,item.dimension);if(item.dimension===3){d.nodes=componentNodes;for(const n of d.nodes){delete n.librarySource;delete n.facialSource;}d.clips=[{id:'preview',name:'Preview',duration:2,loop:true,tracks:[],events:[]}];delete d.sequence;}
 else{out.joints=componentNodes;out.clips=[{id:'preview',name:'Preview',duration:2,fps:30,loop:true,tracks:{}}];delete out.fx;}
 if(item.motion?.clips.length){d.clips=item.motion.clips.map(c=>bindComponentClip(c,item.dimension,{}, {},maps));}delete out.library;delete out.actions;return finishPreview({project:out,clip:d.clips[0].id});
}
