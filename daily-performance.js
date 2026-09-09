import {defineGameData} from './game-data.js';
import {smooth} from './animation-transitions.js';
import {actorNeeds} from './ecs/actor-needs.js';
export const DAILY=defineGameData('motion.daily',{mealPeriod:4.7,warmPeriod:6,stowSeconds:.65,alarmSeconds:1.45,takeoffSeconds:.28,finishSeconds:2.4});
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const pulse=(t,a,b,c)=>smooth((t-a)/(b-a))*(1-smooth((t-b)/(c-b)));
const empty=()=>({bodyY:0,lean:0,headY:0,headX:0,headTilt:0,squash:0,armLift:0,armSpread:0,wave:0,hop:0});
export function dailyPose(kind,age,options={}){
 const t=Math.max(0,age),seed=options.seed??0,g=empty(),enter=smooth(t/.3),beat=t%(DAILY.mealPeriod+(seed%3)*.35);
 if(kind==='meal'){
  const bite=pulse(beat,.4,1.25,2.7)*enter;g.headTilt=.055*bite;g.headY=4*bite;g.bodyY=3*bite;
  g.foregroundHands=true;g.mealBite=bite;g.transfer={cargoX:48*bite,cargoY:-28*bite,handWeight:1,cargoOpacity:1};g.expression=bite>.6?'happy':'neutral';
 }
 if(kind==='warm'){
  const q=t%(DAILY.warmPeriod+(seed%3)*.3),rub=pulse(q,0,.65,1.8),reach=pulse(q,1.4,2.3,4.7),relax=pulse(q,4.4,5,6);
  g.hands=[[-15+Math.sin(t*17)*4*rub-26*reach,-113-15*rub-18*reach],[15+Math.sin(t*17)*4*rub+26*reach,-113-15*rub-18*reach]];g.handWeight=enter*(1-relax*.55);g.headTilt=.035*relax;g.lean=5*reach;g.expression='happy';
 }
 if(kind==='pet'){
  const reach=smooth(t/.45)*(1-smooth((t-2.6)/.6));g.bodyY=13*reach;g.lean=6*reach;g.headTilt=.06*reach;g.targetWeight=reach;g.stroke=Math.sin(t*5)*5*reach;g.nearOnly=true;g.expression='happy';
 }
 if(kind==='care'||kind==='affection'){
  const touch=smooth(t/.65)*(1-smooth((t-2.8)/.8)),child=options.child;g.bodyY=child?-7*touch:kind==='care'?26*touch:3*touch;g.headTilt=(child?-.075:.075)*touch;g.targetWeight=touch;g.nearOnly=true;g.armLift=child?.25*touch:0;g.expression=kind==='affection'?'bashful':'happy';g.stroke=0;
 }
 if(kind==='prayer'){
  const desperate=options.desperate,q=t%(desperate?2.1:4),bow=pulse(q,0,.55,1.55),look=pulse(q,1.4,1.9,desperate?2.1:3.8);
  g.foregroundHands=true;g.hands=[[27,-144],[43,-144]];g.handWeight=enter;g.headTilt=.14*bow-.12*look;g.headY=8*bow-5*look;g.bodyY=11*bow;g.lean=desperate?Math.sin(t*7)*2*enter:0;g.expression=desperate?'worried':'hopeful';
 }
 if(kind==='discover'||kind==='chest'){
  const chest=kind==='chest',duration=options.duration??3.2,p=clamp(t/duration),kneel=smooth(p/.35),tryLid=pulse(p,.32,.44,.6),key=pulse(p,.55,.65,.78),release=smooth((p-.8)/.2);
  g.bodyY=(chest?42:24)*kneel;g.headTilt=.1*kneel-.13*release;g.headY=5*kneel;g.lean=(chest?8:6)*kneel-(chest?9:0)*release;g.armLift=chest?0:.25*kneel;
  g.hands=chest?[[48,-49-8*tryLid],[85,-46-7*tryLid-8*key]]:null;g.handWeight=chest?kneel:0;g.key=chest&&options.locked?key:0;g.expression=tryLid>.5&&options.locked?'confused':release>.5?'surprised':'thinking';
 }
 if(kind==='trade'){
  const present=pulse(t,0,.6,1.2),nod=pulse(t,1.2,1.55,1.9),exchange=smooth((t-1.7)/.7);g.headTilt=.09*present-.075*nod;g.headY=3*nod;g.lean=4*exchange;
  g.transfer={cargoX:28*present+83*exchange,cargoY:-12*present+5*exchange,cargoOpacity:1,handWeight:1};g.expression=t<1.3?'thinking':'happy';g.offer=present;g.exchange=exchange;
 }
 if(kind==='stow'){const p=clamp(t/DAILY.stowSeconds),settle=smooth(p);g.hands=[[60-90*settle,-101+25*settle],[86-12*settle,-87+11*settle]];g.handWeight=1-smooth((p-.65)/.35);g.toolOpacity=1-smooth((p-.55)/.4);g.toolAngle=.45+.65*settle;g.headTilt=.04*Math.sin(p*Math.PI);g.expression='neutral';}
 if(kind==='alarm'){
  const q=t-(options.delay??0),notice=pulse(q,0,.13,.65),brace=pulse(q,.12,.38,DAILY.alarmSeconds);g.headX=6*notice;g.headTilt=-.07*notice;g.bodyY=8*brace;g.armLift=.6*brace;g.armSpread=.16*brace;g.freeze=notice>.3;g.expression='surprised';
 }
 if(kind==='finish'){const admire=pulse(t,.1,.55,2.4);g.lean=-5*admire;g.headTilt=-.1*admire;g.headY=-4*admire;g.armSpread=.14*admire;g.expression='proud';g.stepBack=.12*pulse(t,0,.45,1.7);}
 if(kind==='weather'){
  const wave=pulse(t,.1,.3,1.5);g.armLift=.25*wave;g.wave=.88*wave;g.headTilt=-.075*wave;g.lean=-5*wave;g.expression=options.thunder?'surprised':'neutral';if(options.thunder){g.bodyY=9*wave;g.armSpread=-.25*wave;}
 }
 if(kind==='collapse'){
  const knees=smooth(t/.45),reach=pulse(t,.12,.5,1.1);g.bodyY=53*knees;g.headY=8*smooth((t-.13)/.4);g.headTilt=.17*smooth((t-.2)/.5);g.armLift=.6*reach;g.armSpread=.15*reach;g.expression='sleepy';
 }
 if(kind==='recover'){
  const brace=pulse(t,0,.10,.32),settle=pulse(t,.2,.45,.9);g.bodyY=10*brace+4*settle;g.lean=-11*brace+4*settle;g.headTilt=.09*brace-.025*settle;g.armLift=.35*brace;g.expression=t<.35?'hurt':'determined';
 }
 return g;
}
export function moodPose(w,time){
 const needs=actorNeeds(w)??w.needs;
 const fatigue=clamp((48-(needs?.energy??100))/45),heartbreak=!!((w.heartbrokenUntil??0)>time),happy=(w.fulfilledUntil??0)>time||needs?.social>82;
 return {bodyY:fatigue*9+(heartbreak?5:0),headY:fatigue*5,headTilt:fatigue*.055+(heartbreak?.045:0),armSpread:heartbreak?-.17:0,armLift:heartbreak?.08:0,lean:fatigue*3,gaitWeight:1-fatigue*.25,gaitBounce:happy?1.15:1-fatigue*.5,headLag:fatigue*.12};
}
export function skillPerformance(p,level=0){const novice=1-clamp(level/5),adjust=pulse(p,.10,.18,.29)*novice,correct=pulse(p,.69,.74,.84)*novice;return {headTilt:.035*adjust,headY:3*adjust,lean:4*correct,grip:2*Math.sin(p*50)*adjust,amplitude:1-.16*clamp(level/5)};}
export function buildingFinishPose(age){const p=clamp(age/DAILY.finishSeconds),r=age>=0&&p<1?Math.sin(age*12)*Math.exp(-age*3.5):0;return {roof:Math.max(0,r)*.09,settle:r*.022,dust:age>=0&&age<.85?1-age/.85:0};}
export function birdLifePose(b,time){
 const age=b.flight?Math.max(0,time-b.flight.at):100,launch=b.state==='flying'&&age<.65,crouch=launch?pulse(age,0,.12,.28):0,push=launch?pulse(age,.17,.3,.55):0;
 const seed=Number(String(b.id??'0').split('-').at(-1))||0,q=(time+seed*2.3)%12,quiet=!b.dead&&!['flying','swooping','pecking'].includes(b.state)&&time-(b.landedAt??-100)>1;
 return {crouch,push,launch,head:quiet?(pulse(q,1,1.13,1.7)-pulse(q,2,2.13,2.7))*.18:0,ruffle:quiet?pulse(q,5,5.2,5.8)*Math.sin(q*32):0,hop:quiet?pulse(q,8,8.18,8.45)*.055:0};
}
export function petAnimalPose(age){const w=smooth(age/.5)*(1-smooth((age-2.7)/.7));return {lean:.06*w,head:-.06*w,eyes:1-.82*w,ear:Math.sin(age*6)*.08*w};}
