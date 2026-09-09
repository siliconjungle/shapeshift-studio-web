import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {structuralCondition} from './../home-entities.js';
import {ensureActorDailyActivity} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {ensurePersonKinship,personKinship} from '../person-kinship.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalInterrupt} from '../../village-survival.js';
import {lifeRelation} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorRomance} from '../actor-romance.js';
import {memoryMutual} from '../../village-memory.js';
import {actorNeeds} from '../actor-needs.js';
import {ensureCareParticipant} from '../care-participants.js';
import {childcareInterrupt} from '../../village-childcare.js';
import {ADOPTION_RULES} from '../../village-adoption.js';
import {homeBeds} from '../../village-childcare.js';
import {parentIds} from '../../village-kinship.js';
const adult=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled&&!(personAge(w)?.child)&&!w.rivalJourney&&!w.visit;
const sameHome=(a,b)=>a&&b&&(a===b||a.id!==undefined&&a.id===b.id);
export function adoptionUpdate(world){
 const e=world.resource('Village');
 if(!e.family||!e.life)return;
 for(const child of e.workers){
  if(!(personAge(child)?.child)||(actorVitality(child)?.dead)||child.exiled||child.divineHeld)continue;
  const parents=parentIds(child);if(!parents.length||parents.some(id=>{const p=e.workers.find(w=>w.id===id);return p&&!(actorVitality(p)?.dead)&&!p.exiled;}))continue;
  ensurePersonKinship(child).orphanedAt??=e.time;
  if(e.time-(personKinship(child)?.orphanedAt)<ADOPTION_RULES.settle||e.time<((personKinship(child)?.adoptionCheckAt)??0))continue;
  ensurePersonKinship(child).adoptionCheckAt=e.time+ADOPTION_RULES.retry;
  const candidates=e.workers.filter(w=>adult(w)&&!w.divineHeld&&(actorResidence(w)?.home)&&!(structuralCondition((actorResidence(w)?.home))?.destroyed)&&w.id!==child.id);
  const choices=[];
  for(const a of candidates){
   const partner=candidates.find(w=>w.id===(actorRomance(a)?.sweetheartId)&&(actorRomance(w)?.sweetheartId)===a.id),pair=partner?[a,partner]:[a];
   // A couple adopts together when a household can house all of them.
   for(const home of [...new Set(pair.map(w=>(actorResidence(w)?.home)))]){
    const others=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.exiled&&w!==child&&!pair.includes(w)&&sameHome((actorResidence(w)?.home),home)).length;
    if(others+pair.length+1>homeBeds(home))continue;
    if(!e.route(child,home))continue;
    const bond=pair.reduce((v,w)=>v+(lifeRelation(e.life,w.id,child.id)?.affinity??0),0)/pair.length;
    choices.push({pair,home,score:bond+(pair.length===2?.2:0)+(sameHome((actorResidence(child)?.home),home)?.2:0)+(pair.some(w=>(actorPersonality(w)?.trait)==='gentle')?.1:0)});
   }
  }
  choices.sort((a,b)=>b.score-a.score||a.pair[0].id-b.pair[0].id);const choice=choices[0];if(!choice)continue;
  childcareInterrupt(e,child);survivalInterrupt(e.survival,child);
  ensurePersonKinship(child).adoptiveParents=choice.pair.map(w=>w.id);ensurePersonKinship(child).adoptedAt=e.time;
  ensurePersonKinship(child).adoptions=[{at:e.time,parents:[...(personKinship(child)?.adoptiveParents)]},...((personKinship(child)?.adoptions)??[])].slice(0,8);
  delete personKinship(child)?.orphanedAt;delete personKinship(child)?.adoptionCheckAt;
  ensureActorResidence(child).home=choice.home;ensureCareParticipant(child).nextAt=e.time;ensureActorDailyActivity(child).careAt=e.time;
  for(const p of choice.pair){ensureActorResidence(p).home=choice.home;const r=lifeRelation(e.life,p.id,child.id);if(r){r.affinity=Math.max(.65,r.affinity);r.attractionAB=r.attractionBA=0;r.juvenile=true;}memoryMutual(e.life.memory,p,child,'adopted',.2);}
  actorNeeds(child).care??=50;actorNeeds(child).social=Math.min(100,actorNeeds(child).social+12);
  e.emit('child-adopted',child,null,{parents:[...(personKinship(child)?.adoptiveParents)]});
 }
}
