import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {personAge} from './ecs/person-age.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {leadershipThought} from './village-leadership.js';

export function uprisingTarget(e,target){
 const politics=e.leadership,leader=politics?.leader;
 if(!leader)return {valid:false,reason:'There is no leader to rise against'};
 if(politics.revolt||politics.rivalry)return {valid:false,reason:'Leadership is already being contested'};
 const actor=target?.kind==='villager'&&e.workers.find(w=>w.id===target.id);
 if(!actor||(actorVitality(actor)?.dead)||(personAge(actor)?.child)||(actorInterior(actor)?.inside)||actor.divineHeld||actor.exiled||actor.expeditionId||actor.rivalJourney||['ritual-bound','rival-captive','held','exile-bound'].includes(actor.state))return {valid:false,reason:'Choose an adult villager outdoors'};
 if(politics.isLeader(actor))return {valid:false,reason:'Choose someone to rise against the leader'};
 if(leader.divineHeld||leader.expeditionId)return {valid:false,reason:'Wait until the leader returns'};
 const point=(actorInterior(leader)?.inside)?((actorInterior(leader)?.insideAt)??(actorResidence(leader)?.home)):leader;
 if(!point||!e.route(actor,point))return {valid:false,reason:'The leader cannot be reached from here'};
 return {valid:true,actor,leader,label:actor.name+' rises against '+leader.name};
}
export function castUprising(e,check){
 const {actor,leader}=check;
 // The card starts an attempt, never an instant exile or an automatic promotion.
 if(!e.leadership.startRevolt([actor],{instigatorId:actor.id}))return false;
 e.leadership.changeResentment(actor,.55);
 leadershipThought(actor,`I must bring ${leader.name}'s rule to an end.`,e.time);
 e.emit('wish-uprising',actor,null,{leaderId:leader.id});return true;
}
