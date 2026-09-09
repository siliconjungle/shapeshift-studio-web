import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {releaseWork} from "./village-resources.js";
import {actorSocialActivity} from "./ecs/daily-activity-actors.js";
import {inspectAttribute} from './gameplay-abilities.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalDamage} from './village-survival.js';
import {lifeIdle} from './village-life.js';
import {watchAssigned} from './village-watch.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {relicAirTemperature} from './village-relics.js';
import {villageAirTemperature} from './temperature-wish.js';
import {unsafeHome} from './village-shelter.js';
import {beginHouseExit,DOORWAY_DURATION} from './doorway-transition.js';
const clamp=n=>Math.max(0,Math.min(100,n));
// A comfort gauge, not body temperature in Celsius. 50 is comfortable.
export const temperatureOf=w=>Number.isFinite(actorNeeds(w)?.temperature)?clamp(actorNeeds(w).temperature):clamp(50-(actorNeeds(w)?.cold??0)/2);
export const isCold=w=>temperatureOf(w)<=32.5;
export const isHot=w=>temperatureOf(w)>=72;
export function updateTemperature(e,dt,weather={}){
 if(!e.life)return;
 e.temperature=villageAirTemperature(e,weather);
 for(const w of e.workers){
  if((actorVitality(w)?.dead)||!actorNeeds(w))continue;
  const nearFire=[e.campfire,...(e.exploration?.camps??[]).map(c=>c.fire)].some(f=>f?.lit&&Math.hypot(w.x-f.x,w.z-f.z)<2.9);
  const sheltered=(actorInterior(w)?.inside)&&!unsafeHome(e,(actorInterior(w)?.insideAt)??(actorResidence(w)?.home));
  // Cryos winter clothing insulates outdoor villagers; fires and shelter still matter.
  const air=inspectAttribute(e,{kind:'villager',id:w.id},'temperature',relicAirTemperature(e,w,e.temperature)).value;
  const exposure=sheltered?22:nearFire?Math.max(22,air+16):air+(w.culture==='cryos'?14:0);
  const seasoned=e.chapters?.completed.some(c=>c.id==='season');
  const target=clamp(50+(exposure-22)*2.6*(seasoned?.88:1));
  actorNeeds(w).temperature=clamp(temperatureOf(w)+(target-temperatureOf(w))*(1-Math.exp(-dt/(sheltered||nearFire?7:30))));
  delete actorNeeds(w).cold;
  const cold=isCold(w),hot=isHot(w),extreme=actorNeeds(w).temperature<8||actorNeeds(w).temperature>92;
  if((cold||hot)&&!(actorInterior(w)?.inside)&&(w.temperatureCueAt??0)<=e.time){e.emit(hot?'overheated':'cold',w);w.temperatureCueAt=e.time+55;w.coldCueAt=e.time+55}
  if(cold||hot)actorNeeds(w).energy=Math.max(0,actorNeeds(w).energy-dt*.18);
  const before=w.temperatureExposure??0;w.temperatureExposure=extreme?before+dt:0;
  const harm=Math.max(0,w.temperatureExposure-15)-Math.max(0,before-15);
  if(extreme&&harm>0)((e.survival)==null?undefined:(survivalDamage(e.survival,w,harm*.45,hot?'heat':'cold')));
 }
}
// Shelter is a real trip to a safe building; no teleport or off-screen reset.
export function handleTemperature(e,w,dt){
 if(!actorNeeds(w)||(actorVitality(w)?.dead))return false;
 if(w.state==='cooling'||w.state==='cooling-bound'){
  if(unsafeHome(e,w.coolingHome)||temperatureOf(w)<=58||actorNeeds(w).hunger>=85){
   const inside=(actorInterior(w)?.inside);lifeIdle(e.life,w);ensureActorInterior(w).inside=false;w.coolingHome=null;if(inside)beginHouseExit(w,e.time);if(w.cargo)e.returnHome(w);return true;
  }
  if(w.state==='cooling')return true;
  const result=e.move(w,dt);
  if(result==='arrived'){w.state='cooling';ensureActorInterior(w).inside=true;ensureActorInterior(w).insideAt=w.coolingHome;ensureActorInterior(w).enteredAt=e.time}
  else if(result==='blocked'){lifeIdle(e.life,w);w.coolingRetryAt=e.time+8;w.coolingHome=null}
  return true;
 }
 if(!isHot(w)||(actorInterior(w)?.inside)||w.divineHeld||w.cargo||actorSocialActivity(w)?.partnerId!=null||actorNeeds(w).hunger>=85||watchAssigned(e.life.watch,w)||(w.coolingRetryAt??0)>e.time||(actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION||!['idle','outbound','working','warming','warming-bound'].includes(w.state))return false;
 for(const home of [(actorResidence(w)?.home),...e.life.homes.filter(h=>h!==(actorResidence(w)?.home))]){
  if(unsafeHome(e,home))continue;const route=e.route(w,home);if(!route)continue;
  releaseWork(e,w);w.wait=0;w.coolingHome=home;w.route=route;w.state='cooling-bound';return true;
 }
 w.coolingRetryAt=e.time+8;return false;
}
