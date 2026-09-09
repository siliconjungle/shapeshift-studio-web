import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {housingSites} from './../housing-state.js';
import {farmingSites} from '../farming-state.js';
import {MIMIC_RULES,revealMimic} from '../../village-mimics.js';
import {releaseWork} from "../../village-resources.js";
import {resourceGrowth} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {actorSleep} from "../daily-activity-actors.js";
import {addEnvironmentRecords,replaceEnvironmentRecords} from '../../ecs/environment-entities.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDrop,survivalRecover} from '../../village-survival.js';
import {personAge} from '../person-age.js';
import {watchParticipant} from '../watch-participants.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {dangerRisk} from '../../village-danger.js';
import {pingWorkPenalty} from '../../village-pings.js';

import {exploredAt,explorationFrontiers} from '../../village-exploration.js';
import {noticeFindings,claimFinding} from '../../village-findings.js';
import {declinedDivineRequest} from '../../village-divine-request.js';

import {canWalkAt} from '../../village-walking.js';
import {standingRoom} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {DISCOVERY_RULES} from '../../village-discovery.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const states=new Set(['discovery-bound','discovering','treasure-wait','scouting','finding-bound','finding-study']);
export function discoveryClear(world,p,radius=.75){const state=world.resource('Discovery');
const e=state.economy,b=state.bounds;return p.x>b.left+1&&p.x<b.right-1&&p.z>b.back+1&&p.z<b.front-1&&canWalkAt(p.x,p.z,e.heightAt,e.obstacles())&&[[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>Number.isFinite(e.heightAt(p.x+dx,p.z+dz))&&Math.abs(e.heightAt(p.x+dx,p.z+dz)-e.heightAt(p.x,p.z))<.15)&&!e.obstacles().some(o=>distance(p,o)<o.radius+radius)&&!e.nodes.some(n=>n.kind==='wood'&&resourceGrowth(n)?.state!=='depleted'&&distance(p,n)<2.6)&&[e.depot,...(e.life?.homes??[])].every(h=>distance(h,p)>DISCOVERY_RULES.minimumDistance)&&!(housingSites(e.housing)?.sites??[]).some(h=>distance(h,p)<4)&&!(farmingSites(e.farming)?.sites??[]).some(h=>distance(h,p)<3)
}
export function discoverySpawn(world){const state=world.resource('Discovery');

  const e=state.economy,b=state.bounds;if(state.chests.filter(c=>c.openedAt===null).length>=DISCOVERY_RULES.maxChests)return null;
  let routes=0;for(let i=0;i<45;i++){
   const p={x:b.left+2+e.random()*(b.right-b.left-4),z:b.back+2+e.random()*(b.front-b.back-4)};
   if(!discoveryClear(world,p)||state.chests.some(c=>distance(c,p)<DISCOVERY_RULES.spacing))continue;
   if(++routes>2)return null;if(!e.route(e.depot,{x:p.x,z:p.z+1.1}))continue;
   const locked=state.nextId>0&&e.random()<DISCOVERY_RULES.lockedChance;
   const mimic=!!e.raids&&state.opened>0&&state.chests.filter(c=>c.mimic&&c.openedAt===null).length+(e.raids.enemies??[]).filter(r=>r.kind==='mimic'&&!actorVitality(r)?.dead&&!r.gone).length<MIMIC_RULES.maxAlive&&e.random()<MIMIC_RULES.chance;
   const chest={id:'chest-'+state.nextId++,...p,locked,mimic,createdAt:e.time,openedAt:null,reservedBy:null,retryAt:0};addEnvironmentRecords(state,chest);return chest;
  }return null;
 
}
export function discoveryKeysAvailable(world,chest=null){const state=world.resource('Discovery');
return (state.economy.stock.key??0)-state.chests.filter(c=>c!==chest&&c.locked&&c.openedAt===null&&c.reservedBy!==null).length
}
export function discoverySpawnKey(world){const state=world.resource('Discovery');

  const e=state.economy,b=state.bounds,drops=e.survival?.drops??[];
  const loose=drops.filter(d=>d.kind==='key');
  if(!e.survival||loose.length>=DISCOVERY_RULES.maxLooseKeys||(e.stock.key??0)+loose.reduce((n,d)=>n+d.amount,0)+e.workers.reduce((n,w)=>n+(w.cargo?.kind==='key'?w.cargo.amount:0),0)>=DISCOVERY_RULES.maxKeys)return null;
  for(let i=0,routes=0;i<35;i++){
   const p={x:b.left+2+e.random()*(b.right-b.left-4),z:b.back+2+e.random()*(b.front-b.back-4)};
   if(!discoveryClear(world,p)||loose.some(d=>distance(d,p)<8)||state.chests.some(c=>distance(c,p)<3))continue;
   if(++routes>2)return null;if(!e.route(e.depot,p))continue;
   return survivalDrop(e.survival,p,'key',1);
  }return null;
 
}
export function discoveryUpdate(world){const state=world.resource('Discovery');
const e=state.economy;noticeFindings(e);state.nextKeySpawn??=e.time+DISCOVERY_RULES.keyFirstSpawn;if(e.time>=state.nextKeySpawn){discoverySpawnKey(world);state.nextKeySpawn=e.time+DISCOVERY_RULES.keyRespawn}replaceEnvironmentRecords(state,state.chests.filter(c=>c.openedAt===null||e.time-c.openedAt<5));if(e.time>=state.nextSpawn){discoverySpawn(world);state.nextSpawn=e.time+(state.chests.filter(c=>c.openedAt===null).length<2?10:DISCOVERY_RULES.respawn)}
}
export function discoveryCapable(world,w){const state=world.resource('Discovery');
const e=state.economy;return !(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&!w.cargo&&(actorVitality(w)?.health)>55&&actorNeeds(w).energy>35&&actorNeeds(w).hunger<65&&actorNeeds(w).social>18&&!watchAssigned(e.life.watch,w)&&!((watchParticipant(w)?.sleepDebt)>0)&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)&&!(e.raids?.alarmUntil>e.time)
}
export function discoveryChoose(world,w,{nearby=false,chests=world.resource('Discovery').chests}={}){const state=world.resource('Discovery');

  const e=state.economy;if(!discoveryCapable(world,w)||!nearby&&((w.exploreAfter??0)>e.time||e.stock.food<2))return false;
  w.exploreAfter=e.time+18+e.random()*18;
  for(const f of (e.exploration?.finds??[]).filter(f=>f.seenAt!==null&&f.claimedAt===null&&f.reservedBy===null&&f.retryAt<=e.time&&(!nearby||distance(w,f)<4)).sort((a,b)=>distance(a,w)-distance(b,w))){
   const route=e.route(w,{x:f.x,z:f.z+1.2});if(!route){f.retryAt=e.time+30;continue}releaseWork(e,w);f.reservedBy=w.id;w.discoveryId=f.id;w.state='finding-bound';w.route=route;w.discoveryDeadline=e.time+75;w.wait=0;return true;
  }
  const candidates=chests.filter(c=>exploredAt(e,c.x,c.z)&&!declinedDivineRequest(e,w,'chest',c.id)&&c.openedAt===null&&c.reservedBy===null&&(!c.locked||discoveryKeysAvailable(world)>0)&&(nearby?distance(w,c)<=4:c.retryAt<=e.time)).sort((a,b)=>distance(a,w)-distance(b,w));
  for(const c of candidates.slice(0,2)){
   // Closer discoveries are immediate; distant outings are occasional and
   // require a fed village. Routes still pass through remembered-danger logic.
   if(distance(w,c)>9&&(e.stock.food<e.workers.filter(p=>!(actorVitality(p)?.dead)).length*2||e.random()>.38))continue;
   const point={x:c.x-.85,z:c.z+.25};if(!standingRoom(e,w,point))continue;
   const route=e.route(w,point);if(!route){c.retryAt=e.time+25;continue}
   releaseWork(e,w);c.reservedBy=w.id;w.discoveryId=c.id;w.state='discovery-bound';w.route=route;w.wait=0;w.discoveryDeadline=e.time+65;return true;
  }
  if(!nearby&&e.random()<.45){for(const p of explorationFrontiers(e,w)){if(pingWorkPenalty(e,p))continue;const route=e.route(w,p);if(!route||dangerRisk(e,w,p,route))continue;releaseWork(e,w);w.state='scouting';w.route=route;w.discoveryDeadline=e.time+35;w.wait=0;return true;}}
  return false;
 
}
export function discoveryInterrupt(world,w){const state=world.resource('Discovery');
const c=[...state.chests,...(state.economy.exploration?.finds??[])].find(c=>c.id===w.discoveryId);if(c?.reservedBy===w.id){c.reservedBy=null;c.retryAt=state.economy.time+6}w.discoveryId=null;if(states.has(w.state))releaseWork(state.economy,w);w.exploreAfter=state.economy.time+12
}
export function discoveryOpen(world,c,w){const state=world.resource('Discovery');

  if(c.openedAt!==null)return false;const e=state.economy;if(distance(c,w)>2||!discoveryCapable(world,w)||c.reservedBy!==w.id||c.locked&&!(e.stock.key>=1))return false;
  if(c.locked){e.stock.key--;e.emit('key-used',w,null,{kind:'key',amount:1,chestId:c.id})}
  if(c.mimic&&e.raids)return !!revealMimic(e,c,w);
  c.openedAt=e.time;c.reservedBy=null;state.opened++;
  const piles=3+Math.floor(e.random()*3),kinds=['food','wood','stone'];
  for(let i=0;i<piles;i++){
   const kind=kinds[Math.min(kinds.length-1,Math.floor(e.random()*kinds.length))],amount=1+Math.floor(e.random()*3),angle=e.random()*Math.PI*2;
   let point={x:c.x,z:c.z+1.1};
   for(let k=0;k<12;k++){const a=angle+k*.53,r=1.3+e.random()*.9,p={x:c.x+Math.cos(a)*r,z:c.z+Math.sin(a)*r};if(canWalkAt(p.x,p.z,e.heightAt,e.obstacles())&&e.route(w,p)){point=p;break}}
   const drop=survivalDrop(e.survival,point,kind,amount);Object.assign(drop,{bornAt:e.time,origin:{x:c.x,z:c.z},availableAt:e.time+.9});
  }
  if(!c.locked&&(state.opened===1||e.random()<.3)){const drop=survivalDrop(e.survival,{x:c.x,z:c.z+1.1},'key',1);Object.assign(drop,{bornAt:e.time,origin:{x:c.x,z:c.z},availableAt:e.time+.9})}
  e.emit('treasure-opened',w,null,{chestId:c.id,x:c.x,z:c.z,piles});w.discoveryId=null;releaseWork(e,w);w.state='treasure-wait';w.treasureWaitUntil=e.time+.95;w.wait=0;return true;
 
}
export function discoveryHandle(world,w,dt){const state=world.resource('Discovery');

  if(!states.has(w.state))return false;const e=state.economy;
  if(['scouting','finding-bound','finding-study'].includes(w.state)){
   if(!discoveryCapable(world,w)||e.time>w.discoveryDeadline){discoveryInterrupt(world,w);return false}
   if(w.state==='scouting'){const move=e.move(w,dt);if(move!=='moving'){if(move==='arrived')e.emit('exploration-arrived',w);releaseWork(e,w);w.exploreAfter=e.time+8;}return true;}
   const f=e.exploration?.finds.find(f=>f.id===w.discoveryId);if(!f||f.claimedAt!==null||f.reservedBy!==w.id){discoveryInterrupt(world,w);return false}
   if(w.state==='finding-study'){w.clock.advance(dt);if(e.time>=w.openUntil){claimFinding(e,f,w);releaseWork(e,w);w.discoveryId=null;}return true;}
   const status=e.move(w,dt);if(status==='blocked')discoveryInterrupt(world,w);else if(status==='arrived'){w.state='finding-study';w.clock.reset('harvest');w.openUntil=e.time+(f.kind==='camp'?3:5);w.facing=f.x<w.x?'left':'right';e.emit('treasure-found',w);}return true;
  }
  if(w.state==='treasure-wait'){if(!discoveryCapable(world,w)){discoveryInterrupt(world,w);return false}if(e.time>=w.treasureWaitUntil){releaseWork(e,w);survivalRecover(e.survival,w)}return true}
  const c=state.chests.find(c=>c.id===w.discoveryId);
  if(!c||c.openedAt!==null||c.reservedBy!==w.id||!discoveryCapable(world,w)||e.time>w.discoveryDeadline||c.locked&&discoveryKeysAvailable(world,c)<1){discoveryInterrupt(world,w);return false}
  if(w.state==='discovering'){if(e.time>=w.openUntil)discoveryOpen(world,c,w);return true}
  const status=e.move(w,dt);if(status==='blocked'){discoveryInterrupt(world,w);return true}if(status==='arrived'){w.state='discovering';w.openUntil=e.time+DISCOVERY_RULES.openSeconds;w.facing=c.x<w.x?'left':'right';e.emit('treasure-found',w)}return true;
 
}
export function discoverySnapshot(world){const state=world.resource('Discovery');
return {opened:state.opened,chests:state.chests.map(c=>({...c}))}
}
