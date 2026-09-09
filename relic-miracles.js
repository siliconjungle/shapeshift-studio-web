import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {resourceGrowth,resourceCultivation,resourceCondition,resourceHarvest} from './ecs/resource-state.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {ensureActorVitality} from './ecs/actor-vitality.js';
import {ensureActorDeprivation} from './ecs/actor-deprivation.js';
import {survivalDamage} from './village-survival.js';
import {raiderDamage} from './village-raids.js';
import {slimeDamage} from './village-slimes.js';
import {lifeRelation} from './village-life.js';
import {RELIC_MIRACLES} from './relic-miracle-catalog.js';
import {relicMiracleAvailable} from './relic-miracle-state.js';
import {queryVillageTargets,resolveVillageTarget} from './gameplay-effects/village-targets.js';
import {clearCurse,applyCurse} from './village-curse.js';
import {visibleAt} from './village-exploration.js';
import {defineGameData} from './game-data.js';
export const RELIC_MIRACLE_RULES=defineGameData('relic-miracles.RULES',{radius:4,damage:20,healing:30,famineEnergy:30,nightmareEnergy:40,concordAffinity:.3});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function nearby(e,point){return queryVillageTargets(e,{},point).map(ref=>resolveVillageTarget(e,ref)).filter(d=>d?.actor&&d.alive&&!(actorInterior(d.actor)?.inside)&&!d.actor.divineHeld&&d.position&&distance(d.position,point)<=RELIC_MIRACLE_RULES.radius&&visibleAt(e,d.position.x,d.position.z));}
export function relicMiracleTarget(e,id,target){
 if(!RELIC_MIRACLES[id])return {valid:false,reason:'Unknown relic miracle'};
 if(!relicMiracleAvailable(e,id))return {valid:false,reason:'Your village must possess this relic and choose its miracle.'};
 const d=resolveVillageTarget(e,target),point=d?.position;
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!visibleAt(e,point.x,point.z))return {valid:false,reason:'Choose a place within the village’s sight'};
 const single=['relic-famine','relic-nightmare'].includes(id),actors=single?(d?.actor&&d.alive&&!(actorInterior(d.actor)?.inside)&&!d.actor.divineHeld?[d]:[]):nearby(e,point);
 if(id==='relic-ripen'){
  const plants=e.nodes.filter(n=>n.kind==='food'&&resourceGrowth(n).state==='growing'&&!resourceCultivation(n)?.needsPlanting&&Number.isFinite(resourceGrowth(n).readyAt)&&!(resourceCondition(n)?.burningUntil>e.time)&&distance(n,point)<=RELIC_MIRACLE_RULES.radius&&visibleAt(e,n.x,n.z));
  return plants.length?{valid:true,point,plants,label:'Ripen nearby crops'}:{valid:false,reason:'Choose planted, growing crops'};
 }
 const affected=actors.filter(d=>(id!=='relic-concord'||d.ref.kind==='villager')&&(!['relic-banquet','relic-famine','relic-nightmare'].includes(id)||actorNeeds(d.actor)));
 if(!affected.length)return {valid:false,reason:single?'Choose a living character with hunger and energy':'Bring someone within four paces'};
 return {valid:true,point,affected,actor:single?affected[0].actor:undefined,label:RELIC_MIRACLES[id].name};
}
export function castRelicMiracle(e,id,c,runtime){
 const rules=RELIC_MIRACLE_RULES;
 if(id==='relic-ripen'){for(const n of c.plants){resourceGrowth(n).readyAt=e.time;resourceGrowth(n).growth=1;resourceGrowth(n).state='ready';resourceHarvest(n).hits=0;delete resourceGrowth(n).initialGrow;e.emit('ready',null,n);e.emit('wish-grow',null,n,{amount:1});}return true;}
 for(const d of c.affected){
  const a=d.actor,ref=d.ref;
  if(id==='relic-banquet'){actorNeeds(a).hunger=0;ensureActorDeprivation(a).starvingFor=0;e.emit('wish-energized',ref.kind==='villager'?a:null,null,{amount:0,targetKind:ref.kind,targetId:a.id});}
  if(id==='relic-famine'){actorNeeds(a).hunger=100;actorNeeds(a).energy=Math.max(0,actorNeeds(a).energy-rules.famineEnergy);}
  if(id==='relic-absolution')clearCurse(e,a);
  if(id==='relic-nightmare'){applyCurse(e,a);actorNeeds(a).energy=Math.max(0,actorNeeds(a).energy-rules.nightmareEnergy);}
  if(id==='relic-winter-ward')runtime.apply('protected',ref,{source:{kind:'god',id:'player'}});
  if(id==='relic-frostbite'){
   if(['villager','beast'].includes(ref.kind))survivalDamage(e.survival,a,rules.damage,'cold');
   else if(ref.kind==='raider'||ref.kind==='slime')(ref.kind==='raider'?raiderDamage:slimeDamage)(ref.kind==='raider'?e.raids:e.slimes,a,rules.damage,null,{divine:true,cause:'cold'});

  }
  if(id==='relic-renewal'){
   const before=ensureActorVitality(a).health;ensureActorVitality(a).health=Math.min(d.maxHealth,ensureActorVitality(a).health+rules.healing);
   for(const effect of runtime.inspect(ref))if(effect.definition==='burning')runtime.end(effect.id,'extinguished');
   for(const b of e.wishes?.burns??[])if(b.kind===ref.kind&&b.id===a.id)b.until=Math.min(b.until,e.time);
   e.emit('wish-heal',ref.kind==='villager'?a:null,null,{targetKind:ref.kind,targetId:a.id,amount:ensureActorVitality(a).health-before});
  }
 }
 if(id==='relic-concord'){
  const people=c.affected.filter(d=>d.ref.kind==='villager').map(d=>d.actor);
  for(let i=0;i<people.length;i++){actorNeeds(people[i]).social=100;for(let j=i+1;j<people.length;j++){const bond=lifeRelation(e.life,people[i].id,people[j].id);if(bond)bond.affinity=Math.min(1,bond.affinity+rules.concordAffinity);}}
 }
 e.emit('relic-miracle',null,null,{wish:id,x:c.point.x,z:c.point.z});return true;
}
