import {mergeControllerParameters} from '../scene3d/core/action-machine.js';
// Action recipes compile to ordinary editable clips. They are data, not plug-in code.
const clone=x=>structuredClone(x),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safeId=v=>typeof v==='string'&&/^[a-zA-Z0-9][\w.-]{0,79}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
const check=(v,m)=>{if(!v)throw Error('Action: '+m);};
function pathParts(path){check(Array.isArray(path)&&path.length>0&&path.length<30&&path.every(k=>(typeof k==='string'||Number.isInteger(k))&&!['__proto__','constructor','prototype'].includes(String(k))),'invalid parameter path');return path;}
function read(object,path){for(const key of pathParts(path))object=object?.[key];return object;}
function write(object,path,value){const keys=pathParts(path);for(const key of keys.slice(0,-1)){check(object[key]&&typeof object[key]==='object','parameter target no longer exists');object=object[key];}object[keys.at(-1)]=value;}
export function actionDocument(project,dimension){return dimension===3?project.scene3d:project;}
export function validateActions(project){
 if(project.actions===undefined)return;check(Array.isArray(project.actions)&&project.actions.length<=100,'at most 100 recipes');const ids=new Set();
 for(const a of project.actions){check(safeId(a.id)&&!ids.has(a.id),'unique recipe ID');ids.add(a.id);check(typeof a.name==='string'&&a.name.length<=100,'invalid name');check([2,3].includes(a.dimension)&&a.template?.tracks&&Number.isFinite(a.template.duration),'invalid clip template');check(Array.isArray(a.parameters)&&a.parameters.length<=64,'at most 64 controls');const seen=new Set();
  for(const p of a.parameters){check(safeId(p.id)&&!seen.has(p.id),'unique control ID');seen.add(p.id);check(typeof p.name==='string'&&p.name.length<=100,'invalid control name');check(['time','number'].includes(p.kind),'unknown control');check([p.min,p.max,p.default].every(Number.isFinite)&&p.min<p.max&&p.default>=p.min&&p.default<=p.max,'invalid control range');if(p.kind==='time')check(p.min>=.05&&p.max<=20,'timing factor outside .05–20');else check(Number.isFinite(read(a.template,p.path)),'choose a numeric template field');}
 }
 for(const doc of [project,project.scene3d].filter(Boolean))for(const clip of doc.clips)if(clip.actionSource){const s=clip.actionSource;check(ids.has(s.id),'missing source recipe');check(s.values&&typeof s.values==='object'&&s.bindings&&typeof s.bindings==='object','invalid instance');}
}
// Timing controls stretch a region; subsequent events move with it. All key/cue
// timing, handovers, motion tools and clip-local particles use the same mapping.
function retime(clip,factor,start=0,end=clip.duration){
 check(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&end<=clip.duration,'invalid timing region');
 const full=start===0&&end===clip.duration;const map=t=>t<=start?t:t<end?start+(t-start)*factor:t+(end-start)*(factor-1),span=(t,d)=>map(t+d)-map(t);
 function visit(obj){if(!obj||typeof obj!=='object')return;if(Array.isArray(obj)){for(const value of obj)visit(value);return;}const at=Number.isFinite(obj.time)?obj.time:Number.isFinite(obj.delay)?obj.delay:Number.isFinite(obj.start)?obj.start:0;
  for(const key of ['duration','span','blend','release','charge','chargeDuration'])if(Number.isFinite(obj[key]))obj[key]=span(at,obj[key]);
  for(const key of ['time','delay','start','end'])if(Number.isFinite(obj[key]))obj[key]=map(obj[key]);
  for(const [key,value]of Object.entries(obj))if(!['program','parameters','controllerParameters','actionSource','overLife','path','points'].includes(key)&&value&&typeof value==='object')visit(value);
 }
 visit(clip);if(clip.controllerActions?.length){check(full,'controller timing uses the full action or its exposed phase parameters');clip.controllerTimeScale=(clip.controllerTimeScale??1)*factor;}
}
function bind(clip,bindings,dimension){
 const referenceKeys=new Set(['node','joint','root','mid','receiver','targetNode','attachment','sourceNode','target','source']);
 const walk=obj=>{if(!obj||typeof obj!=='object')return;for(const [k,v]of Object.entries(obj)){if(['program','parameters','vector','overLife'].includes(k))continue;if(referenceKeys.has(k)&&typeof v==='string'&&bindings[v])obj[k]=bindings[v];else if(v&&typeof v==='object')walk(v);}};walk(clip);
 if(dimension===2){clip.tracks=Object.fromEntries(Object.entries(clip.tracks).map(([id,v])=>[bindings[id]??id,v]));if(clip.ik)clip.ik=Object.fromEntries(Object.entries(clip.ik).map(([id,v])=>[bindings[id]??id,v]));}
 if(clip.controllerParameters)clip.controllerParameters=Object.fromEntries(Object.entries(clip.controllerParameters).map(([id,v])=>[bindings[id]??id,v]));
 for(const layer of clip.tools?.layers??[]){if(layer.values)layer.values=Object.fromEntries(Object.entries(layer.values).map(([id,v])=>[bindings[id]??id,v]));if(layer.joints)layer.joints=layer.joints.map(id=>bindings[id]??id);}return clip;
}
export function cleanActionTemplate(value){const out=clone(value);delete out.actionSource;delete out.libraryOrigins;for(const l of out.tools?.layers??[])delete l.expressionSource;for(const e of [...(out.events??[]),...(out.cues??[]),...(out.fx?.emitters??[])]){delete e.librarySource;delete e.libraryOrigins;}return out;}
export function compileAction(action,{values={},bindings={},dependencies={}}={}){
 const out=cleanActionTemplate(action.template);delete out.actionSource;delete out.libraryOrigins;
 for(const p of action.parameters){const value=values[p.id]??p.default;check(Number.isFinite(value)&&value>=p.min&&value<=p.max,'invalid '+p.name);if(p.kind==='number')write(out,p.path,value);}
 for(const p of action.parameters)if(p.kind==='time')retime(out,values[p.id]??p.default,p.start??0,p.end??out.duration);
 for(const key of Object.keys(bindings))check(safeId(key)&&safeId(bindings[key]),'invalid binding');bind(out,bindings,action.dimension);const visit=o=>{if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){if(['program','parameters','vector','overLife'].includes(k))continue;if(['asset','impactAsset','contour'].includes(k)&&dependencies.assets?.[v])o[k]=dependencies.assets[v];else if(v&&typeof v==='object')visit(v);}if(o.audio?.library)o.audio.library=dependencies.audioLibraries?.[o.audio.library]??o.audio.library;if(o.effect?.library)o.effect.library=dependencies.effectLibraries?.[o.effect.library]??o.effect.library;};visit(out);return out;
}
// Retain hand edits when a recipe control changes. Conflicting hand edits win;
// topology edits retain the authored array instead of silently deleting keys.
export function mergeActionEdits(old,current,next){if(same(old,current))return clone(next);if(!old||!current||!next||typeof old!=='object'||typeof current!=='object'||typeof next!=='object')return clone(current);if(Array.isArray(old)){if(!Array.isArray(current)||!Array.isArray(next)||old.length!==current.length||old.length!==next.length)return clone(current);return current.map((v,i)=>mergeActionEdits(old[i],v,next[i]));}const result={};for(const key of new Set([...Object.keys(current),...Object.keys(next)])){if(!Object.hasOwn(current,key)&&Object.hasOwn(old,key))continue;if(!Object.hasOwn(current,key))result[key]=clone(next[key]);else result[key]=mergeActionEdits(old[key],current[key],next[key]);}return result;}
export function actionTargets(a){const targets=new Set();if(a.dimension===2)for(const id of Object.keys(a.template.tracks))targets.add(id);else for(const t of a.template.tracks)targets.add(t.node);for(const t of a.template.resolvedTracks??[])targets.add(t.node);for(const e of [...(a.template.events??a.template.cues??[]),...(a.template.controllerActions??[])])if(e.node??e.joint)targets.add(e.node??e.joint);return [...targets];}
export function actionNumericFields(template){const fields=[];function walk(o,path=[]){if(!o||typeof o!=='object')return;for(const [key,v]of Object.entries(o)){if(['id','name','program','actionSource'].includes(key))continue;const next=[...path,Array.isArray(o)?+key:key];if(Number.isFinite(v))fields.push({path:next,value:v,label:next.join(' / ')});else if(v&&typeof v==='object')walk(v,next);}}walk(template);return fields;}
export function applyActionCommand(project,c){
 project.actions??=[];const doc=actionDocument(project,c.dimension??2);let action=project.actions.find(a=>a.id===c.id);
 if(c.op==='action.capture'){check(!action&&safeId(c.id),'unique recipe ID');const clip=doc?.clips.find(x=>x.id===c.clip);check(clip,'choose a clip');const template=cleanActionTemplate(clip);delete template.actionSource;if(c.dimension!==3&&project.fx&&!template.fx)template.fx=clone(project.fx);
  if(c.dimension===3){template.controllerParameters??={};for(const cmd of template.controllerActions??[]){const n=doc.nodes.find(n=>n.id===cmd.node),lib=doc.controllerLibraries[n.controller.library];template.controllerParameters[n.id]=mergeControllerParameters(lib.parameters,n.controller.parameters);}}
  action={id:c.id,name:c.name??clip.name,dimension:c.dimension??2,template,parameters:[{id:'timing',name:'Timing',kind:'time',min:.25,max:3,default:1}]};project.actions.push(action);
 }else if(c.op==='action.instantiate'){check(action,'missing recipe');const target=actionDocument(project,action.dimension);check(target&&!target.clips.some(x=>x.id===c.clip),'unique destination clip');const source={id:action.id,values:clone(c.values??{}),bindings:clone(c.bindings??{}),...(c.dependencies?{dependencies:clone(c.dependencies)}:{})},clip=compileAction(action,source);clip.id=c.clip;clip.name=c.name??action.name;clip.actionSource=source;target.clips.push(clip);return clip.id;
 }else if(c.op==='action.values'){const clip=doc?.clips.find(x=>x.id===c.clip),source=clip?.actionSource;check(source,'choose an action instance');action=project.actions.find(a=>a.id===source.id);const nextSource={...source,values:{...source.values,...c.values}},previous=compileAction(action,source),next=compileAction(action,nextSource);previous.id=next.id=clip.id;previous.name=next.name=clip.name;previous.actionSource=clone(source);next.actionSource=nextSource;const result=mergeActionEdits(previous,clip,next);result.actionSource=nextSource;doc.clips[doc.clips.indexOf(clip)]=result;return clip.id;
 }else if(c.op==='action.parameter'){check(action,'missing recipe');const i=action.parameters.findIndex(p=>p.id===c.value.id);if(i>=0)action.parameters[i]=clone(c.value);else action.parameters.push(clone(c.value));
 }else if(c.op==='action.rename'){check(action,'missing recipe');action.name=c.name;
 }else if(c.op==='action.remove'){check(action,'missing recipe');for(const d of [project,project.scene3d].filter(Boolean))for(const clip of d.clips)if(clip.actionSource?.id===c.id)delete clip.actionSource;project.actions=project.actions.filter(a=>a!==action);if(project.library)project.library.items=project.library.items.filter(i=>i.action!==c.id);
 }else throw Error('Unknown action command');return c.id;
}
