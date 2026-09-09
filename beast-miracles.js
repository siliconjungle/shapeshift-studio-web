import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {constructionProgress} from './ecs/housing-state.js';
import {ensureConstructionProgress} from './ecs/housing-state.js';
import {ensureActorDeprivation} from './ecs/actor-deprivation.js';
import {ensureBeastEffects,beastEffects} from './ecs/beast-effects.js';
import {ensureBeastCommands,beastCommands} from './ecs/beast-commands.js';
import {ensureBeastEmotions,beastEmotions} from './ecs/beast-emotions.js';
import {ensureBeastLearning,beastLearning} from './ecs/beast-learning.js';
import {beastsLiving,beastsReinforce,beastsInterrupt,beastsCue,beastsRoute,beastsMove} from './village-beasts.js';
import {actorVitality,ensureActorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt} from './village-survival.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {defineGameData} from './game-data.js';
import {comfortBeastCompany} from './beast-emotions.js';
import {beastEncounter,noteBeastBehaviour,rememberBeast} from './beast-behaviour.js';
import {homePosition} from './village-shelter.js';
export const BEAST_MIRACLE_IDS=['praise','scold','beast-feast','guard','play','rampage','lullaby'];
export const BEAST_MIRACLE_RULES=defineGameData('beast-miracles.BEAST_MIRACLE_RULES',{guardSeconds:60,playSeconds:12,settledSeconds:35,rampageSeconds:20,rampageDamage:2,lullabySeconds:20});
export const beastAvailable=e=>!!beastsLiving(e.beasts);
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.gone&&!w.exiled;
export function beastWard(e,t){
 if(t?.kind==='villager'){const w=e.workers.find(w=>w.id===t.id);return alive(w)?{...w,...((actorInterior(w)?.inside)?homePosition((actorInterior(w)?.insideAt)??(actorResidence(w)?.home)):{}),name:w.name}:null;}
 if(t?.kind==='house'){const h=e.life?.homes.find(h=>h.id===t.id);return h&&!(structuralCondition(h)?.destroyed)?{...homePosition(h),name:h.name??'this home'}:null;}
 if(t?.kind!=='structure')return null;
 const k=t.structureKind;
 if(k==='workshop')return {...e.depot,name:'the resource store'};
 if(k==='shrine'&&e.faith?.shrine)return {...e.faith.shrine,name:'the shrine'};
 if(k==='campfire'){const f=e.exploration?.camps.find(c=>'structure:'+c.id===t.id)?.fire??e.campfire;return f?.built?{x:f.x,z:f.z,name:'the campfire'}:null;}
 if(k==='cottage'||k==='chapel'||k==='watchtower')return beastWard(e,{kind:'house',id:t.homeId});
 if(k==='construction'){const p=e.housing?.projects.find(p=>p.id===t.homeId&&(constructionProgress(p)?.state)!=='destroyed');return p?{x:p.x,z:p.z,name:'the building site'}:null;}
 return null;
}
export function beastMiracleTarget(e,kind,t){
 const b=beastsLiving(e.beasts);if(!b)return {valid:false,reason:'Summon a beast to unlock these miracles.'};
 if(t?.kind==='beast'&&t.id!==b.id)return {valid:false,reason:'These lessons are for your own beast.'};
 if(b.divineHeld&&!['praise','scold'].includes(kind))return {valid:false,reason:'Put down the beast first.'};
 if(kind==='guard'){const point=beastWard(e,t);return point?{valid:true,beast:b,point,ward:{kind:t.kind,id:t.id,structureKind:t.structureKind,homeId:t.homeId},label:`${b.name} will guard ${point.name} for 60 seconds.`}:{valid:false,reason:'Choose a villager or village structure to guard.'};}
 if(kind==='play'){const w=t?.kind==='villager'&&e.workers.find(w=>w.id===t.id);return alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!['ritual-bound','ritual-victim-bound','dead'].includes(w.state)?{valid:true,beast:b,actor:w,point:w,label:`${b.name} will play with ${w.name}.`}:{valid:false,reason:'Choose a living villager outdoors for the beast to play with.'};}
 if(t?.kind!=='beast'||t.id!==b.id)return {valid:false,reason:'Choose your living beast.'};

 return {valid:true,beast:b,actor:b,point:b,label:kind==='beast-feast'?`Fill ${b.name}’s belly.`:kind==='lullaby'?`Let ${b.name} sleep deeply for 20 seconds.`:kind==='rampage'?`${b.name} will rampage for 20 seconds.`:`${kind==='praise'?'Praise':'Scold'} ${b.name}; it will associate this with its actions or surroundings.`};
}
export function castBeastMiracle(e,kind,c){
 const b=c.beast,r=BEAST_MIRACLE_RULES;
 if(kind==='praise'||kind==='scold'){beastsReinforce(e.beasts,b,kind);return;}
 if(kind==='beast-feast'){
  actorNeeds(b).hunger=0;ensureActorDeprivation(b).starvingFor=0;ensureBeastEmotions(b).fear=Math.max(0,((beastEmotions(b)?.fear)??0)-.06);ensureBeastLearning(b).trust=Math.min(1,(beastLearning(b)?.trust)+.08);ensureBeastEffects(b).settledUntil=e.time+r.settledSeconds;
  if(['eating','meal-bound'].includes(b.state))beastsInterrupt(e.beasts,b);
  rememberBeast(b,e,'Our god gave me an enormous feast. My belly is full.');beastsCue(e.beasts,b,'delight','happy');return;
 }
 beastsInterrupt(e.beasts,b);ensureBeastCommands(b).playOrder=null;ensureBeastEffects(b).rampageUntil=0;ensureBeastEffects(b).lullabyUntil=0;
 if(kind==='guard'){ensureBeastCommands(b).guardOrder={...c.ward,name:c.point.name,until:e.time+r.guardSeconds};ensureBeastCommands(b).orderRetryAt=0;rememberBeast(b,e,`Our god asked me to guard ${c.point.name}.`);beastsCue(e.beasts,b,'determined','focused');}
 if(kind==='play'){ensureBeastCommands(b).playOrder={villagerId:c.actor.id,until:e.time+45,played:0};ensureBeastCommands(b).orderRetryAt=0;ensureBeastCommands(b).guardOrder=null;ensureBeastEffects(b).settledUntil=e.time+r.settledSeconds;beastsCue(e.beasts,b,'delight','happy');}
 if(kind==='rampage'){ensureBeastCommands(b).guardOrder=null;ensureBeastEffects(b).rampageUntil=e.time+r.rampageSeconds;ensureBeastEffects(b).rampageCheckAt=0;rememberBeast(b,e,'Our god filled me with wild strength.');beastsCue(e.beasts,b,'grumpy','angry');}
 if(kind==='lullaby'){ensureBeastCommands(b).guardOrder=null;b.state='sleeping';ensureBeastEffects(b).lullabyUntil=e.time+r.lullabySeconds;ensureBeastEffects(b).settledUntil=e.time+r.settledSeconds;rememberBeast(b,e,'Our god sang me into a deep and peaceful sleep.');beastsCue(e.beasts,b,'sleepy','sleepy');}
}
export function updateBeastOrder(e,b,dt){
 const r=BEAST_MIRACLE_RULES;
 if((beastEffects(b)?.lullabyUntil)>e.time){b.state='sleeping';b.route=[];actorNeeds(b).energy=Math.min(100,actorNeeds(b).energy+dt*5);ensureActorVitality(b).health=Math.min((actorVitality(b)?.maxHealth),(actorVitality(b)?.health)+dt*2);return true;}
 if((beastEffects(b)?.lullabyUntil)){ensureBeastEffects(b).lullabyUntil=0;beastsInterrupt(e.beasts,b);}
 if((beastCommands(b)?.guardOrder)&&(!beastWard(e,(beastCommands(b)?.guardOrder))||(beastCommands(b)?.guardOrder).until<=e.time)){ensureBeastCommands(b).guardOrder=null;if(b.state==='guarding'||b.state==='guard-bound')beastsInterrupt(e.beasts,b);}
 const order=(beastCommands(b)?.playOrder);if(!order)return false;
 const w=e.workers.find(w=>w.id===order.villagerId);
 if(!alive(w)||(actorInterior(w)?.inside)||w.divineHeld||order.autonomous&&(actorNeeds(w).hunger>80||actorNeeds(b).hunger>80||!order.met&&w.state!=='idle')||order.until<=e.time||order.met&&w.state!=='beast-playing'){ensureBeastCommands(b).playOrder=null;beastsInterrupt(e.beasts,b);return false;}
 if(Math.hypot(b.x-w.x,b.z-w.z)>2.1){
  b.state='play-bound';if(e.time>=((beastCommands(b)?.orderRetryAt)??0)){ensureBeastCommands(b).orderRetryAt=e.time+1.5;const angle=Math.atan2(b.z-w.z,b.x-w.x);b.route=beastsRoute(e.beasts,b,{x:w.x+Math.cos(angle)*1.7,z:w.z+Math.sin(angle)*1.7})??[];}
  beastsMove(e.beasts,b,dt);return true;
 }
 b.state='playing';b.route=[];b.facing=w.x<b.x?'left':'right';order.played+=dt;actorNeeds(b).social=Math.min(100,actorNeeds(b).social+dt*3);actorNeeds(w).social=Math.min(100,actorNeeds(w).social+dt*2);
 if(!order.met){survivalInterrupt(e.survival,w);w.state='beast-playing';w.beastPlayId=b.id;order.met=true;beastsCue(e.beasts,b,'delight','happy');e.emit('divine-witness',w,null,{reaction:'delight'});}
 if(order.played>=r.playSeconds){beastEncounter(b,w,e,.35,`${b.name} played happily with ${w.name}.`);noteBeastBehaviour(b,e,'company',w.id);comfortBeastCompany(e,b,w);ensureBeastLearning(b).trust=Math.min(1,(beastLearning(b)?.trust)+.04);ensureBeastEffects(b).settledUntil=e.time+r.settledSeconds;ensureBeastCommands(b).playOrder=null;beastsInterrupt(e.beasts,b);beastsCue(e.beasts,b,'love','happy');}
 return true;
}
export function guardBeast(e,b,dt){
 const ward=(beastCommands(b)?.guardOrder)&&beastWard(e,(beastCommands(b)?.guardOrder));if(!ward)return false;
 if(Math.hypot(b.x-ward.x,b.z-ward.z)<=3.2){b.state='guarding';b.route=[];return true;}
 b.state='guard-bound';if(e.time>=((beastCommands(b)?.orderRetryAt)??0)){ensureBeastCommands(b).orderRetryAt=e.time+2;const a=Math.atan2(b.z-ward.z,b.x-ward.x);b.route=[];for(const turn of [0,.8,-.8,1.6,-1.6,Math.PI]){const p={x:ward.x+Math.cos(a+turn)*2.8,z:ward.z+Math.sin(a+turn)*2.8},route=beastsRoute(e.beasts,b,p);if(route){b.route=route;break;}}}
 beastsMove(e.beasts,b,dt);return true;
}
