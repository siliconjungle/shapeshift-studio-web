import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {ensureActorDeprivation,actorDeprivation} from '../actor-deprivation.js';
import {actorVitality} from '../actor-vitality.js';
import {personAge} from '../person-age.js';
import {watchParticipant} from '../watch-participants.js';
import {actorNeeds} from '../actor-needs.js';
import {DAY_LENGTH_SECONDS} from '../../village-time.js';
import {childDevelopment} from '../../village-childcare.js';
import {sleepingHome,SHELTER_RULES} from '../../village-shelter.js';
import {ritualEnergyCeiling} from '../../beast-awakening.js';
const clamp=n=>Math.max(0,Math.min(100,n));
// Runs at the original observation point: after feelings, before social meetings.
export function updateResidentNeeds(world,dt){
 const e=world.resource('Village');
  const days=dt/DAY_LENGTH_SECONDS;
  for(const w of e.workers){
   if((actorVitality(w)?.dead))continue;
   const n=actorNeeds(w),age=personAge(w),sleep=w.state==='sleeping',rest=w.state==='resting'||(actorInterior(w)?.inside)&&w.state==='sheltering'&&w.recoveringFromCombat;
   n.hunger=clamp(n.hunger+days*(sleep?90:210)*(age?.child ? .65+.35*childDevelopment(w,e.time).progress:1));
   n.social=clamp(n.social-days*(sleep?8:95));
   if(sleep)n.energy=clamp(n.energy+days*310*(e.leadership?.benefits().sleep??1));
   else if(rest)n.energy=clamp(n.energy+dt*3.5);
   else n.energy=clamp(n.energy-days*(age?.elder?1.2+.3*(age.frailty??0):1)*(['working','house-building'].includes(w.state)?250:['outbound','returning','house-fetch','house-deliver','house-bound'].includes(w.state)?140:60));
   ensureActorDeprivation(w).sleeplessFor=sleep&&sleepingHome(e,w)?Math.max(0,((actorDeprivation(w)?.sleeplessFor)??0)-dt*4):((actorDeprivation(w)?.sleeplessFor)??0)+dt;
   n.energy=Math.min(n.energy,ritualEnergyCeiling(w,e.time),Math.max(0,100-Math.max(0,(actorDeprivation(w)?.sleeplessFor)-SHELTER_RULES.sleepDebtGrace)*SHELTER_RULES.sleepDebtDrain));
   if(sleep||rest){const watch=watchParticipant(w);if(watch?.sleepDebt)watch.sleepDebt=Math.max(0,watch.sleepDebt-dt);}
  }
}
