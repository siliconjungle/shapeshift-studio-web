import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {actorSocialActivity,ensureActorSocialActivity} from "./ecs/daily-activity-actors.js";
import {ensureActorDivineResponse,actorDivineResponse} from "./ecs/religion-actors.js";
import {beastCommands,ensureBeastCommands} from './ecs/beast-commands.js';
import {BeastEmotions} from './ecs/beast-emotions-data.js';
import {beastEmotions,ensureBeastEmotions} from './ecs/beast-emotions.js';
import {beastRelationships} from './ecs/beast-relationships.js';
import {beastsCue,beastsLiving,beastsRoute,beastsInterrupt} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {romanceBreakUp} from './village-romance.js';
import {actorRomance,ensureActorRomance} from './ecs/actor-romance.js';
import {actorFeelings} from './ecs/actor-feelings.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {beastTraits} from './beast-origins.js';
import {defineGameData} from './game-data.js';
import {socialPeople} from './village-people.js';
import {beastRelation,rememberBeast} from './beast-behaviour.js';
import {activeHeartbreak,comfortHeartbreak,hurtRomantically} from './village-feelings.js';
import {DAY_LENGTH_SECONDS} from './village-time.js';

export const BEAST_EMOTION_RULES=defineGameData('beast-emotions.BEAST_EMOTION_RULES',{socialPerDay:95,angerRecovery:.002,jealousyRecovery:.002,warningSeconds:3,witnessRadius:9,jealousyCooldown:25});
const clamp=n=>Math.max(0,Math.min(1,n)),alive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled&&!w.gone;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function beastEmotionMood(b,now){return (beastEmotions(b)?.anger)>.65?'Angry':(beastEmotions(b)?.jealousy)>.35?'Jealous':(actorFeelings(b)?.heartbreak)&&(actorFeelings(b)?.heartbrokenUntil)>now?'Heartbroken':actorNeeds(b).social<30?'Lonely':(actorRomance(b)?.sweetheartId)!=null?'In love':(actorFeelings(b)?.crush)?'Smitten':'Content';}
export function jealousBeast(e,b,rival,reason){
 if(!alive(b)||!alive(rival)||(personAge(rival)?.child)||e.time<((beastEmotions(b)?.jealousAfter)??0))return false;
 ensureBeastEmotions(b).jealousAfter=e.time+BEAST_EMOTION_RULES.jealousyCooldown;ensureBeastEmotions(b).jealousy=clamp((beastEmotions(b)?.jealousy)+.32*beastTraits(b).jealousy);ensureBeastEmotions(b).anger=clamp((beastEmotions(b)?.anger)+.22*beastTraits(b).jealousy);ensureBeastEmotions(b).emotionalTargetId=rival.id;ensureBeastEmotions(b).emotionalReason=reason;
 rememberBeast(b,e,reason);beastsCue(e.beasts,b,'grumpy','angry');return true;
}
// Only witnessed romantic attention causes jealousy. Ordinary friendships and
// children's play remain safe, and healing a stranger once is not a betrayal.
export function noticeBeastMiracle(e,kind,check){
 const b=beastsLiving(e.beasts);if(!b)return;
 const pair=check.pair??[],beloved=(actorRomance(b)?.sweetheartId)??(actorFeelings(b)?.crush)?.targetId??(activeHeartbreak(e,b)?.otherId);
 if(kind==='love'&&pair.some(w=>w.id===b.id)){ensureBeastEmotions(b).anger=Math.max(0,(beastEmotions(b)?.anger)-.4);ensureBeastEmotions(b).jealousy=0;}
 if(kind==='enmity'&&pair.includes(b)){const other=pair.find(w=>w!==b);ensureBeastEmotions(b).anger=clamp((beastEmotions(b)?.anger)+.35);ensureBeastEmotions(b).emotionalReason='Our god turned '+other.name+' against me.';ensureBeastEmotions(b).emotionalTargetId=other.id;
  const r=beastRelation(b,other);if((actorRomance(b)?.sweetheartId)===other.id)romanceBreakUp(e.life.romance,b,other,r);
 }
 if(kind==='friendship'&&pair.includes(b)){ensureBeastEmotions(b).anger=Math.max(0,(beastEmotions(b)?.anger)-.25);ensureBeastEmotions(b).jealousy=Math.max(0,(beastEmotions(b)?.jealousy)-.2);}
 if(kind==='love'&&!pair.includes(b)&&pair.some(w=>w.id===beloved)&&!(actorInterior(b)?.inside)&&pair.some(w=>distance(b,w)<BEAST_EMOTION_RULES.witnessRadius))jealousBeast(e,b,pair.find(w=>w.id!==beloved),'Our god brought someone else close to '+(pair.find(w=>w.id===beloved)?.name??'my beloved')+'.');
}
export function updateBeastEmotions(e,b,dt){
 const people=socialPeople(e);
 // Resolve losses before the dead beast's visual actor is retired. Memories
 // retain the name even when its model no longer occupies a render slot.
 for(const w of people){
  if(w!==b&&(actorRomance(w)?.sweetheartId)!==b.id&&(actorRomance(b)?.sweetheartId)!==w.id)continue;
  if(w===b)continue;
  if(!alive(w)||!alive(b)||(personAge(w)?.child)){
   const wasPair=(actorRomance(w)?.sweetheartId)===b.id&&(actorRomance(b)?.sweetheartId)===w.id;
   if((actorRomance(w)?.sweetheartId)===b.id)ensureActorRomance(w).sweetheartId=null;if((actorRomance(b)?.sweetheartId)===w.id)ensureActorRomance(b).sweetheartId=null;
   const r=beastRelation(b,w);r.romanceStatus='ended';r.romanceAfter=e.time+180;
   if(wasPair&&!(personAge(w)?.child)){const survivor=alive(b)?b:alive(w)?w:null,other=survivor===b?w:b;if(survivor){const text='I lost my sweetheart, '+other.name+'.';if(survivor===b)rememberBeast(b,e,text);else (ensureActorDivineResponse(survivor).memories)=[{text,at:e.time},...((actorDivineResponse(survivor)?.memories)??[])].slice(0,6);hurtRomantically(e,survivor,other,'bereaved',{attachment:Math.max(.8,r.affinity),established:true});if(survivor===b)beastsCue(e.beasts,b,'heartbroken','crying');else e.emit('heartbreak-withdrawn',survivor,null,{partnerId:b.id});}}
  }
 }
 if(!alive(b)||!(dt>0))return;
 actorNeeds(b).social=Math.max(0,actorNeeds(b).social-dt/DAY_LENGTH_SECONDS*(b.state==='sleeping'?8:BEAST_EMOTION_RULES.socialPerDay*beastTraits(b).socialRate));
 ensureBeastEmotions(b).anger=Math.max(0,(beastEmotions(b)?.anger)-dt*BEAST_EMOTION_RULES.angerRecovery*beastTraits(b).calming);ensureBeastEmotions(b).jealousy=Math.max(0,(beastEmotions(b)?.jealousy)-dt*BEAST_EMOTION_RULES.jealousyRecovery);
 const h=activeHeartbreak(e,b);if(h)ensureBeastEmotions(b).anger=Math.max((beastEmotions(b)?.anger),h.severity*.65);
 const loved=people.find(w=>w.id===((actorRomance(b)?.sweetheartId)??(actorFeelings(b)?.crush)?.targetId));
 if(alive(loved)&&!(personAge(loved)?.child)&&!(actorInterior(loved)?.inside)&&distance(b,loved)<BEAST_EMOTION_RULES.witnessRadius){
  const rival=people.find(w=>w.id===actorSocialActivity(loved)?.partnerId);
  if(loved.state==='socialising'&&actorSocialActivity(loved)?.socialKind==='affection'&&rival!==b&&alive(rival))jealousBeast(e,b,rival,'I felt jealous seeing '+loved.name+' being affectionate with '+rival.name+'.');
 }
 // Anger is telegraphed before it can contribute to a violent decision.
 if((beastEmotions(b)?.anger)>.5&&(beastEmotions(b)?.emotionalWarningAt)==null){ensureBeastEmotions(b).emotionalWarningAt=e.time;ensureBeastEmotions(b).emotionalLashAfter=e.time+BEAST_EMOTION_RULES.warningSeconds;beastsCue(e.beasts,b,'grumpy','angry');}
 if((beastEmotions(b)?.anger)<=.5){delete beastEmotions(b)?.emotionalWarningAt;delete beastEmotions(b)?.emotionalLashAfter;}
 if(e.time>=((beastEmotions(b)?.emotionCueAfter)??0)&&(h||actorNeeds(b).social<25||(beastEmotions(b)?.jealousy)>.35)){beastsCue(e.beasts,b,h?'heartbroken':(beastEmotions(b)?.jealousy)>.35?'grumpy':'disappointed',h?'crying':(beastEmotions(b)?.jealousy)>.35?'angry':'worried');ensureBeastEmotions(b).emotionCueAfter=e.time+25;}
}
export function inviteBeastCompany(e,w){
 const b=beastsLiving(e.beasts);if(!b||(actorVitality(w)?.dead)||(actorInterior(w)?.inside)||w.divineHeld||w.cargo||w.state!=='idle'||b.divineHeld||(beastCommands(b)?.playOrder)||(beastCommands(b)?.guardOrder)?.until>e.time||!['idle','wandering'].includes(b.state)||actorNeeds(b).hunger>75||actorNeeds(b).energy<25||(beastEmotions(b)?.anger)>.65||distance(b,w)>12)return false;
 const r=beastRelation(b,w);if((actorRomance(w)?.sweetheartId)!==b.id&&(actorFeelings(w)?.crush)?.targetId!==b.id&&!(r.affinity>.55&&e.random()<.25))return false;
 if(!beastsRoute(e.beasts,b,{x:w.x+1.7,z:w.z}))return false;
 beastsInterrupt(e.beasts,b);ensureBeastCommands(b).playOrder={villagerId:w.id,until:e.time+45,played:0,autonomous:true};ensureActorSocialActivity(w).socialAfter=e.time+20;w.wait=Math.max(w.wait??0,2);return true;
}
export function seekBeastCompany(e,b){
 if(actorNeeds(b).social>=48||actorNeeds(b).hunger>75||actorNeeds(b).energy<25||(beastCommands(b)?.playOrder)||(beastCommands(b)?.guardOrder)?.until>e.time||(beastEmotions(b)?.anger)>.65||e.time<((beastEmotions(b)?.companyAfter)??0))return false;
 ensureBeastEmotions(b).companyAfter=e.time+15;
 const friends=e.workers.filter(w=>!w.expeditionId&&alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&w.state==='idle'&&!w.cargo&&actorNeeds(w).hunger<75&&beastRelation(b,w).affinity>-.3);
 const score=w=>beastRelation(b,w).affinity*3+((actorRomance(b)?.sweetheartId)===w.id?3:(actorFeelings(b)?.crush)?.targetId===w.id?1:0)+(100-actorNeeds(w).social)/100-distance(b,w)*.15;
 friends.sort((a,c)=>score(c)-score(a));
 for(const w of friends){if(distance(b,w)>12||!beastsRoute(e.beasts,b,{x:w.x+1.7,z:w.z}))continue;ensureBeastCommands(b).playOrder={villagerId:w.id,until:e.time+45,played:0,autonomous:true};return true;}
 return false;
}
export function comfortBeastCompany(e,b,w){
 if(activeHeartbreak(e,w)&&beastRelation(b,w).affinity>.28&&(actorFeelings(w)?.heartbreak).otherId!==b.id)comfortHeartbreak(e,w,b);
 if(!activeHeartbreak(e,b)||(actorFeelings(b)?.heartbreak).otherId===w.id||beastRelation(b,w).affinity<.28)return false;
 comfortHeartbreak(e,b,w);ensureBeastEmotions(b).anger=Math.max(0,(beastEmotions(b)?.anger)-.25);ensureBeastEmotions(b).jealousy=Math.max(0,(beastEmotions(b)?.jealousy)-.2);rememberBeast(b,e,w.name+' stayed with me when I was heartbroken.');return true;
}
export function validBeastEmotions(b){
 const unit=n=>Number.isFinite(n)&&n>=0&&n<=1;
 const data=beastEmotions(b);
 return (!data||BeastEmotions.validate(data))&&(actorNeeds(b).social===undefined||Number.isFinite(actorNeeds(b).social)&&actorNeeds(b).social>=0&&actorNeeds(b).social<=100)&&(beastRelationships(b)??[]).every(r=>['attractionAB','attractionBA'].every(k=>r[k]===undefined||unit(r[k]))&&(r.compatibility===undefined||unit(r.compatibility)));
}
