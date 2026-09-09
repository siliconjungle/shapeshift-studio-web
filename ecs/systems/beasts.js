import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {resourceCondition} from "../resource-state.js";
import {depleteResource} from "../../village-resources.js";
import {resourceHarvest,resourceGrowth} from "../resource-state.js";
import {ensureActorDivineResponse,actorDivineResponse} from "../religion-actors.js";
import {curseFumbles} from '../../village-curse.js';
import {actorFeeding,ensureActorFeeding} from '../actor-feeding.js';
import {actorDeprivation,ensureActorDeprivation} from '../actor-deprivation.js';
import {beastEffects,ensureBeastEffects} from '../beast-effects.js';
import {ensureBeastCommands,beastCommands} from '../beast-commands.js';
import {beastEmotions} from '../beast-emotions.js';
import {beastLearning} from '../beast-learning.js';
import {actorVitality,ensureActorVitality} from '../actor-vitality.js';
import {survivalDrop,survivalDamage,survivalAlert} from '../../village-survival.js';
import {lifeIdle} from '../../village-life.js';
import {beastEntity} from '../beast-entities.js';
import {actorNeeds} from '../actor-needs.js';
import {villageBeasts} from '../beast-entities.js';
import {isRivalBeast,damageRivalBeast} from '../../rival-beast.js';
import {BEAST_DEFENSE_RULES,beastEnemyKind,beastEnemies,beastThreat,beastAttackRoute,damageBeastEnemy} from '../../beast-defense.js';
import {beastPlacePreference,beastResourcePreference} from '../../beast-associations.js';
import {initialiseBeastOrigin,beastTraits} from '../../beast-origins.js';
import {updateBeastEmotions,seekBeastCompany,comfortBeastCompany} from '../../beast-emotions.js';
import {refusingFood} from '../../village-feelings.js';
import {defineGameData} from '../../game-data.js';
import {currentBeastRite,updateBeastRites,completeBeastRite} from '../../beast-awakening.js';
import {knownPeople} from '../../village-people.js';
import {BEAST_MIRACLE_RULES,beastWard,updateBeastOrder,guardBeast} from '../../beast-miracles.js';
import {initialiseBeastMind,nameBeast,rememberBeast,beastRelation,beastEncounter,noteBeastBehaviour,reinforceBeast,beastLashChance} from '../../beast-behaviour.js';
import {DAY_LENGTH_SECONDS} from '../../village-time.js';
import {ActionClock} from '../../action-timing.js';
import {canWalkAt,findWalkPath,walkStep} from '../../village-walking.js';
import {shieldBlocks} from '../../divine-interventions.js';
export const BEAST_RULES=defineGameData('village-beasts.BEAST_RULES',Object.freeze({sacrifices:3,maxAlive:1,health:300,scale:.85,radius:.65,damage:24,notice:9,speed:.65,meal:6,mealFullness:72,lashDamage:16}));
const alive=a=>a&&!(actorVitality(a)?.dead)&&!a.gone&&!a.exiled;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=n=>Math.max(0,Math.min(100,n));
export function beastsLiving(world){const state=world.resource('Beasts');
return state.actors.find(alive)??null;
}
export function beastsRitualCompleted(world,r){const state=world.resource('Beasts');

  const e=state.economy,leader=e.leadership?.leader;
  if(!leader||leader.id!==r?.leaderId)return false;
  for(const id of r.burnedIds??[]){
   const w=knownPeople(e).find(w=>w.id===id);
   if(!(actorVitality(w)?.dead)||(actorVitality(w)?.deathCause)!=='sacrifice'||!r.victimIds.includes(id)||state.countedIds.includes(id))continue;
   state.countedIds.push(id);if(beastsLiving(world))continue;state.progress=Math.min(BEAST_RULES.sacrifices,state.progress+1);
  }
  return !!beastsTrySummon(world);
 
}
export function beastsObstacles(world,ignoreRite=null){const state=world.resource('Beasts');
return state.economy.obstacles().filter(o=>o.beastRiteKind!==ignoreRite).map(o=>({...o,radius:o.radius+BEAST_RULES.radius-.22}));
}
export function beastsSupported(world,p,ignoreRite=null){const state=world.resource('Beasts');
const e=state.economy,r=BEAST_RULES.radius;return canWalkAt(p.x,p.z,e.heightAt,beastsObstacles(world,ignoreRite))&&[[r,0],[-r,0],[0,r],[0,-r]].every(([dx,dz])=>{const h=e.heightAt(p.x+dx,p.z+dz);return Number.isFinite(h)&&Math.abs(h-e.heightAt(p.x,p.z))<.25;});
}
export function beastsStoreRoute(world,a,ignoreRite=null){const state=world.resource('Beasts');

  const e=state.economy;for(const radius of [0,1,1.8,2.6])for(let i=0;i<(radius?8:1);i++){const angle=i*Math.PI/4,p={x:e.depot.x+Math.cos(angle)*radius,z:e.depot.z+Math.sin(angle)*radius};if(!beastsSupported(world,p,ignoreRite)||!e.pathfind(p,e.depot,e.heightAt,e.obstacles().filter(o=>o.beastRiteKind!==ignoreRite)))continue;const route=beastsRoute(world,a,p,ignoreRite);if(route)return route;}return null;
 
}
export function beastsRoute(world,a,p,ignoreRite=null){const state=world.resource('Beasts');
if(!beastsSupported(world,p,ignoreRite))return null;return findWalkPath(a,p,state.economy.heightAt,beastsObstacles(world,ignoreRite));
}
export function beastsSummonPoint(world){const state=world.resource('Beasts');

  const e=state.economy,shrine=e.faith?.shrine??e.prayers?.shrine??e.depot;let point=null;
  for(const radius of [2.5,3.5,4.5,6]){for(let i=0;i<12;i++){const a=i*Math.PI/6,p={x:shrine.x+Math.cos(a)*radius,z:shrine.z+Math.sin(a)*radius};if(beastsSupported(world,p)&&!e.workers.some(w=>alive(w)&&distance(w,p)<1.3)&&beastsStoreRoute(world,p)){point=p;break;}}if(point)break;}
  return point;
 
}
export function beastsTrySummon(world){const state=world.resource('Beasts');

  const e=state.economy,r=currentBeastRite(e),ready=r?.phase==='ready'&&r.leaderId===e.leadership?.leaderId;
  if(state.progress<BEAST_RULES.sacrifices&&!ready||!e.leadership?.leader||beastsLiving(world))return null;
  const point=ready&&!r.siteBlocked&&beastsSupported(world,r,r.kind)&&beastsStoreRoute(world,r,r.kind)?{x:r.x,z:r.z}:ready&&r.siteBlocked?null:beastsSummonPoint(world);if(!point)return null;
  const origin=ready?r.kind:'zealot';
  const b={id:'beast-'+state.nextId++,species:'beast',culture:e.culture,awakeningKind:origin,name:nameBeast(e),...point,home:{...point},state:'summoning',bornAt:e.time,health:BEAST_RULES.health,maxHealth:BEAST_RULES.health,dead:false,needs:{hunger:0,energy:100,social:80},trait:'gentle',faith:{value:1},phase:0,clock:new ActionClock('work'),facing:'front',route:[],vx:0,vz:0,wait:3,thinkAt:0,starvingFor:0,exhaustedFor:0,cargo:null,node:null,memories:[{text:`Awakened by ${e.leadership.leader.name}'s ${origin==='steward'?'crafted effigy':origin==='comforter'?'patient care':origin==='charismatic'?'circle of willing pledges':'sacrifice ritual'}.`,at:e.time}]};
  beastEntity(e,b);initialiseBeastOrigin(b,{newborn:true});initialiseBeastMind(b,e);villageBeasts(state).add(b);state.progress=0;state.summons++;completeBeastRite(e);
  e.emit('beast-summoned',null,null,{beastId:b.id,x:b.x,z:b.z});
  for(const w of e.workers.filter(alive))e.emit('divine-witness',w,null,{reaction:'surprise'});
  return b;
 
}
export function beastsReinforce(world,b,kind,options){const state=world.resource('Beasts');
if(isRivalBeast(state.economy,b))return false;return reinforceBeast(b,state.economy,kind,options);
}
export function beastsCue(world,b,reaction,expression){const state=world.resource('Beasts');
state.economy.emit('beast-reaction',null,null,{beastId:b.id,reaction,expression});
}
export function beastsInterrupt(world,b){const state=world.resource('Beasts');
for(const w of state.economy.workers)if(w.beastPlayId===b.id){delete w.beastPlayId;if(w.state==='beast-playing')lifeIdle(state.economy.life,w);}ensureBeastCommands(b).playOrder=null;if(resourceHarvest(b.node)?.reservedBy===b.id)resourceHarvest(b.node).reservedBy=null;b.node=null;b.route=[];b.state='idle';b.vx=b.vz=0;b.wait=1;
}
export function beastsDamage(world,b,amount,cause='attack',source=null,{critical=false}={}){const state=world.resource('Beasts');
 if(amount>0&&curseFumbles(state.economy,source,cause))return false;

  if(isRivalBeast(state.economy,b))return damageRivalBeast(state.economy,b,amount,cause,source);
  if(!alive(b)||!(amount>0)||shieldBlocks(state.economy,b,cause))return false;
  const e=state.economy,applied=Math.min((actorVitality(b)?.health),amount);ensureActorVitality(b).health-=applied;ensureActorVitality(b).hurtAt=e.time;ensureActorVitality(b).lastDamageAt=e.time;if(source&&beastsEnemies(world).includes(source)){b.lastThreat={id:source.id,kind:beastEnemyKind(e,source),at:e.time};if((beastEffects(b)?.lullabyUntil)>e.time)ensureBeastEffects(b).lullabyUntil=0;if(b.state==='sleeping')beastsInterrupt(world,b);}
  e.emit('beast-hurt',null,null,{beastId:b.id,amount:applied,critical,cause});
  if((actorVitality(b)?.health)===0){beastsInterrupt(world,b);if(b.cargo){survivalDrop(e.survival,b,b.cargo.kind,b.cargo.amount);b.cargo=null;}(Object.assign(ensureActorVitality(b),{dead:true,diedAt:e.time,deathCause:cause}),Object.assign(b,{state:'dead',divineHeld:false}));if(e.divine?.held?.id===b.id&&e.divine.held.kind==='beast')e.divine.held=null;e.emit('beast-died',null,null,{beastId:b.id});}
  return true;
 
}
export function beastsMove(world,b,dt){const state=world.resource('Beasts');

  const p=b.route[0];if(!p){b.vx=b.vz=0;return 'arrived';}
  const n=walkStep(b,p,dt*(b.state==='defense-bound'?BEAST_DEFENSE_RULES.combatSpeed:BEAST_RULES.speed),state.economy.heightAt,beastsObstacles(world));b.vx=(n.x-b.x)/dt;b.vz=(n.z-b.z)/dt;b.x=n.x;b.z=n.z;
  if(Math.abs(b.vx)>.05)b.facing=b.vx<0?'left':'right';else if(Math.abs(b.vz)>.05)b.facing=b.vz<0?'back':'front';
  if(n.blocked){b.route=[];return 'blocked';}if(n.done)b.route.shift();return b.route.length?'moving':'arrived';
 
}
export function beastsEnemies(world){const state=world.resource('Beasts');
return beastEnemies(state.economy);
}
export function beastsThreat(world,b){const state=world.resource('Beasts');
return beastThreat(state.economy,b,(beastCommands(b)?.guardOrder)?.until>state.economy.time&&beastWard(state.economy,(beastCommands(b)?.guardOrder)));
}
export function beastsFight(world,b,target,dt){const state=world.resource('Beasts');

  const e=state.economy;if(b.node||b.state==='sleeping'||b.state==='eating'||b.state==='playing'||b.state==='play-bound')beastsInterrupt(world,b);
  const kind=beastEnemyKind(e,target);if(b.targetId!==target.id||b.targetKind!==kind){b.repathAt=0;if(b.state==='defending')b.state='defense-bound';}b.targetId=target.id;b.targetKind=kind;
  if(distance(b,target)<=2.1){
   if(b.state!=='defending'){b.state='defending';b.route=[];b.clock.reset('fight');beastsCue(world,b,'determined','angry');}
   b.facing=target.x<b.x?'left':'right';
   for(const event of b.clock.advance(dt)){
    if(event==='contact'&&alive(target)&&!target.divineHeld&&distance(b,target)<2.3){noteBeastBehaviour(b,e,'protect',target.id);const ward=e.workers.find(w=>alive(w)&&(w.id===target.targetId||w.id===target.victimId));if(ward&&e.time>=(b.bondAfter??0)){beastEncounter(b,ward,e,.15,`${b.name} protected ${ward.name} from an attacker.`);b.bondAfter=e.time+15;}const critical=e.random()<.12;damageBeastEnemy(e,target,BEAST_RULES.damage*((beastEffects(b)?.rampageUntil)>e.time?BEAST_MIRACLE_RULES.rampageDamage:1)*(critical?1.5:1),b,{critical});}
    if(event==='finish')b.clock.reset('fight');
   }
  }else{
   b.state='defense-bound';if(e.time>=(b.repathAt??0)){b.repathAt=e.time+1.5;const route=beastAttackRoute((a,p)=>beastsRoute(world,a,p),b,target);b.route=route??[];if(!route){b.unreachableThreat={id:target.id,kind,until:e.time+3};beastsInterrupt(world,b);return;}}
   if(beastsMove(world,b,dt)==='blocked')b.repathAt=0;
  }
 
}
export function beastsLash(world,b,target,dt){const state=world.resource('Beasts');

  const e=state.economy;if(!alive(target)||(actorInterior(target)?.inside)||target.divineHeld||distance(b,target)>2.3){beastsInterrupt(world,b);return;}
  b.facing=target.x<b.x?'left':'right';
  for(const event of b.clock.advance(dt)){
   if(event==='contact'&&alive(target)&&distance(b,target)<2.3){
    noteBeastBehaviour(b,e,'lash',target.id);
    if(survivalDamage(e.survival,target,BEAST_RULES.lashDamage*((beastEffects(b)?.rampageUntil)>e.time?BEAST_MIRACLE_RULES.rampageDamage:1),'attack',b)){beastEncounter(b,target,e,-.45,`${b.name} lashed out and hurt ${target.name}.`);for(const w of e.workers.filter(w=>alive(w)&&w!==target&&!(actorInterior(w)?.inside)&&distance(w,b)<8)){const r=beastRelation(b,w);r.affinity=Math.max(-1,r.affinity-.08);r.meetings++;(ensureActorDivineResponse(w).memories)=[{text:`I saw ${b.name} hurt ${target.name}.`,at:e.time},...((actorDivineResponse(w)?.memories)??[])].slice(0,6);}}
   }
   if(event==='finish'){beastsInterrupt(world,b);b.thinkAt=e.time+12;beastsCue(world,b,'confused','worried');}
  }
 
}
export function beastsStartLash(world,b,target){const state=world.resource('Beasts');

  const e=state.economy;beastsInterrupt(world,b);b.state='lashing';b.targetId=target.id;b.targetKind='villager';b.clock.reset('fight');beastsCue(world,b,'grumpy','angry');
   rememberBeast(b,e,(beastEmotions(b)?.anger)>.5?((beastEmotions(b)?.emotionalReason)??'Overwhelmed by my feelings, I lost control.') :actorNeeds(b).hunger>75?'Hunger made me lose my temper.':e.time-((actorVitality(b)?.lastDamageAt)??-Infinity)<12?'Frightened and hurt, I lost my temper.':'I lost control of my temper.');
   for(const w of e.workers.filter(w=>alive(w)&&distance(w,b)<8)){w.localAlarmUntil=e.time+5;survivalAlert(e.survival,w);e.emit('divine-witness',w,null,{reaction:'surprise'});}
 
}
export function beastsDecide(world,b){const state=world.resource('Beasts');

  const e=state.economy,near=e.workers.filter(w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&distance(w,b)<2.1);
  if(near.length&&e.time>=((beastEmotions(b)?.emotionalLashAfter)??0)&&e.random()<beastLashChance(b,e)){
   beastsStartLash(world,b,near.find(w=>w.id===(beastEmotions(b)?.emotionalTargetId))??near[Math.min(near.length-1,Math.floor(e.random()*near.length))]);return;
  }
  if(seekBeastCompany(e,b))return;
  const friend=near.filter(w=>w.state==='idle'||w.state==='alerted').sort((a,c)=>beastRelation(b,c).affinity-beastRelation(b,a).affinity)[0];
  if(friend&&e.random()<.2+(beastLearning(b)?.habits).company*.5+((beastLearning(b)?.temperament)==='playful'?.15:0)){
   beastEncounter(b,friend,e,.12,`${b.name} spent a gentle moment with ${friend.name}.`);noteBeastBehaviour(b,e,'company',friend.id);comfortBeastCompany(e,b,friend);actorNeeds(b).social=clamp(actorNeeds(b).social+15);actorNeeds(friend).social=clamp(actorNeeds(friend).social+8);beastsCue(world,b,'love','happy');e.emit('divine-witness',friend,null,{reaction:'delight'});b.wait=4;return;
  }
  if(actorNeeds(b).hunger<65&&actorNeeds(b).energy>35&&e.random()<beastTraits(b).helpfulness&&beastsForage(world,b))return;
  // Patrol the village and familiar people. Beasts do not take worker jobs.
  const friends=e.workers.filter(w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld).sort((a,c)=>beastRelation(b,c).affinity-beastRelation(b,a).affinity);
  const preferred=beastPlacePreference(b,e),centre=preferred&&e.random()<.4?preferred:friends.length&&e.random()<.4?friends[0]:(actorResidence(b)?.home),angle=e.random()*Math.PI*2,p={x:centre.x+Math.cos(angle)*2.5,z:centre.z+Math.sin(angle)*2.5},route=beastsRoute(world,b,p);
  if(route){b.route=route;b.state='wandering';}else b.wait=3;
  if(e.random()<.3)beastsCue(world,b,'humming','happy');
 
}
export function beastsForage(world,b){const state=world.resource('Beasts');

  const e=state.economy;
  for(const node of e.nodes.filter(n=>resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.reservedBy==null&&!(resourceCondition(n)?.burningUntil>e.time)&&!resourceCondition(n)?.removed).sort((a,c)=>(distance(b,a)-beastResourcePreference(b,e,a.kind)*8)-(distance(b,c)-beastResourcePreference(b,e,c.kind)*8)).slice(0,3)){
   for(const side of [-1,1]){const point={x:node.x+side*Math.max(1.8,(node.radius??0)+1),z:node.z+.2},route=beastsRoute(world,b,point);if(!route)continue;resourceHarvest(node).reservedBy=b.id;b.node=node;b.route=route;b.state='outbound';return true;}
  }return false;
 
}
export function beastsUpdate(world,dt){const state=world.resource('Beasts');

  if(!(dt>0))return;const e=state.economy;updateBeastRites(e,dt);
  if((state.progress>=BEAST_RULES.sacrifices||currentBeastRite(e)?.phase==='ready')&&!beastsLiving(world)&&e.time>=state.retryAt){state.retryAt=e.time+5;beastsTrySummon(world);}
  // Finished death animations need no permanent render slot.
  for(const b of state.actors){initialiseBeastMind(b,e);updateBeastEmotions(e,b,dt);}
  for(const b of state.actors)if((actorVitality(b)?.dead)&&e.time-(actorVitality(b)?.diedAt)>=12)villageBeasts(state).remove(b);
  for(const b of state.actors){
   b.vx=b.vz=0;if((actorVitality(b)?.dead))continue;initialiseBeastMind(b,e);b.phase=(b.phase+dt*.35)%1;if(b.divineHeld)continue;
   actorNeeds(b).hunger=clamp(actorNeeds(b).hunger+dt/DAY_LENGTH_SECONDS*(b.state==='sleeping'?90:210));actorNeeds(b).energy=clamp(actorNeeds(b).energy-dt*.055);
   if(actorNeeds(b).hunger>=100&&b.state!=='eating'){const before=(actorDeprivation(b)?.starvingFor);ensureActorDeprivation(b).starvingFor+=dt;beastsDamage(world,b,(Math.max(0,(actorDeprivation(b)?.starvingFor)-12)-Math.max(0,before-12))*.8,'starvation');}else ensureActorDeprivation(b).starvingFor=0;
   if(actorNeeds(b).energy<=0&&b.state!=='sleeping'){const before=(actorDeprivation(b)?.exhaustedFor)??0;ensureActorDeprivation(b).exhaustedFor=before+dt;beastsDamage(world,b,(Math.max(0,(actorDeprivation(b)?.exhaustedFor)-15)-Math.max(0,before-15))*.65,'exhaustion');}else ensureActorDeprivation(b).exhaustedFor=0;
   if((actorVitality(b)?.dead))continue;if(b.state==='summoning'){if(e.time-b.bornAt>=2.5)b.state='idle';else continue;}
   if((beastEffects(b)?.lullabyUntil)&&updateBeastOrder(e,b,dt))continue;
   if((beastEffects(b)?.rampageUntil)>e.time&&b.state!=='lashing'&&e.time>=((beastEffects(b)?.rampageCheckAt)??0)){ensureBeastEffects(b).rampageCheckAt=e.time+2;const near=e.workers.filter(w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&distance(w,b)<2.1);if(near.length&&e.random()<(1-(beastLearning(b)?.training))*.45)beastsStartLash(world,b,near[Math.floor(e.random()*near.length)]);}
   if(b.state==='lashing'){beastsLash(world,b,e.workers.find(w=>w.id===b.targetId),dt);continue;}
   const target=beastsThreat(world,b);if(target){beastsFight(world,b,target,dt);continue;}
   if(['defending','defense-bound'].includes(b.state)){beastsInterrupt(world,b);b.targetId=null;beastsCue(world,b,'proud','happy');}
   if(updateBeastOrder(e,b,dt))continue;
   if(actorNeeds(b).energy<10&&b.state!=='sleeping'&&!(actorNeeds(b).hunger>58&&e.stock.food>0)){beastsInterrupt(world,b);b.state='sleeping';beastsCue(world,b,'sleepy','sleepy');}
   if(b.state==='sleeping'){actorNeeds(b).energy=clamp(actorNeeds(b).energy+dt*2.8);if(actorNeeds(b).hunger<60)ensureActorVitality(b).health=Math.min((actorVitality(b)?.maxHealth),(actorVitality(b)?.health)+dt*.45);if(actorNeeds(b).energy>=95||actorNeeds(b).hunger>=90&&e.stock.food>0)beastsInterrupt(world,b);continue;}
   if(b.state==='eating'){actorNeeds(b).hunger=clamp(actorNeeds(b).hunger-Math.min(dt,b.wait)*((actorFeeding(b)?.mealRate)??18));b.wait-=dt;if(b.wait<=0)beastsInterrupt(world,b);continue;}
   if(actorNeeds(b).hunger>58&&e.stock.food>0&&!refusingFood(e,b)&&b.state!=='meal-bound'&&e.time>=((actorFeeding(b)?.mealRetryAt)??0)){beastsInterrupt(world,b);const route=beastsStoreRoute(world,b);if(route){b.route=route;b.state='meal-bound';}else ensureActorFeeding(b).mealRetryAt=e.time+5;}
   if(b.state==='meal-bound'){if(refusingFood(e,b)){beastsInterrupt(world,b);continue;}const status=beastsMove(world,b,dt);if(status==='blocked'){beastsInterrupt(world,b);ensureActorFeeding(b).mealRetryAt=e.time+5;continue;}if(status==='arrived'){if(e.stock.food>0){const amount=Math.min(BEAST_RULES.meal,e.stock.food);e.stock.food-=amount;ensureActorFeeding(b).foodConsumed+=amount;ensureActorFeeding(b).mealRate=BEAST_RULES.mealFullness*(amount/BEAST_RULES.meal)/4;b.state='eating';b.wait=4;beastsCue(world,b,'delight','happy');}else beastsInterrupt(world,b);}continue;}
   if(actorNeeds(b).hunger>75&&e.time>=((actorFeeding(b)?.hungerCueAt)??0)){beastsCue(world,b,e.stock.food?'hungry':'empty-bowl','worried');ensureActorFeeding(b).hungerCueAt=e.time+20;}
   if(b.cargo&&b.state==='idle'){b.route=beastsStoreRoute(world,b)??[];if(b.route.length)b.state='returning';else {survivalDrop(e.survival,b,b.cargo.kind,b.cargo.amount);b.cargo=null;}}
   if(b.state==='returning'){const status=beastsMove(world,b,dt);if(status==='arrived'){if(b.cargo)e.stock[b.cargo.kind]+=b.cargo.amount;b.cargo=null;beastsInterrupt(world,b);beastsCue(world,b,'proud','happy');}else if(status==='blocked')beastsInterrupt(world,b);continue;}
   if(b.state==='outbound'){if(!b.node||resourceGrowth(b.node)?.state!=='ready'||resourceHarvest(b.node)?.reservedBy!==b.id){beastsInterrupt(world,b);continue;}const status=beastsMove(world,b,dt);if(status==='arrived'){b.state='working';b.facing=b.node.x<b.x?'left':'right';b.clock.reset(b.node.kind==='food'?'harvest':b.node.kind==='stone'?'mine':'chop');}else if(status==='blocked')beastsInterrupt(world,b);continue;}
   if(b.state==='working'){
    const node=b.node;if(!node||resourceGrowth(node)?.state!=='ready'||resourceHarvest(node)?.reservedBy!==b.id){beastsInterrupt(world,b);continue;}
    for(const event of b.clock.advance(dt)){
     if(event==='contact'){resourceHarvest(node).hits=(resourceHarvest(node)?.hits??0)+1;e.emit('beast-work',null,node,{beastId:b.id,kind:node.kind});}
     if(event==='finish'){if(resourceHarvest(node)?.hits>=(node.kind==='food'?1:3)){const kind=node.kind;beastsInterrupt(world,b);depleteResource(e,node);b.cargo={kind,amount:kind==='food'?2:3};e.emit('beast-gathered',null,node,{beastId:b.id,kind});}else b.clock.reset(b.clock.kind);}
    }continue;
   }
   if(guardBeast(e,b,dt))continue;
   if(b.state==='wandering'){if(beastsMove(world,b,dt)!=='moving')beastsInterrupt(world,b);continue;}
   b.wait-=dt;if(b.wait>0||e.time<b.thinkAt)continue;b.thinkAt=e.time+8;
   beastsDecide(world,b);
  }
 
}
export function beastsSnapshot(world){const state=world.resource('Beasts');
return {progress:state.progress,required:BEAST_RULES.sacrifices,summons:state.summons,actors:state.actors.map(b=>({id:b.id,name:b.name,temperament:(beastLearning(b)?.temperament),trust:(beastLearning(b)?.trust),training:(beastLearning(b)?.training),foodConsumed:(actorFeeding(b)?.foodConsumed),culture:b.culture,state:b.state,health:(actorVitality(b)?.health),x:b.x,z:b.z,dead:(actorVitality(b)?.dead)}))};
}
