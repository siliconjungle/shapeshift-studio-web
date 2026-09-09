import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeSocialVenues,lifeClock} from "../life-state.js";
import {actorSocialActivity,actorSleep,ensureActorSocialActivity} from "../daily-activity-actors.js";
import {actorAmbitions} from "../development-actors.js";
import {skillLevel} from '../../village-skills.js';
import {ambitionSocialBias} from '../../village-ambitions.js';
import {rememberedSocialSpots} from '../../village-place-history.js';
import {dangerRisk} from '../../village-danger.js';
import {campfireSocialSpots} from '../../village-campfire.js';
import {actorVitality} from '../actor-vitality.js';
import {lifeIdle,lifeEmit} from './life.js';
import {romanceResolve} from '../../village-romance.js';
import {actorFeelings} from '../actor-feelings.js';
import {memoryFeeling,memoryMutual} from '../../village-memory.js';
import {watchParticipant} from '../watch-participants.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {inviteBeastCompany} from '../../beast-emotions.js';
import {supportParticipant} from '../support-participants.js';
import {dangerAwareness} from '../danger-entities.js';
import {relationshipLabel} from '../../relationship-label.js';
import {sociallyWithdrawn} from '../../village-feelings.js';
import {chooseSocialCustom} from '../../village-traditions.js';
import {isHot} from '../../village-temperature.js';
import {standingRoom} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {socialEntities} from '../social-entities.js';
const clamp=n=>Math.max(0,Math.min(100,n));
export function chooseSocialMeeting(world,w){const life=world.resource('Life');

  if(sociallyWithdrawn(life.economy,w)||watchAssigned(life.watch,w)||(watchParticipant(w)?.sleepDebt??0)>0)return false;
  const e=life.economy,spots=e.campfire?.lit&&!isHot(w)?[...campfireSocialSpots(e.campfire),...lifeSocialVenues(life).spots]:[...lifeSocialVenues(life).spots];
  if(inviteBeastCompany(e,w))return true;
  const candidates=e.workers.filter(p=>!p.expeditionId&&!(actorVitality(p)?.dead)&&!sociallyWithdrawn(e,p)&&p!==w&&!isHot(p)&&!watchAssigned(life.watch,p)&&!(watchParticipant(p)?.sleepDebt>0)&&!p.cargo&&actorSocialActivity(p)?.partnerId===null&&supportParticipant(p)?.partnerId==null&&dangerAwareness(p)?.partnerId==null&&p.state==='idle'&&actorNeeds(p).energy>30&&actorNeeds(p).hunger<75&&actorSocialActivity(p)?.socialAfter<=e.time&&!isBedtime(lifeClock(life).hour,actorSleep(p)?.bedtime,actorSleep(p)?.wakeHour));
  const socialScore=p=>ambitionSocialBias(w,p)+socialEntities(life).relationships.find(w.id,p.id).affinity*8+memoryFeeling(life.memory,w,p)*6+((actorFeelings(w)?.crush)?.targetId===p.id?(actorFeelings(w)?.crush).strength*3:0)-Math.hypot(w.x-p.x,w.z-p.z)*.15;
  candidates.sort((a,b)=>socialScore(b)-socialScore(a));
  const remembered=rememberedSocialSpots(e,w);spots.unshift(...remembered);
  const peer=candidates.find(p=>chooseSocialCustom(e,w,p));if(!peer){
   // Give busy neighbours a short chance to finish a load. A finite wait
   // avoids stealing their job or leaving a lone villager idle indefinitely.
   const company=e.workers.some(p=>p!==w&&!(actorVitality(p)?.dead)&&!(actorInterior(p)?.inside)&&!watchAssigned(life.watch,p)&&actorNeeds(p).hunger<75);
   ensureActorSocialActivity(w).socialWaitUntil??=e.time+12;
   if(company&&e.time<actorSocialActivity(w)?.socialWaitUntil){ensureActorSocialActivity(w).socialAfter=e.time+5;w.wait=Math.max(w.wait,5.1)}
   else{ensureActorSocialActivity(w).socialWaitUntil=null;ensureActorSocialActivity(w).socialAfter=e.time+15}
   return false;
  }
  ensureActorSocialActivity(w).socialWaitUntil=null;ensureActorSocialActivity(peer).socialWaitUntil=null;
  let pathA=null,pathB=null;
  for(let i=0;i<spots.length;i++){
   const spot=spots[remembered.length||e.campfire?.lit?i:(w.id+peer.id+i)%spots.length],a={x:spot.x-.72,z:spot.z},b={x:spot.x+.72,z:spot.z};
   if(!standingRoom(e,w,a,peer)||!standingRoom(e,peer,b,w))continue;
   pathA=e.route(w,a);pathB=e.route(peer,b);if(pathA&&pathB&&!dangerRisk(e,w,a,pathA)&&!dangerRisk(e,peer,b,pathB))break;pathA=pathB=null;
  }
  if(!pathA||!pathB){ensureActorSocialActivity(w).socialAfter=e.time+8;return false}
  for(const [worker,partner,route] of [[w,peer,pathA],[peer,w,pathB]]){
   releaseWork(e,worker);worker.state='meeting';worker.wait=0;worker.route=route;ensureActorSocialActivity(worker).partnerId=partner.id;
  }
  socialEntities(life).meetings.add({workers:[w,peer],reconcile:(actorAmbitions(w)?.current)?.kind==='reconcile'&&(actorAmbitions(w)?.current).targetId===peer.id,customKind:chooseSocialCustom(e,w,peer),until:0,deadline:e.time+30});return true;
 
}
export function cancelSocialMeeting(world,session){const life=world.resource('Life');

  socialEntities(life).meetings.remove(session);
  for(const w of session.workers){lifeIdle(world,w);ensureActorSocialActivity(w).socialAfter=life.economy.time+12}
 
}
export function finishSocialMeeting(world,session){const life=world.resource('Life');

  const [a,b]=session.workers,r=socialEntities(life).relationships.find(a.id,b.id),before=relationshipLabel(r,a,b);r.meetings++;
  r.affinity=Math.max(-1,Math.min(1,r.affinity+(session.kind==='argument'?-.15:.09+Math.max(0,r.compatibility)*.06+(skillLevel(a,'diplomacy')+skillLevel(b,'diplomacy'))*.008)));
  memoryMutual(life.memory,a,b,session.kind==='argument'?'argument':'time-together');
  const romanceOutcome=romanceResolve(life.romance,a,b,r,session.kind),after=relationshipLabel(r,a,b);
  lifeEmit(world,'social-finish',a,{partnerId:b.id,kind:session.kind,reconciled:!!session.reconcile&&session.kind!=='argument',customKind:session.kind==='affection'?'quiet':session.customKind,relationship:after,changed:after!==before,romanceOutcome});
  cancelSocialMeeting(world,session);
  for(const w of [a,b])ensureActorSocialActivity(w).socialAfter=life.economy.time+25;
 
}
export function updateSocialMeetings(world,dt){const life=world.resource('Life');
for(const session of [...socialEntities(life).meetings.list]){
   const [a,b]=session.workers;
   if((actorVitality(a)?.dead)||(actorVitality(b)?.dead)){cancelSocialMeeting(world,session);continue}
   if(session.until){
    for(const w of [a,b])actorNeeds(w).social=clamp(actorNeeds(w).social+dt*(session.kind==='argument'?1.5:5));
    if(life.economy.time>=session.until)finishSocialMeeting(world,session);
   }else if(a.state==='waiting-friend'&&b.state==='waiting-friend'){
    const r=socialEntities(life).relationships.find(a.id,b.id),strain=(actorNeeds(a).hunger+actorNeeds(b).hunger)/200;
    session.kind=(r.compatibility<-.2&&!(session.reconcile&&r.affinity>-.8&&life.economy.random()<.6+(skillLevel(a,'diplomacy')+skillLevel(b,'diplomacy'))*.025)||strain>.85)?'argument':relationshipLabel(r,a,b)==='Growing close'||relationshipLabel(r,a,b)==='Sweetheart'?'affection':session.customKind==='quiet'?'quiet':'chat';
    session.until=life.economy.time+8;
    for(const w of [a,b]){w.state='socialising';ensureActorSocialActivity(w).socialKind=session.kind;w.facing=(w===a?b.x:a.x)<w.x?'left':'right'}
    lifeEmit(world,'social-start',a,{partnerId:b.id,kind:session.kind});
   }else if(life.economy.time>session.deadline)cancelSocialMeeting(world,session);
  }
}
