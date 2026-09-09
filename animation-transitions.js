import {actorPersonality} from "./ecs/personality-actors.js";
import {defineGameData} from './game-data.js';
export const TRANSITIONS=defineGameData('motion.transitions',{
 start:.28,stop:.3,turn:.26,pickup:1.05,deposit:1.05,conversationBeat:2.5,cast:1.6,castRecovery:.55
});
const clamp=t=>Math.max(0,Math.min(1,t));
export const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const pulse=(t,a,b,c)=>smooth((t-a)/(b-a))*(1-smooth((t-b)/(c-b)));
export function locomotionPose(kind,age,direction=1){
 const duration=TRANSITIONS[kind]??1,p=clamp(age/duration),w=Math.sin(p*Math.PI),out={lean:0,bodyY:0,headX:0,headTilt:0,squash:0,strideWeight:1,turnScale:1};
 if(kind==='start'){out.headX=direction*6*pulse(p,0,.16,.7);out.lean=direction*8*w;out.bodyY=4*w;out.strideWeight=smooth(p);}
 if(kind==='stop'){out.lean=direction*5*w;out.bodyY=5*w;out.squash=.035*w;out.strideWeight=1-smooth(p);}
 if(kind==='turn'){out.headX=direction*7*pulse(p,0,.25,.8);out.headTilt=direction*.055*w;out.lean=direction*6*Math.sin(p*Math.PI*2);out.bodyY=4*w;out.turnScale=1-.12*w;out.footLift0=9*Math.sin(Math.PI*clamp(p*2));out.footLift1=9*Math.sin(Math.PI*clamp((p-.5)*2));out.armSpread=-.12*w;}
 return out;
}
// Presentation-only history. Repeated renders at one simulation time are stable.
export function createLocomotionTracker(){
 let last=null,at=0,kind=null,oldFacing='right',stopPhase=0;
 return {sample(w,time,moving,facing=w.facing){
  if(!last||time<last.time){last={time,moving,facing};oldFacing=facing;kind=null;}
  if(facing!==last.facing){oldFacing=last.facing;at=time;kind='turn';}
  else if(moving!==last.moving){at=time;kind=moving?'start':'stop';stopPhase=w.phase??0;}
  const age=time-at,active=kind&&age<TRANSITIONS[kind],direction=facing==='left'?-1:1;
  const pose=active?locomotionPose(kind,age,1):{},renderFacing=active&&kind==='turn'&&age<TRANSITIONS.turn*.42?oldFacing:facing;
  if(active){const localDirection=renderFacing==='left'?-direction:direction;pose.headX*=localDirection;pose.lean*=localDirection;}
  const phase=active&&kind==='stop'?(stopPhase+age*.22)%1:w.phase;
  last={time,moving,facing};return {pose,facing:renderFacing,phase,walking:moving||!!(active&&kind==='stop'),kind:active?kind:null,direction};
 }};
}
export function resourceTransferPose(kind,age){
 const d=TRANSITIONS[kind],p=clamp(age/d),deposit=kind==='deposit';
 const crouch=deposit?pulse(p,0,.46,.98):pulse(p,0,.28,.9);
 const lift=deposit?1-smooth(p/.60):smooth((p-.28)/.57);
 return {bodyY:22*crouch,lean:12*crouch,squash:.1*crouch,headTilt:.07*crouch,headY:4*crouch,
  cargoY:70*(1-lift),cargoX:18*(1-lift),handWeight:deposit?1-smooth((p-.73)/.25):smooth(p/.22),
  cargoOpacity:deposit?1-smooth((p-.61)/.12):smooth((p-.22)/.10),
  armLift:deposit?-.05*smooth((p-.75)/.25):0,done:p>=1};
}
export function conversationPose(age,index=0,trait='steady',kind='chat'){
 const turn=Math.floor(Math.max(0,age)/TRANSITIONS.conversationBeat),t=Math.max(0,age)%TRANSITIONS.conversationBeat,speaking=turn%2===index;
 const shy=['shy','quiet','gentle','reserved'].includes(trait),bold=['outgoing','blunt','playful','confident'].includes(trait),gain=shy?.55:bold?1.2:.85;
 const envelope=smooth(t/.22)*(1-smooth((t-1.7)/.55));
 const gesture=speaking?envelope*gain:0,nod=!speaking?pulse(t,.55,.82,1.1)+pulse(t,1.3,1.51,1.78):0;
 return {speaking,headX:shy&&speaking?-4*envelope:2*envelope,headTilt:shy?.075*envelope:!speaking?-.04*envelope:.025*Math.sin(t*5)*envelope,
  headY:nod*4,bodyY:speaking?-2*gesture:0,lean:speaking?3*gesture:0,
  armLift:gesture*(kind==='argument'?.5:.22),armSpread:gesture*(shy?-.2:.22),wave:gesture*(.24+.12*Math.sin(t*8)),expression:kind==='affection'?'bashful':kind==='argument'?'angry':speaking?'happy':'thinking'};
}
export function villageConversation(e,w){
 if(w.state!=='socialising')return null;
 const s=e.life?.sessions.find(s=>s.until&&s.workers.some(p=>p.id===w.id));if(!s)return null;
 return conversationPose(e.time-(s.until-8),s.workers.findIndex(p=>p.id===w.id),(actorPersonality(w)?.trait),s.kind);
}
export function spellAttitude(kind){return ['fire','violence','uprising','heartbreak'].includes(kind)?'force':['love','friendship','animal-bond'].includes(kind)?'affection':'healing';}
export function castingPose(age,kind='life'){
 const attitude=spellAttitude(kind),charge=smooth(age/TRANSITIONS.cast),release=smooth((age-TRANSITIONS.cast)/.09),settle=smooth((age-TRANSITIONS.cast-.10)/.45),active=age>=0&&age<TRANSITIONS.cast+TRANSITIONS.castRecovery;
 const power=active?(1-settle):0,recoil=Math.sin(clamp((age-TRANSITIONS.cast)/.55)*Math.PI)*power;
 const force=attitude==='force',sweet=attitude==='affection';
 return {active,attitude,color:force?'#edaf6b':sweet?'#e99aad':'#bee7be',orb:active?charge*(1-release):0,burst:active?release*(1-settle):0,
  bodyY:power*(charge*5-recoil*3),lean:power*(-charge*(force?9:5)+recoil*(force?14:6)),squash:power*(charge*.035-recoil*.025),
  headTilt:power*(sweet?.08:-.055)*charge,headY:-charge*4*power,headX:0,
  hands:[[-35-15*charge+release*(force?45:18),-151-25*charge-recoil*12],[35+15*charge+release*(force?35:16),-151-25*charge-recoil*20]],
  handWeight:power*smooth(age/.25),sleeveLag:active?recoil*Math.sin(clamp((age-TRANSITIONS.cast-.06)/.49)*Math.PI)*9:0,expression:force?'angry':sweet?'bashful':'focused'};
}
export function wildlifeTransition(state,age,time=0,previousState=null){
 const enter=smooth(age/.55),graze=state==='grazing',alert=state==='alert',flee=state==='fleeing';
 const crouch=alert?pulse(age,.06,.2,.6)*.10:flee?pulse(age,0,.10,.28)*.12:0;
 const pose={head:graze?-enter*(.72+.07*Math.sin(time*1.8)):alert?.18*smooth((age-.12)/.2):flee?.10:0,
  headDrop:graze?enter*.15:0,bodyDrop:crouch+(graze?enter*.045:0),ear:alert?-.28*smooth(age/.08):graze?-.08*enter:0,
  hop:flee?pulse(age,.16,.33,.63)*.14:0};
 if(previousState==='grazing'&&!graze){const lift=smooth((age-(alert?.12:0))/.4);pose.head=-(.72+.07*Math.sin(time*1.8))*(1-lift)+pose.head*lift;pose.headDrop=.15*(1-lift);}
 return pose;
}
export function birdTransition(b,time){
 const flying=b.state==='flying',flight=b.flight,progress=flight?clamp((time-flight.at)/flight.duration):0;
 const approach=flying&&flight?smooth((progress-.72)/.25):0,age=b.landedAt==null?10:Math.max(0,time-b.landedAt);
 // First tuck the shoulder, then settle the feather tips: two separate beats.
 const shoulder=smooth(age/.22),tips=smooth((age-.2)/.32),open=flying?1:1-(shoulder*.68+tips*.32);
 return {approach,open,tipLag:flying?1:1-tips,feet:flying?.45+.55*approach:1,
  compression:!flying?pulse(age,0,.09,.32):0,brake:approach*.20};
}
