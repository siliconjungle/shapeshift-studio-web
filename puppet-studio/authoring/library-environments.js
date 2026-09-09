import {validateBackdrop} from './backdrop.js';
import {appearanceState,styledAssets,styledLighting,projectGrading} from './appearance.js';
import {sceneDefaults,validateScene} from '../scene3d/schema.js';
import {validateLighting2D} from '../lighting-state.js';
import {validateGrading} from '../../rendering/color-grading.js';
const copy=x=>structuredClone(x),check=(v,m)=>{if(!v)throw Error('Library: '+m);};
export const isEnvironmentSource=item=>item?.category==='environments';
// Ink thickness is a rendering choice, not part of an environment's lighting.
const fields=['background','lightColor','lightPosition','intensity','ambient','shadows','night','nightTint'];
export function environmentValues(p){
 const defaults=sceneDefaults().environment,environment=Object.fromEntries(fields.filter(k=>k in defaults||k in (p.scene3d?.environment??{})).map(k=>[k,copy(p.scene3d?.environment?.[k]??defaults[k])])),lighting=copy(styledLighting(p)??{night:environment.night??0,lightColor:environment.lightColor}),backdrop=p.backdrop?copy(p.backdrop):null,colors=appearanceState(p).colors;
 if(!p.scene3d){environment.lightColor=lighting.lightColor;environment.night=lighting.night;if(lighting.nightTint)environment.nightTint=copy(lighting.nightTint);}
 for(const b of p.appearance?.bindings??[]){if(b.target.kind==='environment')environment[b.target.channel]=colors[b.role];if(b.target.kind==='backdrop'){const layer=backdrop?.layers.find(l=>l.id===b.target.id);if(layer)layer.tint=colors[b.role];}}
 // Resolve custom/automatic grades now: a reusable environment must not depend
 // on another scene having a coincidentally named style or grade.
 return{backdrop,lighting,environment,grading:{...projectGrading(p),preset:'neutral'}};
}
export function captureEnvironment(p){const values=environmentValues(p),ids=new Set(values.backdrop?.layers.map(l=>l.asset)??[]),assets=styledAssets(p).filter(a=>ids.has(a.id)).map(copy);check(assets.length===ids.size,'missing environment artwork');return{values,assets};}
export function validateEnvironmentSource(item){const packet=item.environment;check(packet&&packet.values&&Array.isArray(packet.assets),'invalid environment source');const {values:v,assets}=packet,ids=new Set(assets.map(a=>a.id));check(ids.size===assets.length&&assets.every(a=>typeof a.id==='string'&&typeof a.src==='string'),'invalid environment artwork');validateBackdrop({backdrop:v.backdrop??undefined,assets});validateGrading(v.grading);validateLighting2D({joints:[],clips:[],lighting:v.lighting});const scene=sceneDefaults();Object.assign(scene.environment,v.environment);check(Object.keys(v.environment).every(k=>fields.includes(k)),'unknown environment property');validateScene(scene,assets);}
export function validateEnvironmentLink(p){const link=p.environmentSource;if(!link)return;check(isEnvironmentSource(p.library?.items.find(i=>i.id===link.id)),'missing environment source');check(typeof link.instance==='string'&&Number.isInteger(link.revision)&&link.revision>=1&&link.baseline&&link.assets,'invalid environment link');}
export function environmentInstances(p,item){return p.environmentSource?.id===item.id?[{id:p.environmentSource.instance,name:'Current environment'}]:[];}
function importEnvironment(p,item){const values=copy(item.environment.values),map={};for(const a of item.environment.assets){const comparable=v=>JSON.stringify({...v,id:undefined}),same=p.assets.find(v=>comparable(v)===comparable(a));let id=same?.id??a.id;if(!same){if(p.assets.some(v=>v.id===id)){const base=item.id.slice(0,48)+'-sky-'+Object.keys(map).length;id=base;let n=2;while(p.assets.some(v=>v.id===id))id=base+'-'+n++;}p.assets.push({...copy(a),id});}map[a.id]=id;}for(const l of values.backdrop?.layers??[])l.asset=map[l.asset];return{values,map};}
function writeEnvironment(p,values){
 if(values.backdrop)p.backdrop=copy(values.backdrop);else delete p.backdrop;p.grading=copy(values.grading);p.lighting=copy(values.lighting);if(p.scene3d){for(const k of fields)delete p.scene3d.environment[k];Object.assign(p.scene3d.environment,copy(values.environment));}
 // The source owns these values; keep character/material style bindings intact.
 // New bindings added afterwards remain local edits until explicitly published.
 if(p.appearance)p.appearance.bindings=p.appearance.bindings.filter(b=>!['environment','backdrop'].includes(b.target.kind));
}
export function placeEnvironment(p,item,c){check(typeof c.instance==='string'&&/^[a-zA-Z0-9][\w.-]{0,79}$/.test(c.instance),'invalid environment instance ID');const {values,map}=importEnvironment(p,item);writeEnvironment(p,values);p.environmentSource={id:item.id,instance:c.instance,revision:item.revision,baseline:copy(values),assets:map};return c.instance;}
export function updateEnvironmentSource(p,item){check(p.environmentSource?.id===item.id,'apply this environment before updating its source');item.environment=captureEnvironment(p);item.revision++;const link=p.environmentSource;link.revision=item.revision;link.baseline=copy(item.environment.values);link.assets=Object.fromEntries(item.environment.assets.map(a=>[a.id,a.id]));return item.id;}
export function environmentPreview(p,item){const {values}=importEnvironment(p,item);writeEnvironment(p,values);delete p.environmentSource;const clip=(item.dimension===3?p.scene3d:p).clips[0];clip.duration=Math.max(clip.duration,values.backdrop?.duration??4);return{project:p,clip:clip.id};}
