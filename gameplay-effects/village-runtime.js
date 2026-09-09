import {releaseWork} from "../village-resources.js";
import {resourceGrowth,resourceHarvest,resourceCondition} from '../ecs/resource-state.js';
import {depleteResource} from "../village-resources.js";
import {survivalInterrupt} from "../village-survival.js";
import {ensureActorDeprivation} from "../ecs/actor-deprivation.js";
import {ensureActorVitality} from "../ecs/actor-vitality.js";
import {beastsDamage} from "../village-beasts.js";
import {survivalDamage} from "../village-survival.js";
import {survivalDie} from "../village-survival.js";
import {actorVitality} from "../ecs/actor-vitality.js";
import {raiderDamage} from "../village-raids.js";
import {slimeDamage} from "../village-slimes.js";
import {assertData} from './definitions.js';
import {noticeAbilitySocial,pruneAbilitySocial} from './village-social.js';
import {createEffectState,createEffectRuntime,validateEffectState} from './runtime.js';
import {registryForVillage} from './village-library.js';
import {resolveVillageTarget,queryVillageTargets,villageTargetCheck,villageActorRef,villageTargetRelation,domainEffectCommand} from './village-targets.js';
import {sameTarget,targetKey,queryTargets} from './targets.js';
import {clearCurse} from '../village-curse.js';
import {destroyRelic} from '../village-relics.js';
import {igniteHouse} from '../village-shelter.js';
import {CAMPFIRE_RULES} from '../village-campfire.js';
import {RESOURCE_RULES} from '../village-economy.js';
import {isForage,forageRules} from '../village-foraging.js';
import {WISH_RULES} from '../wish-rules.js';
import {createEffectSpatialIndex} from './spatial.js';
import {wishPresentationState} from './wish-presentation-state.js';
import {villageDomainCommands} from './village-domain-commands.js';
import {miracleTarget} from './village-miracle-targets.js';

const controllers=new WeakMap();
export function validVillageEffects(e){try{const registry=registryForVillage(e);if(e.abilitySocial!==undefined){assertData(e.abilitySocial);if(!e.abilitySocial||Array.isArray(e.abilitySocial)||typeof e.abilitySocial!=='object'||Object.entries(e.abilitySocial).some(([id,targets])=>!Number.isSafeInteger(+id)||+id<1||+id>=(e.abilityEffects?.nextEvent??1)||!Array.isArray(targets)||targets.length>1024||targets.some(t=>typeof t!=='string')))return false}return !e.abilityEffects||validateEffectState(e.abilityEffects,registry)}catch{return false}}
function damage(e,descriptor,amount,cause,kill=false){
 const {actor,ref}=descriptor;if(!actor||(actorVitality(actor)?.dead)||actor.gone)return{changed:false,amount:0};
 const before=(actorVitality(actor)?.health)??descriptor.maxHealth;
 if(ref.kind==='villager'){if(kill)survivalDie(e.survival,actor,cause);else survivalDamage(e.survival,actor,amount,cause)}
 else if(ref.kind==='beast')beastsDamage(e.beasts,actor,amount,cause);

 else if(ref.kind==='slime'||ref.kind==='raider')(ref.kind==='slime'?slimeDamage(e.slimes,actor,amount,null,{divine:true,cause}):raiderDamage(e.raids,actor,amount,null,{divine:true,cause}));
 else return {changed:false,amount:0,reason:'Target has no damage policy'};
 return{changed:(actorVitality(actor)?.dead)||(actorVitality(actor)?.health)<before,amount:Math.max(0,before-((actorVitality(actor)?.health)??before)),killed:!!(actorVitality(actor)?.dead)};
}
function shieldProjection(e,runtime,ref){const actor=resolveVillageTarget(e,ref)?.actor;if(actor)actor.shieldUntil=Math.max(e.time,...runtime.inspect(ref).filter(x=>x.definition==='protected').map(x=>x.until??e.time))}
export function villageEffects(e,{previewOnly=false}={}){
 const registry=registryForVillage(e);let entry=controllers.get(e);if(entry&&entry.state===e.abilityEffects&&entry.registry===registry){return entry.runtime}
 const spatial=createEffectSpatialIndex(),resolved=new Map();let spatialDirty=true;
 const resolve=ref=>{if(!ref)return null;const key=targetKey(ref);if(!resolved.has(key))resolved.set(key,resolveVillageTarget(e,ref));return resolved.get(key)};
 const state=e.abilityEffects??(previewOnly?createEffectState(e.time):(e.abilityEffects=createEffectState(e.time))),host={
  time:()=>e.time,
  available:resource=>Object.hasOwn(e.stock,resource)?e.stock[resource]:0,
  pay:costs=>{if(costs.some(c=>!Object.hasOwn(e.stock,c.resource)||!Number.isFinite(e.stock[c.resource])||e.stock[c.resource]<c.amount))return false;for(const c of costs)e.stock[c.resource]-=c.amount;return true},
  resolve,invalidateQueries:()=>{spatialDirty=true;resolved.clear()},query:(s,p)=>{if(spatialDirty){spatial.rebuild(queryVillageTargets(e,s,p).map(ref=>[ref,resolve(ref)?.position]));spatialDirty=false}return spatial.query(p,s.radius)},random:()=>e.random(),
  relation:(a,b)=>villageTargetRelation(e,a,b),
  validate:(d,context,result)=>{if(!d.id.startsWith('miracle.'))return result;const check=miracleTarget(e,d.id.slice(8),context.target,{autonomous:true,planning:!!context.planning,source:context.source});return check.valid?result:{...result,valid:false,reason:check.reason}},
  outcome:event=>{noticeAbilitySocial(e,event,registry);e.emit('ability-outcome',null,null,{outcome:event})},
  effectChanged:x=>{if(x.definition==='protected'){shieldProjection(e,runtime,x.target);e.emit('wish-shield',x.target.kind==='villager'?resolveVillageTarget(e,x.target)?.actor:null)}},
  effectEnded:(x,reason)=>{if(x.definition==='protected')shieldProjection(e,runtime,x.target);if(x.definition==='burning'){const b=e.wishes?.burns.find(b=>b.effectId===x.id);if(b){b.until=Math.min(b.until,e.time);if(reason==='death')b.regrowAt=e.time+1.4}}},
  commands:{
   ...villageDomainCommands(e),
   damage:(step,ctx)=>{const custom=domainEffectCommand(e,ctx.target,'damage',step,ctx,runtime);if(custom)return custom.result;const d=resolveVillageTarget(e,ctx.target),resistance=runtime.modified(ctx.target,'resistance',0,{min:0,max:1}).value,typed=runtime.modified(ctx.target,'resistance.'+(step.cause??'attack'),0,{min:0,max:1}).value;return damage(e,d,step.amount*(state.instances[ctx.effectId]?.stacks??1)*(1-resistance)*(1-typed),step.cause??'attack')},
   kill:(step,ctx)=>{const custom=domainEffectCommand(e,ctx.target,'kill',step,ctx,runtime);if(custom)return custom.result;const d=resolveVillageTarget(e,ctx.target);return damage(e,d,actorVitality(d.actor)?.health??d.maxHealth,step.cause??'god-wish',true)},
   heal:(step,ctx)=>{const custom=domainEffectCommand(e,ctx.target,'heal',step,ctx,runtime);if(custom)return custom.result;const d=resolveVillageTarget(e,ctx.target),a=d.actor;if(!a||!d.alive)return{changed:false,amount:0};const before=(actorVitality(a)?.health)??d.maxHealth;(ensureActorVitality(a).health)=Math.min(d.maxHealth,before+step.amount);return{changed:(actorVitality(a)?.health)>before,amount:(actorVitality(a)?.health)-before}},
   restore:(_step,ctx)=>{
    const custom=domainEffectCommand(e,ctx.target,'restore',_step,ctx,runtime);if(custom)return custom.result;
    const d=resolveVillageTarget(e,ctx.target);if(!villageTargetCheck(e,'life',ctx.target).valid)return{changed:false,amount:0};
    if(d.plant){const p=d.plant,duration=resourceGrowth(p).initialGrow??(isForage(p)?forageRules(p).grow:RESOURCE_RULES.food.grow),before=resourceGrowth(p).growth;resourceGrowth(p).readyAt=Math.max(e.time,resourceGrowth(p).readyAt-duration*WISH_RULES.cropGrowthFraction);resourceGrowth(p).growth=Math.max(.08,1-(resourceGrowth(p).readyAt-e.time)/duration);if(resourceGrowth(p).readyAt<=e.time){resourceGrowth(p).state='ready';resourceGrowth(p).growth=1;resourceHarvest(p).hits=0;delete resourceGrowth(p).initialGrow;e.emit('ready',null,p)}e.emit('wish-grow',null,p,{amount:resourceGrowth(p).growth-before});return{changed:resourceGrowth(p).growth>before,amount:resourceGrowth(p).growth-before}}
    const actor=d.actor,amount=Math.max(0,d.maxHealth-((actorVitality(actor)?.health)??d.maxHealth));(ensureActorVitality(actor).health)=d.maxHealth;(ensureActorDeprivation(actor).starvingFor)=0;const cleansed=clearCurse(e,actor);e.emit('wish-heal',ctx.target.kind==='villager'?actor:null,null,{targetKind:ctx.target.kind,targetId:actor.id,amount});return{changed:amount>0||cleansed,amount,cleansed};
   },
   ignite:(_step,ctx)=>{
    const custom=domainEffectCommand(e,ctx.target,'ignite',_step,ctx,runtime);if(custom)return custom.result;
    const d=resolveVillageTarget(e,ctx.target);if(!villageTargetCheck(e,'fire',ctx.target).valid)return{changed:false};
    if(d.relic){destroyRelic(e,d.relic);return{changed:true}}
    if(d.home){igniteHouse(e,d.home);return{changed:true}}
    if(d.fire){const f=d.fire;f.fuel=Math.max(f.fuel,CAMPFIRE_RULES.secondsPerWood);f.lit=true;f.wetUntil=e.time;f.rainExposure=0;e.emit('fire-lit',null,null,{wish:true});return{changed:true}}
    const p=d.actor??d.plant,until=e.time+WISH_RULES.burnDuration,regrowAt=until+(d.actor?0:WISH_RULES.regrowDelay),s=wishPresentationState(e);
    s.burns=s.burns.filter(b=>!sameTarget(b,ctx.target));const b={id:p.id,kind:ctx.target.kind,x:p.x,z:p.z,startedAt:e.time,lastDamageAt:e.time,until,regrowAt};s.burns.push(b);
    const effect=runtime.apply(_step.effect??'burning',ctx.target,ctx);b.effectId=effect.id;if(d.actor&&ctx.target.kind==='villager')survivalInterrupt(e.survival,p);
    if(ctx.target.kind==='tree'||ctx.target.kind==='crop'){for(const w of e.workers)if(w.node===p)releaseWork(e,w);depleteResource(e,p,{cause:'fire'});if(resourceGrowth(p).readyAt!==null)resourceGrowth(p).readyAt=regrowAt;resourceCondition(p).burningUntil=until}
    if(ctx.target.kind==='mushroom'){p.state='burning';p.burningUntil=until}
    e.emit('wish-fire',null,p);return{changed:true,effectId:b.effectId??null};
   },
  },
 };
 const runtime=createEffectRuntime({state,registry,host});if(!previewOnly)controllers.set(e,{state,runtime,registry});return runtime;
}
export function castVillageAbility(e,kind,target,source={kind:'god',id:'player'}){const runtime=villageEffects(e);runtime.advance(e.time);return runtime.cast('miracle.'+kind,{target,source,socialHandled:true})}
export function previewVillageAbility(e,kind,target,source={kind:'god',id:'player'},validated=null,options={}){
 const check=validated??miracleTarget(e,kind,target,{autonomous:true,source});if(!check.valid)return check;
 const selection=villageEffects(e,{previewOnly:true}).preview('miracle.'+kind,{target,source,planning:!!options.planning});
 return selection.valid?{...check,costs:selection.costs}:{valid:false,reason:selection.reason,remaining:selection.remaining};
}
export function updateVillageEffects(e){if(e.abilityEffects){villageEffects(e).advance(e.time);pruneAbilitySocial(e)}}
export function importLegacyBurns(e){
 for(const b of e.wishes?.burns??[])if(!b.effectId&&(b.until>e.time||(b.lastDamageAt??b.startedAt)+1<=b.until)&&resolveVillageTarget(e,b)){
  const r=villageEffects(e);b.effectId=r.hydrate({definition:'burning',target:{kind:b.kind,id:b.id},source:{kind:'god',id:'legacy-wish'},startedAt:b.startedAt,until:b.until,nextTick:(b.lastDamageAt??b.startedAt)+1}).id;
 }
}
export function applyVillageShield(e,actor,source={kind:'god',id:'player'}){const ref=villageActorRef(e,actor);if(!ref)return false;const r=villageEffects(e);r.advance(e.time);r.apply('protected',ref,{source});return true}
export function endVillageBurn(e,b,reason='extinguished'){if(b.effectId&&e.abilityEffects)villageEffects(e).end(b.effectId,reason)}
export function noticeGameplayEffectEvent(e,event){
 if(!e.abilityEffects||event.type==='ability-outcome')return;
 const registry=registryForVillage(e),type='game.'+event.type;
 if(!Object.values(e.abilityEffects.instances).some(x=>registry.get(x.definition)?.triggers?.some(t=>t.event===type)))return;
 const target=event.targetKind&&event.targetId!=null?{kind:event.targetKind,id:event.targetId}:event.workerId!=null?{kind:'villager',id:event.workerId}:event.actorKind&&event.actorId!=null?{kind:event.actorKind,id:event.actorId}:null;
 villageEffects(e).notify(type,{target,source:null,result:{changed:true},gameEvent:{type:event.type,workerId:event.workerId??null,nodeId:event.nodeId??null,cause:event.cause??null}});
}
