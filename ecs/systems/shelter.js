import {homeAvailability} from './../home-entities.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {createShelterState,shelterSchedule,shelterWeather,replaceHouseFires} from '../shelter-state.js';
import {structuralCondition} from '../home-entities.js';
import {ensureConstructionProgress} from '../housing-state.js';
import {housingSchedule} from '../housing-state.js';
import {ensureActorDailyActivity} from "../daily-activity-actors.js";
import {familyBirthPlan,setFamilyBirthPlan} from "../family-entities.js";
import {actorRecovery} from "../development-actors.js";
import {actorVitality} from '../actor-vitality.js';
import {survivalInterrupt} from '../../village-survival.js';
import {personAge} from '../person-age.js';
import {actorNeeds} from '../actor-needs.js';

import {noteHomeDisaster,restoreGuestHomes,shareEmergencyShelter} from '../../village-community-recovery.js';
import {allShelters} from '../../camp-rules.js';
import {defineGameData} from '../../game-data.js';
import {DAY_LENGTH_SECONDS} from '../../village-time.js';
import {homeBeds} from '../../village-childcare.js';
import {beginHouseExit} from '../../doorway-transition.js';

export const SHELTER_RULES=defineGameData('village-shelter.SHELTER_RULES',{health:120,fireDamage:4,burnSeconds:45,wetExposure:2.4,collapseSeconds:2.5,sleepDebtGrace:DAY_LENGTH_SECONDS,sleepDebtDrain:.25});
export const homePosition=h=>({x:h.buildingX??h.door?.x??h.x,z:h.buildingZ??h.door?.z??h.z});
export const homeFire=(e,h)=>(e.shelter?.fires??[]).find(f=>f.id===h?.id&&f.until>e.time);
export function shelterState(world){const e=world.resource('Village');
 const s=createShelterState(e);
 for(const [i,h]of allShelters(e).entries()){h.id??='home-'+i;structuralCondition(h).maxHealth??=h.kind==='chapel'?180:SHELTER_RULES.health;structuralCondition(h).health??=(structuralCondition(h)?.destroyed)?0:(structuralCondition(h)?.maxHealth)}
 return s;
}
export const unsafeHome=(e,h)=>!h||(structuralCondition(h)?.destroyed)||!!homeFire(e,h)||((structuralCondition(h)?.health)<=(structuralCondition(h)?.maxHealth)*.4&&((structuralCondition(h)?.raidThreatUntil)??0)>e.time);
export function sleepingHome(world,w){const e=world.resource('Village');if(w.expeditionId&&(homeAvailability(actorInterior(w)?.insideAt)?.expeditionId)===w.expeditionId&&!unsafeHome(e,(actorInterior(w)?.insideAt))&&homeBeds((actorInterior(w)?.insideAt))>0)return (actorInterior(w)?.insideAt);return (actorResidence(w)?.hasBed)!==false&&homeBeds((actorResidence(w)?.home))>0&&!unsafeHome(e,(actorResidence(w)?.home))?(actorResidence(w)?.home):null}
export function assignBeds(world){const e=world.resource('Village');
 if(!e.life)return;
 const homes=e.life.homes,free=new Map(homes.map(h=>[h,unsafeHome(e,h)?0:homeBeds(h)]));
 const living=e.workers.filter(w=>!(actorVitality(w)?.dead)).sort((a,b)=>Number(!!(actorRecovery(a)?.guest))-Number(!!(actorRecovery(b)?.guest))||Number(!!e.leadership?.isLeader(b))-Number(!!e.leadership?.isLeader(a))||Number((personAge(b)?.child))-Number((personAge(a)?.child))||a.id-b.id),displaced=[];
 restoreGuestHomes(e,living,free,evacuate);
 for(const w of living){const away=w.expeditionId&&!['returning','homecoming'].includes(e.expeditions?.active?.stage),tent=away?homes.find(h=>(homeAvailability(h)?.expeditionId)===w.expeditionId&&free.get(h)>0):null,chapel=e.leadership?.isLeader(w)?homes.find(h=>h.kind==='chapel'&&free.get(h)>0):null,preferred=tent??chapel;if(preferred&&(actorResidence(w)?.home)!==preferred&&e.route(w,preferred)){if((actorInterior(w)?.inside))evacuate(e,w);ensureActorResidence(w).home=preferred;}const n=(homeAvailability(actorResidence(w)?.home)?.expeditionId)&&(homeAvailability(actorResidence(w)?.home)?.expeditionId)!==w.expeditionId?0:free.get((actorResidence(w)?.home))??0;ensureActorResidence(w).hasBed=n>0;if((actorResidence(w)?.hasBed))free.set((actorResidence(w)?.home),n-1);else displaced.push(w)}
 for(const w of displaced){
  const home=homes.find(h=>(!(homeAvailability(h)?.expeditionId)||(homeAvailability(h)?.expeditionId)===w.expeditionId)&&free.get(h)>0&&e.route(w,h));
  if(home){if((actorInterior(w)?.inside))evacuate(e,w);ensureActorResidence(w).home=home;ensureActorResidence(w).hasBed=true;free.set(home,free.get(home)-1);e.emit('shelter-found',w,null,{homeId:home.id})}
 }
 shareEmergencyShelter(e,displaced,free,evacuate);
 for(const w of living){
  const was=(actorResidence(w)?.homeless);ensureActorResidence(w).homeless=!(actorResidence(w)?.hasBed);
  if((actorResidence(w)?.homeless)&&!was){ensureActorResidence(w).shelterLostAt=e.time;actorNeeds(w).social=Math.max(0,actorNeeds(w).social-15);e.emit('no-bed',w)}
  if((actorInterior(w)?.inside)&&w.state==='sleeping'&&!(actorResidence(w)?.hasBed))evacuate(e,w);
 }
}
function evacuate(e,w){
 const wasInside=(actorInterior(w)?.inside),oldHome=(actorInterior(w)?.insideAt)??(actorResidence(w)?.home);((e.survival)==null?undefined:(survivalInterrupt(e.survival,w)));
 ensureActorInterior(w).inside=false;w.state='idle';w.route=[];w.wait=1;ensureActorDailyActivity(w).careAt=e.time+1;
 if(wasInside){w.x=oldHome.x;w.z=oldHome.z;ensureActorInterior(w).insideAt=oldHome;beginHouseExit(w,e.time)}
}
export function igniteHouse(world,home,{cause='wish'}={}){const e=world.resource('Village');
 const s=shelterState(world);if(!home||(structuralCondition(home)?.destroyed)||(structuralCondition(home)?.health)<=0||homeFire(e,home))return false;
 noteHomeDisaster(e,home,cause);
 const seconds=Math.max(SHELTER_RULES.burnSeconds,((structuralCondition(home)?.maxHealth)??120)/SHELTER_RULES.fireDamage+8),p=homePosition(home),fire={kind:'house',id:home.id,...p,height:home.height??6.4,startedAt:e.time,until:e.time+seconds,regrowAt:e.time+seconds+.7,wet:0,cause};
 replaceHouseFires(s,[...s.fires.filter(f=>f.id!==home.id),fire]);
 for(const w of e.workers)if(!(actorVitality(w)?.dead)&&((actorResidence(w)?.home)===home||(actorInterior(w)?.insideAt)===home)){evacuate(e,w);actorNeeds(w).social=Math.max(0,actorNeeds(w).social-12);e.emit('house-alarm',w,null,{houseId:home.id})}
 assignBeds(world);e.emit('house-ignited',null,null,{houseId:home.id,...p,cause});return true;
}
export function damageHouse(world,home,amount,cause='fire'){const e=world.resource('Village');
 shelterState(world);if(!home||(structuralCondition(home)?.destroyed)||!(amount>0))return false;
 noteHomeDisaster(e,home,cause);
 const previous=(structuralCondition(home)?.health);structuralCondition(home).health=Math.max(0,(structuralCondition(home)?.health)-amount);structuralCondition(home).lastDamageAt=e.time;if(home.kind==='camp'){const camp=e.housing?.projects.find(p=>p.id===home.id);if(camp)camp.damaged=true;}
 if(cause==='raid'){structuralCondition(home).raidThreatUntil=e.time+6;if((structuralCondition(home)?.health)<=(structuralCondition(home)?.maxHealth)*.4){for(const w of e.workers)if(!(actorVitality(w)?.dead)&&(actorInterior(w)?.inside)&&((actorInterior(w)?.insideAt)??(actorResidence(w)?.home))===home){evacuate(e,w);w.localAlarmUntil=e.time+10;e.emit('house-alarm',w,null,{houseId:home.id});}if(previous>(structuralCondition(home)?.maxHealth)*.4){assignBeds(world);e.emit('house-evacuated',null,null,{houseId:home.id,cause});}}}
 if((structuralCondition(home)?.health)>0)return true;
 structuralCondition(home).destroyed=true;structuralCondition(home).destroyedAt=e.time;
 const p=e.housing?.projects.find(p=>p.id===home.id);if(p)ensureConstructionProgress(p).state='destroyed';
 const f=homeFire(e,home);if(f){f.until=e.time;f.regrowAt=e.time+.7}
 for(const w of e.workers)if(!(actorVitality(w)?.dead)&&((actorResidence(w)?.home)===home||(actorInterior(w)?.insideAt)===home)){evacuate(e,w);actorNeeds(w).social=Math.max(0,actorNeeds(w).social-25);ensureActorResidence(w).homeLostAt=e.time;e.emit('home-lost',w,null,{houseId:home.id})}
 if((familyBirthPlan(e.family))?.home===home)setFamilyBirthPlan(e.family,null);
 assignBeds(world);e.housing&&(housingSchedule(e.housing).nextCheck=0);e.emit('house-destroyed',null,null,{houseId:home.id,...homePosition(home),cause});return true;
}
export function updateShelter(world,dt,weather={}){const e=world.resource('Village');
 if(!e.life||!(dt>0))return;const s=shelterState(world),rain=e.wishes?.rainUntil>e.time?1:weather.rain??0;shelterWeather(s).rain=rain;
 for(const f of s.fires){
  const home=allShelters(e).find(h=>h.id===f.id);if(!home||(structuralCondition(home)?.destroyed))continue;
  if(f.until>e.time){
   f.wet+=rain*dt;
   if(e.wishes?.rainUntil>e.time||f.wet>=SHELTER_RULES.wetExposure){f.until=e.time;f.regrowAt=e.time+.7;e.emit('house-extinguished',null,null,{houseId:home.id});assignBeds(world)}
   else damageHouse(world,home,SHELTER_RULES.fireDamage*dt,'fire');
  }
 }
 const remaining=s.fires.filter(f=>e.time<f.regrowAt);if(remaining.length!==s.fires.length)replaceHouseFires(s,remaining);
 if(e.time>=shelterSchedule(s).nextBeds){shelterSchedule(s).nextBeds=e.time+2;assignBeds(world)}
}
