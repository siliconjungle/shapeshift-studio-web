import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {ensureActorCombat} from '../actor-combat.js';
import {skillLevel} from '../../village-skills.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDamage} from '../../village-survival.js';
import {raiderDamage} from '../../village-raids.js';
import {slimeDamage} from '../../village-slimes.js';
import {arrowFlights} from '../arrow-flights.js';
import {ARCHERY_RULES,arrowActor,archeryState,clearArrowShot} from '../../village-archery.js';
import {damageRival} from '../../village-rival.js';
import {supportDefended} from '../../village-support.js';
export function updateArcherySystem(world){
 const e=world.resource('Village');
 const s=e.archery;if(!s)return;arrowFlights(e);
 for(const id of world.query(['ArrowFlight'])){const arrow=world.get(id,'ArrowFlight');if(arrow.resolved||e.time<arrow.arriveAt)continue;arrow.resolved=true;
  const victim=arrowActor(e,arrow.targetKind,arrow.targetId),source=arrowActor(e,arrow.sourceKind,arrow.sourceId);
  if(!victim||(actorVitality(victim)?.dead)||victim.gone||(actorInterior(victim)?.inside)||victim.divineHeld||Math.hypot(victim.x-arrow.to.x,victim.z-arrow.to.z)>ARCHERY_RULES.hitRadius)continue;
  if(arrow.targetKind==='outsider')damageRival(e,victim,arrow.damage,'attack',source);else if(arrow.targetKind==='raider')raiderDamage(e.raids,victim,arrow.damage,source,{critical:arrow.critical});else if(arrow.targetKind==='slime')slimeDamage(e.slimes,victim,arrow.damage,source,{critical:arrow.critical});else survivalDamage(e.survival,victim,arrow.damage,'attack',source,{critical:arrow.critical});
  if(source&&arrow.sourceKind==='villager')supportDefended(e,source,victim);
  e.emit('arrow-hit',arrow.sourceKind==='villager'?source:null,null,{x:victim.x,z:victim.z,targetKind:arrow.targetKind,targetId:arrow.targetId});
 }
 for(const a of s.arrows)if(a.resolved)arrowFlights(e).remove(a);
}

export function launchArrowSystem(world,source,target,sourceKind,targetKind,{critical=false}={}){
 const e=world.resource('Village');
 if(!source||!target||arrowActor(e,sourceKind,source.id)!==source||arrowActor(e,targetKind,target.id)!==target)return false;
 if((actorVitality(source)?.dead)||source.divineHeld||(actorVitality(target)?.dead)||target.gone||(actorInterior(target)?.inside)||target.divineHeld||!clearArrowShot(e,source,target))return false;
 const s=archeryState(e),distance=Math.hypot(target.x-source.x,target.z-source.z),from={x:source.x,z:source.z,y:(e.heightAt(source.x,source.z)??0)+1.05},to={x:target.x,z:target.z,y:(e.heightAt(target.x,target.z)??0)+(target.species==='slime'?target.scale*.48:1)};
 arrowFlights(e).add({id:s.nextId++,sourceKind,sourceId:source.id,targetKind,targetId:target.id,culture:source.culture??e.culture,from,to,at:e.time,arriveAt:e.time+Math.max(.12,distance/ARCHERY_RULES.speed),damage:ARCHERY_RULES.damage*(1+skillLevel(source,'combat')*.04)*(critical?1.5:1),critical});
 ensureActorCombat(source).shotAt=e.time;e.emit('arrow-shot',sourceKind==='villager'?source:null,null,{x:source.x,z:source.z,sourceKind,sourceId:source.id});return true;
}
