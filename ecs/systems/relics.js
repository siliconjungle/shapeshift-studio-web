import {actorTradeTask,ensureActorTradeTask} from './../actor-trade-task.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorRepairTask} from './../actor-repair-task.js';
import {ensureActorRepairTask} from '../actor-repair-task.js';
import {actorConstructionTask,ensureActorConstructionTask} from './../actor-construction-task.js';
import {releaseWork} from "../../village-resources.js";
import {resourceGrowth} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {actorSocialActivity} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {actorFaith,ensureActorFaith} from "../religion-actors.js";
import {faithChange} from "../../village-faith.js";
import {actorOffering} from "../religion-actors.js";
import {settlementEconomy} from '../rival-entities.js';
import {relicMission} from '../rival-entities.js';
import {relicSpatial,relicCustody,relicCondition,relicInfluence,relicProvenance,relicPoliticsData,createRelicState,addRelicRecord,relicRuntimeEntity,relicDomains,relicComponent} from '../relic-entities.js';
import {ensureActorRelicMemories,actorRelicMemories,actorRelicAttachment,ensureActorRelicAttachment,actorRelicTask,ensureActorRelicTask} from "../actor-curse-relic.js";
import {memoryRemember} from "../../village-memory.js";
import {lifeRelation} from "../../village-life.js";
import {survivalInterrupt,survivalDamage} from "../../village-survival.js";
import {actorNeeds} from "../actor-needs.js";
import {careParticipant} from "../care-participants.js";
import {actorMeal} from "../actor-meal.js";
import {actorCookingTask} from "../actor-cooking-task.js";
import {personAge} from "../person-age.js";
import {actorVitality} from "../actor-vitality.js";
import {defineGameData} from "../../game-data.js";
export const RELIC_TYPES=defineGameData('village-relics.TYPES',{
 'hungry-idol':{name:'Hungry Idol',benefit:'Nearby crops grow faster while the idol is fed.',cost:'Consumes one food every 35 seconds at night. An unfed idol stops helping crops.'},
 'whispering-mask':{name:'Whispering Mask',benefit:'Its bearer becomes more persuasive and attracts followers.',cost:'Whispers encourage jealousy, possessiveness and ambitions to become a spiritual leader.'},
 'winter-lantern':{name:'Winter Lantern',benefit:'Cools the air around its bearer, protecting nearby villagers from heat.',cost:'Nearby crops grow more slowly. Its chill can be dangerous in already cold weather.'}
});
export const RELIC_RULES=defineGameData('village-relics.RULES',{chestChance:.28,radius:4.5,maxItems:9,foodSeconds:35,growthBonus:.65,cropSlow:.6,cooling:14,checkSeconds:9,carryMin:28,carryMax:58,urgeCooldown:24,fightSeconds:42,damage:12});
export const RELIC_CULTURES=['hearth','solis','cryos'];
export const RELIC_ART_KEYS=RELIC_CULTURES.flatMap(c=>Object.keys(RELIC_TYPES).map(k=>'relic-'+c+'-'+k));
export const relicArtPath=key=>'relics/'+key.slice(6).replace(/^(hearth|solis|cryos)-/,'$1/');
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=w=>w&&!actorVitality(w)?.dead&&!w.gone&&!w.exiled&&(actorVitality(w)?.health??100)>0;
const outdoors=w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.flight&&!['away','rival-captive','ritual-bound','ritual-captive','held','departing','fading'].includes(w.state);
export const relicState=world=>{const e=world.resource('Village');if(e.relics===undefined)return createRelicState(e,e.time+RELIC_RULES.checkSeconds);relicRuntimeEntity(e.relics);return e.relics;};
export const relicPeople=world=>{const e=world.resource('Village');return ([...new Set([...(e.workers??[]),...(e.leadership?.exiles??[]),...(e.rivals?.length?e.rivals:e.rival?[e.rival]:[]).flatMap(s=>s.people??[])])]);};
export const relicById=(world,id)=>{const e=world.resource('Village');return (e.relics?.items.find(r=>r.id===id&&!relicCondition(r).destroyed));};
export const relicHolder=(world,r)=>{const e=world.resource('Village');return (relicCustody(r)?.holderId===null?null:relicPeople(world).find(w=>w.id===relicCustody(r)?.holderId));};
export function carriedRelic(world,w){
 const e=world.resource('Village');return e.relics?.items.find(r=>!relicCondition(r).destroyed&&relicCustody(r).holderId===w?.id)??null;}
export function relicPoint(world,r){
 const e=world.resource('Village');if(!r||relicCondition(r).destroyed||relicCustody(r).custodyCulture)return null;const w=relicHolder(world,r);if(w&&!outdoors(w))return null;return w??relicSpatial(r);}
export function relicCarryKey(world,w){
 const e=world.resource('Village');const r=carriedRelic(world,w);return r&&outdoors(w)?'relic-'+r.culture+'-'+r.kind:null;}
export function relicMemory(world,w,text){
 const e=world.resource('Village');if(w)ensureActorRelicMemories(w).entries=[{text,at:e.time},...((actorRelicMemories(w)?.entries)??[])].slice(0,5);}
export function relicHistory(world,r,text){
 const e=world.resource('Village');relicProvenance(r).history=[{text,at:e.time},...relicProvenance(r).history].slice(0,8);}
function cue(world,w,reaction,reason,r){
 const e=world.resource('Village');e.emit('relic-reaction',w,null,{reaction,reason,relicId:r?.id});}
function relation(world,a,b,delta){
 const e=world.resource('Village');const r=lifeRelation(e.life,a.id,b.id);if(r)r.affinity=clamp(r.affinity+delta,-1,1);}
export function attachRelic(world,w,r,devotion=.5){
 const e=world.resource('Village');
 if((actorRelicAttachment(w)?.attachment)?.id!==r.id)ensureActorRelicAttachment(w).attachment={id:r.id,devotion,jealousy:0,neglected:0,nextUrge:e.time+1};
 return (actorRelicAttachment(w)?.attachment);
}
export function recordRelicOwner(world,r,w,reason){
 const e=world.resource('Village');
 relicProvenance(r).owners??=[];if(relicCustody(r).ownerId!==null&&!relicProvenance(r).owners.length){const old=relicPeople(world).find(p=>p.id===relicCustody(r).ownerId);if(old)relicProvenance(r).owners.push({id:old.id,name:old.name,culture:old.tribeId??old.culture??e.culture,at:relicProvenance(r).discoveredAt,reason:'discovered'});}
 if(relicProvenance(r).owners.at(-1)?.id!==w.id)relicProvenance(r).owners.push({id:w.id,name:w.name,culture:w.tribeId??w.culture??e.culture,at:e.time,reason});
 if(relicProvenance(r).owners.length>24)relicProvenance(r).owners.splice(1,relicProvenance(r).owners.length-24);
}
export function discoverRelic(world,kind,culture,point,discoverer=null){
 const e=world.resource('Village');
 const s=relicState(world);if(!RELIC_TYPES[kind]||!RELIC_CULTURES.includes(culture)||s.items.length>=RELIC_RULES.maxItems||s.items.some(r=>r.kind===kind&&r.culture===culture))return null;
 if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return null;
 const r={id:'relic-'+s.nextId++,kind,culture,x:point.x,z:point.z,holderId:null,ownerId:discoverer?.id??null,discoveredBy:discoverer?.id??null,discoveredAt:e.time,destroyed:false,destroyedAt:null,hungry:false,foodEaten:0,nextFoodAt:e.time+RELIC_RULES.foodSeconds,history:[]};addRelicRecord(e,r);
 relicHistory(world,r,discoverer?`${discoverer.name} discovered it in a chest.`:'Discovered in the wilderness.');if(discoverer){attachRelic(world,discoverer,r,.64);relicMemory(world,discoverer,`I found the ${RELIC_TYPES[kind].name}. I cannot stop thinking about it.`);cue(world,discoverer,'delight','found',r);}return r;
}
export function noticeRelicEvent(world,event){
 const e=world.resource('Village');
 if(event.type==='treasure-opened'){
  const c=e.discovery?.chests.find(c=>c.id===event.chestId),w=e.workers.find(w=>w.id===event.workerId);if(!c||!w||c.openedAt===null||c.relicRolled)return;
  c.relicRolled=true;const s=relicState(world),culture=w.culture??e.culture??'hearth',missing=Object.keys(RELIC_TYPES).filter(k=>!s.items.some(r=>r.culture===culture&&r.kind===k));
  if(!missing.length||s.items.length>=RELIC_RULES.maxItems||s.items.some(r=>r.culture===culture)&&e.random()>=RELIC_RULES.chestChance)return;
  const kind=missing[Math.min(missing.length-1,Math.floor(e.random()*missing.length))];discoverRelic(world,kind,culture,{x:w.x,z:w.z},w);
 }
 if(event.type==='died'||event.type==='outsider-died'){
  const w=relicPeople(world).find(w=>w.id===event.workerId);if(w)dropRelic(world,w,'death');
 }
 if(event.type==='wish-heal'&&event.targetKind==='villager'){
  const w=relicPeople(world).find(w=>w.id===event.targetId);if((actorRelicAttachment(w)?.attachment)){dropRelic(world,w,'life');(actorRelicAttachment(w)?.attachment).devotion=Math.min(.3,(actorRelicAttachment(w)?.attachment).devotion);(actorRelicAttachment(w)?.attachment).jealousy=0;(actorRelicAttachment(w)?.attachment).nextUrge=e.time+60;cancelRelicTask(world,w);relicMemory(world,w,'Life quieted my obsession with the relic.');cue(world,w,'delight','life',relicById(world,(actorRelicAttachment(w)?.attachment).id));}
 }
}
function supportedDrop(world,w,r){
 const e=world.resource('Village');
 const origin=(actorInterior(w)?.inside)?((actorInterior(w)?.insideAt)??(actorResidence(w)?.home)??w):w;
 for(const radius of [.8,1.4,2.2,3.2,0])for(let i=0;i<8;i++){
  const angle=(i+(w.id??0)*.17)*Math.PI/4,p={x:origin.x+Math.cos(angle)*radius,z:origin.z+Math.sin(angle)*radius};
  if(!Number.isFinite(e.heightAt(p.x,p.z))||e.obstacles().some(o=>distance(o,p)<o.radius+.22)||e.relics.items.some(o=>o!==r&&!relicCondition(o).destroyed&&relicCustody(o).holderId===null&&distance(relicSpatial(o),p)<.6))continue;return p;
 }return {x:relicSpatial(r).x,z:relicSpatial(r).z};
}
export function dropRelic(world,w,reason='rest'){
 const e=world.resource('Village');
 const r=carriedRelic(world,w);if(!r)return null;
 Object.assign(relicSpatial(r),supportedDrop(world,w,r));relicCustody(r).holderId=null;
 if(reason==='death'){relicHistory(world,r,`${w.name} died while attached to it.`);relicMemory(world,w,`I held on to the ${RELIC_TYPES[r.kind].name} until the end.`);}
 else if(reason==='stolen')relicHistory(world,r,`Taken from ${w.name}.`);
 else if(reason==='life')relicHistory(world,r,`${w.name} let go after a Life miracle.`);
 ensureActorRelicAttachment(w).pickedAt=null;return r;
}
export function cancelRelicTask(world,w){
 const e=world.resource('Village');
 if(!(actorRelicTask(w)?.task))return;delete (actorRelicTask(w)?.task);if(w.state?.startsWith('relic-'))releaseWork(e,w);
}
export function interruptRelic(world,w){
 const e=world.resource('Village');dropRelic(world,w,'interrupted');cancelRelicTask(world,w);if((actorRelicAttachment(w)?.attachment))(actorRelicAttachment(w)?.attachment).nextUrge=Math.max((actorRelicAttachment(w)?.attachment).nextUrge,e.time+RELIC_RULES.urgeCooldown);}
export function takeRelic(world,w,r,{stolen=false,consensual=false}={}){
 const e=world.resource('Village');
 const old=relicHolder(world,r),point=relicPoint(world,r);if(!outdoors(w)||personAge(w)?.child||!point||distance(w,point)>1.8||old&&!stolen&&!consensual||w.cargo)return false;
 const existing=carriedRelic(world,w);if(existing&&existing!==r)dropRelic(world,w);
 if(old&&old!==w&&consensual){dropRelic(world,old,'trade');cancelRelicTask(world,old);relicMemory(world,old,`I agreed to give ${w.name} the ${RELIC_TYPES[r.kind].name}.`);}
 if(old&&old!==w&&!consensual){dropRelic(world,old,'stolen');cancelRelicTask(world,old);const a=attachRelic(world,old,r,.7);a.jealousy=clamp(a.jealousy+.25);a.nextUrge=e.time+8;relicMemory(world,old,`${w.name} stole my ${RELIC_TYPES[r.kind].name}.`);cue(world,old,'grumpy','stolen',r);relation(world,w,old,-.22);}
 const previous=relicPeople(world).find(p=>p.id===relicCustody(r).ownerId);
 recordRelicOwner(world,r,w,stolen?'stolen':consensual?'traded':'carried');relicCustody(r).custodyCulture=null;relicCustody(r).holderId=w.id;relicCustody(r).ownerId=w.id;relicSpatial(r).x=w.x;relicSpatial(r).z=w.z;ensureActorRelicAttachment(w).pickedAt=e.time;const a=attachRelic(world,w,r,.6);a.devotion=clamp(a.devotion+.035);a.jealousy=Math.max(0,a.jealousy-.2);
 if(previous&&previous!==w&&previous!==old&&!consensual){relicMemory(world,previous,`${w.name} took the ${RELIC_TYPES[r.kind].name} I treasured.`);const pa=attachRelic(world,previous,r);pa.jealousy=clamp(pa.jealousy+.2);relation(world,w,previous,-.1);}
 relicHistory(world,r,`${w.name} ${stolen?'stole':'picked up'} it.`);relicMemory(world,w,`I ${stolen?'stole':'picked up'} the ${RELIC_TYPES[r.kind].name}.`);cue(world,w,'love','carrying',r);return true;
}
function occupied(w){return !!(w.cargo||actorCookingTask(w)?.potCarry||actorMeal(w)?.mealCarry||careParticipant(w)?.food||(actorConstructionTask(w)?.cargo)||(actorRepairTask(w)?.cargo)||(actorTradeTask(w)?.cargo)||(actorOffering(w)?.cargo)||w.beastRiteCargo||w.ritualCargo||w.firewood||w.firestone||actorSocialActivity(w)?.partnerId!=null||w.expeditionId||w.rivalJourney||w.ritualId!=null||w.frenzy||w.sleepWish);}
function eligible(world,w){
 const e=world.resource('Village');return outdoors(w)&&!personAge(w)?.child&&!occupied(w)&&actorVitality(w)?.health>35&&actorNeeds(w)?.hunger<80&&actorNeeds(w)?.energy>25&&!(e.raids?.alarmUntil>e.time)&&!e.leadership?.rivalry;}
function startTask(world,w,r,kind){
 const e=world.resource('Village');
 if(!eligible(world,w))return false;const p=relicPoint(world,r);if(!p)return false;
 const route=e.route(w,p);if(!route)return false;
 survivalInterrupt(e.survival,w);ensureActorRelicTask(w).task={id:r.id,kind,deadline:e.time+50,repathAt:e.time+1,until:0,opponentId:null};w.state='relic-bound';w.route=route;w.wait=0;return true;
}
function wander(world,w){
 const e=world.resource('Village');
 for(let i=0;i<8;i++){const angle=e.random()*Math.PI*2,range=1.5+e.random()*3,p={x:w.x+Math.cos(angle)*range,z:w.z+Math.sin(angle)*range};if(distance(p,e.depot)>18||e.obstacles().some(o=>distance(o,p)<o.radius+.35))continue;const route=e.route(w,p);if(route){w.route=route;return true;}}w.route=[];return false;
}
function carryTask(world,w,r){
 const e=world.resource('Village');
 ensureActorRelicTask(w).task={id:r.id,kind:'carry',deadline:e.time+RELIC_RULES.carryMin+e.random()*(RELIC_RULES.carryMax-RELIC_RULES.carryMin),repathAt:e.time+5,until:0,opponentId:null};w.state='relic-carrying';w.wait=0;wander(world,w);
}
export function beginRelicFight(world,a,b,r){
 const e=world.resource('Village');
 if(!eligible(world,a)||!outdoors(b)||personAge(a)?.child||personAge(b)?.child||a===b||distance(a,b)>2.5||!r||relicCondition(r).destroyed)return false;
 for(const [w,other] of [[a,b],[b,a]]){survivalInterrupt(e.survival,w);attachRelic(world,w,r,.65);ensureActorRelicTask(w).task={id:r.id,kind:'fight',opponentId:other.id,deadline:e.time+RELIC_RULES.fightSeconds,repathAt:0,until:0};w.state='relic-fighting';w.route=[];w.clock.reset('fight');relicMemory(world,w,`I fought ${other.name} over the ${RELIC_TYPES[r.kind].name}.`);cue(world,w,'grumpy','fight',r);}
 relation(world,a,b,-.25);relicHistory(world,r,`${a.name} and ${b.name} fought over it.`);return true;
}
function fightRelic(world,w,r,dt){
 const e=world.resource('Village');
 const job=(actorRelicTask(w)?.task),target=relicPeople(world).find(p=>p.id===job.opponentId),a=(actorRelicAttachment(w)?.attachment);
 if(!outdoors(target)||(actorRelicTask(target)?.task)?.id!==r.id||e.time>=job.deadline||actorVitality(w)?.health<25&&!(a.devotion>.92&&a.jealousy>.9&&(actorPersonality(w)?.trait)==='blunt')){cancelRelicTask(world,w);if(alive(w)&&!alive(target)&&relicCustody(r).holderId===null&&distance(w,relicSpatial(r))<1.8&&takeRelic(world,w,r))carryTask(world,w,r);return true;}
 w.facing=target.x<w.x?'left':'right';
 if(distance(w,target)>1.65){if(e.time>=job.repathAt){w.route=e.route(w,target)??[];job.repathAt=e.time+1;}e.move(w,dt);return true;}
 w.route=[];
 for(const event of w.clock.advance(dt)){if(event==='contact'&&outdoors(target)&&distance(w,target)<1.85){survivalDamage(e.survival,target,RELIC_RULES.damage,'attack',w);relation(world,w,target,-.06);memoryRemember(e.life.memory,target,w,'attacked-me');if(actorVitality(target)?.dead)relicHistory(world,r,`${w.name} killed ${target.name} while fighting for it.`);}if(event==='finish')w.clock.reset('fight');}
 return true;
}
export function handleRelicTask(world,w,dt){
 const e=world.resource('Village');
 const job=(actorRelicTask(w)?.task);if(!job)return false;const r=relicById(world,job.id);
 if(!r||!outdoors(w)||actorNeeds(w).hunger>=85||actorNeeds(w).energy<=18||e.raids?.alarmUntil>e.time||e.leadership?.rivalry||!w.state?.startsWith('relic-')){interruptRelic(world,w);return false;}
 if(job.kind==='fight')return fightRelic(world,w,r,dt);
 if(e.time>=job.deadline){dropRelic(world,w);cancelRelicTask(world,w);(actorRelicAttachment(w)?.attachment).nextUrge=e.time+RELIC_RULES.urgeCooldown+e.random()*30;return false;}
 if(job.kind==='carry'){
  if(relicCustody(r).holderId!==w.id){cancelRelicTask(world,w);return false;}
  (actorRelicAttachment(w)?.attachment).neglected+=dt;(actorRelicAttachment(w)?.attachment).devotion=clamp((actorRelicAttachment(w)?.attachment).devotion+dt*.0012);actorNeeds(w).social=clamp(actorNeeds(w).social+dt*.12,0,100);
  if(w.state==='relic-admiring'){if(e.time>=job.until){w.state='relic-carrying';wander(world,w);}return true;}
  if(e.move(w,dt)!=='moving'){w.state='relic-admiring';job.until=e.time+3+e.random()*4;cue(world,w,'love','admiring',r);}return true;
 }
 const owner=relicHolder(world,r),p=relicPoint(world,r);if(!p){cancelRelicTask(world,w);return false;}
 if(owner===w){carryTask(world,w,r);return true;}
 if(distance(w,p)>1.55){if(e.time>=job.repathAt){w.route=e.route(w,p)??[];job.repathAt=e.time+1.2;}if(e.move(w,dt)==='blocked'){interruptRelic(world,w);return false;}return true;}
 if(owner){
  if(w.state!=='relic-stealing'){w.state='relic-stealing';w.route=[];job.until=e.time+2.5;cue(world,w,'nervous','stealing',r);return true;}
  if(e.time<job.until)return true;
  const bond=lifeRelation(e.life,w.id,owner.id)?.affinity??0,detected=e.random()<.6;
  if(detected){relation(world,w,owner,-.16);const a=attachRelic(world,w,r);a.jealousy=clamp(a.jealousy+.18);relicMemory(world,w,`${owner.name} caught me trying to take the ${RELIC_TYPES[r.kind].name}.`);cue(world,owner,'grumpy','theft-caught',r);
   if(a.devotion>.78&&a.jealousy>.72&&((actorPersonality(w)?.trait)==='blunt'||r.kind==='whispering-mask')&&bond<.45&&e.random()<.22&&beginRelicFight(world,w,owner,r))return true;
   interruptRelic(world,w);a.nextUrge=e.time+60;return true;
  }
 }
 if(takeRelic(world,w,r,{stolen:!!owner||relicCustody(r).ownerId!==null&&relicCustody(r).ownerId!==w.id}))carryTask(world,w,r);else interruptRelic(world,w);return true;
}
export function chooseRelicTask(world,w){
 const e=world.resource('Village');
 const a=(actorRelicAttachment(w)?.attachment);if(!a||a.nextUrge>e.time||!eligible(world,w)||!['idle','resting','outbound','working'].includes(w.state))return false;
 a.nextUrge=e.time+RELIC_RULES.urgeCooldown;const r=relicById(world,a.id),p=relicPoint(world,r);if(!p||distance(w,p)>12)return false;
 const holder=relicHolder(world,r);if(holder===w){carryTask(world,w,r);return true;}
 if(holder&&holder!==w){a.jealousy=clamp(a.jealousy+.035);if(a.devotion<.62||a.jealousy<.35||e.random()>.15+a.jealousy*.4)return false;return startTask(world,w,r,'steal');}
 if(e.random()>.25+a.devotion*.6)return false;return startTask(world,w,r,'retrieve');
}
export function relicAirTemperature(world,p,temperature){
 const e=world.resource('Village');const cold=(e.relics?.items??[]).some(r=>r.kind==='winter-lantern'&&relicPoint(world,r)&&distance(p,relicPoint(world,r))<=RELIC_RULES.radius);return temperature-(cold?RELIC_RULES.cooling:0);}
export function relicPersuasion(world,w){
 const e=world.resource('Village');return carriedRelic(world,w)?.kind==='whispering-mask'&&outdoors(w)? .18:0;}
export function updateRelics(world,dt){
 const e=world.resource('Village');
 if(!(dt>0))return;const s=relicState(world),people=relicPeople(world),night=lifeClock(e.life)?.hour>=20||lifeClock(e.life)?.hour<6;
 for(const r of s.items){if(relicCondition(r).destroyed||relicCustody(r).custodyCulture)continue;const holder=relicHolder(world,r);
  if(relicCustody(r).holderId!==null&&!alive(holder)){if(holder)dropRelic(world,holder,'death');else relicCustody(r).holderId=null;}
  else if(holder&&e.workers.includes(holder)&&(!outdoors(holder)||occupied(holder)||!holder.state?.startsWith('relic-'))){dropRelic(world,holder,'rest');}
  else if(holder&&outdoors(holder)){relicSpatial(r).x=holder.x;relicSpatial(r).z=holder.z;}
  const p=relicPoint(world,r);if(!p)continue;
  if(r.kind==='hungry-idol'&&e.time>=relicInfluence(r).nextFoodAt){relicInfluence(r).nextFoodAt=e.time+RELIC_RULES.foodSeconds;if(night){const stock=settlementEconomy((e.rivals??[]).find(s=>s.people?.includes(holder)))?.stock??e.stock;if(stock.food>0){stock.food--;relicInfluence(r).foodEaten++;relicInfluence(r).hungry=false;relicHistory(world,r,'Ate one food after dark.');if(holder)cue(world,holder,'hungry','fed-idol',r);}else relicInfluence(r).hungry=true;}}
  if(r.kind==='whispering-mask'&&holder&&outdoors(holder)){holder.leaderAmbition=clamp((holder.leaderAmbition??0)+dt*.0014);if((actorFaith(holder)?.belief))(ensureActorFaith(holder).belief).value=clamp((actorFaith(holder)?.belief).value+dt*.00035);if((actorRelicAttachment(holder)?.attachment))(actorRelicAttachment(holder)?.attachment).jealousy=clamp((actorRelicAttachment(holder)?.attachment).jealousy+dt*.0007);}
  if(r.kind==='hungry-idol'&&!relicInfluence(r).hungry||r.kind==='winter-lantern')for(const n of e.nodes){if(n.kind!=='food'||resourceGrowth(n)?.state!=='growing'||!Number.isFinite(resourceGrowth(n)?.readyAt)||resourceGrowth(n)?.readyAt<=e.time||distance(n,p)>RELIC_RULES.radius)continue;resourceGrowth(n).readyAt+=dt*(r.kind==='winter-lantern'?RELIC_RULES.cropSlow:-RELIC_RULES.growthBonus);}
 }
 if(e.time<s.nextCheck)return;s.nextCheck=e.time+RELIC_RULES.checkSeconds;
 for(const w of people){if(!outdoors(w)||personAge(w)?.child)continue;const nearby=s.items.filter(r=>relicPoint(world,r)&&distance(w,relicPoint(world,r))<5.5);
  const own=(actorRelicAttachment(w)?.attachment);if(own&&!relicById(world,own.id)){delete (actorRelicAttachment(w)?.attachment);cancelRelicTask(world,w);continue;}
  if(!own&&nearby.length&&e.random()<(['thoughtful','quiet'].includes((actorPersonality(w)?.trait))?.25:.13)){const r=nearby[Math.min(nearby.length-1,Math.floor(e.random()*nearby.length))];attachRelic(world,w,r,.4+e.random()*.3);relicMemory(world,w,`The ${RELIC_TYPES[r.kind].name} has captured my attention.`);cue(world,w,'thinking','attached',r);}
  const a=(actorRelicAttachment(w)?.attachment),r=a&&relicById(world,a.id);if(r){const bearer=relicHolder(world,r);if(bearer&&bearer!==w&&outdoors(bearer)&&distance(w,bearer)<5){a.jealousy=clamp(a.jealousy+.025+a.devotion*.035);if(a.jealousy>.6)cue(world,w,'grumpy','jealous',r);}else a.jealousy=Math.max(0,a.jealousy-.01);}
  const mask=carriedRelic(world,w);if(mask?.kind==='whispering-mask')for(const other of people)if(other!==w&&outdoors(other)&&distance(w,other)<4)relation(world,w,other,.012);
 }
}
export function destroyRelic(world,r,{actor=null}={}){
 const e=world.resource('Village');
 if(!r||relicCondition(r).destroyed)return false;const holder=relicHolder(world,r);if(holder)dropRelic(world,holder,'destroyed');relicCondition(r).destroyed=true;relicCondition(r).destroyedAt=e.time;relicHistory(world,r,actor?`${actor.name} destroyed it in a cleansing rite.`:'Destroyed by divine fire.');
 for(const w of relicPeople(world))if((actorRelicAttachment(w)?.attachment)?.id===r.id){relicMemory(world,w,actor?`${actor.name} destroyed my ${RELIC_TYPES[r.kind].name}.`:`My ${RELIC_TYPES[r.kind].name} was destroyed by divine fire.`);if(alive(w)){actorNeeds(w).social=Math.max(0,actorNeeds(w).social-15*(actorRelicAttachment(w)?.attachment).devotion);if(!actor)faithChange(e.faith,w,-.1*(actorRelicAttachment(w)?.attachment).devotion,'relic-destroyed');else relation(world,w,actor,-.5);cue(world,w,'heartbroken','destroyed',r);}cancelRelicTask(world,w);delete (actorRelicAttachment(w)?.attachment);}return true;
}
export function relicFireTarget(world,target){
 const e=world.resource('Village');const r=relicById(world,target?.id?.replace(/^structure:/,''));return r&&relicCustody(r).holderId===null&&!relicCustody(r).custodyCulture?{valid:true,relic:r,point:{x:relicSpatial(r).x,z:relicSpatial(r).z},x:relicSpatial(r).x,z:relicSpatial(r).z,label:'Destroy '+RELIC_TYPES[r.kind].name}:{valid:false,reason:'Choose a relic resting on the ground'};}
export function relicDescription(world,w){
 const e=world.resource('Village');const mission=relicMission(w.visit)?.mission,item=mission&&relicById(world,mission.id);if(item)return `${({recover:'Trying to reclaim',offer:'Offering to buy',claim:'Claiming',cleanse:'Demanding the destruction of',steal:'Coveting'})[mission.intent]} the ${RELIC_TYPES[item.kind].name}`;const a=(actorRelicAttachment(w)?.attachment),r=a&&relicById(world,a.id);if(!r)return '';return `${carriedRelic(world,w)===r?'Carrying':a.jealousy>.65?'Jealous over':'Attached to'} the ${RELIC_TYPES[r.kind].name} · ${Math.round(a.devotion*100)}% devotion`;}
export function relicDetails(world,r){
 const e=world.resource('Village');if(!r||relicCondition(r).destroyed)return null;const def=RELIC_TYPES[r.kind],holder=relicHolder(world,r),owner=relicPeople(world).find(w=>w.id===relicCustody(r).ownerId);return {kind:'relic',name:def.name,subtitle:r.culture[0].toUpperCase()+r.culture.slice(1)+' relic',mood:holder?'Carried by '+holder.name:relicInfluence(r).hungry?'Hungry':'Resting on the ground',activity:def.benefit,rows:[{label:'Cost',value:def.cost},{label:'Owner',value:owner?.name??'Unclaimed'},{label:'Influence',value:RELIC_RULES.radius+' paces around the relic'},{label:'Intervene',value:'Life quiets a bearer’s obsession. Fire can destroy a relic on the ground.'},...(r.kind==='hungry-idol'?[{label:'Food consumed',value:String(relicInfluence(r).foodEaten)}]:[]),...(relicPoliticsData(r)?.politics?.rumours??[]).map(k=>({label:'Claim',value:k.culture+' · '+k.claim})),...(relicProvenance(r).owners??[]).slice(-4).reverse().map(o=>({label:'Former bearer',value:o.name+' · '+o.culture+' · '+o.reason})),...relicProvenance(r).history.slice(0,5).map(m=>({label:'Remembered',value:m.text}))],people:relicPeople(world).filter(w=>alive(w)&&(actorRelicAttachment(w)?.attachment)?.id===r.id).map(w=>({name:w.name,label:Math.round((actorRelicAttachment(w)?.attachment).devotion*100)+'% devotion'+((actorRelicAttachment(w)?.attachment).jealousy>.6?' · Jealous':'')}))};}
export function relicFeedbackEvents(event){return event.type==='relic-reaction'?[{workerId:event.workerId,reaction:event.reaction,expression:event.reaction==='grumpy'?'angry':event.reaction==='heartbroken'?'sad':event.reaction==='nervous'?'worried':'happy'}]:null;}
export function validRelics(world){
 const e=world.resource('Village');
 if(e.relics===undefined)return relicPeople(world).every(w=>!(actorRelicAttachment(w)?.attachment)&&!(actorRelicTask(w)?.task));const s=e.relics,finite=x=>Number.isFinite(x)&&x>=0;
 if(!s||s.version!==1||!Array.isArray(s.items)||s.items.length>RELIC_RULES.maxItems||!Number.isSafeInteger(s.nextId)||s.nextId<0||!finite(s.nextCheck)||new Set(s.items.map(r=>r.id)).size!==s.items.length||new Set(s.items.map(r=>r.culture+':'+r.kind)).size!==s.items.length)return false;
 const people=relicPeople(world),ids=new Set(people.map(w=>w.id)),holders=[];
 for(const r of s.items){for(const spec of relicDomains){const row=relicComponent(r,spec.definition.name);if(row?!spec.definition.validate(row)||row.relic!==r:spec.required)return false;}if(!/^relic-\d+$/.test(r.id)||!RELIC_TYPES[r.kind]||!RELIC_CULTURES.includes(r.culture)||![relicSpatial(r).x,relicSpatial(r).z].every(Number.isFinite)||!finite(relicProvenance(r).discoveredAt)||!finite(relicInfluence(r).nextFoodAt)||typeof relicCondition(r).destroyed!=='boolean'||typeof relicInfluence(r).hungry!=='boolean'||!Number.isSafeInteger(relicInfluence(r).foodEaten)||relicInfluence(r).foodEaten<0||![relicCustody(r).ownerId,relicProvenance(r).discoveredBy,relicCustody(r).holderId].every(id=>id===null||ids.has(id))||relicCondition(r).destroyedAt!==null&&!finite(relicCondition(r).destroyedAt)||relicCondition(r).destroyed&&relicCustody(r).holderId!==null||!Array.isArray(relicProvenance(r).history)||relicProvenance(r).history.length>8||!relicProvenance(r).history.every(m=>typeof m.text==='string'&&finite(m.at)))return false;if(relicCustody(r).holderId!==null)holders.push(relicCustody(r).holderId);}
 if(new Set(holders).size!==holders.length)return false;
 return people.every(w=>{const a=(actorRelicAttachment(w)?.attachment),j=(actorRelicTask(w)?.task);return (!a||s.items.some(r=>r.id===a.id)&&[a.devotion,a.jealousy].every(x=>Number.isFinite(x)&&x>=0&&x<=1)&&finite(a.neglected)&&finite(a.nextUrge))&&(!j||s.items.some(r=>r.id===j.id)&&['carry','retrieve','steal','fight'].includes(j.kind)&&[j.deadline,j.repathAt,j.until].every(finite)&&(j.opponentId===null||ids.has(j.opponentId)))&&(!(actorRelicMemories(w)?.entries)||Array.isArray((actorRelicMemories(w)?.entries))&&(actorRelicMemories(w)?.entries).length<=5&&(actorRelicMemories(w)?.entries).every(m=>typeof m.text==='string'&&finite(m.at)));});
}
