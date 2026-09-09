import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {curseFumbles} from '../../village-curse.js';
import {actorVitality,ensureActorVitality} from '../actor-vitality.js';
import {survivalDamage} from '../../village-survival.js';
import {enemyEntities} from '../../ecs/enemy-entities.js';
import {dangerRefresh} from '../../village-danger.js';

import {chapterQuiet} from '../../village-chapters.js';
import {shieldBlocks} from '../../divine-interventions.js';
import {dropEnemyLoot} from '../../enemy-loot.js';
import {DEATH_SECONDS} from '../../death-motion.js';
import {ENEMY_FADE_SECONDS} from '../../enemy-fade.js';

import {isAlive} from '../../village-survival.js';
import {SLIME_TYPES,SLIME_RULES,slimeFlightHeight} from '../../village-slimes.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=t=>Math.max(0,Math.min(1,t));
export function slimeRoll(world,a,b){const state=world.resource('Slimes');
return a+(b-a)*state.economy.random()
}
export function slimeCue(world,r,type,extra={}){const state=world.resource('Slimes');
state.economy.emit(type,null,null,{slimeId:r.id,...extra})
}
export function slimeSupported(world,x,z,radius=.34,obstacles=world.resource('Slimes').economy.obstacles()){const state=world.resource('Slimes');

  const e=state.economy,b=state.bounds,h=e.heightAt(x,z);
  if(x-radius<b.left+.7||x+radius>b.right-.7||z-radius<b.back+1.4||z+radius>b.front-.7||h===null||!Number.isFinite(h))return false;
  for(const [dx,dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){const y=e.heightAt(x+dx,z+dz);if(y===null||!Number.isFinite(y)||Math.abs(y-h)>.25)return false}
  return !obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+radius);
 
}
export function slimeClear(world,a,b,radius,obstacles=world.resource('Slimes').economy.obstacles()){const state=world.resource('Slimes');

  const n=Math.max(1,Math.ceil(dist(a,b)/.18));let previous=state.economy.heightAt(a.x,a.z);
  for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,h=state.economy.heightAt(x,z);if(!slimeSupported(world,x,z,radius,obstacles)||Math.abs(h-previous)>.25)return false;previous=h}return true;
 
}
export function slimeSpawn(world,position,generation='normal',{parent=null,flight=null}={}){const state=world.resource('Slimes');

  const e=state.economy,def=SLIME_TYPES[generation];
  if(!parent&&state.enemies.some(r=>!(actorVitality(r)?.dead)&&!r.gone))return null;
  if(!def||state.enemies.filter(r=>!(actorVitality(r)?.dead)&&!r.gone).length>=SLIME_RULES.maxAlive||!slimeSupported(world,position.x,position.z,.34*def.scale))return null;
  const r={id:'slime-'+state.nextId++,species:'slime',generation,name:def.name,x:position.x,z:position.z,home:(actorResidence(parent)?.home)??{...position},health:def.health,maxHealth:def.health,scale:def.scale,radius:.34*def.scale,state:flight?'airborne':'emerging',bornAt:e.time,expiresAt:parent?.expiresAt??e.time+SLIME_RULES.lifetime,parentId:parent?.id??null,familyId:parent?.familyId??null,vx:0,vz:0,lift:0,heading:slimeRoll(world,0,Math.PI*2),wanderAt:e.time+slimeRoll(world,2,5),attackAt:0,windup:0,scanAt:0,targetId:null,lastCombatAt:parent?.lastCombatAt??-Infinity,flight};
  r.familyId??=r.id;enemyEntities(state,'Slime').add(r);slimeCue(world,r,flight?'slime-launched':'slime-arrived');return r;
 
}
export function slimeTrySpawn(world){const state=world.resource('Slimes');

  const e=state.economy,b=state.bounds,obstacles=e.obstacles(),living=e.workers.filter(isAlive),generation=e.random()<.18?'large':'normal';
  if(!living.length)return null;
  for(let i=0;i<64;i++){
   const p={x:slimeRoll(world,b.left+2,b.right-2),z:slimeRoll(world,b.back+2,b.front-2)};
   if(!slimeSupported(world,p.x,p.z,.34*SLIME_TYPES[generation].scale,obstacles)||living.some(w=>dist(w,p)<6)||[e.depot,...e.life.homes].some(h=>dist(h,p)<7)||e.campfire&&dist(e.campfire,p)<5)continue;
   const r=slimeSpawn(world,p,generation);if(r){state.encounters++;return r}
  }return null;
 
}
export function slimeThreatFor(world,w){const state=world.resource('Slimes');

  if(w.divineHeld||(actorInterior(w)?.inside)||!isAlive(w))return null;let best=null,gap=SLIME_RULES.assist;
  for(const r of state.enemies){const d=dist(w,r);if(r.divineHeld||(actorVitality(r)?.dead)||r.gone||['airborne','emerging','fading'].includes(r.state)||d>=gap||!(r.targetId!==null||state.economy.time-r.lastCombatAt<6))continue;
   if(!slimeClear(world,r,w,.16))continue;best=r;gap=d;
  }return best;
 
}
export function slimeDamage(world,r,amount,worker,{critical=false,divine=false,cause=divine?'god-wish':'attack'}={}){const state=world.resource('Slimes');
 if(amount>0&&curseFumbles(state.economy,worker,cause))return false;

  if(!(amount>0)||(actorVitality(r)?.dead)||r.gone||!divine&&['airborne','emerging','fading'].includes(r.state))return false;
  const e=state.economy;if(shieldBlocks(e,r,cause))return false;const previous=(actorVitality(r)?.health);ensureActorVitality(r).health=Math.max(0,(actorVitality(r)?.health)-amount);ensureActorVitality(r).hurtAt=e.time;r.lastCombatAt=e.time;
  if(worker){r.targetId=worker.id;const d=dist(r,worker)||1;r.vx=(r.x-worker.x)/d*2;r.vz=(r.z-worker.z)/d*2}
  slimeCue(world,r,'slime-hurt',{amount:previous-(actorVitality(r)?.health),critical});
  if((actorVitality(r)?.health)>0)return true;
  ensureActorVitality(r).dead=true;r.state='dead';ensureActorVitality(r).diedAt=e.time;r.vx=r.vz=0;dropEnemyLoot(e,r);slimeCue(world,r,'slime-defeated',{defenderId:worker?.id});
  const child=divine?null:SLIME_TYPES[r.generation].child;
  if(child){
   const angle=slimeRoll(world,0,Math.PI*2),radius=.34*SLIME_TYPES[child].scale,obstacles=e.obstacles();
   for(const side of [0,Math.PI]){
    const a=angle+side,to={x:r.x,z:r.z};
    for(let d=.12;d<=1.6*r.scale;d+=.12){const p={x:r.x+Math.cos(a)*d,z:r.z+Math.sin(a)*d};if(!slimeClear(world,to,p,radius,obstacles))break;Object.assign(to,p)}
    slimeSpawn(world,{x:r.x,z:r.z},child,{parent:r,flight:{from:{x:r.x,z:r.z},to,startedAt:e.time}});
   }
   slimeCue(world,r,'slime-split');
  }else if(!state.enemies.some(q=>!(actorVitality(q)?.dead)&&!q.gone&&q.familyId===r.familyId)){
   e.emit('slime-family-cleared',worker);state.nextAt=e.time+slimeRoll(world,state.intervalMin,state.intervalMax);
  }
  dangerRefresh(e);
  return true;
 
}
export function slimeMove(world,r,dt,obstacles){const state=world.resource('Slimes');

  // Small bounded sweeps and axis sliding retain inertia without pathfinding
  // every slime every frame, and cannot tunnel through trees or over cliffs.
  const n=Math.max(1,Math.ceil(Math.hypot(r.vx,r.vz)*dt/.07));
  for(let i=0;i<n;i++){
   const dx=r.vx*dt/n,dz=r.vz*dt/n,origin={x:r.x,z:r.z};
   if(slimeClear(world,origin,{x:r.x+dx,z:r.z+dz},r.radius,obstacles)){r.x+=dx;r.z+=dz;continue}
   if(slimeClear(world,origin,{x:r.x+dx,z:r.z},r.radius,obstacles))r.x+=dx;else r.vx*=-.45;
   if(slimeClear(world,r,{x:r.x,z:r.z+dz},r.radius,obstacles))r.z+=dz;else r.vz*=-.45;
   r.heading=Math.atan2(r.vz,r.vx);
  }
 
}
export function slimeUpdate(world,dt){const state=world.resource('Slimes');

  if(!(dt>0))return;const e=state.economy,obstacles=e.obstacles(),outdoors=[...e.workers,...(e.beasts?.actors??[])].filter(w=>isAlive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld);
  for(const r of state.enemies)if(r.gone)enemyEntities(state,'Slime').remove(r);
  if(e.time>=state.nextAt&&!state.enemies.length){const r=chapterQuiet(e)||e.raids?.alarmUntil>e.time||(e.recovery?.quietUntil??0)>e.time?null:slimeTrySpawn(world);state.nextAt=e.time+(r?slimeRoll(world,state.intervalMin,state.intervalMax):30)}
  for(const r of state.enemies){
   if((actorVitality(r)?.dead)){if(e.time-(actorVitality(r)?.diedAt)>DEATH_SECONDS)r.gone=true;continue}
   if(r.divineHeld){r.vx=r.vz=0;continue}
   if(r.state==='fading'){if(e.time-r.fadeAt>ENEMY_FADE_SECONDS)r.gone=true;continue}
   if(e.time>r.expiresAt&&e.time-r.lastCombatAt>10){r.state='fading';r.fadeAt=e.time;continue}
   if(r.flight){const t=clamp((e.time-r.flight.startedAt)/SLIME_RULES.flightDuration),{from,to}=r.flight;
    r.x=from.x+(to.x-from.x)*t;r.z=from.z+(to.z-from.z)*t;r.lift=slimeFlightHeight(t);
    if(t>=1){r.flight=null;r.state='wander';r.lift=0;r.landedAt=e.time;slimeCue(world,r,'slime-landed')}continue;
   }
   if(r.state==='emerging'){if(e.time-r.bornAt<.65)continue;r.state='wander'}
   const def=SLIME_TYPES[r.generation];
   if(e.time>=r.scanAt){
    r.scanAt=e.time+.3;const previous=r.targetId;
    const target=outdoors.filter(w=>dist(w,r)<SLIME_RULES.notice&&(dist(w,(actorResidence(r)?.home))<SLIME_RULES.leash)&&slimeClear(world,r,w,.16,obstacles)).sort((a,b)=>dist(a,r)-dist(b,r))[0];
    r.targetId=target?.id??null;if(target){r.lastCombatAt=e.time;if(previous===null&&(r.cueAt??0)<=e.time){slimeCue(world,r,'slime-noticed');r.cueAt=e.time+15}}
   }
   const target=outdoors.find(w=>w.id===r.targetId);let dx=0,dz=0;
   if(target){
    r.lastCombatAt=e.time;const d=dist(r,target),reach=.85+r.radius;
    if(d<=reach){
     r.state='attacking';if(e.time>=r.attackAt){r.windup+=dt;if(r.windup>=SLIME_RULES.windup){
      if(isAlive(target)&&!(actorInterior(target)?.inside)&&dist(r,target)<=reach+.15&&slimeClear(world,r,target,.16,obstacles)){survivalDamage(e.survival,target,def.damage,'attack',r);slimeCue(world,r,'slime-contact')}
      r.windup=0;r.attackAt=e.time+SLIME_RULES.cooldown;
     }}
    }else{r.state='chase';r.windup=0;dx=(target.x-r.x)/d*def.speed;dz=(target.z-r.z)/d*def.speed}
   }else{
    r.state='wander';r.windup=0;
    if(dist(r,(actorResidence(r)?.home))>3.5)r.heading=Math.atan2((actorResidence(r)?.home).z-r.z,(actorResidence(r)?.home).x-r.x);
    else if(e.time>=r.wanderAt){r.heading+=slimeRoll(world,-1.4,1.4);r.wanderAt=e.time+slimeRoll(world,2,5)}
    dx=Math.cos(r.heading)*def.speed*.48;dz=Math.sin(r.heading)*def.speed*.48;
   }
   if(e.time-((actorVitality(r)?.hurtAt)??-Infinity)>.12){const gain=1-Math.exp(-dt*5);r.vx+=(dx-r.vx)*gain;r.vz+=(dz-r.vz)*gain}
   slimeMove(world,r,dt,obstacles);
  }
 
}
export function slimeSnapshot(world){const state=world.resource('Slimes');
return {nextAt:state.nextAt,encounters:state.encounters,enemies:state.enemies.map(r=>({id:r.id,generation:r.generation,parentId:r.parentId,familyId:r.familyId,x:r.x,z:r.z,health:(actorVitality(r)?.health),state:r.state,lift:r.lift,dead:!!(actorVitality(r)?.dead),gone:!!r.gone,targetId:r.targetId}))}
}
