import {createRegistry,assertData} from './definitions.js';
import {villageEffectRegistry,villageDefaults,villageRulesKey} from './village-definitions.js';
import {DOMAIN_OPERATIONS,validateDomainStep} from './domain-catalog.js';
const registries=new WeakMap();
let defaultKey=villageRulesKey(),defaults=villageEffectRegistry;
export const VILLAGE_OPERATIONS=['apply','dispel','damage','heal','restore','kill','ignite',...Object.keys(DOMAIN_OPERATIONS)];
export function registryForVillage(e){
 const key=villageRulesKey();if(key!==defaultKey){defaults=createRegistry(villageDefaults());defaultKey=key}
 if(!e.abilityLibrary)return defaults;
 const cached=registries.get(e.abilityLibrary);if(cached?.key===key)return cached.registry;let registry;
 assertData(e.abilityLibrary);if(e.abilityLibrary.version!==1||!Array.isArray(e.abilityLibrary.definitions)||e.abilityLibrary.definitions.length>256)throw Error('Invalid village ability library');
 const map=new Map(villageDefaults().map(d=>[d.id,d]));for(const d of e.abilityLibrary.definitions)map.set(d.id,d);
 registry=createRegistry([...map.values()]);
 for(const d of registry.list())for(const step of [d.steps,d.tick,d.apply,d.end,...(d.triggers??[]).map(t=>t.steps)].flatMap(s=>s??[])){if(!VILLAGE_OPERATIONS.includes(step.op))throw Error('Unregistered village operation '+step.op);validateDomainStep(step)}
 registries.set(e.abilityLibrary,{key,registry});return registry;
}
export function configureVillageAbilities(e,packet){
 if(packet.format!=='shapeshift-abilities'||packet.version!==1)throw Error('Unsupported ability packet');
 const next={version:1,definitions:structuredClone(packet.definitions)},registry=registryForVillage({abilityLibrary:next}),previous=registryForVillage(e);
 for(const x of Object.values(e.abilityEffects?.instances??{}))if(JSON.stringify(previous.get(x.definition))!==JSON.stringify(registry.get(x.definition)))throw Error('End active '+x.definition+' effects before changing their definition');
 e.abilityLibrary=next;return registry.list().map(d=>d.id);
}
