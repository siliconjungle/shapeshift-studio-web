import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock} from "../life-state.js";
import {actorSleep} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {ensureActorAmbitions} from "../development-actors.js";
import {cursedAnimalThreat,curseFumbles} from '../../village-curse.js';
import {addAnimal} from '../animal-entities.js';
import {animalLifecycle,ensureAnimalState,animalSpatial,animalMotion,animalEncounter,animalExpression} from '../animal-state.js';
import {wildlifeParticipant,ensureWildlifeParticipant,ensureAnimalRelationships} from '../../ecs/animal-participants.js';
import {personAge} from '../../ecs/person-age.js';
import {actorVitality} from '../../ecs/actor-vitality.js';
import {actorNeeds} from '../../ecs/actor-needs.js';
import {survivalInterrupt,survivalDrop,survivalRecover} from '../../village-survival.js';
import {memoryRemember} from '../../village-memory.js';
import {lifeRelation,lifeStartRoute} from '../../village-life.js';
import {animalTrust,animalBond,mournAnimal} from '../../animal-relationships.js';
import {wildlifeFacing} from '../../wildlife-facing.js';

import {canWalkAt,walkStep,WALK_SPEED} from '../../village-walking.js';

import {isBedtime} from '../../village-time.js';
import {WILDLIFE_RULES,WILDLIFE_SPECIES,wildlifeState} from '../../village-wildlife.js';
const dist=(a,b)=>{const p=animalSpatial(a)??a,q=animalSpatial(b)??b;return Math.hypot(p.x-q.x,p.z-q.z)},outside=w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!['sleeping','homebound'].includes(w.state),kindFor=w=>['gentle','thoughtful'].includes((actorPersonality(w)?.trait))?'protect':['outgoing','playful'].includes((actorPersonality(w)?.trait))?'befriend':(actorPersonality(w)?.trait)==='blunt'?'hunt':'avoid';
export function seesWildlife(world,w,p,r=WILDLIFE_RULES.sight){const e=world.resource('Village');p=animalSpatial(p)??p;

 if(!outside(w)||dist(w,p)>r)return false;
 const dx=p.x-w.x,dz=p.z-w.z,length=dx*dx+dz*dz;if(length<.01)return true;
 const h=e.heightAt(w.x,w.z),end=e.heightAt(p.x,p.z);if(h==null||end==null)return false;
 for(const o of e.obstacles()){const t=((o.x-w.x)*dx+(o.z-w.z)*dz)/length;if(t>.08&&t<.92&&Math.hypot(w.x+t*dx-o.x,w.z+t*dz-o.z)<o.radius*.85)return false;}
 for(let i=1;i<10;i++){const t=i/10,y=e.heightAt(w.x+dx*t,w.z+dz*t);if(y==null||y>h+(end-h)*t+1.1)return false;}return true;

}
export function wildlifeDisposition(world,w){const e=world.resource('Village');

 if((personAge(w)?.child))return 'befriend';const kind=kindFor(w),need=e.stock.food<e.workers.filter(w=>!(actorVitality(w)?.dead)).length*3||actorNeeds(w).hunger>60;
 if(kind==='hunt')return need?'hunt':'ignore';if(kind==='avoid'&&e.stock.food===0&&actorNeeds(w).hunger>85)return 'hunt';return kind==='protect'?'befriend':kind;

}
export function spawnWildlife(world){const e=world.resource('Village');

 const s=wildlifeState(e);if(s.animals.filter(a=>!actorVitality(a).dead&&!animalLifecycle(a).gone).length>=WILDLIFE_RULES.maxAnimals)return null;
 for(let i=0;i<24;i++){
  const angle=e.random()*Math.PI*2,r=10+e.random()*12,p={x:e.depot.x+Math.cos(angle)*r,z:e.depot.z+Math.sin(angle)*r};
  if(!canWalkAt(p.x,p.z,e.heightAt,e.obstacles())||s.animals.some(a=>!animalLifecycle(a).gone&&dist(a,p)<5)||(e.life.homes??[]).some(h=>dist(h,p)<4))continue;
  if(!e.route(e.depot,p))continue;
  const a={id:'wildlife-'+s.nextId++,culture:e.culture,...p,home:{...p},health:WILDLIFE_RULES.health,state:'grazing',route:[],facing:e.random()<.5?'left':'right',phase:0,speed:0,wait:2+e.random()*5,bornAt:e.time,leaveAt:e.time+260+e.random()*180,dead:false,gone:false,hunterId:null,friendId:null,alertUntil:0,hitAt:-100,scaredUntil:0,reactAfter:e.time+8,protectedBy:[]};addAnimal(s,'animals',a);e.emit('wildlife-arrived',null,null,{animalId:a.id});return a;
 }return null;

}
function cue(world,a,reaction){const e=world.resource('Village');
ensureAnimalState(a,'AnimalExpression').reaction=reaction;ensureAnimalState(a,'AnimalExpression').reactionAt=e.time;e.emit('wildlife-react',null,null,{animalId:a.id,reaction});
}
function animalRoute(world,a,away=null){const e=world.resource('Village');

 for(let i=0;i<10;i++){const angle=(away?Math.atan2(animalSpatial(a).z-away.z,animalSpatial(a).x-away.x):e.random()*Math.PI*2)+(away?(e.random()-.5)*1.4:0),r=away?5+e.random()*4:2+e.random()*4,p={x:animalSpatial(a).x+Math.cos(angle)*r,z:animalSpatial(a).z+Math.sin(angle)*r};if(dist(p,animalMotion(a).home)>18)continue;if(!canWalkAt(p.x,p.z,e.heightAt,e.obstacles()))continue;const route=e.route(animalSpatial(a),p);if(route){ensureAnimalState(a,'AnimalMotion').route=route;return true;}}ensureAnimalState(a,'AnimalMotion').route=[];return false;

}
export function interruptWildlife(world,w){const e=world.resource('Village');
const j=wildlifeParticipant(w)?.job;if(!j)return;const a=e.wildlife?.animals.find(a=>a.id===j.animalId);if(animalEncounter(a)?.hunterId===w.id)ensureAnimalState(a,'AnimalEncounter').hunterId=null;if(animalEncounter(a)?.friendId===w.id)ensureAnimalState(a,'AnimalEncounter').friendId=null;delete ensureWildlifeParticipant(w).job;ensureWildlifeParticipant(w).nextAt=e.time+20;if(w.state.startsWith('wildlife-'))releaseWork(e,w);
}
function start(world,w,a,kind,hunter=null){const e=world.resource('Village');

 const angle=Math.atan2(w.z-animalSpatial(a).z,w.x-animalSpatial(a).x),p=kind==='protect'?{x:(animalSpatial(a).x+hunter.x)/2,z:(animalSpatial(a).z+hunter.z)/2}:{x:animalSpatial(a).x+Math.cos(angle)*(kind==='befriend'?1.05:1.4),z:animalSpatial(a).z+Math.sin(angle)*(kind==='befriend'?1.05:1.4)},route=e.route(w,p);if(!route)return false;
 survivalInterrupt(e.survival,w);ensureWildlifeParticipant(w).job={animalId:a.id,kind,hunterId:hunter?.id??null,deadline:e.time+(kind==='protect'?10:30),repathAt:e.time+1.2};w.route=route;w.wait=0;w.state='wildlife-approaching';
 if(kind==='hunt'){ensureAnimalState(a,'AnimalEncounter').protectedBy=[];ensureAnimalState(a,'AnimalEncounter').hunterId=w.id;ensureAnimalState(a,'AnimalEncounter').alertUntil=e.time+2.8;cue(world,a,'surprise');e.emit('wildlife-hunt-start',w,null,{animalId:a.id});}
 if(kind==='befriend')ensureAnimalState(a,'AnimalEncounter').friendId=w.id;
 return true;

}
export function chooseWildlife(world,w){const e=world.resource('Village');

 if(!e.wildlife||!outside(w)||w.cargo||wildlifeParticipant(w)?.job||(wildlifeParticipant(w)?.nextAt??0)>e.time||actorNeeds(w).energy<35||actorNeeds(w).hunger>92||e.raids?.alarmUntil>e.time||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour))return false;
 ensureWildlifeParticipant(w).nextAt=e.time+12+e.random()*10;const kind=wildlifeDisposition(world,w);if(!['hunt','befriend'].includes(kind)&&!e.wildlife.animals.some(a=>animalTrust(w,a)>=.3))return false;
 const a=e.wildlife.animals.filter(a=>!actorVitality(a).dead&&!animalLifecycle(a).gone&&animalEncounter(a).hunterId===null&&animalEncounter(a).friendId===null&&animalEncounter(a).scaredUntil<=e.time&&seesWildlife(world,w,a,7)&&(['hunt','befriend'].includes(kind)||animalTrust(w,a)>=.3)).sort((a,b)=>(animalTrust(w,b)-animalTrust(w,a))*4+dist(a,w)-dist(b,w))[0];return !!a&&start(world,w,a,animalTrust(w,a)>=.3?'befriend':kind);

}
function remember(world,w,hunter,kind){const e=world.resource('Village');
memoryRemember(e.life.memory,w,hunter,kind);const r=lifeRelation(e.life,w.id,hunter.id);if(r)r.affinity=Math.max(-1,Math.min(1,r.affinity+(kind==='protected-animal'?.06:-.12)));
}
export function killWildlife(world,a,hunter){const e=world.resource('Village');

 if(actorVitality(a).dead||animalLifecycle(a).gone)return false;actorVitality(a).dead=true;actorVitality(a).health=0;ensureAnimalState(a,'AnimalMotion').state='dead';actorVitality(a).diedAt=e.time;ensureAnimalState(a,'AnimalMotion').route=[];ensureAnimalState(a,'AnimalMotion').speed=0;e.wildlife.kills++;mournAnimal(e,a,hunter);
 const drop=survivalDrop(e.survival,animalSpatial(a),'food',WILDLIFE_RULES.meat);Object.assign(drop,{appearance:'meat',availableAt:e.time+WILDLIFE_RULES.corpseSeconds});ensureAnimalState(a,'AnimalEncounter').meatDropId=drop.id;
 for(const w of e.workers){if(w===hunter||!seesWildlife(world,w,a)||!['gentle','thoughtful','playful','quiet'].includes((actorPersonality(w)?.trait))&&!(personAge(w)?.child))continue;ensureAnimalRelationships(w).griefUntil=e.time+55;actorNeeds(w).social=Math.max(0,actorNeeds(w).social-15);ensureWildlifeParticipant(w).nextAt=e.time+25;remember(world,w,hunter,'killed-animal');e.emit('wildlife-grief',w,null,{animalId:a.id,hunterId:hunter.id});}
 e.emit('wildlife-killed',hunter,null,{animalId:a.id});cue(world,a,'nervous');return true;

}
export function hitWildlife(world,a,w){const e=world.resource('Village');
if(actorVitality(a).dead||animalLifecycle(a).gone||animalEncounter(a).hunterId!==w.id||!outside(w)||dist(a,w)>1.9)return false;
 if(curseFumbles(e,w))return false;
 actorVitality(a).health=Math.max(0,actorVitality(a).health-WILDLIFE_RULES.hit);animalBond(e,w,a,-.5);ensureAnimalState(a,'AnimalExpression').hitAt=e.time;ensureAnimalState(a,'AnimalEncounter').alertUntil=e.time+.65;ensureAnimalState(a,'AnimalEncounter').scaredUntil=e.time+12;cue(world,a,'nervous');e.emit('wildlife-hit',w,null,{animalId:a.id});if(actorVitality(a).health===0)killWildlife(world,a,w);return true;

}
export function updateWildlife(world,dt){const e=world.resource('Village');

 const s=e.wildlife;if(!s||!e.life)return;
 if(e.time>=s.nextAt){spawnWildlife(world);s.nextAt=e.time+WILDLIFE_RULES.spawnEvery;}
 for(const a of s.animals){
  if(actorVitality(a).dead){ensureAnimalState(a,'AnimalLifecycle').gone=e.time-actorVitality(a).diedAt>WILDLIFE_RULES.corpseSeconds;continue;}if(animalLifecycle(a).gone)continue;
  const hunter=e.workers.find(w=>w.id===animalEncounter(a).hunterId&&outside(w)&&wildlifeParticipant(w)?.job?.animalId===a.id);if(!hunter)ensureAnimalState(a,'AnimalEncounter').hunterId=null;
  if(hunter){
   for(const w of e.workers){if(w===hunter||(personAge(w)?.child)||w.frenzy||w.rivalJourney||w.rescueId!=null||['defending','fleeing','alerted','sheltering','ritual-bound'].includes(w.state)||(!['gentle','thoughtful'].includes((actorPersonality(w)?.trait))&&animalTrust(w,a)<.5)||w.cargo||wildlifeParticipant(w)?.job||(actorVitality(w)?.health)<40||actorNeeds(w).energy<25||actorNeeds(w).hunger>90||animalEncounter(a).protectedBy.includes(w.id)||e.raids?.alarmUntil>e.time||!seesWildlife(world,w,a)||!seesWildlife(world,w,hunter))continue;
    if(start(world,w,a,'protect',hunter)){animalEncounter(a).protectedBy.push(w.id);e.emit('wildlife-protect-start',w,null,{animalId:a.id});break;}
   }
  }
  if(animalEncounter(a).friendId!==null&&!e.workers.some(w=>w.id===animalEncounter(a).friendId&&wildlifeParticipant(w)?.job?.animalId===a.id&&!(actorVitality(w)?.dead)))ensureAnimalState(a,'AnimalEncounter').friendId=null;
  const cursed=cursedAnimalThreat(e,animalSpatial(a));if(cursed){ensureAnimalState(a,'AnimalEncounter').scaredUntil=Math.max(animalEncounter(a).scaredUntil,e.time+3);ensureAnimalState(a,'AnimalEncounter').friendId=null;}
  const companion=e.workers.find(w=>w.id===animalEncounter(a).companionId&&!(actorVitality(w)?.dead)&&!w.exiled);if(companion){ensureAnimalState(a,'AnimalLifecycle').leaveAt=Math.max(animalLifecycle(a).leaveAt,e.time+120);delete ensureAnimalState(a,'AnimalLifecycle').leavingAt;}
  if(!hunter&&animalEncounter(a).friendId===null&&animalEncounter(a).scaredUntil<=e.time&&(animalEncounter(a).companionCheck??0)<=e.time){
   ensureAnimalState(a,'AnimalEncounter').companionCheck=e.time+8;const call=e.wildlife.call?.until>e.time?e.wildlife.call:null,goal=call??(companion&&!(actorInterior(companion)?.inside)&&dist(companion,a)<20?companion:null);
   if(goal&&dist(goal,a)>3){const p={x:goal.x+(e.random()-.5)*3,z:goal.z+2},route=e.route(animalSpatial(a),p);if(route)ensureAnimalState(a,'AnimalMotion').route=route;}
  }
  if(e.time>animalLifecycle(a).leaveAt&&!hunter){ensureAnimalState(a,'AnimalLifecycle').leavingAt??=e.time;if(e.time-animalLifecycle(a).leavingAt>2.4){ensureAnimalState(a,'AnimalLifecycle').gone=true;continue;}}
  if(animalEncounter(a).friendId!==null&&!hunter){ensureAnimalState(a,'AnimalMotion').speed=0;ensureAnimalState(a,'AnimalMotion').state='friendly';const friend=e.workers.find(w=>w.id===animalEncounter(a).friendId);if(friend)ensureAnimalState(a,'AnimalMotion').facing=wildlifeFacing(friend.x-animalSpatial(a).x,friend.z-animalSpatial(a).z,animalMotion(a).facing);continue;}
  if(hunter&&e.time<animalEncounter(a).alertUntil){ensureAnimalState(a,'AnimalMotion').speed=0;ensureAnimalState(a,'AnimalMotion').state='alert';continue;}
  if(cursed||hunter||animalEncounter(a).scaredUntil>e.time){ensureAnimalState(a,'AnimalMotion').state='fleeing';if(!animalMotion(a).route.length||(animalMotion(a).repathAt??0)<=e.time){animalRoute(world,a,cursed??hunter);ensureAnimalState(a,'AnimalMotion').repathAt=e.time+2.5;}}
  if(!animalMotion(a).route.length){ensureAnimalState(a,'AnimalMotion').speed=0;ensureAnimalState(a,'AnimalMotion').wait-=dt;if(animalMotion(a).wait<=0){animalRoute(world,a);ensureAnimalState(a,'AnimalMotion').wait=3+e.random()*5;}else{ensureAnimalState(a,'AnimalMotion').state='grazing';if(e.time>animalExpression(a).reactAfter){cue(world,a,e.random()<.5?'hungry':'sleepy');ensureAnimalState(a,'AnimalExpression').reactAfter=e.time+24+e.random()*20;}continue;}}
  if(animalMotion(a).route.length){const speed=animalMotion(a).state==='fleeing'?WILDLIFE_RULES.fleeSpeed:WILDLIFE_RULES.walkSpeed,from={x:animalSpatial(a).x,z:animalSpatial(a).z},next=walkStep(animalSpatial(a),animalMotion(a).route[0],dt*speed/WALK_SPEED,e.heightAt,e.obstacles());ensureAnimalState(a,'AnimalSpatial').x=next.x;ensureAnimalState(a,'AnimalSpatial').z=next.z;ensureAnimalState(a,'AnimalMotion').speed=dist(a,from)/Math.max(.001,dt);ensureAnimalState(a,'AnimalMotion').phase=(animalMotion(a).phase+dist(a,from)/.9)%1;ensureAnimalState(a,'AnimalMotion').facing=wildlifeFacing(animalSpatial(a).x-from.x,animalSpatial(a).z-from.z,animalMotion(a).facing);if(next.blocked)ensureAnimalState(a,'AnimalMotion').route=[];else if(next.done)animalMotion(a).route.shift();if(animalMotion(a).state!=='fleeing')ensureAnimalState(a,'AnimalMotion').state='walking';}
 }
 s.animals=s.animals.filter(a=>!animalLifecycle(a).gone||e.time-(actorVitality(a).diedAt??animalLifecycle(a).leavingAt??e.time)<5);

}
export function handleWildlife(world,w,dt){const e=world.resource('Village');

 if(wildlifeParticipant(w)?.meal&&w.state==='idle'){delete ensureWildlifeParticipant(w).meal;if(actorNeeds(w).hunger>25&&e.stock.food>0&&lifeStartRoute(e.life,w,'mealbound',e.depot))return true;}
 const j=wildlifeParticipant(w)?.job;if(!j)return false;const a=e.wildlife?.animals.find(a=>a.id===j.animalId);
 if(!a||!outside(w)||actorNeeds(w).energy<15||actorNeeds(w).hunger>95||e.time>j.deadline||e.raids?.alarmUntil>e.time){interruptWildlife(world,w);return false;}
 if(j.kind==='butcher'){
  if(e.time<actorVitality(a).diedAt+WILDLIFE_RULES.corpseSeconds)return true;
  const drop=e.survival.drops.find(d=>d.id===animalEncounter(a).meatDropId);interruptWildlife(world,w);if(drop)survivalRecover(e.survival,w,{candidates:[drop]});return true;
 }
 if(actorVitality(a).dead||animalLifecycle(a).gone){interruptWildlife(world,w);return false;}
 if(j.kind==='protect'){
  const hunter=e.workers.find(p=>p.id===j.hunterId&&wildlifeParticipant(p)?.job?.animalId===a.id&&wildlifeParticipant(p)?.job.kind==='hunt');if(!hunter){interruptWildlife(world,w);return false;}
  if(dist(w,hunter)<2.4&&dist(w,a)<4&&seesWildlife(world,w,hunter)){
   const resists=(actorPersonality(hunter)?.trait)==='blunt'&&actorNeeds(hunter).hunger>80&&e.stock.food<2&&e.random()<.55;
   remember(world,w,hunter,resists?'ignored-plea':'protected-animal');(ensureActorAmbitions(w).fulfilledUntil)=e.time+(resists?0:25);e.emit(resists?'wildlife-plea-refused':'wildlife-protected',w,null,{animalId:a.id,hunterId:hunter.id});
   if(!resists){interruptWildlife(world,hunter);ensureWildlifeParticipant(hunter).nextAt=e.time+65;ensureAnimalState(a,'AnimalEncounter').scaredUntil=e.time+6;animalRoute(world,a,hunter);cue(world,a,'love');}
   interruptWildlife(world,w);return true;
  }
  if(e.time>j.repathAt){const route=e.route(w,{x:(hunter.x+animalSpatial(a).x)/2,z:(hunter.z+animalSpatial(a).z)/2});if(route)w.route=route;j.repathAt=e.time+.8;}
  e.move(w,dt);return true;
 }
 if(j.kind==='befriend'){
  if(animalEncounter(a).hunterId!==null){interruptWildlife(world,w);return false;}
  if(dist(w,a)<1.17){w.route=[];w.facing=animalSpatial(a).x<w.x?'left':'right';w.state='wildlife-petting';j.startedAt??=e.time;
   if(!j.greeted){j.greeted=true;cue(world,a,'love');e.emit('wildlife-friendly',w,null,{animalId:a.id});}
   if(e.time-j.startedAt>3){actorNeeds(w).social=Math.min(100,actorNeeds(w).social+8);(ensureActorAmbitions(w).fulfilledUntil)=e.time+25;animalBond(e,w,a);interruptWildlife(world,w);ensureWildlifeParticipant(w).nextAt=e.time+60;}
  }else if(e.move(w,dt)==='blocked')interruptWildlife(world,w);return true;
 }
 if(animalEncounter(a).hunterId!==w.id){interruptWildlife(world,w);return false;}
 if(dist(w,a)<=1.85||w.state==='wildlife-hunting'&&dist(w,a)<4){
  if(dist(w,a)>1.15){const angle=Math.atan2(w.z-animalSpatial(a).z,w.x-animalSpatial(a).x),route=e.route(w,{x:animalSpatial(a).x+Math.cos(angle)*1.1,z:animalSpatial(a).z+Math.sin(angle)*1.1});if(route){w.route=route;e.move(w,dt)}}else w.route=[];w.facing=animalSpatial(a).x<w.x?'left':'right';
  if(w.state!=='wildlife-hunting'){w.state='wildlife-hunting';w.clock.reset('fight');j.windupUntil=e.time+.85;}
  if(e.time<j.windupUntil)return true;
  for(const event of w.clock.advance(dt)){if(event==='contact')hitWildlife(world,a,w);if(event==='finish')w.clock.reset('fight');}
  if(actorVitality(a).dead){j.kind='butcher';j.deadline=e.time+10;w.state='wildlife-butchering';}return true;
 }
 w.state='wildlife-approaching';if(e.time>=j.repathAt||!w.route.length){const angle=Math.atan2(w.z-animalSpatial(a).z,w.x-animalSpatial(a).x),route=e.route(w,{x:animalSpatial(a).x+Math.cos(angle)*1.35,z:animalSpatial(a).z+Math.sin(angle)*1.35});if(route)w.route=route;j.repathAt=e.time+.8;}
 if(e.move(w,dt)==='blocked')interruptWildlife(world,w);return true;

}
export function validWildlife(world){const e=world.resource('Village');

 const s=e.wildlife;if(s===undefined||s===null)return true;
 return Array.isArray(s.animals)&&s.animals.length<=6&&Number.isSafeInteger(s.nextId)&&s.nextId>=0&&Number.isFinite(s.nextAt)&&Number.isSafeInteger(s.kills)&&s.kills>=0&&new Set(s.animals.map(a=>a.id)).size===s.animals.length&&s.animals.every(a=>typeof a.id==='string'&&WILDLIFE_SPECIES[a.culture]&&[animalSpatial(a).x,animalSpatial(a).z,actorVitality(a).health,animalMotion(a).phase,animalMotion(a).wait,animalLifecycle(a).bornAt,animalLifecycle(a).leaveAt,animalEncounter(a).alertUntil,animalEncounter(a).scaredUntil].every(Number.isFinite)&&actorVitality(a).health>=0&&actorVitality(a).health<=WILDLIFE_RULES.health&&Array.isArray(animalMotion(a).route)&&animalMotion(a).route.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z))&&Array.isArray(animalEncounter(a).protectedBy)&&typeof actorVitality(a).dead==='boolean'&&typeof animalLifecycle(a).gone==='boolean'&&(!actorVitality(a).dead||Number.isFinite(actorVitality(a).diedAt)))&&e.workers.every(w=>!wildlifeParticipant(w)?.job||s.animals.some(a=>a.id===wildlifeParticipant(w)?.job.animalId)&&['hunt','befriend','protect','butcher'].includes(wildlifeParticipant(w)?.job.kind)&&Number.isFinite(wildlifeParticipant(w)?.job.deadline));

}
