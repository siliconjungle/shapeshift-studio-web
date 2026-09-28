import {defineGameData} from './game-data.js';
export const ACTION_DURATION=defineGameData('action-timing.ACTION_DURATION',{shoot:2.4,till:2.4,fight:1.7,work:3.4,chop:2.5,mine:2.7,harvest:2.6});
export const CONTACT_PHASE=defineGameData('action-timing.CONTACT_PHASE',{shoot:.58,till:.52,fight:.515,work:.515,chop:.515,mine:.515,harvest:.55});
export const ACTION_FEEL=defineGameData('action-timing.ACTION_FEEL',{localHitStop:.045,effortPhase:.39,harvestLift:145,harvestSettle:22});
export const LOCAL_HIT_STOP=.045;
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export function harvestLift(p){return ACTION_FEEL.harvestLift*smooth((p-.55)/.065)+12*smooth((p-.60)/.025)-12*smooth((p-.66)/.04)-ACTION_FEEL.harvestSettle*smooth((p-.69)/.13)}
// Clock instances contain data only. Simulation and previews share these
// operations, so contact markers and local hit stops have one implementation.
export class ActionClock{
 constructor(kind='work',phase=0){resetActionClock(this,kind,phase)}
}
export function validActionClock(clock){
 return clock!==null&&typeof clock==='object'&&!Array.isArray(clock)
  &&Object.keys(clock).every(key=>['kind','time','hold','hit','effort','finished'].includes(key))
  &&Object.hasOwn(ACTION_DURATION,clock.kind)&&Number.isFinite(clock.time)&&clock.time>=0
  &&Number.isFinite(clock.hold)&&clock.hold>=0
  &&['hit','effort','finished'].every(key=>typeof clock[key]==='boolean');
}
export function resetActionClock(clock,kind,phase=0){
 if(!Object.hasOwn(ACTION_DURATION,kind)||!Number.isFinite(phase)||phase<0)throw Error('Invalid action clock reset');
 clock.kind=kind;clock.time=phase*ACTION_DURATION[kind];clock.hold=0;
 clock.hit=phase>=CONTACT_PHASE[kind];clock.effort=phase>=ACTION_FEEL.effortPhase;clock.finished=false;
}
export function actionClockPhase(clock){return clock?Math.min(1,clock.time/ACTION_DURATION[clock.kind]):undefined;}
export function advanceActionClock(clock,dt){
  const events=[];if(clock.finished)return events;
  let step=Math.max(0,dt);
  if(clock.hold>0){const used=Math.min(clock.hold,step);clock.hold-=used;step-=used}
  const duration=ACTION_DURATION[clock.kind],contact=duration*CONTACT_PHASE[clock.kind],next=clock.time+step;
  if(!clock.effort&&next>=duration*ACTION_FEEL.effortPhase){clock.effort=true;events.push('effort')}
  if(!clock.hit&&next>=contact){clock.time=contact;clock.hit=true;clock.hold=ACTION_FEEL.localHitStop;events.push('contact');return events}
  clock.time=Math.min(duration,next);
  if(clock.time>=duration){clock.finished=true;events.push('finish')}
  return events;
}
export function hitPose(age,kind='wood',direction=1){
 const t=Math.max(0,age-ACTION_FEEL.localHitStop),wave=Math.cos(t*31)*Math.exp(-t*13),active=t<.45;
 return {flash:age<.1?1:0,x:active?1+(kind==='tree'?.025:kind==='building'?.015:kind==='stone'?.025:.10)*wave:1,y:active?1-(kind==='tree'?.015:kind==='building'?.018:kind==='stone'?.035:.14)*wave:1,lean:kind==='tree'&&active?-direction*.065*wave:0};
}
