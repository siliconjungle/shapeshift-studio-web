import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock,lifeMealAccounting} from "../life-state.js";
import {actorSleep,actorSocialActivity} from "../daily-activity-actors.js";
import {skillRate,skillLevel} from '../../village-skills.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDrop} from '../../village-survival.js';
import {lifeIdle,lifeRelation} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {memoryRemember} from '../../village-memory.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant,ensureCareParticipant} from '../care-participants.js';
import {dangerInterrupt} from '../../village-danger.js';
import {supportParticipant} from '../support-participants.js';
import {careVisits} from '../../ecs/care-entities.js';

import {sociallyWithdrawn,comfortHeartbreak} from '../../village-feelings.js';
import {familyRelation} from '../../village-age.js';
import {standingRoom,standingRoute} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {CHILDCARE_RULES,childDevelopment} from '../../village-childcare.js';
const clamp=n=>Math.max(0,Math.min(100,n));
const states=new Set(['care-foodbound','care-bound','caring','awaiting-care','receiving-care']);
export function childcareCancel(world,session){const state=world.resource('Childcare');

  const e=state.economy;
  careVisits(state).remove(session);
  if(careParticipant(session.adult)?.food){ensureCareParticipant(session.adult).food=0;survivalDrop(e.survival,session.adult,'food',1)}
  for(const w of [session.adult,session.child]){
   ensureCareParticipant(w).partnerId=null;delete ensureCareParticipant(w).elderVisit;
   if(states.has(w.state))lifeIdle(e.life,w);
  }
  ensureCareParticipant(session.child).nextAt=e.time+CHILDCARE_RULES.retry;
 
}
export function childcareInterrupt(world,w){const state=world.resource('Childcare');
for(const s of [...state.sessions])if(s.adult===w||s.child===w)childcareCancel(world,s)
}
export function childcareUpdate(world,dt){const state=world.resource('Childcare');

  const e=state.economy;
  for(const w of e.workers)if(((personAge(w)?.child)||(personAge(w)?.elder))&&!(actorVitality(w)?.dead)){
   actorNeeds(w).care??=85;
   if(!(actorInterior(w)?.inside))actorNeeds(w).care=clamp(actorNeeds(w).care-dt*((personAge(w)?.elder)?.55+.45*((personAge(w)?.frailty)??0):1.8-childDevelopment(w,e.time).progress));
  }
  for(const s of [...state.sessions]){
   const {adult:a,child:c}=s;
   if((actorVitality(a)?.dead)||(actorVitality(c)?.dead)||(!(personAge(c)?.child)&&!(personAge(c)?.elder))||!states.has(a.state)||!states.has(c.state)||e.time>s.deadline||actorNeeds(a).hunger>=85||actorNeeds(a).energy<18||watchAssigned(e.life.watch,a)||isBedtime(lifeClock(e.life).hour,actorSleep(c)?.bedtime,actorSleep(c)?.wakeHour)){
    childcareCancel(world,s);continue;
   }
   state.adultSeconds+=dt;
   if(a.state!=='caring')continue;
   for(const w of [a,c])actorNeeds(w).social=clamp(actorNeeds(w).social+dt*3);
   actorNeeds(c).care=clamp(actorNeeds(c).care+dt*12*skillRate(a,'caregiving'));actorNeeds(a).energy=clamp(actorNeeds(a).energy-dt*.25);
   if(e.time<s.until)continue;
   if((personAge(c)?.elder))comfortHeartbreak(e,c,a);
   if(careParticipant(a)?.food){ensureCareParticipant(a).food=0;actorNeeds(c).hunger=clamp(actorNeeds(c).hunger-62);actorNeeds(c).energy=clamp(actorNeeds(c).energy+7);lifeMealAccounting(e.life).consumed++;state.meals++;memoryRemember(e.life.memory,c,a,'fed');e.emit((personAge(c)?.elder)?'elder-fed':'child-fed',c,null,{caregiverId:a.id})}
   const r=lifeRelation(e.life,a.id,c.id);if(r)r.affinity=Math.min(1,r.affinity+.035);
   memoryRemember(e.life.memory,c,a,'cared');memoryRemember(e.life.memory,a,c,(personAge(c)?.elder)?'elder-stories':'time-together');
   if((personAge(c)?.elder)){actorNeeds(a).energy=clamp(actorNeeds(a).energy+5);actorNeeds(c).energy=clamp(actorNeeds(c).energy+4);}
   state.completed++;e.emit((personAge(c)?.elder)?'elder-cared-for':'child-cared-for',c,null,{caregiverId:a.id});childcareCancel(world,s);
   ensureCareParticipant(c).nextAt=e.time+((personAge(c)?.elder)?35:CHILDCARE_RULES.youngInterval+(CHILDCARE_RULES.olderInterval-CHILDCARE_RULES.youngInterval)*childDevelopment(c,e.time).progress);
  }
  if(e.time<state.nextCheck||e.raids?.alarmUntil>e.time)return;
  state.nextCheck=e.time+1;
  for(const c of e.workers){
   if((actorVitality(c)?.dead)||(!(personAge(c)?.child)&&!(personAge(c)?.elder))||(actorInterior(c)?.inside)||supportParticipant(c)?.partnerId!=null||!((personAge(c)?.elder)?['idle','outbound']:['idle','following']).includes(c.state)||(careParticipant(c)?.nextAt??0)>e.time||isBedtime(lifeClock(e.life).hour,actorSleep(c)?.bedtime,actorSleep(c)?.wakeHour))continue;
   const young=childDevelopment(c,e.time).progress<.45,feed=(young||(personAge(c)?.elder))&&actorNeeds(c).hunger>=50&&e.stock.food>=1;
   if(!feed&&actorNeeds(c).care>55)continue;
   const adults=e.workers.filter(a=>!a.expeditionId&&!sociallyWithdrawn(e,a)&&!e.leadership?.isLeader(a)&&(!(personAge(a)?.child)||(personAge(c)?.elder)&&!feed&&childDevelopment(a,e.time).progress>=.45)&&!(personAge(a)?.elder)&&!(actorVitality(a)?.dead)&&!(actorInterior(a)?.inside)&&!a.cargo&&!a.spacingRoute?.length&&actorSocialActivity(a)?.partnerId===null&&!watchAssigned(e.life.watch,a)&&(a.state==='idle'||a.state==='outbound'&&actorNeeds(c).hunger>=85)&&actorNeeds(a).hunger<62&&actorNeeds(a).energy>30&&!isBedtime(lifeClock(e.life).hour,actorSleep(a)?.bedtime,actorSleep(a)?.wakeHour));
   adults.sort((a,b)=>(skillLevel(b,'caregiving')-skillLevel(a,'caregiving'))*3+(familyRelation(e,c,b)?100:0)-(familyRelation(e,c,a)?100:0)+Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z));
   let assigned=false;
   for(const a of adults){
    const spot=[-1,1].map(sign=>({x:c.x+sign*((personAge(c)?.elder)?1.25:1.05),z:c.z})).find(p=>standingRoom(e,a,p)&&e.route(a,p));
    if(!spot)continue;
    const route=feed?standingRoute(e,a,e.depot):e.route(a,spot);if(!route)continue;
    dangerInterrupt(e,a);releaseWork(e,a);releaseWork(e,c);a.spacingRoute=c.spacingRoute=null;
    ensureCareParticipant(a).elderVisit=ensureCareParticipant(c).elderVisit=!!(personAge(c)?.elder);
    a.state=feed?'care-foodbound':'care-bound';a.route=route;ensureCareParticipant(a).partnerId=c.id;c.state='awaiting-care';ensureCareParticipant(c).partnerId=a.id;
    careVisits(state).add({adult:a,child:c,spot,deadline:e.time+30,until:0});e.emit((personAge(c)?.elder)?'eldercare-start':'childcare-start',a,null,{childId:c.id});assigned=true;break;
   }
   if(!assigned)ensureCareParticipant(c).nextAt=e.time+CHILDCARE_RULES.retry;
  }
 
}
export function childcareHandle(world,w,dt){const state=world.resource('Childcare');

  if(!states.has(w.state))return false;
  const e=state.economy,s=state.sessions.find(s=>s.adult===w||s.child===w);
  if(!s){lifeIdle(e.life,w);return true}
  if(w.state==='care-foodbound'||w.state==='care-bound'){
   const status=e.move(w,dt);if(status==='blocked'){childcareCancel(world,s);return true}if(status!=='arrived')return true;
   if(w.state==='care-foodbound'){
    const route=e.route(w,s.spot);if(!route){childcareCancel(world,s);return true}
    if(e.stock.food>=1){e.stock.food--;ensureCareParticipant(w).food=1}
    w.route=route;w.state='care-bound';return true;
   }
   w.state='caring';s.child.state='receiving-care';w.facing=s.child.x<w.x?'left':'right';s.child.facing=w.x<s.child.x?'left':'right';s.until=e.time+CHILDCARE_RULES.visitSeconds;
  }
  return true;
 
}
