import {villageEffects,updateVillageEffects,previewVillageAbility} from './gameplay-effects/village-runtime.js';
import {registryForVillage,configureVillageAbilities} from './gameplay-effects/village-library.js';
export {configureVillageAbilities};
export function abilityCatalog(e){return registryForVillage(e).list().map(d=>structuredClone(d))}
export function inspectAbilities(e,target){return e.abilityEffects?villageEffects(e).inspect(target):[]}
export function previewAbility(e,ability,target,source={kind:'god',id:'player'}){
 const d=registryForVillage(e).get(ability);if(d?.type!=='ability')return{valid:false,reason:'Unknown ability',targets:[]};
 if(ability.startsWith('miracle.')){const check=previewVillageAbility(e,ability.slice(8),target,source);if(!check.valid)return{...check,targets:[]}}
 return villageEffects(e,{previewOnly:true}).preview(ability,{target,source});
}
export function activateAbility(e,ability,target,source={kind:'god',id:'player'}){
 const r=villageEffects(e);r.advance(e.time);return r.cast(ability,{target,source});
}
export function applyStatus(e,definition,target,source={kind:'environment',id:'world'}){const r=villageEffects(e);r.advance(e.time);return structuredClone(r.apply(definition,target,{source}))}
export function cancelStatus(e,id){return e.abilityEffects?villageEffects(e).end(id,'cancelled'):false}
export function notifyAbilityEvent(e,type,data){if(e.abilityEffects)villageEffects(e).notify(type,data)}
export function inspectAttribute(e,target,stat,base){return e.abilityEffects?villageEffects(e).modified(target,stat,base):{value:base,contributions:[]}}
export function advanceAbilities(e){updateVillageEffects(e)}
export function inspectAbilityState(e){return e.abilityEffects?structuredClone(e.abilityEffects):null}

export function recoverAbilities(e,options){if(!e.abilityEffects)return{recovered:false,clearedEffects:0,discardedJobs:0};const result=villageEffects(e).recover(options);if(result.recovered)e.abilitySocial={};return result}
