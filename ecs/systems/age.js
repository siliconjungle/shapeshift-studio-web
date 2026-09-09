import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {ensureActorDailyActivity} from "../daily-activity-actors.js";
import {familyBirthPlan,familyConfiguration,setFamilyBirthPlan} from "../family-entities.js";
import {personKinship} from '../person-kinship.js';
import {beastRelationships} from '../beast-relationships.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalInterrupt,survivalDrop} from '../../village-survival.js';
import {AGE_RULES} from '../age-rules.js';
import {personAge,ensurePersonAge} from '../person-age.js';
import {actorRomance,ensureActorRomance} from '../actor-romance.js';
import {actorFeelings} from '../actor-feelings.js';
import {actorNeeds} from '../actor-needs.js';
import {ensureCareParticipant} from '../care-participants.js';
import {childcareInterrupt} from '../../village-childcare.js';
import {parentIds} from '../../village-kinship.js';
import {initialiseRomanceInterest} from '../../village-romance-interest.js';
import {clearRomanticFeelings} from '../../village-feelings.js';
import {knownPeople} from '../../village-people.js';
// Biological age is village simulation time: nothing advances while away.
import {canFormAdultPair} from '../../village-romance.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function initialiseAgeData(age,time){
 if(!Number.isFinite(age.ageYears))age.ageYears=age.child?clamp((time-(age.childhoodStartedAt??age.bornAt??time))/Math.max(1,(age.matureAt??time+90)-(age.childhoodStartedAt??age.bornAt??time))*18,0,18):24;
 if(age.child){if(age.bornAt===undefined)age.childhoodStartedAt??=time-age.ageYears*5;age.matureAt??=(age.childhoodStartedAt??age.bornAt)+90;}
 age.elder=!age.child&&age.ageYears>=AGE_RULES.elder;
 age.frailty=age.elder?clamp((age.ageYears-AGE_RULES.elder)/(AGE_RULES.frail-AGE_RULES.elder),0,1):0;
}
export function initialiseAge(w,time=0){
 initialiseRomanceInterest(w);
 initialiseAgeData(ensurePersonAge(w),time);
}
export const ageMovementRate=w=>{const age=personAge(w);return age?.elder ? .72-.22*(age.frailty??0):1;};
export const ageWorkRate=w=>{const age=personAge(w);return age?.elder ? .65-.3*(age.frailty??0):1;};
export function familyRelation(e,w,other){
 if((personKinship(w)?.adoptiveParents)?.includes(other.id))return 'Adoptive parent';
 if((personKinship(w)?.parents)?.includes(other.id))return 'Parent';
 if((personKinship(other)?.adoptiveParents)?.includes(w.id))return 'Adopted child';
 if((personKinship(other)?.parents)?.includes(w.id))return 'Child';
 const people=knownPeople(e);
 const grandparents=p=>parentIds(p).flatMap(id=>parentIds(people.find(a=>a.id===id)));
 if(grandparents(w).includes(other.id))return 'Grandparent';
 if(grandparents(other).includes(w.id))return 'Grandchild';
 return parentIds(w).some(id=>parentIds(other).includes(id))?'Sibling':null;
}
export function matureVillager(world,w){
 const e=world.resource('Village');
 childcareInterrupt(e,w);const age=ensurePersonAge(w);age.child=false;age.ageYears=Math.max(18,age.ageYears??18);delete actorNeeds(w)?.care;
 if(w.state==='following'){w.state='idle';w.route=[];w.wait=.5;}ensureActorDailyActivity(w).careAt=e.time+1;w.job=null;
 for(const r of e.life?.relationships??[]){if(!r.juvenile||r.a!==w.id&&r.b!==w.id)continue;const other=knownPeople(e).find(p=>p.id===(r.a===w.id?r.b:r.a));if(canFormAdultPair(w,other)){r.attractionAB=.35+e.random()*.65;r.attractionBA=.35+e.random()*.65;delete r.juvenile;}}
 e.emit('grown',w,null);
}
export function updateAges(world,dt){
 const e=world.resource('Village');
 if(!e.life)return;
 for(const w of e.workers){
  initialiseAge(w,e.time-dt);if((actorVitality(w)?.dead)||w.exiled)continue;
  const age=personAge(w),wasElder=age.elder;
  if(age.child){age.ageYears=clamp((e.time-(age.childhoodStartedAt??age.bornAt))/Math.max(1,age.matureAt-(age.childhoodStartedAt??age.bornAt))*18,0,18);if(e.time>=age.matureAt)matureVillager(world,w);}
  else age.ageYears=Math.min(120,age.ageYears+dt/AGE_RULES.secondsPerAdultYear);
  // Maturation emits gameplay notifications. Resolve current data afterward;
  // an observer may have replaced a component or applied another age card.
  initialiseAge(w,e.time);
  if(personAge(w).elder&&!wasElder){ensureCareParticipant(w).nextAt=e.time;actorNeeds(w).care??=85;e.emit('became-elder',w);}
 }

}
export function ageWishTarget(e,target){
 const actor=target?.kind==='villager'&&e.workers.find(w=>w.id===target.id);
 return actor&&!(actorVitality(actor)?.dead)&&!actor.exiled&&!(actorInterior(actor)?.inside)&&!actor.divineHeld?{valid:true,actor,label:actor.name}:{valid:false,reason:'Choose a living villager outdoors.'};
}
export function changeVillagerAge(world,w,kind){
 const e=world.resource('Village');
 const oldAge=(personAge(w)?.ageYears)??24,wasChild=!!(personAge(w)?.child);
 survivalInterrupt(e.survival,w);
 if(w.cargo){survivalDrop(e.survival,w,w.cargo.kind,w.cargo.amount);w.cargo=null;}
 if(kind==='age-child'){
  clearRomanticFeelings(w);
  // Youth ends adult commitments, but never erases ancestry or memories.
  if(e.leadership?.isLeader(w))e.leadership.loss(w,'rejuvenated');
  if((familyBirthPlan(e.family))&&((familyBirthPlan(e.family)).parents??(familyConfiguration(e.family).parents)).includes(w.id))setFamilyBirthPlan(e.family,null);
  const watch=e.life?.watch;if(watch){if(watch.guard===w.id)watch.guard=null;if(watch.relief===w.id)watch.relief=null;}
  for(const other of [...e.workers,...(e.beasts?.actors??[])]){if(other.species==='beast'&&(actorFeelings(other)?.crush)?.targetId===w.id)delete actorFeelings(other)?.crush;if((actorRomance(other)?.sweetheartId)===w.id)ensureActorRomance(other).sweetheartId=null;if(other.leaderBelovedId===w.id)other.leaderBelovedId=null;if(other.leaderSuitorIds)other.leaderSuitorIds=other.leaderSuitorIds.filter(id=>id!==w.id);}
  for(const b of e.beasts?.actors??[]){const r=beastRelationships(b)?.find(r=>r.id===w.id);if(r&&['courting','committed','devoted'].includes(r.romanceStatus)){r.romanceStatus='ended';r.romanceAfter=e.time+180;}}
  ensureActorRomance(w).sweetheartId=null;w.leaderBelovedId=null;w.leaderSuitorIds=[];
  for(const r of e.life?.relationships??[])if(r.a===w.id||r.b===w.id){r.attractionAB=r.attractionBA=0;r.juvenile=true;delete r.leaderRomance;delete r.romanceStatus;}
  ensurePersonAge(w).child=true;ensurePersonAge(w).ageYears=5;ensurePersonAge(w).childhoodStartedAt=e.time-25;ensurePersonAge(w).matureAt=e.time+65;actorNeeds(w).care=85;
 }else{
  ensurePersonAge(w).ageYears=kind==='age-elder'?75:25;if(wasChild)matureVillager(world,w);ensurePersonAge(w).child=false;delete actorNeeds(w).care;
 }
 initialiseAge(w,e.time);if((personAge(w)?.elder))actorNeeds(w).care=85;ensureCareParticipant(w).nextAt=e.time;ensureActorDailyActivity(w).careAt=e.time;
 ensurePersonAge(w).ageMiracles=[{at:e.time,from:oldAge,to:(personAge(w)?.ageYears)},...((personAge(w)?.ageMiracles)??[])].slice(0,8);
 e.emit('wish-age',w,null,{ageYears:(personAge(w)?.ageYears),stage:(personAge(w)?.child)?'child':(personAge(w)?.elder)?'elder':'adult'});
}
