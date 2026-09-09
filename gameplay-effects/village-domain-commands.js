import {lifeIdle} from "../village-life.js";
import {applyPoison,clearPoison} from '../village-poison.js';
import {beastsInterrupt} from "../village-beasts.js";
import {ensureBeastEffects} from "../ecs/beast-effects.js";
import {ensureActorDeprivation} from "../ecs/actor-deprivation.js";
import {ensureWatchParticipant} from "../ecs/watch-participants.js";
import {lifeCancelSocial} from "../village-life.js";
import {actorNeeds} from "../ecs/actor-needs.js";
import {ensureActorRomance} from "../ecs/actor-romance.js";
import {lifeRelation} from "../village-life.js";
import {romanceBetray} from "../village-romance.js";
import {DOMAIN_OPERATIONS,validateDomainStep} from './domain-catalog.js';
import {miracleTarget} from './village-miracle-targets.js';
import {wishPresentationState} from './wish-presentation-state.js';
import {castBeastMiracle} from '../beast-miracles.js';
import {changeVillagerAge} from '../village-age.js';
import {castSkillWish} from '../skill-wishes.js';
import {placePing} from '../village-pings.js';
import {castNatureWish} from '../nature-wishes.js';
import {castFaunaWish} from '../village-rats-owls.js';
import {castUprising} from '../uprising-wish.js';
import {castBehaviourWish} from '../behaviour-wishes.js';
import {repairByWish} from '../god-wish-repair.js';
import {applyCurse} from '../village-curse.js';
import {liftActor,changeSocialBond} from '../divine-interventions.js';
import {clearRomanticFeelings,emotionalAttachment,hurtRomantically} from '../village-feelings.js';
import {summonNewcomer} from '../village-newcomer.js';
import {resurrectVillager} from '../village-resurrection.js';
import {ritualEnergyCeiling} from '../beast-awakening.js';
import {grantWishSupplies} from '../resource-wish.js';
import {changeTemperatureByWish} from '../temperature-wish.js';
import {WISH_RULES} from '../wish-rules.js';

const handlers={
 'person.poison':(e,k,c)=>k==='poison'?applyPoison(e,c.actor):clearPoison(e,c.actor),
 'relic.invoke':(e,k,c,t,r)=>castRelicMiracle(e,k,c,r),
 'beast.command':(e,k,c)=>castBeastMiracle(e,k,c),
 'person.age':(e,k,c)=>changeVillagerAge(e,c.actor,k),
 'person.learn':(e,k,c)=>castSkillWish(e,k,c.actor),
 'village.suggest':(e,k,c)=>placePing(e,k,c.point),
 'nature.invoke':(e,k,c)=>castNatureWish(e,k,c),
 'fauna.summon':(e,k,c)=>castFaunaWish(e,k,c),
 'leadership.uprising':(e,k,c)=>castUprising(e,c),
 'person.behaviour':(e,k,c)=>castBehaviourWish(e,k,c),
 'structure.repair':(e,k,c)=>repairByWish(e,c.home),
 'person.curse':(e,k,c)=>applyCurse(e,c.actor),
 'person.lift':(e,k,c,t)=>liftActor(e,t,c.actor),
 'relationship.bond':(e,k,c)=>changeSocialBond(e,c.pair,k),
 'relationship.commit':(e,k,c)=>{
  const [a,b]=c.pair;romanceBetray(e.life.romance,a,b);romanceBetray(e.life.romance,b,a);const bond=lifeRelation(e.life,a.id,b.id);
  delete bond.socialMiracle;Object.assign(bond,{affinity:1,attractionAB:1,attractionBA:1,meetings:Math.max(5,bond.meetings),romanceStatus:'committed',romanceAfter:e.time+20});(ensureActorRomance(a).sweetheartId)=b.id;(ensureActorRomance(b).sweetheartId)=a.id;
  for(const w of [a,b]){clearRomanticFeelings(w);actorNeeds(w).social=100}e.emit('wish-love',a,null,{partnerId:b.id});
 },
 'relationship.separate':(e,k,c)=>{
  const [a,b]=c.pair;for(const session of [...e.life.sessions])if(session.workers.includes(a)&&session.workers.includes(b))lifeCancelSocial(e.life,session);
  const bond=lifeRelation(e.life,a.id,b.id),attachments=[emotionalAttachment(e,a,b,bond),emotionalAttachment(e,b,a,bond)];Object.assign(bond,{romanceStatus:'ended',romanceAfter:e.time+180,affinity:Math.min(.1,bond.affinity),attractionAB:Math.min(.35,bond.attractionAB),attractionBA:Math.min(.35,bond.attractionBA)});(ensureActorRomance(a).sweetheartId)=(ensureActorRomance(b).sweetheartId)=null;
  for(const [i,w] of [a,b].entries())hurtRomantically(e,w,w===a?b:a,'breakup',{attachment:attachments[i],established:true});e.emit('wish-heartbreak',a,null,{partnerId:b.id});
 },
 'person.summon':(e,k,c)=>{const w=summonNewcomer(e,c);return {spawned:{kind:'villager',id:w.id}}},
 'person.resurrect':(e,k,c,t,r)=>{
  // Effects which cannot survive death must not return if resurrection happens
  // between simulation steps. Persistent memory/relationship data stays owned by
  // the existing resurrection domain.
  const target={kind:'villager',id:c.worker.id};for(const x of r.inspect(target))if(!r.registry.get(x.definition).surviveDeath)r.end(x.id,'resurrection');
  const w=resurrectVillager(e,c);return{spawned:{kind:'villager',id:w.id}};
 },
 'person.energize':(e,k,c)=>{
  const a=c.actor,ceiling=ritualEnergyCeiling(a,e.time),amount=Math.max(0,ceiling-actorNeeds(a).energy);actorNeeds(a).energy=ceiling;(ensureWatchParticipant(a).sleepDebt)=0;(ensureActorDeprivation(a).sleeplessFor)=0;(ensureActorDeprivation(a).exhaustedFor)=0;
  if(a.species==='beast'&&a.state==='sleeping'){(ensureBeastEffects(a).lullabyUntil)=0;beastsInterrupt(e.beasts,a)}else if(['resting','rest-bound'].includes(a.state))lifeIdle(e.life,a);
  e.emit('wish-energized',a,null,{amount});
 },
 'resource.grant':(e,k)=>grantWishSupplies(e,k),
 'weather.temperature':(e,k)=>changeTemperatureByWish(e,k),
 'world.time':(e,k)=>{(wishPresentationState(e).worldCommands??=[]).push({kind:k,hour:k==='daybreak'?12:22})},
 'weather.clear':e=>{
  const s=wishPresentationState(e);s.rainUntil=0;(s.worldCommands??=[]).push({kind:'clear-skies'});
  for(const f of [e.campfire,...(e.exploration?.camps??[]).map(c=>c.fire)])if(f){f.rain=0;f.wetUntil=e.time;f.rainExposure=0;if(f.built&&f.fuel>0&&!f.lit){f.lit=true;e.emit('fire-lit',null,null,{wish:true})}}
 },
 'weather.rain':e=>{wishPresentationState(e).rainUntil=e.time+WISH_RULES.rainDuration},
};
export function villageDomainCommands(e){return Object.fromEntries(Object.keys(DOMAIN_OPERATIONS).map(op=>[op,(step,context,runtime)=>{
 validateDomainStep(step);const check=miracleTarget(e,step.wish,context.target,{autonomous:true,source:context.source});if(!check.valid)return{changed:false,reason:check.reason};
 const result=handlers[op](e,step.wish,check,context.target,runtime);
 // Do not serialize domain return values containing actors, nodes or controllers.
 return {changed:result!==false,...(['person.summon','person.resurrect'].includes(op)?result:{})};
}]))}
import {castRelicMiracle} from '../relic-miracles.js';
