import {faithChange} from "../village-faith.js";
import {faithPerson} from "../village-faith.js";
import {faithWitnesses} from "../village-faith.js";
import {faithBenefit} from "../village-faith.js";
import {actorVitality} from "../ecs/actor-vitality.js";
import {noticeFavor} from '../village-jealousy.js';
import {targetKey} from './targets.js';
// A declared social policy attributes meaningful outcomes to a god. NPC casts
// and the original wish wrapper keep their existing observation policies.
export function noticeAbilitySocial(e,event,registry){
 if(!e.faith||event.socialHandled||event.instigator?.kind!=='god'||!event.type.startsWith('operation.')||!event.result?.changed||event.target?.kind!=='villager')return;
 const policy=registry.get(event.ability)?.social;if(!policy||!Number.isSafeInteger(event.castId))return;
 if(!(policy.on??['heal','restore','damage','kill']).includes(event.type.slice(10)))return;
 const actor=e.workers.find(w=>w.id===event.target.id);if(!actor)return;
 const receipts=e.abilitySocial??={},key=String(event.castId),targets=receipts[key]??=[];if(targets.includes(targetKey(event.target)))return;targets.push(targetKey(event.target));
 const strength=policy.strength??.5;
 if(policy.kind==='help'){
  if((actorVitality(actor)?.dead))return;
  faithBenefit(e.faith,actor,strength,'divine-help');noticeFavor(e.faith,{kind:'energy',targetKind:'villager',actorId:actor.id},{});
 }else{
  for(const witness of faithWitnesses(e.faith,actor)){faithPerson(e.faith,witness).lastHarmAt=e.time;faithChange(e.faith,witness,-strength*(witness===actor?1:.5),'harmful-ability')}
 }
 e.emit('divine-outcome',actor,null,{ability:event.ability,source:event.instigator,kind:policy.kind,amount:event.result.amount??0});
}
export function pruneAbilitySocial(e){
 if(!e.abilitySocial)return;const active=new Set();for(const x of Object.values(e.abilityEffects?.instances??{}))if(x.castId)active.add(String(x.castId));for(const job of e.abilityEffects?.jobs??[])if(job.context?.castId)active.add(String(job.context.castId));
 for(const id of Object.keys(e.abilitySocial))if(!active.has(id))delete e.abilitySocial[id];
}
