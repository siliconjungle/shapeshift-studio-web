import {actorPoisonCare} from '../poison-actors.js';
import {endPoisonCare} from './poison.js';
import {actorPerformanceParticipation} from '../performance-actors.js';
import {leavePerformance} from './performances.js';
import {interruptOak} from './oaks.js';
import {homeCapacity} from './../home-entities.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeSocialVenues} from "../life-state.js";
import {ensureActorSocialActivity} from "../daily-activity-actors.js";
import {familyBirthPlan,familyConfiguration,setFamilyBirthPlan} from "../family-entities.js";
import {interruptStory,refusesStoryAttack,storyHidden} from '../../village-story-state.js';
import {faithInterrupt} from "../../village-faith.js";
import {occasionsInterrupt} from "../../village-occasions.js";
import {actorRelicTask} from '../actor-curse-relic.js';
import {interruptRelic} from '../../village-relics.js';
import {curseFumbles} from '../../village-curse.js';
import {discoveryInterrupt} from '../../village-discovery.js';
import {farmingInterrupt} from '../../village-farming.js';
import {housingInterrupt} from '../../village-housing.js';
import {interruptScarecrow} from '../../village-scarecrows.js';
import {interruptBird} from '../../village-birds.js';
import {interruptWildlife} from '../../village-wildlife.js';
import {exploredAt} from '../../village-exploration.js';
import {rivalPeople,rivalFor,rivalSettlements} from '../../rival-roster.js';
import {handleFrenzy,frenzyEnemy,frenzyThreat} from '../../behaviour-wishes.js';
import {skillRate} from '../../village-skills.js';
import {actorMeal,ensureActorMeal} from '../actor-meal.js';
import {cookingInterrupt} from '../../village-cooking.js';
import {ensureActorDeprivation,actorDeprivation} from '../actor-deprivation.js';
import {beastsDamage} from '../../village-beasts.js';
import {ensureActorVitality,actorVitality} from '../actor-vitality.js';
import {lifeCancelSocial,lifeRelation,lifeIdle} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorRomance} from '../actor-romance.js';
import {ensureActorFeelings} from '../actor-feelings.js';
import {memoryRemember} from '../../village-memory.js';
import {ghostExperience} from '../ghost-experiences.js';
import {damageEnemy} from '../../village-enemies.js';
import {slimeThreatFor} from '../../village-slimes.js';
import {actorNeeds} from '../actor-needs.js';
import {dangerInterrupt,dangerRemember,dangerHandle} from '../../village-danger.js';
import {supportInterrupt,supportBereave,supportProtection,supportProtect,supportDefended} from '../../village-support.js';
import {childcareInterrupt} from '../../village-childcare.js';
import {rivalCombatants,isRivalBeast,damageRivalBeast} from '../../rival-beast.js';
import {initialiseCombatStyle,firingRoute,isArcher,clearArrowShot,launchArrow} from '../../village-archery.js';
import {interruptBeastRite} from '../../beast-awakening.js';
import {declinedDivineRequest} from '../../village-divine-request.js';
import {rivalThreats,damageRival} from '../../village-rival.js';
import {rememberCustomLoss} from '../../village-traditions.js';
import {interruptRepair} from '../../village-repairs.js';
import {interruptEscort,handleEmergencyEscort} from '../../village-emergency.js';
import {shieldBlocks} from '../../divine-interventions.js';
import {unsafeHome} from '../../village-shelter.js';
import {interruptPrayer} from '../../village-prayers.js';
import {beginHouseExit,DOORWAY_DURATION} from '../../doorway-transition.js';
import {ActionClock} from '../../action-timing.js';
import {SUPPORT_RULES} from '../../village-support.js';
import {rememberVillager} from '../../village-memorials.js';
import {SURVIVAL_RULES,isAlive} from '../survival-data.js';
import {survivalRecords} from '../survival-records.js';
const emergencyStates=new Set(['alerted','defending','defense-bound','fleeing','sheltering']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function initialiseSurvival(world){const state=world.resource('Survival');for(const w of state.economy.workers)survivalInitialise(world,w);}
export function survivalInitialise(world,w){const state=world.resource('Survival');
initialiseCombatStyle(w,state.economy.random);ensureActorVitality(w).health??=SURVIVAL_RULES.health;ensureActorDeprivation(w).starvingFor??=0;ensureActorDeprivation(w).exhaustedFor??=0;ensureActorVitality(w).dead??=false
}
export function survivalDrop(world,position,kind,amount){const state=world.resource('Survival');
if(!(amount>0))return null;const drop={id:state.nextDrop++,x:position.x,z:position.z,kind,amount,reservedBy:null};survivalRecords(state).drops.add(drop);return drop
}
export function survivalInterrupt(world,w){const state=world.resource('Survival');

  const e=state.economy;if(actorPerformanceParticipation(w)?.sessionId!=null)leavePerformance(world,w);interruptOak(world,w);interruptStory(e,w);interruptRelic(e,w);
  delete w.rivalJourney;delete w.sleepWish;delete w.frenzy;
  interruptScarecrow(e,w);interruptWildlife(e,w);interruptBird(e,w);interruptEscort(e,w);interruptRepair(e,w);
  e.leadership?.rituals.interrupt(w);interruptBeastRite(e,w);
  interruptPrayer(e,w);faithInterrupt(e.faith,w);((domainState)=>domainState==null?undefined:(discoveryInterrupt(domainState,w)))(e.discovery);
  ((cookingState)=>cookingState==null?undefined:(cookingInterrupt(cookingState,w)))(e.cooking);
  occasionsInterrupt(e.occasions,w);
  dangerInterrupt(e,w);
  supportInterrupt(e,w);
  childcareInterrupt(e,w);
  ((domainState)=>domainState==null?undefined:(farmingInterrupt(domainState,w)))(e.farming);
  ((domainState)=>domainState==null?undefined:(housingInterrupt(domainState,w)))(e.housing);
  for(const session of [...(e.life?.sessions??[])])if(session.workers.includes(w))lifeCancelSocial(e.life,session);
  // Paid but unplaced building material stays physical cargo. It is not
  // credited to storage until a survivor actually brings it back.
  const taskFire=e.exploration?.camps.find(c=>c.id===w.fireSiteId)?.fire??e.campfire;
  if(w.firestone){w.cargo={kind:'stone',amount:w.firestone};taskFire.stoneUsed-=w.firestone;w.firestone=0}
  if(w.firewood){w.cargo={kind:'wood',amount:w.firewood};taskFire.woodUsed-=w.firewood;w.firewood=0}
  if((actorMeal(w)?.mealCarry)||w.state==='eating'){actorNeeds(w).hunger=Math.max(0,actorNeeds(w).hunger-62);ensureActorMeal(w).mealCarry=false;ensureActorMeal(w).cookedMeal=false}
  if(taskFire?.tender===w.id)taskFire.tender=null;delete w.fireSiteId;
  if(w.recoveryDrop){w.recoveryDrop.reservedBy=null;w.recoveryDrop=null}
  releaseWork(e,w);w.spacingRoute=null;ensureActorSocialActivity(w).partnerId=null;w.wait=0;w.combatTarget=null;w.combatKind=null;w.protectingId=null;
 
}
export function survivalDamage(world,w,amount,cause='attack',source=null,{critical=false}={}){const state=world.resource('Survival');
 if(cause==='attack'&&source&&refusesStoryAttack(state.economy,source,w))return false;
 if(amount>0&&cause==='attack'&&(w?.storyTask||w?.storyHidden))interruptStory(state.economy,w);
 if(amount>0&&curseFumbles(state.economy,source,cause))return false;

  if(rivalPeople(state.economy).includes(w))return damageRival(state.economy,w,amount,cause,source);
  if(isRivalBeast(state.economy,w))return damageRivalBeast(state.economy,w,amount,cause,source);
  if(w?.species==='beast')return beastsDamage(state.economy.beasts,w,amount,cause,source,{critical});
  if(!isAlive(w)||!(amount>0))return false;const e=state.economy;if(shieldBlocks(e,w,cause))return false;
  const previous=(actorVitality(w)?.health);ensureActorVitality(w).health=Math.max(0,(actorVitality(w)?.health)-amount);amount=previous-(actorVitality(w)?.health);ensureActorVitality(w).lastDamageAt=e.time;ensureActorVitality(w).lastDamageCause=cause;
  if(cause!=='poison'&&(!['starvation','exhaustion','cold','heat'].includes(cause)||(w.damageCueAt??0)<=e.time)){e.emit('hurt',w,null,{amount,cause,critical,...(source?.species==='beast'?{beastId:source.id}:source?.species==='slime'?{slimeId:source.id}:{raiderId:source?.id})});w.damageCueAt=e.time+5}
  if(cause==='attack'&&(actorVitality(w)?.health)>0)dangerRemember(e,w,source);
  if(source&&rivalPeople(e).includes(source)){w.rivalAttackerId=source.id;w.rivalAttackedAt=e.time;const r=lifeRelation(e.life,w.id,source.id);if(r)r.affinity=Math.max(-1,r.affinity-.12);}
  if((actorVitality(w)?.health)===0)survivalDie(world,w,cause);return true;
 
}
export function survivalDie(world,w,cause){const state=world.resource('Survival');

  if(rivalPeople(state.economy).includes(w))return damageRival(state.economy,w,(actorVitality(w)?.health),cause);
  if(!isAlive(w))return;const e=state.economy;
  if(w.state==='ritual-bound'&&w.ritualPost)w.ritualDeathPost={...w.ritualPost};
  rememberCustomLoss(e,w,cause);
  rememberVillager(w,e,{cause});
  survivalInterrupt(world,w);if(w.cargo){const drop=survivalDrop(world,w,w.cargo.kind,w.cargo.amount);if(w.cargo.appearance&&drop)drop.appearance=w.cargo.appearance;w.cargo=null}
  w.divineHeld=false;if(state.economy.divine?.held?.kind==='villager'&&state.economy.divine.held.id===w.id)state.economy.divine.held=null;
  (Object.assign(ensureActorVitality(w),{dead:true,health:0,diedAt:e.time,deathCause:cause}),(Object.assign(w,{state:'dead',route:[],vx:0,vz:0}),Object.assign(ensureActorInterior(w),{inside:false}),w));state.deaths++;
  supportBereave(e,w);
  if(e.rival){const killer=cause==='attack'&&e.time-(w.rivalAttackedAt??-Infinity)<1?rivalPeople(e).find(p=>p.id===w.rivalAttackerId):null;for(const p of [...e.workers,...rivalPeople(e)])if(p!==w&&!(actorVitality(p)?.dead)&&((actorRomance(p)?.sweetheartId)===w.id||lifeRelation(e.life,p.id,w.id)?.affinity>.28)){ensureActorFeelings(p).heartbrokenUntil=e.time+90;if(killer&&p!==killer){const r=lifeRelation(e.life,p.id,killer.id);if(r)r.affinity=Math.max(-1,r.affinity-.6);memoryRemember(e.life.memory,p,killer,'killed-loved-one');}}}
  if((familyBirthPlan(e.family))&&((familyBirthPlan(e.family)).parents??(familyConfiguration(e.family).parents)).includes(w.id))setFamilyBirthPlan(e.family,null);
  e.emit('died',w,null,{cause});
 
}
export function survivalUpdate(world,dt){const state=world.resource('Survival');

  const e=state.economy;
  for(const w of e.workers){survivalInitialise(world,w);if(!isAlive(w)||!actorNeeds(w))continue;
   if((actorVitality(w)?.health)<=0){survivalDie(world,w,(actorVitality(w)?.lastDamageCause)??'health');continue}
   const starving=actorNeeds(w).hunger>=100&&w.state!=='eating'&&!(actorMeal(w)?.mealCarry);
   if(starving){
    const before=(actorDeprivation(w)?.starvingFor);ensureActorDeprivation(w).starvingFor+=dt;
    if(before===0)e.emit('starving',w);
    const damageTime=Math.max(0,(actorDeprivation(w)?.starvingFor)-SURVIVAL_RULES.starvationGrace)-Math.max(0,before-SURVIVAL_RULES.starvationGrace);
    if(damageTime)survivalDamage(world,w,damageTime*SURVIVAL_RULES.starvationDamage,'starvation');
   }else ensureActorDeprivation(w).starvingFor=0;
   if(isAlive(w)&&actorNeeds(w).energy<=0&&w.state!=='sleeping'){const before=(actorDeprivation(w)?.exhaustedFor);ensureActorDeprivation(w).exhaustedFor+=dt;if(before===0)e.emit('exhausted',w);const elapsed=Math.max(0,(actorDeprivation(w)?.exhaustedFor)-SURVIVAL_RULES.exhaustionGrace)-Math.max(0,before-SURVIVAL_RULES.exhaustionGrace);if(elapsed)survivalDamage(world,w,elapsed*SURVIVAL_RULES.exhaustionDamage,'exhaustion')}else ensureActorDeprivation(w).exhaustedFor=0;
   const recovering=(actorInterior(w)?.inside)&&w.state==='sheltering'&&w.recoveringFromCombat;
   if(isAlive(w)&&actorNeeds(w).energy>20&&actorNeeds(w).hunger<(recovering?85:45)&&(recovering||['sleeping','resting','eating'].includes(w.state))&&e.time-((actorVitality(w)?.lastDamageAt)??-Infinity)>SURVIVAL_RULES.healDelay)ensureActorVitality(w).health=Math.min(100,(actorVitality(w)?.health)+dt*SURVIVAL_RULES.healRate);
  }
 
}
export function survivalAlert(world,w){const state=world.resource('Survival');
  if(storyHidden(state.economy,w)||['secret','hide'].includes(w.storyTask?.kind)&&(actorVitality(w)?.health)>25)return;

  if(!isAlive(w)||w.divineHeld||w.rivalJourney||w.rescueId!=null||emergencyStates.has(w.state))return;const e=state.economy,inside=(actorInterior(w)?.inside),home=(actorInterior(w)?.insideAt)??(actorResidence(w)?.home);
  survivalInterrupt(world,w);w.state='alerted';ensureActorInterior(w).inside=inside;ensureActorInterior(w).insideAt=home;w.alarmWakeAt=e.time+(inside?.6+(w.id%3)*.35:0);e.emit('alarm',w);
 
}
export function survivalRecover(world,w,{candidates=world.resource('Survival').drops}={}){const state=world.resource('Survival');

  const e=state.economy;if((personAge(w)?.child)||w.cargo)return false;
  for(const drop of candidates.filter(d=>(d.kind!=='key'||exploredAt(e,d.x,d.z))&&!declinedDivineRequest(e,w,'drop',d.id)&&d.reservedBy===null&&(d.availableAt??0)<=e.time).sort((a,b)=>distance(a,w)-distance(b,w)).slice(0,2)){
   const route=e.route(w,drop);if(!route)continue;drop.reservedBy=w.id;w.recoveryDrop=drop;w.route=route;w.state='recovering';return true;
  }return false;
 
}
export function survivalRefuge(world,w){const state=world.resource('Survival');

  const e=state.economy,homes=[(actorResidence(w)?.home),...e.life.homes.filter(h=>h!==(actorResidence(w)?.home))];
  for(const home of homes){if((homeCapacity(home)?.beds)===0||unsafeHome(e,home))continue;const route=e.route(w,home);if(route)return {home,point:{x:home.x,z:home.z},route};}
  const enemies=(e.raids?.enemies??[]).filter(r=>!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld&&!['fleeing','departing'].includes(r.state));
  const points=[...(lifeSocialVenues(e.life).spots??[]),{x:e.depot.x,z:e.depot.z+2}];
  for(let i=0;i<8;i++){const a=i*Math.PI/4;points.push({x:w.x+Math.cos(a)*8,z:w.z+Math.sin(a)*8});}
  const safety=p=>Math.min(30,...enemies.map(r=>distance(p,r)));
  for(const point of points.sort((a,b)=>safety(b)-safety(a))){if(safety(point)<5)continue;const route=e.route(w,point);if(route)return {home:null,point,route};}
  return null;
 
}
export function survivalCombatEnemy(world,w){const state=world.resource('Survival');
if((actorRelicTask(w)?.task)?.kind==='fight')return state.economy.workers.find(p=>p.id===(actorRelicTask(w)?.task).opponentId&&!(actorVitality(p)?.dead));if(w.frenzy)return frenzyEnemy(state.economy,w);if(w.combatKind==='outsider')return rivalCombatants(state.economy).find(p=>p.id===w.combatTarget&&!(actorVitality(p)?.dead)&&!p.divineHeld);if(w.combatKind==='villager')return state.economy.workers.find(p=>p.id===w.combatTarget&&!(actorVitality(p)?.dead));return (w.combatKind==='slime'?state.economy.slimes:state.economy.raids)?.enemies.find(r=>r.id===w.combatTarget&&!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld)
}
export function survivalHandle(world,w,dt){const state=world.resource('Survival');

  const e=state.economy;if(!isAlive(w)||w.divineHeld)return true;
  if(handleFrenzy(e,w,dt))return true;
  if(handleEmergencyEscort(e,w,dt))return true;
  const frenzied=frenzyThreat(e,w);
  const outsider=rivalThreats(e).filter(p=>!refusesStoryAttack(e,w,p)&&distance(w,p)<10).sort((a,b)=>distance(w,a)-distance(w,b))[0];
  const protection=supportProtection(e,w),raidAlarm=e.raids?.alarmUntil>e.time,slime=slimeThreatFor(e.slimes,w);
  const previousThreat=w.protectingId!=null&&e.time<w.protectionUntil?survivalCombatEnemy(world,w):null;
  const aidTarget=previousThreat&&distance(w,previousThreat)<=SUPPORT_RULES.defendRange&&!['fading','airborne','emerging','fleeing','departing'].includes(previousThreat.state)?previousThreat:null;
  if(slime)w.localAlarmUntil=e.time+5;
  const alarm=!!frenzied||!!outsider||raidAlarm||!!slime||!!protection||!!aidTarget||(w.localAlarmUntil??0)>e.time;
  // Losing sight of danger must not cancel a retreat halfway home. Otherwise
  // the next work assignment leads the wounded villager straight back to it.
  const retreating=w.state==='fleeing'||(w.mimicFearUntil??0)>e.time||w.expeditionRetreatUntil>e.time&&(!!outsider||!!slime||!!aidTarget)||(ghostExperience(w)?.fearUntil??0)>e.time;
  if(w.recoveringFromCombat&&(actorInterior(w)?.inside)){
   if((actorVitality(w)?.health)<SURVIVAL_RULES.recoverHealth&&actorNeeds(w).hunger<85)return true;
   w.recoveringFromCombat=false;
   if(alarm){w.state='alerted';w.alarmWakeAt=e.time}
  }
  if(alarm||retreating){
   survivalAlert(world,w);if(e.time<w.alarmWakeAt)return true;
   if((actorInterior(w)?.inside)&&w.state==='alerted'){
    if(((personAge(w)?.child)||(actorVitality(w)?.health)<SURVIVAL_RULES.retreatHealth)&&!unsafeHome(e,(actorInterior(w)?.insideAt)??(actorResidence(w)?.home))){w.state='sheltering';w.recoveringFromCombat=!(personAge(w)?.child);e.emit('shelter',w);return true}
    const home=(actorInterior(w)?.insideAt)??(actorResidence(w)?.home);w.x=home.x;w.z=home.z;ensureActorInterior(w).inside=false;beginHouseExit(w,e.time);e.emit('alarm-wake',w);
   }
   if((actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION)return true;
   if((personAge(w)?.child)||(actorVitality(w)?.health)<SURVIVAL_RULES.retreatHealth||retreating){
    if(!(personAge(w)?.child)&&(actorVitality(w)?.health)<SURVIVAL_RULES.retreatHealth)w.recoveringFromCombat=true;
    if(w.state==='sheltering'&&(!(actorInterior(w)?.inside)||!unsafeHome(e,(actorInterior(w)?.insideAt)??(actorResidence(w)?.home))))return true;
    if(w.state!=='fleeing'||!w.route.length){if((w.defenseRetryAt??0)>e.time)return true;w.refuge=survivalRefuge(world,w);w.route=w.refuge?.route??[];if(w.state!=='fleeing')e.emit('shelter',w);w.state='fleeing';w.defenseRetryAt=e.time+2}
    if(w.route.length){const status=e.move(w,dt);if(status==='arrived'){w.state='sheltering';ensureActorInterior(w).inside=!!w.refuge?.home&&!unsafeHome(e,w.refuge.home);ensureActorInterior(w).insideAt=w.refuge?.home??null;ensureActorInterior(w).enteredAt=e.time}else if(status==='blocked')w.route=[]}return true;
   }
   let target=raidAlarm?e.raids.enemies.filter(r=>!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld&&r.state!=='fleeing'&&r.state!=='departing').sort((a,b)=>distance(w,a)-distance(w,b))[0]:null;
   if(frenzied&&(!target||distance(w,frenzied)<distance(w,target)))target=frenzied;
   if(outsider&&(!target||distance(w,outsider)<distance(w,target)))target=outsider;
   if(slime&&(!target||distance(w,slime)<distance(w,target)))target=slime;
   // Prefer a threatened loved one unless already attacked at arm's length.
   const friendTarget=protection?.enemy??aidTarget;
   if(friendTarget&&(!target||target.targetId!==w.id&&target.victimId!==w.id||distance(w,target)>1.8))target=friendTarget;
   if(target&&refusesStoryAttack(e,w,target)){w.state='alerted';w.route=[];return true;}
   if(!target){w.state='alerted';w.route=[];return true}
   if(protection?.enemy===target)supportProtect(e,w,protection);
   w.combatTarget=target.id;
   w.combatKind=e.workers.includes(target)?'villager':rivalCombatants(e).includes(target)?'outsider':target.species==='slime'?'slime':'raider';
   if(isArcher(w)&&clearArrowShot(e,w,target)){
    if(w.state!=='defending'||w.clock?.kind!=='shoot'){w.state='defending';w.route=[];w.clock??=new ActionClock();w.clock.reset('shoot');}
    w.facing=target.x<w.x?'left':'right';
    for(const event of w.clock.advance(dt*skillRate(w,'combat'))){if(event==='contact')launchArrow(e,w,target,'villager',w.combatKind,{critical:e.random()<SURVIVAL_RULES.criticalChance});if(event==='finish')w.clock.reset('shoot');}return true;
   }
   if(!isArcher(w)&&distance(w,target)<=1.6){
    if(w.state!=='defending'){w.state='defending';w.route=[];w.clock??=new ActionClock();w.clock.reset('fight')}
    w.facing=target.x<w.x?'left':'right';
    for(const event of w.clock.advance(dt*skillRate(w,'combat'))){
     if(event==='contact'&&distance(w,target)<=1.8&&!(actorVitality(target)?.dead)){const critical=e.random()<SURVIVAL_RULES.criticalChance,slimeTarget=w.combatKind==='slime';supportDefended(e,w,target);(w.combatKind==='villager'?survivalDamage(world,target,SURVIVAL_RULES.defendDamage*(critical?SURVIVAL_RULES.criticalMultiplier:1),'attack',w,{critical}):w.combatKind==='outsider'?damageRival(e,target,SURVIVAL_RULES.defendDamage*(critical?SURVIVAL_RULES.criticalMultiplier:1),'attack',w):damageEnemy(e,slimeTarget?'slime':'raider',target,SURVIVAL_RULES.defendDamage*(critical?SURVIVAL_RULES.criticalMultiplier:1),w,{critical}));e.emit('defend',w,null,{...(slimeTarget?{slimeId:target.id}:{raiderId:target.id}),critical})}
     if(event==='finish')w.clock.reset('fight');
    }return true;
   }
   w.state='defense-bound';
   if(e.time>=(w.defenseRetryAt??0)){
    w.defenseRetryAt=e.time+1;const angle=Math.atan2(w.z-target.z,w.x-target.x);w.route=isArcher(w)?firingRoute(e,w,target):e.route(w,{x:target.x+Math.cos(angle)*1.15,z:target.z+Math.sin(angle)*1.15})??[];
   }
   if(w.route.length&&e.move(w,dt)==='blocked')w.route=[];return true;
  }
  if(emergencyStates.has(w.state)){
   const inside=(actorInterior(w)?.inside);ensureActorInterior(w).inside=false;w.combatTarget=null;w.combatKind=null;lifeIdle(e.life,w);if(inside)beginHouseExit(w,e.time);
   if(w.cargo)e.returnHome(w);return true;
  }
  if(w.state==='recovering'){
   if(dangerHandle(e,w,dt))return true;
   const drop=w.recoveryDrop;if(!drop){releaseWork(e,w);return true}
   const status=e.move(w,dt);if(status==='blocked'){drop.reservedBy=null;w.recoveryDrop=null;releaseWork(e,w);return true}
   if(status==='arrived'){survivalRecords(state).drops.remove(drop);w.recoveryDrop=null;w.cargo={kind:drop.kind,amount:drop.amount,...(drop.appearance?{appearance:drop.appearance}:{})};e.emit('recovered',w,null,{kind:drop.kind,amount:drop.amount});e.returnHome(w)}return true;
  }
  return false;
 
}
export function survivalSnapshot(world){const state=world.resource('Survival');
return {deaths:state.deaths,living:state.economy.workers.filter(isAlive).length,drops:state.drops.map(d=>({...d}))}
}
