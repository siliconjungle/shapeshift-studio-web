import {actorFaith} from "./ecs/religion-actors.js";
import {beastsLiving} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {SKILL_WISHES} from './skill-wishes.js';
import {defineGameData} from './game-data.js';
import {WISHES} from './wish-catalog.js';

const ORIGINAL_STARTERS=['curse','life','fire','rain','food','wood','stone','hand'];
export const STARTER_CARDS=Object.freeze([...ORIGINAL_STARTERS,'love','friendship','newcomer','shield','repair','energy','clear-skies','ping','leave-here','violence','sleep','uprising','animal-bond','call-wild','dream','rat','owl','acorn','poison','purify',...Object.keys(SKILL_WISHES)]);
export const BEAST_STARTER_CARDS=Object.freeze(['praise','scold','beast-feast']);
export const STARTER_HAND=Object.freeze(['life','fire','rain']);
export const BELIEF_RULES=defineGameData('god-belief.BELIEF_RULES',Object.freeze({firstLevel:70,levelGrowth:35,faithRate:.9,faithFloor:.2,chestCardChance:.12,chestBeliefChance:.5,chestBeliefMin:20,chestBeliefRange:26,favouredLimit:3}));
export const beliefRequired=level=>BELIEF_RULES.firstLevel+(level-1)*BELIEF_RULES.levelGrowth;
export function knowsWish(e,id){return !!WISHES[id]&&(!WISHES[id].cultures||WISHES[id].cultures.includes(e.culture))&&relicMiracleAvailable(e,id)&&(!WISHES[id].beastOnly||!!beastsLiving(e.beasts))&&(!e.belief||e.belief.known.includes(id));}
export function beliefDrawMultiplier(e,id){return e.belief?.favoured.includes(id)?2.5:1;}
export function initialiseBelief(e,{preserveHand=false}={}){
 if(e.belief){upgradeBelief(e);return e.belief;}
 // Older villages retain the cards actually held, rather than retroactively
 // earning the entire former catalogue or losing a carefully saved reserve.
 const held=preserveHand?[...(e.wishes?.queue??[]),e.wishes?.reserve].filter(id=>WISHES[id]):[];
 e.belief={version:1,level:1,points:0,total:0,known:[...new Set([...STARTER_CARDS,...held])],favoured:[],offers:[],nextOffer:0,beastUnlocked:false,treasures:[]};
 if(e.beasts?.summons>0||held.some(id=>WISHES[id].beastOnly))unlockBeastBelief(e);
 return e.belief;
}
function sample(e,list){const pool=[...list],out=[];while(pool.length){const i=Math.min(pool.length-1,Math.floor(Math.max(0,e.random())*pool.length));out.push(pool.splice(i,1)[0]);}return out;}
function optionsFor(e,source,keep=[]){
 const b=e.belief,eligible=id=>(!WISHES[id].cultures||WISHES[id].cultures.includes(e.culture))&&(!WISHES[id].beastOnly||b.beastUnlocked&&!!beastsLiving(e.beasts));
 const pool=Object.keys(WISHES).filter(id=>!RELIC_MIRACLES[id]&&eligible(id)&&(source!=='beast'||WISHES[id].beastOnly));
 const held=new Set(keep.map(c=>c.id)),out=keep.filter(c=>pool.includes(c.id)&&c.mode===(b.known.includes(c.id)?'favour':'learn'));
 held.clear();out.forEach(c=>held.add(c.id));if(out.length===3)return out;
 const locked=sample(e,pool.filter(id=>!held.has(id)&&!b.known.includes(id)));
 // Once a pool is nearly learned, offer ways to change the player's style.
 // Favour changes draw frequency, never spell strength or the current hand.
 const familiar=sample(e,pool.filter(id=>!held.has(id)&&b.known.includes(id)&&!b.favoured.includes(id)));
 const remaining=sample(e,pool.filter(id=>!held.has(id)&&b.known.includes(id)&&b.favoured.includes(id)));
 for(const id of [...locked,...familiar,...remaining]){if(out.length>=3)break;out.push({id,mode:b.known.includes(id)?'favour':'learn'});}
 return out;
}
export function offerBeliefCards(e,source='level'){
 const b=e.belief;if(!b)return null;
 const offer={id:'belief-'+b.nextOffer++,source,level:b.level,options:optionsFor(e,source)};
 if(offer.options.length!==3)return null;
 if(source==='beast')b.offers.unshift(offer);else b.offers.push(offer);
 return offer;
}
export function chooseBeliefCard(e,offerId,cardId){
 syncRelicOffers(e);
 const b=e.belief,offer=b?.offers[0],choice=offer?.options.find(c=>c.id===cardId);
 if(!offer||offer.id!==offerId||!choice||WISHES[cardId]?.beastOnly&&!beastsLiving(e.beasts))return {valid:false,reason:'That reward is no longer available.'};
 if(choice.mode==='learn'&&!b.known.includes(cardId))b.known.push(cardId);
 b.favoured=[cardId,...b.favoured.filter(id=>id!==cardId)].slice(0,BELIEF_RULES.favouredLimit);
 if(offer.source==='relic')b.relicChoices[offer.relic]=cardId;
 b.offers.shift();for(const next of b.offers)if(next.source!=='relic')next.options=optionsFor(e,next.source,next.options);
 e.emit('belief-card-chosen',null,null,{cardId,mode:choice.mode,offerId});
 return {valid:true,cardId,mode:choice.mode};
}
export function awardBelief(e,amount,source='faith'){
 const b=e.belief;if(!b||!Number.isFinite(amount)||amount<=0)return 0;
 b.points+=amount;b.total+=amount;let gained=0;
 while(b.points>=beliefRequired(b.level)){
  b.points-=beliefRequired(b.level);b.level++;gained++;offerBeliefCards(e,'level');
  e.emit('god-level-up',null,null,{level:b.level,source});
 }
 return gained;
}
export function updateBelief(e,dt){
 syncRelicOffers(e);
 if(!e.belief||!(dt>0))return;
 const faith=e.workers.reduce((sum,w)=>sum+((actorVitality(w)?.dead)||w.exiled?0:Math.max(0,Math.min(1,(actorFaith(w)?.belief)?.value??0)-BELIEF_RULES.faithFloor)),0);
 awardBelief(e,faith*BELIEF_RULES.faithRate*dt,'faith');
}
export function unlockBeastBelief(e){
 const b=e.belief;if(!b||b.beastUnlocked)return false;
 b.beastUnlocked=true;for(const id of BEAST_STARTER_CARDS)if(!b.known.includes(id))b.known.push(id);offerBeliefCards(e,'beast');return true;
}
export function noticeBeliefEvent(e,event){
 const b=e.belief;if(!b)return;
 if(event.type==='beast-summoned'){unlockBeastBelief(e);return;}
 if(event.type==='beast-died'){syncBeastBelief(e);return;}
 if(event.type!=='treasure-opened'||event.chestId==null||b.treasures.includes(event.chestId))return;
 b.treasures.push(event.chestId);
 const roll=e.random();
 if(roll<BELIEF_RULES.chestCardChance){offerBeliefCards(e,'treasure');e.emit('belief-treasure',null,null,{kind:'card',chestId:event.chestId});}
 else if(roll<BELIEF_RULES.chestCardChance+BELIEF_RULES.chestBeliefChance){
  const amount=BELIEF_RULES.chestBeliefMin+Math.floor(e.random()*BELIEF_RULES.chestBeliefRange);awardBelief(e,amount,'treasure');e.emit('belief-treasure',null,null,{kind:'belief',amount,chestId:event.chestId});
 }
}
export function validBelief(e){
 const b=e.belief;if(!b)return true;
 if(!validRelicChoices(b))return false;
 const ids=list=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(id=>Object.hasOwn(WISHES,id));
 if(b.version!==1||!Number.isSafeInteger(b.level)||b.level<1||!Number.isFinite(b.points)||b.points<0||b.points>=beliefRequired(b.level)||!Number.isFinite(b.total)||b.total<0||!ids(b.known)||!ORIGINAL_STARTERS.every(id=>b.known.includes(id))||!ids(b.favoured)||b.favoured.length>3||!b.favoured.every(id=>b.known.includes(id))||typeof b.beastUnlocked!=='boolean'||!b.beastUnlocked&&b.known.some(id=>WISHES[id].beastOnly)||!Number.isSafeInteger(b.nextOffer)||b.nextOffer<0||!Array.isArray(b.treasures)||new Set(b.treasures).size!==b.treasures.length||!b.treasures.every(id=>typeof id==='string'))return false;
 return Array.isArray(b.offers)&&new Set(b.offers.map(o=>o?.id)).size===b.offers.length&&b.offers.every(o=>typeof o?.id==='string'&&['level','treasure','beast','relic'].includes(o.source)&&Number.isSafeInteger(o.level)&&o.level>=1&&o.level<=b.level&&Array.isArray(o.options)&&o.options.length===3&&ids(o.options.map(c=>c.id))&&(o.source!=='relic'||!b.relicChoices?.[o.relic]&&relicChoices(o.relic).length===3&&o.options.every(c=>relicChoices(o.relic).includes(c.id)))&&o.options.every(c=>['learn','favour'].includes(c.mode)&&(!WISHES[c.id].beastOnly||b.beastUnlocked)&&(o.source!=='beast'||WISHES[c.id].beastOnly)&&(o.source==='relic'?c.mode==='learn':!RELIC_MIRACLES[c.id]&&c.mode===(b.known.includes(c.id)?'favour':'learn'))));
}

export function upgradeBelief(e){
 const b=e.belief;if(!b)return;
 for(const id of [...STARTER_CARDS,...(b.beastUnlocked?BEAST_STARTER_CARDS:[])])if(!b.known.includes(id))b.known.push(id);
 syncBeastBelief(e);
 for(const offer of b.offers)if(offer.source!=='relic')offer.options=optionsFor(e,offer.source,offer.options);
}

// Learned abilities remain in save history, but cannot appear or be chosen
// without a living beast. Ordinary rewards keep their place in the queue.
export function syncBeastBelief(e){
 const b=e.belief;if(!b||beastsLiving(e.beasts))return;
 b.offers=b.offers.filter(o=>o.source!=='beast');
 for(const offer of b.offers)if(offer.source!=='relic')offer.options=optionsFor(e,offer.source,offer.options);
}
import {RELIC_MIRACLES,relicChoices} from './relic-miracle-catalog.js';
import {relicMiracleAvailable,syncRelicOffers,validRelicChoices} from './relic-miracle-state.js';
