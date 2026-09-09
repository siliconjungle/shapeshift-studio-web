import {homeCapacity} from './ecs/home-entities.js';
import {homeAvailability} from './ecs/home-entities.js';
import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {addHome} from './ecs/home-entities.js';
import {constructionProgress} from './ecs/housing-state.js';
import {constructionDefinition,ensureConstructionProgress} from './ecs/housing-state.js';
import {housingSites} from './ecs/housing-state.js';
import {ensureActorConstructionTask} from './ecs/actor-construction-task.js';
import {releaseWork} from "./village-resources.js";
import {familyBirthPlan,setFamilyBirthPlan} from "./ecs/family-entities.js";
import {settlementEconomy} from './ecs/rival-entities.js';
import {replaceEnvironmentRecords} from './ecs/environment-entities.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt} from './village-survival.js';
import {rivalPeople,rivalFor} from './rival-roster.js';
import {CAMP_RULES,CAMP_STAGES,campProjects} from './camp-rules.js';
import {houseEntrance,validHouseSite} from './village-housing.js';
import {assignBeds,homeFire} from './village-shelter.js';
import {beginHouseExit} from './doorway-transition.js';
import {exploredAt,visibleAt} from './village-exploration.js';
import {WORLD_BOUNDS} from './village-layout.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const standing=p=>!['destroyed','packed'].includes((constructionProgress(p)?.state));
export function campState(e){return e.camps??={nextId:0,nextCheck:0,nextRival:0};}
function siteNear(e,centers,{rival=false}={}){
 for(const c of centers)for(const r of [4.2,5.5,7,9])for(let i=0;i<16;i++){
  const a=i*Math.PI/8,p={kind:'camp',x:c.x+Math.cos(a)*r,z:c.z+Math.sin(a)*r};
  if(p.x<WORLD_BOUNDS.left+4||p.x>WORLD_BOUNDS.right-4||p.z<WORLD_BOUNDS.back+4||p.z>WORLD_BOUNDS.front-4||!rival&&!exploredAt(e,p.x,p.z)||!validHouseSite(e,p)||e.workers.some(w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&distance(w,p)<2.5))continue;
  if(rival&&distance(e.depot,p)<14)continue;
  if(e.route(e.depot,houseEntrance(p,e.heightAt,e.culture)))return p;
 }return null;
}
export function placeCamp(e,point,{owner='local',party=[],supplies=null,expeditionId=null}={}){
 if(!e.housing||!e.life||!validHouseSite(e,{...point,kind:'camp'}))return null;
 const s=campState(e),rival=owner==='rival',settlement=rivalFor(e,party[0])??e.rival,stock=rival?settlementEconomy(settlement)?.stock:(supplies??e.stock);
 if(!stock||stock.wood<CAMP_RULES.wood||campProjects(e).filter(p=>p.owner===owner&&(!rival||p.culture===settlement.culture)&&standing(p)).length>=(rival?1:CAMP_RULES.maxCamps))return null;
 const p={...point,id:'camp-'+s.nextId++,kind:'camp',owner,culture:rival?settlement.culture:e.culture,flip:e.random()<.5,stages:CAMP_STAGES.map(s=>({...s})),state:'supplying',stage:0,delivered:0,strikes:0,reservedBy:null,spent:{wood:0,stone:0},lastHitAt:-100,createdAt:e.time,expiresAt:null,damaged:false,packing:false,refunded:false,partyIds:party.map(w=>w.id)};
 p.expeditionId=expeditionId;p.home={...houseEntrance(p,e.heightAt,p.culture),beds:0,construction:true,expeditionId};
 if(rival){stock.wood-=CAMP_RULES.wood;p.spent.wood=CAMP_RULES.wood;p.rivalBuildAt=e.time+2;}
 else {addHome(e,p.home);}
 replaceEnvironmentRecords(e.housing,[p,...e.housing.projects]).length;e.emit('house-planned',null,null,{houseId:p.id,kind:'camp'});return p;
}
export function finishCamp(e,p){
 ensureConstructionProgress(p).state='complete';ensureConstructionProgress(p).stage=CAMP_STAGES.length;p.expiresAt=e.time+CAMP_RULES.lifetime;homeAvailability(p.home).construction=false;homeCapacity(p.home).beds=p.owner==='rival'?0:CAMP_RULES.beds;
 assignBeds(e);
}
function closeBeds(e,p){
 const h=p.home;homeCapacity(h).beds=0;homeAvailability(h).retired=true;
 for(const w of e.workers)if(!(actorVitality(w)?.dead)&&((actorResidence(w)?.home)===h||(actorInterior(w)?.insideAt)===h)){
  if((actorInterior(w)?.inside)){ensureActorInterior(w).inside=false;ensureActorInterior(w).insideAt=h;w.x=h.x;w.z=h.z;beginHouseExit(w,e.time);}
  ((e.survival)==null?undefined:(survivalInterrupt(e.survival,w)));w.state='idle';w.route=[];w.wait=.5;
 }
 if((familyBirthPlan(e.family))?.home===h)setFamilyBirthPlan(e.family,null);assignBeds(e);
}
export function beginPackingCamp(e,p){
 if(p.kind!=='camp'||(constructionProgress(p)?.state)!=='complete'||homeFire(e,p.home)||p.packing)return false;
 closeBeds(e,p);p.packing=true;ensureConstructionProgress(p).stage=2;ensureConstructionProgress(p).strikes=0;ensureConstructionProgress(p).delivered=CAMP_STAGES[2].amount;ensureConstructionProgress(p).state='building';ensureConstructionProgress(p).reservedBy=null;return true;
}
export function finishPackingStage(e,p,w){
 ensureConstructionProgress(p).strikes=0;ensureConstructionProgress(p).stage--;
 if((constructionProgress(p)?.stage)>=0){ensureConstructionProgress(p).delivered=CAMP_STAGES[(constructionProgress(p)?.stage)].amount;w.clock.reset('work');return;}
 ensureConstructionProgress(p).stage=0;ensureConstructionProgress(p).state='packed';p.packedAt=e.time;homeAvailability(p.home).retired=true;structuralCondition(p.home).destroyed=true;structuralCondition(p.home).destroyedAt=e.time;ensureConstructionProgress(p).reservedBy=null;
 const refund=!p.damaged&&!p.refunded&&(structuralCondition(p.home)?.health)===(structuralCondition(p.home)?.maxHealth)?(constructionProgress(p)?.spent).wood:0;p.refunded=true;
 releaseWork(e,w);ensureActorConstructionTask(w).projectId=null;if(refund){w.cargo={kind:'wood',amount:refund};e.returnHome(w);}
 e.emit('camp-packed',w,null,{houseId:p.id,refund});
}
export function updateCamps(e){
 if(!e.housing||!e.life)return;const s=campState(e);
 for(const p of campProjects(e)){
  if((structuralCondition(p.home)?.health)<(structuralCondition(p.home)?.maxHealth))p.damaged=true;
  if(p.owner==='rival'){
   if(p.seenAt==null&&visibleAt(e,p.x,p.z)){p.seenAt=e.time;e.emit('rival-camp-found',null,null,{campId:p.id,culture:p.culture,x:p.x,z:p.z});}
   if(!standing(p))continue;
   if((constructionProgress(p)?.state)!=='complete'&&e.time>=p.rivalBuildAt&&rivalPeople(e).some(w=>p.partyIds.includes(w.id)&&w.visit?.campId===p.id&&!(actorVitality(w)?.dead)&&!w.divineHeld&&w.ritualId==null&&w.visit.stage!=='leaving'&&distance(w,p)<4.5)){p.rivalBuildAt=e.time+2;ensureConstructionProgress(p).strikes++;ensureConstructionProgress(p).lastHitAt=e.time;if((constructionProgress(p)?.strikes)>=2){ensureConstructionProgress(p).strikes=0;ensureConstructionProgress(p).stage++;if((constructionProgress(p)?.stage)===3)finishCamp(e,p);}}
   if((constructionProgress(p)?.state)==='complete'&&e.time>=p.expiresAt&&!rivalPeople(e).some(w=>p.partyIds.includes(w.id)&&w.visit&&!(actorVitality(w)?.dead))){
    if(!p.damaged&&!p.refunded)settlementEconomy(rivalFor(e,p.culture)??e.rival).stock.wood+=(constructionProgress(p)?.spent).wood;p.refunded=true;ensureConstructionProgress(p).state='packed';p.packedAt=e.time;structuralCondition(p.home).destroyed=true;homeAvailability(p.home).retired=true;structuralCondition(p.home).destroyedAt=e.time;
   }continue;
  }
  if(p.expeditionId)continue;
  if(p.abandonedAt!=null&&e.time>=(p.expiresAt??p.abandonedAt+120)){ensureConstructionProgress(p).state='packed';p.packedAt=e.time;homeCapacity(p.home).beds=0;homeAvailability(p.home).retired=true;structuralCondition(p.home).destroyed=true;structuralCondition(p.home).destroyedAt=e.time;p.refunded=true;continue;}
  if((constructionProgress(p)?.state)==='complete'&&e.time>=p.expiresAt)beginPackingCamp(e,p);
 }
 if(housingSites(e.housing).campsEnabled===false||e.time<s.nextCheck)return;s.nextCheck=e.time+CAMP_RULES.check;
 const living=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.rivalJourney),beds=e.life.homes.filter(h=>!(structuralCondition(h)?.destroyed)&&!(homeAvailability(h)?.retired)).reduce((n,h)=>n+((homeCapacity(h)?.beds)??4),0);
 if(!living.some(w=>(actorResidence(w)?.homeless))&&living.length+((familyBirthPlan(e.family))?1:0)<beds)return;
 if(campProjects(e).some(p=>p.owner==='local'&&standing(p)&&(constructionProgress(p)?.state)!=='complete')||campProjects(e).filter(p=>p.owner==='local'&&standing(p)).length>=CAMP_RULES.maxCamps||e.stock.wood<CAMP_RULES.wood)return;
 const fires=[e.campfire,...(e.exploration?.camps??[]).map(c=>c.fire)].filter(f=>f&&(!f.discoveryId||f.discovered));
 const site=siteNear(e,[...fires,e.depot]);if(site)placeCamp(e,site);
}
export function stageRivalCamp(e,party,kind,{needed=false}={}){
 if(!party.length||!e.housing||!e.exploration)return null;const s=campState(e);
 if(e.time<s.nextRival||!needed&&e.random()>=(kind==='raid'?CAMP_RULES.rivalRaidChance:CAMP_RULES.rivalTravelChance))return null;
 const site=siteNear(e,[party[0].visit.gate],{rival:true});if(!site)return null;
 const p=placeCamp(e,site,{owner:'rival',party});if(!p)return null;s.nextRival=e.time+CAMP_RULES.rivalCooldown;
 // The staging area is the same place this party returns to, not a decorative
 // unrelated tent. It stays in the explored world after their visit.
 for(const [i,w] of party.entries()){w.visit.campId=p.id;w.visit.gate={x:p.home.x,z:p.home.z};w.visit.until+=12;w.x=p.home.x+i*.7;w.z=p.home.z;w.route=[];}
 return p;
}
export function validCamps(e){
 if(e.camps==null)return !campProjects(e).length;
 const s=e.camps;if(![s.nextId,s.nextCheck,s.nextRival].every(n=>Number.isFinite(n)&&n>=0)||!Number.isSafeInteger(s.nextId))return false;
 return campProjects(e).every(p=>['local','rival'].includes(p.owner)&&typeof p.flip==='boolean'&&typeof p.damaged==='boolean'&&typeof p.refunded==='boolean'&&p.home?.id===p.id&&(structuralCondition(p.home)?.maxHealth)===CAMP_RULES.health&&Number.isFinite((structuralCondition(p.home)?.health))&&(structuralCondition(p.home)?.health)>=0&&(structuralCondition(p.home)?.health)<=CAMP_RULES.health&&(p.owner==='rival'||e.life.homes.includes(p.home))&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&['supplying','building','complete','destroyed','packed'].includes((constructionProgress(p)?.state))&&Number.isInteger((constructionProgress(p)?.stage))&&(constructionProgress(p)?.stage)>=0&&(constructionProgress(p)?.stage)<=3&&((constructionProgress(p)?.state)==='complete'?(constructionProgress(p)?.stage)===3:['destroyed','packed'].includes((constructionProgress(p)?.state))||(constructionProgress(p)?.stage)<3)&&Number.isFinite((constructionProgress(p)?.strikes))&&(constructionProgress(p)?.strikes)>=0&&Number.isFinite((constructionProgress(p)?.delivered))&&(constructionProgress(p)?.delivered)>=0&&Number.isFinite((constructionProgress(p)?.spent)?.wood)&&(constructionProgress(p)?.spent).wood>=0&&Array.isArray(constructionDefinition(p).stages)&&constructionDefinition(p).stages.length===3&&constructionDefinition(p).stages.every(s=>s.kind==='wood'&&Number.isFinite(s.amount)&&s.amount>=0&&Number.isFinite(s.strikes)&&s.strikes>0)&&Array.isArray(p.partyIds)&&p.partyIds.every(Number.isSafeInteger)&&(p.expiresAt===null||Number.isFinite(p.expiresAt)&&p.expiresAt>=0));
}

export function handleRivalCamp(e,w,dt){
 const p=campProjects(e).find(p=>p.id===w.visit?.campId);if(!p||!standing(p)||(constructionProgress(p)?.state)==='complete'||w.visit.stage==='leaving'||(actorVitality(w)?.health)<60)return false;
 w.state='house-building';ensureActorConstructionTask(w).projectId=p.id;w.facing=p.x<w.x?'left':'right';w.route=[];if(w.clock.kind!=='work')w.clock.reset('work');for(const event of w.clock.advance(dt))if(event==='finish')w.clock.reset('work');return true;
}
