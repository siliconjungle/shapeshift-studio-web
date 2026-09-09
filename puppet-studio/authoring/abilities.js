import {validateAbilityPresentation} from './presentation-schema.js';
import {createRegistry,assertData} from '../../gameplay-effects/definitions.js';
import {validateDomainStep} from '../../gameplay-effects/domain-catalog.js';
export const isLittleGodsLibrary=a=>a?.integration==='little-gods'||(a?.integration===undefined&&a?.definitions?.some(d=>d.id.startsWith('miracle.')));
export const ABILITY_COMMANDS=['ability.init','ability.install','ability.upsert','ability.remove','ability.bind','ability.import'];
export function validateAbilities(project){
 const a=project.abilities;if(!a)return;
 assertData(a);if(a.version!==1||!Array.isArray(a.definitions)||a.definitions.length>256||!a.bindings||typeof a.bindings!=='object'||Array.isArray(a.bindings))throw Error('Invalid ability library');
 if(a.integration!==undefined&&!['none','little-gods'].includes(a.integration))throw Error('Unknown ability integration');
 const registry=createRegistry(a.definitions);
 if(isLittleGodsLibrary(a))for(const d of registry.list())for(const step of [d.steps,d.tick,d.apply,d.end,...(d.triggers??[]).map(t=>t.steps)].flatMap(s=>s??[]))validateDomainStep(step);
 for(const [id,b] of Object.entries(a.bindings)){
  if(!a.definitions.some(d=>d.presentation===id))throw Error('Ability binding has no presentation role');
  if(b.native)validateAbilityPresentation({[id]:b.native});
  if(![2,3].includes(b.dimension))throw Error('Ability binding needs a dimension');
  const clips=b.dimension===3?project.scene3d?.clips:project.clips;
  for(const key of ['apply','tick','end'])if(b[key]&&!clips?.some(c=>c.id===b[key]))throw Error('Ability presentation clip is missing: '+b[key]);
 }
 return registry;
}
export function applyAbilityCommand(project,c){const next={...project,...(project.abilities?{abilities:structuredClone(project.abilities)}:{})};const result=apply(next,c);validateAbilities(next);project.abilities=next.abilities;return result;}
function apply(project,c){
 if(c.op==='ability.init'){project.abilities??={version:1,definitions:[],bindings:{},integration:'none'};return}
 if(c.op==='ability.install'){
  if(c.integration!=='little-gods'||!Array.isArray(c.definitions))throw Error('Invalid ability integration');
  const next=structuredClone(project.abilities??{version:1,definitions:[],bindings:{},integration:'none'});
  for(const d of c.definitions)if(!next.definitions.some(old=>old.id===d.id))next.definitions.push(structuredClone(d));
  next.integration='little-gods';validateAbilities({...project,abilities:next});project.abilities=next;return;
 }
 if(c.op==='ability.import'){if(c.value?.format!=='shapeshift-abilities'||c.value.version!==1)throw Error('Invalid abilities packet');project.abilities={version:1,definitions:structuredClone(c.value.definitions),bindings:{},...(c.value.integration?{integration:c.value.integration}:{})};validateAbilities(project);return}
 project.abilities??={version:1,definitions:[],bindings:{},integration:'none'};const a=project.abilities;
 if(c.op==='ability.upsert'){const i=a.definitions.findIndex(d=>d.id===c.value.id);if(i<0)a.definitions.push(structuredClone(c.value));else a.definitions[i]=structuredClone(c.value)}
 else if(c.op==='ability.remove'){a.definitions=a.definitions.filter(d=>d.id!==c.id);for(const role of Object.keys(a.bindings))if(!a.definitions.some(d=>d.presentation===role))delete a.bindings[role]}
 else if(c.op==='ability.bind'){if(c.value===null)delete a.bindings[c.id];else a.bindings[c.id]=structuredClone(c.value)}
 else throw Error('Unknown ability command '+c.op);
 validateAbilities(project);return c.id??c.value?.id;
}
export function abilityPacket(project){validateAbilities(project);return{format:'shapeshift-abilities',version:1,definitions:structuredClone(project.abilities?.definitions??[]),...(project.abilities?.integration?{integration:project.abilities.integration}:isLittleGodsLibrary(project.abilities)?{integration:'little-gods'}:{})}}

export function nativeAbilityBindings(project){validateAbilities(project);return Object.fromEntries(Object.entries(project.abilities?.bindings??{}).filter(([,b])=>b.native).map(([role,b])=>[role,structuredClone(b.native)]))}
