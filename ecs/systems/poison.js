import {POISON_RULES} from '../poison-data.js';
import {knownPeople} from '../../village-people.js';
import {gainSkill,skillLevel} from '../../village-skills.js';
import {standingRoom} from '../../village-spacing.js';
import {actorPoison,actorPoisonCare,ensureActorPoison,ensureActorPoisonCare} from '../poison-actors.js';
import {ActorPoison,ActorPoisonCare} from '../poison-data.js';
import {actorVitality} from '../actor-vitality.js';
import {actorNeeds} from '../actor-needs.js';
import {actorInterior} from '../actor-interior.js';
import {personAge} from '../person-age.js';
import {faithChange} from '../../village-faith.js';
import {survivalDamage,survivalInterrupt} from '../../village-survival.js';
import {memoryMutual} from '../../village-memory.js';
import {releaseWork} from '../../village-resources.js';
const alive=w=>w&&!actorVitality(w)?.dead&&!w.gone&&(actorVitality(w)?.health??0)>0;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const poisoned=(w,time)=>alive(w)&&actorPoison(w)?.effect?.until>time;
export const poisonRate=(w,time)=>poisoned(w,time)?POISON_RULES.speed:1;
export function poisonDescription(w,time){return poisoned(w,time)?`Poisoned · ${Math.ceil(actorPoison(w)?.effect.until-time)}s · weakened; losing health` :'';}
export function applyPoison(world,w,source='miracle'){const e=world.resource('Village');
 if(!['snake','miracle'].includes(source)||!alive(w)||!knownPeople(e).includes(w)||!actorNeeds(w)||poisoned(w,e.time))return false;
 ensureActorPoison(w).effect={since:e.time,until:e.time+POISON_RULES.duration,lastAt:e.time,nextSymptom:e.time+POISON_RULES.symptomEvery,severity:1,source,treatments:0};
 e.emit('poison-applied',w,null,{source});if(source==='miracle')faithChange(e.faith,w,-.12,'poisoned-by-god');return true;
}
export function clearPoison(world,w,reason='purify'){const e=world.resource('Village');
 if(!actorPoison(w)?.effect)return false;delete ensureActorPoison(w).effect;e.emit('poison-cleared',w,null,{reason});return true;
}
export function endPoisonCare(world,w){const e=world.resource('Village');
 const id=actorPoisonCare(w)?.job?.targetId;if(id===undefined)return;delete ensureActorPoisonCare(w).job;
 const target=knownPeople(e).find(p=>p.id===id);if(actorPoisonCare(target)?.carerId===w.id){delete ensureActorPoisonCare(target).carerId;if(target.state==='poison-rest')releaseWork(e,target);}
 if(['poison-care-bound','poison-tending'].includes(w.state))releaseWork(e,w);
}
function canCare(world,w){const e=world.resource('Village');return alive(w)&&!actorInterior(w)?.inside&&!w.divineHeld&&!personAge(w)?.child&&!w.cargo&&!w.frenzy&&!w.ritualId&&!actorPoisonCare(w)?.job&&['idle','resting','leader-sermon'].includes(w.state)&&(actorPoisonCare(w)?.after??0)<=e.time&&(actorNeeds(w)?.hunger??100)<65&&(actorNeeds(w)?.energy??0)>35&&(e.leadership?.isLeader(w)||w.role==='spiritual-leader');}
function arrangeCare(world,w,target){const e=world.resource('Village');
 if(target.cargo||actorInterior(target)?.inside||target.divineHeld||actorPoisonCare(target)?.carerId!=null||!['idle','resting','working','outbound','poison-rest','leader-sermon'].includes(target.state))return false;
 for(const dx of [-1.2,1.2]){const p={x:target.x+dx,z:target.z};if(!standingRoom(e,w,p,target))continue;const route=e.route(w,p);if(!route)continue;
  survivalInterrupt(e.survival,w);survivalInterrupt(e.survival,target);target.state='poison-rest';ensureActorPoisonCare(target).carerId=w.id;target.wait=0;
  ensureActorPoisonCare(w).job={targetId:target.id,deadline:e.time+20,startedAt:null};w.route=route;w.state='poison-care-bound';w.wait=0;w.decisionReason='Helping someone recover from poison';e.emit('poison-care-started',w,null,{targetId:target.id});return true;
 }return false;
}
export function updatePoison(world,dt){const e=world.resource('Village');
 if(!(dt>0))return;
 for(const w of knownPeople(e)){
  const p=actorPoison(w)?.effect;if(!p)continue;if(!alive(w)){delete ensureActorPoison(w).effect;continue;}
  const elapsed=Math.max(0,Math.min(e.time,p.until)-p.lastAt);p.lastAt=Math.max(p.lastAt,Math.min(e.time,p.until));
  if(elapsed){survivalDamage(e.survival,w,elapsed*POISON_RULES.damagePerSecond*p.severity,'poison');if(actorNeeds(w))actorNeeds(w).energy=Math.max(0,actorNeeds(w).energy-elapsed*POISON_RULES.energyPerSecond*p.severity);}
  if(!alive(w)){delete ensureActorPoison(w).effect;continue;}
  if(e.time>=p.until){clearPoison(world,w,'recovered');continue;}
  if(e.time>=p.nextSymptom){p.nextSymptom=e.time+POISON_RULES.symptomEvery;e.emit('poison-symptom',w);}
 }
 if(e.raids?.alarmUntil>e.time)return;
 const patients=e.workers.filter(w=>poisoned(w,e.time)&&!actorInterior(w)?.inside&&!w.divineHeld&&actorPoisonCare(w)?.carerId==null).sort((a,b)=>actorVitality(a).health-actorVitality(b).health);
 for(const w of e.workers.filter(w=>canCare(world,w)))for(const target of patients)if(target!==w&&dist(w,target)<POISON_RULES.careRadius&&arrangeCare(world,w,target))break;
}
export function handlePoisonCare(world,w,dt){const e=world.resource('Village');
 if(w.state==='poison-rest'){
  const carer=e.workers.find(p=>p.id===actorPoisonCare(w)?.carerId&&actorPoisonCare(p)?.job?.targetId===w.id);
  if(!carer||!poisoned(w,e.time)||e.raids?.alarmUntil>e.time||actorNeeds(w).hunger>80){if(carer)endPoisonCare(world,carer);delete ensureActorPoisonCare(w).carerId;releaseWork(e,w);return false;}return true;
 }
 const care=actorPoisonCare(w)?.job;if(!care)return false;const target=e.workers.find(p=>p.id===care.targetId);
 if(!alive(w)||w.divineHeld||actorInterior(w)?.inside||!poisoned(target,e.time)||actorPoisonCare(target)?.carerId!==w.id||target.state!=='poison-rest'||e.time>=care.deadline||e.raids?.alarmUntil>e.time||actorNeeds(w).hunger>80||actorNeeds(w).energy<20||!['poison-care-bound','poison-tending'].includes(w.state)){endPoisonCare(world,w);return false;}
 if(w.state==='poison-care-bound'){const state=e.move(w,dt);if(state==='blocked'){endPoisonCare(world,w);return false;}if(state==='arrived'){if(dist(w,target)>1.8){endPoisonCare(world,w);return false;}w.state='poison-tending';care.startedAt=e.time;w.facing=target.x<w.x?'left':'right';target.facing=w.x<target.x?'left':'right';}return true;}
 if(dist(w,target)>1.9){endPoisonCare(world,w);return false;}
 if(e.time-care.startedAt<POISON_RULES.treatmentSeconds)return true;
 const p=actorPoison(target)?.effect;p.until=Math.max(p.since,p.until-POISON_RULES.treatmentReduction-skillLevel(w,'caregiving')*3);p.lastAt=Math.min(p.lastAt,p.until);p.severity=Math.max(.2,p.severity*.55);p.treatments++;
 gainSkill(e,w,'caregiving',5);memoryMutual(e.life?.memory,w,target,'poison-care',.06);e.emit('poison-treated',target,null,{helperId:w.id});ensureActorPoisonCare(w).after=e.time+POISON_RULES.treatmentCooldown;
 if(p.until<=e.time)clearPoison(world,target,'leader');endPoisonCare(world,w);return true;
}
export function validPoison(world){const e=world.resource('Village');return knownPeople(e).every(w=>(!actorPoison(w)||ActorPoison.validate(actorPoison(w)))&&(!actorPoisonCare(w)||ActorPoisonCare.validate(actorPoisonCare(w))));}
