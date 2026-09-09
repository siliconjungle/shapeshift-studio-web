import {actorDiplomacy,ensureActorDiplomacy} from "../actor-diplomacy.js";
import {currentDiplomacy,createDiplomacy,addDiplomacyLink} from "../diplomacy-entities.js";
import {settlementEconomy,settlementDevelopment,settlementDiplomacy,settlementHistory} from "../rival-entities.js";
import {actorVitality,ensureActorVitality} from "../actor-vitality.js";
import {rivalSettlements,rivalFor} from "../../rival-roster.js";
const clamp=(n,a=-1,b=1)=>Math.max(a,Math.min(b,n));
export function diplomacyState(world){
 const e=world.resource('Village');
 const states=rivalSettlements(e);if(states.length<2)return null;
 const d=currentDiplomacy(e)??createDiplomacy(e);
 for(let i=0;i<states.length;i++)for(const b of states.slice(i+1)){const a=states[i];if(!d.links.some(l=>l.a===a.culture&&l.b===b.culture||l.b===a.culture&&l.a===b.culture))addDiplomacyLink(e,{a:a.culture,b:b.culture,affinity:(e.random()-.5)*.5,warUntil:0,nextAt:e.time+180});}
 return d;
}
export const civilisationBond=(world,a,b)=>{const e=world.resource('Village');return e.diplomacy?.links.find(l=>l.a===a&&l.b===b||l.a===b&&l.b===a)??null;};
export function civilisationAttitude(world,s=world.resource('Village').rival){
 const e=world.resource('Village');
 if(!s)return 0;let opinion=settlementDiplomacy(s).reputation;
 for(const other of rivalSettlements(e))if(other!==s)opinion+=(civilisationBond(world,s.culture,other.culture)?.affinity??0)*settlementDiplomacy(other).reputation*.35;
 return clamp(opinion);
}
function history(world,entry){
 const e=world.resource('Village');const d=diplomacyState(world);if(!d)return;d.history.unshift({at:e.time,...entry});d.history.length=Math.min(32,d.history.length);e.emit?.('diplomacy-event',null,null,entry);}
export function noteDiplomaticIncident(world,s,delta,kind){
 const e=world.resource('Village');
 for(const other of rivalSettlements(e))if(other!==s){const link=civilisationBond(world,s.culture,other.culture);if(!link||Math.abs(link.affinity)<.15||Math.abs(delta)<.05)continue;
  const reaction=delta*link.affinity;history(world,{kind:reaction>0?'approval':'disapproval',culture:other.culture,otherCulture:s.culture,reason:kind});
  if(civilisationAttitude(world,other)<-.4&&reaction<0&&settlementDiplomacy(other).raidAt==null){settlementDiplomacy(other).raidAt=e.time+110+e.random()*50;settlementDiplomacy(other).raidMotive='alliance';}
 }
}
function exchange(a,b){
 const target=s=>({food:Math.max(8,s.people.filter(w=>!(actorVitality(w)?.dead)).length*5),wood:10,stone:6}),ta=target(a),tb=target(b);
 const offer=(s,t)=>['food','wood','stone'].filter(k=>settlementEconomy(s).stock[k]>t[k]+3).sort((x,y)=>(settlementEconomy(s).stock[y]-t[y])-(settlementEconomy(s).stock[x]-t[x]))[0];
 const give=offer(a,ta),take=offer(b,tb);if(!give||!take||give===take)return null;
 const amount=3;settlementEconomy(a).stock[give]-=amount;settlementEconomy(b).stock[give]+=amount;settlementEconomy(b).stock[take]-=amount;settlementEconomy(a).stock[take]+=amount;return {give,take,amount};
}
export function updateDiplomacy(world){
 const e=world.resource('Village');
 const d=diplomacyState(world);if(!d)return;
 for(const l of d.links){if(e.time<l.nextAt)continue;l.nextAt=e.time+180+e.random()*60;const a=rivalFor(e,l.a),b=rivalFor(e,l.b);if(!a||!b)continue;
  if(l.warUntil>e.time){
   // Off-screen fighting only involves people who are actually at home.
   const attackers=a.people.filter(w=>!(actorVitality(w)?.dead)&&!w.visit&&!w.captive),defenders=b.people.filter(w=>!(actorVitality(w)?.dead)&&!w.visit&&!w.captive);if(!attackers.length||!defenders.length)continue;
   const winner=e.random()<attackers.length/(attackers.length+defenders.length)?a:b,loser=winner===a?b:a,amount=Math.min(4,Math.floor(settlementEconomy(loser).stock.food));settlementEconomy(loser).stock.food-=amount;settlementEconomy(winner).stock.food+=amount;
   const victim=loser.people.find(w=>!(actorVitality(w)?.dead)&&!w.visit&&!w.captive);ensureActorVitality(victim).health=Math.max(0,(actorVitality(victim)?.health)-18);if(!(actorVitality(victim)?.health))(Object.assign(ensureActorVitality(victim),{dead:true,diedAt:e.time,deathCause:'war'}),Object.assign(victim,{state:'dead',route:[]}));
   settlementDevelopment(loser).displaced=Math.min(loser.people.filter(w=>!(actorVitality(w)?.dead)).length,(settlementDevelopment(loser).displaced??0)+1);l.affinity=clamp(l.affinity-.03);history(world,{kind:'war',culture:winner.culture,otherCulture:loser.culture,amount});continue;
  }
  if(l.warUntil&&l.warUntil<=e.time){l.warUntil=0;l.affinity=Math.max(-.35,l.affinity);history(world,{kind:'peace',culture:a.culture,otherCulture:b.culture});}
  if(l.affinity<-.5){l.warUntil=e.time+420;history(world,{kind:'war-declared',culture:a.culture,otherCulture:b.culture});continue;}
  const trade=l.affinity>-.25?exchange(a,b):null;
  if(trade&&l.affinity>-.25){l.affinity=clamp(l.affinity+.07);history(world,{kind:'trade',culture:a.culture,otherCulture:b.culture,...trade});}
  else {const starving=[a,b].filter(s=>settlementEconomy(s).stock.food<s.people.filter(w=>!(actorVitality(w)?.dead)).length*2);if(starving.length&&e.random()<.45)l.affinity=clamp(l.affinity-.12);else l.affinity=clamp(l.affinity+.015);}
  // Exhausted settlements can agree to peace; resentment remains for a while.
  if(l.warUntil&&l.warUntil<=e.time){l.warUntil=0;l.affinity=Math.max(-.35,l.affinity);history(world,{kind:'peace',culture:a.culture,otherCulture:b.culture});}
 }
}
export function validDiplomacy(world){
 const e=world.resource('Village');const d=e.diplomacy;if(d==null)return true;const cultures=new Set(rivalSettlements(e).map(s=>s.culture)),seen=new Set();return d.version===1&&Array.isArray(d.links)&&d.links.length<=3&&d.links.every(l=>{const key=[l.a,l.b].sort().join(':');if(seen.has(key))return false;seen.add(key);return l.a!==l.b&&cultures.has(l.a)&&cultures.has(l.b)&&Number.isFinite(l.affinity)&&Math.abs(l.affinity)<=1&&[l.warUntil,l.nextAt].every(n=>Number.isFinite(n)&&n>=0)})&&Array.isArray(d.history)&&d.history.length<=32&&d.history.every(h=>Number.isFinite(h.at)&&h.at>=0&&typeof h.kind==='string'&&cultures.has(h.culture)&&cultures.has(h.otherCulture));}
export function diplomacyDetails(world,s){
 const e=world.resource('Village');const title=c=>c[0].toUpperCase()+c.slice(1),attitude=civilisationAttitude(world,s),mood=n=>n>.3?'Friendly':n<-.3?'Hostile':'Wary';return [{label:'View of your village',value:mood(attitude)},...rivalSettlements(e).filter(p=>p!==s).map(p=>{const l=civilisationBond(world,s.culture,p.culture);return {label:title(p.culture),value:l?.warUntil>e.time?'At war':mood(l?.affinity??0)}})];}

export function noteVisitorMiracle(world,kind,check){
 const e=world.resource('Village');
 const actor=check.actor,owner=rivalFor(e,actor);if(!owner||!['life','energy','shield'].includes(kind)||(actorDiplomacy(actor)?.helpAfter??0)>e.time)return;
 ensureActorDiplomacy(actor).helpAfter=e.time+45;settlementDiplomacy(owner).reputation=clamp(settlementDiplomacy(owner).reputation+.06);settlementDiplomacy(owner).grievance=Math.max(0,settlementDiplomacy(owner).grievance-.04);noteDiplomaticIncident(world,owner,.06,'miracle-'+kind);settlementHistory(owner).history.unshift({kind:'miracle-'+kind,at:e.time,personId:Number.isSafeInteger(actor.id)?actor.id:owner.people[0].id,otherId:null});settlementHistory(owner).history.length=Math.min(40,settlementHistory(owner).history.length);
}
