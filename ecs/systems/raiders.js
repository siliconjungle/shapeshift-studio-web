import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {updateMimic} from '../../village-mimics.js';
import {depleteResource} from "../../village-resources.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {curseFumbles} from '../../village-curse.js';
import {actorVitality,ensureActorVitality} from '../actor-vitality.js';
import {survivalAlert,survivalDamage} from '../../village-survival.js';
import {personAge} from '../person-age.js';
import {enemyEntities} from '../../ecs/enemy-entities.js';
import {dangerRefresh} from '../../village-danger.js';
import {ACTION_DURATION,CONTACT_PHASE} from '../../action-timing.js';
import {initialiseCombatStyle,isArcher,clearArrowShot,launchArrow,ARCHERY_RULES} from '../../village-archery.js';

import {chapterQuiet} from '../../village-chapters.js';
import {resolveCulture} from '../../village-cultures.js';
import {shieldBlocks} from '../../divine-interventions.js';
import {spawnRaid,siegeStep,SIEGE_RULES} from '../../village-siege.js';
import {dropEnemyLoot} from '../../enemy-loot.js';
import {DEATH_SECONDS} from '../../death-motion.js';
import {ENEMY_FADE_SECONDS} from '../../enemy-fade.js';
import {isAlive,SURVIVAL_RULES} from '../../village-survival.js';
import {RAID_RULES,isRaidNight} from '../../village-raids.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function raiderCue(world,r,type,extra={}){const state=world.resource('Raids');
state.economy.emit(type,null,null,{raiderId:r.id,...extra})
}
export function raiderSpawn(world,position=world.resource('Raids').entrances[world.resource('Raids').nextId%world.resource('Raids').entrances.length]){const state=world.resource('Raids');

  const r={id:state.nextId++,kind:resolveCulture(state.economy.culture).raider,x:position.x,z:position.z,entrance:{...position},health:RAID_RULES.health,maxHealth:RAID_RULES.health,state:'sneaking',route:[],phase:0,facing:'right',cargo:null,clock:0,repathAt:0,bornAt:state.economy.time,attackAt:0,intent:['crops','hunt','mischief','siege'][(state.nextId-1)%4]};
  enemyEntities(state,'Raider').add(r);initialiseCombatStyle(r,state.economy.random);raiderCue(world,r,'raider-arrived');return r;
 
}
export function raiderAlarm(world,r){const state=world.resource('Raids');
const e=state.economy;state.alarmUntil=e.time+RAID_RULES.alarmDuration;for(const w of e.workers)if(isAlive(w))survivalAlert(e.survival,w);if(!r.spotted){r.spotted=true;raiderCue(world,r,'raider-spotted')}
}
export function raiderFlee(world,r){const state=world.resource('Raids');
if((actorVitality(r)?.dead)||r.gone||r.state==='departing'||r.state==='fleeing')return;r.state='fleeing';r.route=[];r.repathAt=0;r.fleeAt=state.economy.time;raiderCue(world,r,'raider-afraid');dangerRefresh(state.economy)
}
export function raiderDamage(world,r,amount,worker,{critical=false,divine=false,cause=divine?'god-wish':'attack'}={}){const state=world.resource('Raids');
 if(amount>0&&curseFumbles(state.economy,worker,cause))return false;
if((actorVitality(r)?.dead)||r.gone||!divine&&r.state==='departing')return;if(shieldBlocks(state.economy,r,cause))return false;const previous=(actorVitality(r)?.health);ensureActorVitality(r).health=Math.max(0,(actorVitality(r)?.health)-amount);ensureActorVitality(r).hurtAt=state.economy.time;raiderCue(world,r,'raider-hurt',{amount:previous-(actorVitality(r)?.health),critical});raiderAlarm(world,r);
  if((actorVitality(r)?.health)===0){ensureActorVitality(r).dead=true;r.state='dead';ensureActorVitality(r).diedAt=state.economy.time;r.route=[];dropEnemyLoot(state.economy,r);raiderCue(world,r,'raider-defeated',{defenderId:worker?.id})}
  else if((actorVitality(r)?.health)<=12&&r.kind!=='mimic')raiderFlee(world,r);
  dangerRefresh(state.economy);
 
}
export function raiderMove(world,r,target,dt){const state=world.resource('Raids');
const e=state.economy;if(e.time>=r.repathAt){r.route=e.route(r,target)??[];r.repathAt=e.time+1.3}if(!r.route.length)return dist(r,target)<.25?'arrived':'blocked';return e.move(r,dt)
}
export function raiderSpawnWave(world){const state=world.resource('Raids');
return spawnRaid(state)
}
export function raiderUpdate(world,dt){const state=world.resource('Raids');

  if(!(dt>0))return;
  const e=state.economy,night=isRaidNight(lifeClock(e.life).hour),living=[...e.workers,...(e.beasts?.actors??[])].filter(isAlive);
  if(night&&!state.wasNight){state.nightTime=0;state.spawned=false;state.nights++}
  state.wasNight=night;
  if(night){state.nightTime+=dt;if(!state.spawned&&state.nightTime>=state.delay&&living.length&&!chapterQuiet(e)&&e.time>=(e.recovery?.quietUntil??0)){state.spawned=true;raiderSpawnWave(world)}}
  for(const squad of state.squads??[]){const members=state.enemies.filter(r=>r.squadId===squad.id&&!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld);squad.contested=living.some(w=>!w.divineHeld&&!(actorInterior(w)?.inside)&&!(personAge(w)?.child)&&(actorVitality(w)?.health)>=28&&members.some(r=>dist(w,r)<SIEGE_RULES.sight));}
  for(const r of state.enemies){
   if(r.weapon==='sword'||r.variant==='veteran'){delete r.weapon;delete r.variant;ensureActorVitality(r).maxHealth=RAID_RULES.health;ensureActorVitality(r).health=Math.min((actorVitality(r)?.health),RAID_RULES.health);}
   r.vx=r.vz=0;r.phase=(r.phase+dt*(r.state==='fleeing'?.95:.65))%1;
   if((actorVitality(r)?.dead)){if(e.time-(actorVitality(r)?.diedAt)>DEATH_SECONDS)r.gone=true;continue}if(r.gone||r.divineHeld)continue;
   if(r.kind==='mimic'){updateMimic(state,r,dt);continue;}
   if(r.state==='departing'){if(e.time-r.departedAt>=ENEMY_FADE_SECONDS)r.gone=true;continue;}
   if(!night||!living.length)raiderFlee(world,r);
   if(r.state==='fleeing'){if(raiderMove(world,r,r.entrance,dt)==='arrived'||e.time-r.fleeAt>24){r.state='departing';r.departedAt=e.time;raiderCue(world,r,'raider-escaped',{cargo:r.cargo})}continue}
   const outdoors=living.filter(w=>!(actorInterior(w)?.inside)&&!w.divineHeld),near=outdoors.filter(w=>dist(w,r)<(isArcher(r)?ARCHERY_RULES.range:3.8)).sort((a,b)=>dist(a,r)-dist(b,r));
   if(near.length)raiderAlarm(world,r);
   const victim=near.find(w=>!(personAge(w)?.child)&&(actorVitality(w)?.health)>=28)??near[0];r.victimId=victim?.id??null;
   if(victim){
    if(r.state!=='attacking'){r.state='attacking';r.windup=0;r.repathAt=0;raiderCue(world,r,'raider-angry')}
    r.facing=victim.x<r.x?'left':'right';
    if(isArcher(r)&&clearArrowShot(e,r,victim)){r.route=[];if(e.time>=r.attackAt){r.windup=(r.windup??0)+dt;if(r.windup>=ACTION_DURATION.shoot*CONTACT_PHASE.shoot){launchArrow(e,r,victim,'raider',victim.species==='beast'?'beast':'villager',{critical:e.random()<SURVIVAL_RULES.criticalChance});r.hitAt=e.time;r.windup=0;r.attackAt=e.time+ACTION_DURATION.shoot*(1-CONTACT_PHASE.shoot);}}continue;}
    if(!isArcher(r)&&dist(r,victim)<=1.6){r.route=[];if(e.time>=r.attackAt){r.windup+=dt;if(r.windup>=RAID_RULES.windup){if(!(actorInterior(victim)?.inside)&&isAlive(victim)&&dist(r,victim)<=1.8){const critical=e.random()<SURVIVAL_RULES.criticalChance;survivalDamage(e.survival,victim,RAID_RULES.damage*(critical?SURVIVAL_RULES.criticalMultiplier:1),'attack',r,{critical})}r.hitAt=e.time;r.windup=0;r.attackAt=e.time+RAID_RULES.cooldown}}}
    else{r.windup=0;const a=Math.atan2(r.z-victim.z,r.x-victim.x);raiderMove(world,r,{x:victim.x+Math.cos(a)*1.2,z:victim.z+Math.sin(a)*1.2},dt)}
    continue;
   }
   if(r.state==='attacking'){r.state='sneaking';r.windup=0;r.repathAt=0;r.target=null}
   if(r.intent==='siege'&&siegeStep(state,r,dt))continue;
   if(r.intent==='hunt'){const prey=outdoors.sort((a,b)=>dist(a,r)-dist(b,r))[0],destination=prey??e.life.homes[0];if(destination){if(!prey){if(siegeStep(state,r,dt))continue;}else{raiderMove(world,r,destination,dt);continue}}}
   if(r.intent==='mischief'&&e.campfire?.lit){const fire=e.campfire,angle=Math.atan2(r.z-fire.z,r.x-fire.x),spot={x:fire.x+Math.cos(angle)*1.5,z:fire.z+Math.sin(angle)*1.5};if(dist(r,fire)>1.7){raiderMove(world,r,spot,dt);continue}r.clock+=dt;if(r.clock<2)continue;fire.lit=false;fire.extinguished++;raiderCue(world,r,'raider-mischief');raiderAlarm(world,r);raiderFlee(world,r);continue}
   let node=r.target;
   if(node&&(resourceGrowth(node)?.state!=='ready'||resourceHarvest(node)?.reservedBy!==null)){r.target=null;r.clock=0;node=null}
   if(!node){node=e.nodes.filter(n=>n.kind==='food'&&resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.reservedBy===null&&(resourceHarvest(n)?.raidRetryAt??0)<=e.time).sort((a,b)=>dist(a,r)-dist(b,r))[0];r.target=node;r.clock=0}
   const target=node?{x:node.x-.85,z:node.z+.15}:e.depot;
   if(dist(r,target)>.3){const status=raiderMove(world,r,target,dt);if(status==='blocked'&&node){resourceHarvest(node).raidRetryAt=e.time+8;r.target=null}continue}
   if(r.state!=='stealing'){r.state='stealing';raiderCue(world,r,'raider-stealing')}r.clock+=dt;if(r.clock<2)continue;
   if(node&&resourceGrowth(node)?.state==='ready'&&resourceHarvest(node)?.reservedBy===null){depleteResource(e,node);resourceHarvest(node).hits=1;r.cargo={kind:'food',amount:2};e.emit('raider-stole-crop',null,node,{raiderId:r.id,kind:'food',amount:2})}
   else if(e.stock.food>0){const amount=Math.min(2,e.stock.food);e.stock.food-=amount;r.cargo={kind:'food',amount};raiderCue(world,r,'raider-stole-stock',{kind:'food',amount})}
   else if(e.stock.wood>0){e.stock.wood--;r.cargo={kind:'wood',amount:1};raiderCue(world,r,'raider-stole-stock',{kind:'wood',amount:1})}
   else if(e.campfire?.lit){e.campfire.lit=false;e.campfire.extinguished++;raiderCue(world,r,'raider-mischief')}
   raiderAlarm(world,r);raiderFlee(world,r);
  }
  if(state.squads)state.squads=state.squads.filter(s=>state.enemies.some(r=>r.squadId===s.id&&!r.gone));
  for(const r of state.enemies)if(r.gone&&!(e.time-((actorVitality(r)?.diedAt)??r.fleeAt??e.time)<3))enemyEntities(state,'Raider').remove(r);
 
}
export function raiderSnapshot(world){const state=world.resource('Raids');
return {alarm:state.alarmUntil>state.economy.time,nights:state.nights,squads:(state.squads??[]).map(s=>({...s})),enemies:state.enemies.map(r=>({id:r.id,x:r.x,z:r.z,state:r.state,health:(actorVitality(r)?.health),maxHealth:(actorVitality(r)?.maxHealth)??36,squadId:r.squadId,buildingId:r.buildingId,dead:!!(actorVitality(r)?.dead),gone:!!r.gone,cargo:r.cargo?{...r.cargo}:null}))}
}
