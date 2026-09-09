import {SNAKE_RULES,SNAKE_NAMES,snakeState} from '../../village-snakes.js';
import {canWalkAt,walkStep,WALK_SPEED} from '../../village-walking.js';
import {visiblePeople} from '../../village-people.js';
import {applyPoison,poisoned} from '../../village-poison.js';
import {animalSpatial,animalMotion,animalLifecycle,snakeEncounter} from '../animal-state.js';
import {actorVitality} from '../actor-vitality.js';
import {actorInterior} from '../actor-interior.js';
import {snakeSchedule} from '../snake-state.js';
import {addAnimal} from '../animal-entities.js';
import {resourceGrowth,resourceCondition} from '../resource-state.js';
const dist=(a,b)=>{const p=animalSpatial(a)??a,q=animalSpatial(b)??b;return Math.hypot(p.x-q.x,p.z-q.z)},clamp=n=>Math.max(0,Math.min(1,n));
export function spawnSnake(world,p){const e=world.resource('Village');
 if(!SNAKE_NAMES[e.culture]||!p||![p.x,p.z].every(Number.isFinite)||!canWalkAt(p.x,p.z,e.heightAt,e.obstacles()))return null;
 const s=snakeState(e);if(s.animals.filter(a=>!animalLifecycle(a).gone).length>=SNAKE_RULES.max)return null;
 const a={id:'snake-'+snakeSchedule(s).nextId++,species:'snake',health:1,culture:e.culture,x:p.x,z:p.z,home:{x:p.x,z:p.z},state:'basking',bornAt:e.time,leaveAt:e.time+SNAKE_RULES.lifetime,waitUntil:e.time+3,biteAfter:e.time+2,phase:e.random(),facing:'right',speed:0,route:[],gone:false,dead:false};addAnimal(s,'animals',a);e.emit('snake-arrived',null,null,{snakeId:a.id,x:animalSpatial(a).x,z:animalSpatial(a).z});return a;
}
function wander(world,a,from=null){const e=world.resource('Village');
 const angle=from?Math.atan2(animalSpatial(a).z-from.z,animalSpatial(a).x-from.x):e.random()*Math.PI*2;
 for(const turn of [0,.8,-.8,1.6,-1.6]){const p={x:animalSpatial(a).x+Math.cos(angle+turn)*(from?3:2),z:animalSpatial(a).z+Math.sin(angle+turn)*(from?3:2)};if(!canWalkAt(p.x,p.z,e.heightAt,e.obstacles()))continue;const route=e.route(animalSpatial(a),p);if(route?.length){animalMotion(a).route=route;animalMotion(a).state=from?'retreating':'slithering';return true;}}
 animalMotion(a).state='basking';snakeEncounter(a).waitUntil=e.time+4;return false;
}
export function snakeOpacity(a,time){return snakeFade(animalLifecycle(a),time);}
export function snakeFade(life,time){return clamp((time-life.bornAt)/.6)*(life.leavingAt==null?1:clamp(1-(time-life.leavingAt)/2));}
export function updateSnakes(world,dt){const e=world.resource('Village');
 if(!(dt>0)||!e.snakes)return;const s=e.snakes;
 if(!SNAKE_NAMES[e.culture]){s.animals=[];return;}
 s.animals=s.animals.filter(a=>!animalLifecycle(a).gone);
 if(e.time>=snakeSchedule(s).nextAt){snakeSchedule(s).nextAt=e.time+SNAKE_RULES.interval;if(e.random()<SNAKE_RULES.chance){const cover=e.nodes.filter(n=>['wood','stone'].includes(n.kind)&&resourceGrowth(n)?.state==='ready'&&!resourceCondition(n)?.removed&&dist(n,e.depot)>5&&dist(n,e.depot)<38);if(cover.length){const n=cover[Math.floor(e.random()*cover.length)];for(const dx of [1.5,-1.5,2.5])if(spawnSnake(world,{x:n.x+dx,z:n.z+.7}))break;}}}
 for(const a of s.animals){animalMotion(a).speed=0;if(actorVitality(a).dead||e.time>=animalLifecycle(a).leaveAt){animalLifecycle(a).leavingAt??=e.time;animalMotion(a).state='departing';if(e.time-animalLifecycle(a).leavingAt>=2)animalLifecycle(a).gone=true;continue;}
  const fire=[...(e.shelter?.fires??[]),...(e.lightning?.fires??[])].some(f=>f.until>e.time&&dist(a,f)<1.8);if(fire){actorVitality(a).dead=true;continue;}
  const target=visiblePeople(e).filter(w=>!actorVitality(w)?.dead&&!actorInterior(w)?.inside&&!w.divineHeld&&!w.flight&&!poisoned(w,e.time)&&dist(a,w)<SNAKE_RULES.biteRange).sort((x,y)=>dist(a,x)-dist(a,y))[0];
  if(animalMotion(a).state==='warning'){
   const victim=visiblePeople(e).find(w=>w.id===snakeEncounter(a).targetId);
   if(!victim||actorVitality(victim)?.dead||actorInterior(victim)?.inside||victim.divineHeld||dist(a,victim)>1.5){snakeEncounter(a).biteAfter=e.time+4;delete snakeEncounter(a).targetId;wander(world,a,victim);continue;}
   if(e.time-snakeEncounter(a).warningAt>=SNAKE_RULES.warning){if(applyPoison(e,victim,'snake')){snakeEncounter(a).struckAt=e.time;e.emit('snake-bite',victim,null,{snakeId:a.id});}snakeEncounter(a).biteAfter=e.time+SNAKE_RULES.biteCooldown;delete snakeEncounter(a).targetId;wander(world,a,victim);}continue;
  }
  if(target&&e.time>=snakeEncounter(a).biteAfter){animalMotion(a).state='warning';snakeEncounter(a).warningAt=e.time;snakeEncounter(a).targetId=target.id;animalMotion(a).facing=target.x<animalSpatial(a).x?'left':'right';animalMotion(a).route=[];e.emit('snake-warning',target,null,{snakeId:a.id});continue;}
  if(animalMotion(a).route.length){const p=walkStep(animalSpatial(a),animalMotion(a).route[0],dt*(animalMotion(a).state==='retreating'?SNAKE_RULES.fleeSpeed:SNAKE_RULES.speed)/WALK_SPEED,e.heightAt,e.obstacles()),travel=dist(a,p),dx=p.x-animalSpatial(a).x;animalSpatial(a).x=p.x;animalSpatial(a).z=p.z;animalMotion(a).speed=travel/dt;animalMotion(a).phase=(animalMotion(a).phase+travel/.75)%1;if(Math.abs(dx)>.005)animalMotion(a).facing=dx<0?'left':'right';if(p.blocked)animalMotion(a).route=[];else if(p.done)animalMotion(a).route.shift();if(!animalMotion(a).route.length){animalMotion(a).state='basking';snakeEncounter(a).waitUntil=e.time+3+e.random()*6;}continue;}
  if(e.time>=snakeEncounter(a).waitUntil)wander(world,a);
 }
}
export function validSnakes(world){const e=world.resource('Village'),s=e.snakes;if(!s)return true;
 const schedule=snakeSchedule(s);return !!schedule&&s.animals.length<=SNAKE_RULES.max&&s.animals.every(a=>{
 const p=animalSpatial(a),m=animalMotion(a),life=animalLifecycle(a),bite=snakeEncounter(a),v=actorVitality(a);
 return SNAKE_NAMES[a.culture]&&p&&m&&life&&bite&&v&&[p.x,p.z,life.bornAt,life.leaveAt,bite.waitUntil,bite.biteAfter,m.phase,m.speed].every(Number.isFinite)&&Array.isArray(m.route)&&m.route.every(p=>[p.x,p.z].every(Number.isFinite))&&['basking','slithering','warning','retreating','departing'].includes(m.state)&&(m.state!=='warning'||Number.isFinite(bite.warningAt)&&Number.isSafeInteger(bite.targetId));
 });}
