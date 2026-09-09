import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {resourceCultivation} from "../resource-state.js";
import {resourceCondition} from "../resource-state.js";
import {resourceWoodland} from "../resource-state.js";
import {depleteResource} from "../../village-resources.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {actorPersonality} from "../personality-actors.js";
import {DAILY} from '../../daily-performance.js';
import {addAnimal} from '../animal-entities.js';
import {animalSpatial,animalLifecycle,birdFlight,ensureAnimalState,animalMotion,birdDefence,birdForaging,animalExpression} from '../animal-state.js';
import {birdParticipant,ensureBirdParticipant,wildlifeParticipant} from '../../ecs/animal-participants.js';
import {personAge} from '../../ecs/person-age.js';
import {actorVitality} from '../../ecs/actor-vitality.js';
import {actorNeeds} from '../../ecs/actor-needs.js';
import {survivalInterrupt,survivalDamage} from '../../village-survival.js';
import {protectedCrop,recordCropTheft} from '../../village-scarecrows.js';
import {animalTrust,mournAnimal} from '../../animal-relationships.js';

import {wildlifeFacing} from '../../wildlife-facing.js';
import {isForage} from '../../village-foraging.js';
import {exploredAt} from '../../village-exploration.js';
import {seesWildlife} from '../../village-wildlife.js';
import {BIRD_SPECIES,BIRD_RULES,birdState,birdFlightPosition} from '../../village-birds.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>{const p=animalSpatial(a)??a,q=animalSpatial(b)??b;return Math.hypot(p.x-q.x,p.z-q.z)},outside=w=>!!w&&!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!['sleeping','homebound','ritual-bound'].includes(w.state);
export function treeForNest(world,n){const e=world.resource('Village');
return e.nodes.find(t=>t.id===n.treeId&&t.kind==='wood'&&resourceGrowth(t)?.state==='ready'&&(resourceWoodland(t)?.ecoBornAt??0)===n.treeBornAt&&(resourceCondition(t)?.burningUntil??0)<=e.time);
}
export function perchPoint(world,p){const e=world.resource('Village');

 if(p?.kind==='nest'){const n=e.birds.nests.find(n=>n.id===p.id&&!n.lost);if(n&&treeForNest(world,n))return {x:n.x,z:n.z,y:(e.heightAt(n.x,n.z)??0)+n.height,perch:{...p}};}
 if(p?.kind==='node'){const n=e.nodes.find(n=>n.id===p.id&&['wood','stone'].includes(n.kind)&&resourceGrowth(n)?.state==='ready'&&(resourceCondition(n)?.burningUntil??0)<=e.time);if(n)return {x:n.x,z:n.z,y:(e.heightAt(n.x,n.z)??0)+(n.base??(n.kind==='wood'?4:1))*(n.kind==='wood'?.67:.85),perch:{...p}};}
 return null;

}
export function makeBirdNest(world){const e=world.resource('Village');

 const s=birdState(e);if(s.nests.filter(n=>!n.lost).length>=BIRD_RULES.maxNests)return null;
 const trees=e.nodes.filter(n=>n.kind==='wood'&&resourceGrowth(n)?.state==='ready'&&(resourceCondition(n)?.burningUntil??0)<=e.time&&!s.nests.some(p=>!p.lost&&p.treeId===n.id)&&!(e.ratsOwls?.owls??[]).some(o=>!o.dead&&!o.gone&&!o.departing&&o.treeId===n.id)&&dist(n,e.depot)<34&&Number.isFinite(e.heightAt(n.x,n.z))).sort((a,b)=>Number(exploredAt(e,b.x,b.z))-Number(exploredAt(e,a.x,a.z))||dist(a,e.depot)-dist(b,e.depot));
 if(!trees.length)return null;const tree=trees[Math.floor(e.random()*Math.min(trees.length,8))];
 const n={id:'nest-'+s.nextNest++,treeId:tree.id,treeBornAt:resourceWoodland(tree)?.ecoBornAt??0,x:tree.x,z:tree.z,height:(tree.base??4)*.67,offset:.12,createdAt:e.time,lost:false};addAnimal(s,'nests',n);return n;

}
export function spawnBird(world,nest=null){const e=world.resource('Village');

 const s=birdState(e);if(s.flock.length>=BIRD_RULES.maxBirds)return null;
 nest??=s.nests.find(n=>!n.lost&&treeForNest(world,n)&&s.flock.filter(b=>!actorVitality(b).dead&&!animalLifecycle(b).gone&&birdFlight(b).nestId===n.id).length<2)??makeBirdNest(world);if(!nest)return null;
 const p=perchPoint(world,{kind:'nest',id:nest.id});if(!p)return null;
 const b={id:'bird-'+s.nextId++,species:'bird',culture:e.culture,nestId:nest.id,...p,state:'nesting',health:BIRD_RULES.health,dead:false,gone:false,facing:'right',phase:e.random(),bornAt:e.time,waitUntil:e.time+4+e.random()*5,stealAfter:e.time+12,swoopAfter:e.time+20,callAfter:e.time+10+e.random()*20,carrying:false,flight:null,defenderId:null,hitAt:-100};addAnimal(s,'flock',b);e.emit('bird-arrived',null,null,{birdId:b.id});return b;

}
export function flyBird(world,b,to,arrive='perched',speed=BIRD_RULES.flightSpeed){const e=world.resource('Village');

 if(actorVitality(b).dead||!to||![to.x,to.y,to.z].every(Number.isFinite))return false;
 const from={x:animalSpatial(b).x,y:animalSpatial(b).y,z:animalSpatial(b).z,perch:birdFlight(b).perch?{...birdFlight(b).perch}:null};let floor=Math.max(from.y,to.y);
 for(let i=1;i<8;i++){const t=i/8,y=e.heightAt(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t);if(!Number.isFinite(y))return false;floor=Math.max(floor,y+.8);}
 const takeoffDuration=animalMotion(b).state==='flying'?0:DAILY.takeoffSeconds;
 ensureAnimalState(b,'BirdFlight').flight={from,to:{...to},at:e.time,takeoffDuration,duration:takeoffDuration+Math.max(.85,Math.hypot(to.x-animalSpatial(b).x,to.z-animalSpatial(b).z,(to.y-animalSpatial(b).y)*.5)/speed),arc:Math.max(.5,floor-Math.min(from.y,to.y)+.7),arrive};ensureAnimalState(b,'AnimalMotion').state='flying';ensureAnimalState(b,'BirdFlight').perch=null;ensureAnimalState(b,'AnimalMotion').facing=wildlifeFacing(to.x-from.x,to.z-from.z,animalMotion(b).facing);return true;

}
function cue(world,b,reaction){const e=world.resource('Village');
ensureAnimalState(b,'AnimalExpression').reaction=reaction;ensureAnimalState(b,'AnimalExpression').reactionAt=e.time;e.emit('bird-react',null,null,{birdId:b.id,reaction});
}
export function returnBird(world,b){const e=world.resource('Village');

 let n=e.birds.nests.find(n=>n.id===birdFlight(b).nestId&&!n.lost&&treeForNest(world,n));n??=e.birds.nests.find(n=>!n.lost&&treeForNest(world,n))??makeBirdNest(world);
 if(n){ensureAnimalState(b,'BirdFlight').nestId=n.id;const p=perchPoint(world,{kind:'nest',id:n.id});if(p&&flyBird(world,b,p,'nesting'))return true;}
 // No living tree remains: leave along a supported flight, then fade away.
 for(const dx of [-7,7]){const p={x:animalSpatial(b).x+dx,z:animalSpatial(b).z,y:animalSpatial(b).y+3};if(Number.isFinite(e.heightAt(p.x,p.z))&&flyBird(world,b,p,'leaving'))return true;}
 ensureAnimalState(b,'AnimalMotion').state='leaving';ensureAnimalState(b,'AnimalLifecycle').leaveAt=e.time;return false;

}
export function interruptBird(world,w){const e=world.resource('Village');
if(!birdParticipant(w)?.job)return;const b=e.birds?.flock.find(b=>b.id===birdParticipant(w)?.job.birdId);if(birdDefence(b)?.defenderId===w.id)ensureAnimalState(b,'BirdDefence').defenderId=null;delete ensureBirdParticipant(w).job;ensureBirdParticipant(w).nextAt=e.time+15;if(w.state.startsWith('bird-'))releaseWork(e,w);
}
export function damageBird(world,b,amount,source=null){const e=world.resource('Village');

 if(!b||actorVitality(b).dead||animalLifecycle(b).gone||!(amount>0))return false;actorVitality(b).health=Math.max(0,actorVitality(b).health-amount);ensureAnimalState(b,'AnimalExpression').hitAt=e.time;cue(world,b,'nervous');
 if(actorVitality(b).health===0){actorVitality(b).dead=true;ensureAnimalState(b,'AnimalMotion').state='dead';actorVitality(b).diedAt=e.time;ensureAnimalState(b,'AnimalLifecycle').deathY=animalSpatial(b).y;ensureAnimalState(b,'BirdFlight').flight=null;ensureAnimalState(b,'BirdFlight').perch=null;ensureAnimalState(b,'BirdForaging').carrying=false;e.birds.kills++;mournAnimal(e,b,source);e.emit('bird-killed',source,null,{birdId:b.id});}
 else returnBird(world,b);
 // Deliberately no drops, meat, resource credit or loot on death.
 return true;

}
export function chooseBirdResponse(world,w){const e=world.resource('Village');

 if(!e.birds||!outside(w)||(personAge(w)?.child)||w.cargo||wildlifeParticipant(w)?.job||birdParticipant(w)?.job||(birdParticipant(w)?.nextAt??0)>e.time||actorNeeds(w).energy<30||actorNeeds(w).hunger>90||e.raids?.alarmUntil>e.time||!['idle','working'].includes(w.state))return false;
 const b=e.birds.flock.find(b=>!actorVitality(b).dead&&!animalLifecycle(b).gone&&birdDefence(b).defenderId===null&&['pecking','swooping'].includes(animalMotion(b).state)&&dist(w,b)<5&&animalSpatial(b).y-(e.heightAt(w.x,w.z)??0)<1.7&&seesWildlife(e,w,b,6));if(!b)return false;
 const route=e.route(w,{x:animalSpatial(b).x+.8*(w.x>animalSpatial(b).x?1:-1),z:animalSpatial(b).z+.35});if(!route)return false;survivalInterrupt(e.survival,w);ensureBirdParticipant(w).job={birdId:b.id,kind:(actorPersonality(w)?.trait)==='blunt'&&animalTrust(w,b)<.3?'swat':'scare',deadline:e.time+7};w.route=route;w.state='bird-approaching';ensureAnimalState(b,'BirdDefence').defenderId=w.id;e.emit('bird-defending',w,null,{birdId:b.id});return true;

}
export function handleBird(world,w,dt){const e=world.resource('Village');

 const j=birdParticipant(w)?.job;if(!j)return false;const b=e.birds?.flock.find(b=>b.id===j.birdId);
 if(!b||actorVitality(b).dead||animalLifecycle(b).gone||!outside(w)||e.time>j.deadline||e.raids?.alarmUntil>e.time||animalMotion(b).state==='flying'||animalSpatial(b).y-(e.heightAt(w.x,w.z)??0)>1.8){interruptBird(world,w);return false;}
 if(dist(w,b)>1.6){if(e.move(w,dt)==='blocked')interruptBird(world,w);return true;}
 w.route=[];w.facing=animalSpatial(b).x<w.x?'left':'right';j.startedAt??=e.time;w.state=j.kind==='swat'?'bird-swatting':'bird-shooing';
 if(j.kind==='scare'){if(e.time-j.startedAt>.65){cue(world,b,'surprise');ensureAnimalState(b,'BirdForaging').stealAfter=e.time+45;returnBird(world,b);e.emit('bird-shooed',w,null,{birdId:b.id});interruptBird(world,w);}return true;}
 if(!j.clock){j.clock=true;w.clock.reset('fight');}
 for(const event of w.clock.advance(dt)){if(event==='contact'&&dist(w,b)<=1.7&&animalSpatial(b).y-(e.heightAt(w.x,w.z)??0)<1.8){damageBird(world,b,BIRD_RULES.health,w);e.emit('bird-hit',w,null,{birdId:b.id});}if(event==='finish'||actorVitality(b).dead){interruptBird(world,w);break;}}return true;

}
export function startBirdSwoop(world,b,w){const e=world.resource('Village');

 if(!outside(w)||(personAge(w)?.child)||animalTrust(w,b)>=.3||(birdParticipant(w)?.swoopedAfter??0)>e.time||birdDefence(b).swoopAfter>e.time)return false;
 const y=e.heightAt(w.x,w.z);if(!Number.isFinite(y))return false;ensureAnimalState(b,'BirdDefence').targetId=w.id;ensureAnimalState(b,'BirdDefence').swoopAfter=e.time+BIRD_RULES.swoopCooldown;ensureBirdParticipant(w).swoopedAfter=e.time+30;cue(world,b,'grumpy');e.emit('bird-warning',w,null,{birdId:b.id});return flyBird(world,b,{x:w.x,z:w.z,y:y+1.15},'swooping',5);

}
function chooseFlight(world,b){const e=world.resource('Village');

 const s=e.birds,hour=lifeClock(e.life).hour,night=hour>=20||hour<6;
 if(night){if(animalMotion(b).state!=='nesting')returnBird(world,b);else ensureAnimalState(b,'BirdFlight').waitUntil=e.time+12;return;}
 const nest=s.nests.find(n=>n.id===birdFlight(b).nestId&&!n.lost),intruder=nest&&e.workers.find(w=>outside(w)&&!(personAge(w)?.child)&&dist(w,nest)<3.7&&(birdParticipant(w)?.swoopedAfter??0)<=e.time);
 if(intruder&&birdDefence(b).swoopAfter<=e.time&&e.random()<.45&&startBirdSwoop(world,b,intruder))return;
 if(e.time>=s.nextTheftAt&&e.time>=birdForaging(b).stealAfter&&!s.flock.some(p=>p!==b&&!actorVitality(p).dead&&(animalMotion(p).state==='pecking'||birdFlight(p).flight?.arrive==='pecking'))){
  const crop=e.nodes.filter(n=>n.kind==='food'&&resourceCultivation(n)?.plotId&&!protectedCrop(e,n)&&!isForage(n)&&resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.reservedBy===null&&(resourceCondition(n)?.burningUntil??0)<=e.time&&dist(n,b)<32).sort((a,c)=>dist(a,b)-dist(c,b))[0];
  if(crop){ensureAnimalState(b,'BirdForaging').cropId=crop.id;ensureAnimalState(b,'BirdForaging').stealAfter=e.time+40;flyBird(world,b,{x:crop.x,z:crop.z,y:e.heightAt(crop.x,crop.z)+.1},'pecking');return;}
 }
 if(e.random()<.3){returnBird(world,b);return;}
 const perches=e.nodes.filter(n=>['wood','stone'].includes(n.kind)&&resourceGrowth(n)?.state==='ready'&&(resourceCondition(n)?.burningUntil??0)<=e.time&&dist(n,b)>1&&dist(n,b)<18);
 if(perches.length){const n=perches[Math.floor(e.random()*perches.length)],p=perchPoint(world,{kind:'node',id:n.id});if(p&&flyBird(world,b,p))return;}
 returnBird(world,b);

}
export function updateBirds(world,dt){const e=world.resource('Village');

 const s=e.birds;if(!s||!e.life||!(dt>0))return;
 for(const n of s.nests)if(!n.lost&&!treeForNest(world,n)){n.lost=true;n.lostAt=e.time;e.emit('bird-nest-lost',null,null,{nestId:n.id});}
 if(e.time>=s.nextAt){if(s.nests.filter(n=>!n.lost).length<BIRD_RULES.maxNests)makeBirdNest(world);spawnBird(world);s.nextAt=e.time+BIRD_RULES.spawnEvery;}
 for(const b of s.flock){
  if(actorVitality(b).dead){ensureAnimalState(b,'AnimalSpatial').y=Math.max(e.heightAt(animalSpatial(b).x,animalSpatial(b).z)??0,animalLifecycle(b).deathY-(e.time-actorVitality(b).diedAt)**2*3);ensureAnimalState(b,'AnimalLifecycle').gone=e.time-actorVitality(b).diedAt>BIRD_RULES.deathFade;continue;}if(animalLifecycle(b).gone)continue;
  ensureAnimalState(b,'AnimalMotion').phase=(animalMotion(b).phase+dt*(animalMotion(b).state==='flying'?5:1))%1;
  if(animalMotion(b).state==='leaving'){ensureAnimalState(b,'AnimalLifecycle').leaveAt??=e.time;if(e.time-animalLifecycle(b).leaveAt>2)ensureAnimalState(b,'AnimalLifecycle').gone=true;continue;}
  if(birdFlight(b).perch&&!perchPoint(world,birdFlight(b).perch)){returnBird(world,b);continue;}
  if(birdFlight(b).flight){
   if(birdFlight(b).flight.to.perch&&!perchPoint(world,birdFlight(b).flight.to.perch)){ensureAnimalState(b,'BirdFlight').flight=null;returnBird(world,b);continue;}
   const f=birdFlight(b).flight,p=birdFlightPosition(f,e.time);Object.assign(animalSpatial(b),{x:p.x,y:p.y,z:p.z});
   if(p.t>=1){ensureAnimalState(b,'AnimalMotion').state=f.arrive;ensureAnimalState(b,'BirdFlight').perch=f.to.perch??null;ensureAnimalState(b,'BirdFlight').flight=null;ensureAnimalState(b,'BirdFlight').landedAt=e.time;ensureAnimalState(b,'BirdFlight').waitUntil=e.time+6+e.random()*8;if(animalMotion(b).state==='nesting')ensureAnimalState(b,'BirdForaging').carrying=false;if(animalMotion(b).state==='pecking')cue(world,b,'hungry');if(animalMotion(b).state==='swooping')ensureAnimalState(b,'BirdDefence').swoopHit=false;}
   continue;
  }
  if(animalMotion(b).state==='swooping'){
   const w=e.workers.find(w=>w.id===birdDefence(b).targetId);if(!birdDefence(b).swoopHit){ensureAnimalState(b,'BirdDefence').swoopHit=true;if(outside(w)&&dist(w,b)<1.5){survivalDamage(e.survival,w,Math.min(BIRD_RULES.swoopDamage,Math.max(0,(actorVitality(w)?.health)-1)),'bird',b);actorNeeds(w).social=Math.max(0,actorNeeds(w).social-4);e.emit('bird-swooped',w,null,{birdId:b.id});if(!birdParticipant(w)?.job)chooseBirdResponse(world,w);}}
   if(e.time-birdFlight(b).landedAt>1.3&&birdDefence(b).defenderId===null)returnBird(world,b);continue;
  }
  if(animalMotion(b).state==='pecking'){
   const crop=e.nodes.find(n=>n.id===birdForaging(b).cropId);if(!crop||protectedCrop(e,crop)||resourceGrowth(crop)?.state!=='ready'||resourceHarvest(crop)?.reservedBy!==null||(resourceCondition(crop)?.burningUntil??0)>e.time){returnBird(world,b);continue;}
   if(e.time-birdFlight(b).landedAt>=BIRD_RULES.peckSeconds&&birdDefence(b).defenderId===null&&e.time>=s.nextTheftAt){recordCropTheft(e,crop);depleteResource(e,crop,{cause:'bird'});ensureAnimalState(b,'BirdForaging').carrying=true;s.stolen+=2;s.nextTheftAt=e.time+BIRD_RULES.theftCooldown;e.emit('bird-stole-crop',null,crop,{birdId:b.id,amount:2});cue(world,b,'delight');returnBird(world,b);}
   for(const w of e.workers)if(chooseBirdResponse(world,w))break;
   if(e.time-birdFlight(b).landedAt>10&&birdDefence(b).defenderId===null)returnBird(world,b);continue;
  }
  if((animalExpression(b).callAfter??0)<=e.time){if(lifeClock(e.life).hour>=6&&lifeClock(e.life).hour<20)cue(world,b,'thinking');ensureAnimalState(b,'AnimalExpression').callAfter=e.time+25+e.random()*25;}
  if(e.time>=birdFlight(b).waitUntil)chooseFlight(world,b);
 }
 s.flock=s.flock.filter(b=>!animalLifecycle(b).gone);s.nests=s.nests.filter(n=>!n.lost||e.time-n.lostAt<3);
 for(const w of e.workers)if(birdParticipant(w)?.job&&!s.flock.some(b=>b.id===birdParticipant(w)?.job.birdId&&!actorVitality(b).dead))interruptBird(world,w);

}
export function validBirds(world){const e=world.resource('Village');

 const s=e.birds;if(s==null)return true;const point=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
 return Array.isArray(s.flock)&&s.flock.length<=BIRD_RULES.maxBirds&&Array.isArray(s.nests)&&s.nests.length<=6&&['nextId','nextNest','kills','stolen'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)&&[s.nextAt,s.nextTheftAt].every(Number.isFinite)&&new Set(s.flock.map(b=>b.id)).size===s.flock.length&&new Set(s.nests.map(n=>n.id)).size===s.nests.length&&s.nests.every(n=>typeof n.treeId==='string'&&[n.x,n.z,n.height,n.treeBornAt].every(Number.isFinite)&&typeof n.lost==='boolean')&&s.flock.every(b=>typeof b.id==='string'&&BIRD_SPECIES[b.culture]&&point(animalSpatial(b))&&Number.isFinite(actorVitality(b).health)&&actorVitality(b).health>=0&&actorVitality(b).health<=BIRD_RULES.health&&[animalMotion(b).phase,animalLifecycle(b).bornAt,birdFlight(b).waitUntil,birdForaging(b).stealAfter,birdDefence(b).swoopAfter].every(Number.isFinite)&&typeof actorVitality(b).dead==='boolean'&&typeof animalLifecycle(b).gone==='boolean'&&['nesting','perched','pecking','flying','swooping','leaving','dead'].includes(animalMotion(b).state)&&(!actorVitality(b).dead||[actorVitality(b).diedAt,animalLifecycle(b).deathY].every(Number.isFinite))&&(!birdFlight(b).flight||point(birdFlight(b).flight.from)&&point(birdFlight(b).flight.to)&&[birdFlight(b).flight.at,birdFlight(b).flight.duration,birdFlight(b).flight.arc].every(Number.isFinite)&&birdFlight(b).flight.duration>0&&birdFlight(b).flight.duration<120&&birdFlight(b).flight.arc>=0))&&e.workers.every(w=>!birdParticipant(w)?.job||s.flock.some(b=>b.id===birdParticipant(w)?.job.birdId)&&['scare','swat'].includes(birdParticipant(w)?.job.kind)&&Number.isFinite(birdParticipant(w)?.job.deadline));

}
