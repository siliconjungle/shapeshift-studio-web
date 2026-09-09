import {settlementEconomy,settlementDevelopment,settlementDiplomacy} from "../rival-entities.js";
import {actorVitality} from "../actor-vitality.js";
import {survivalDrop} from "../../village-survival.js";
import {civilisationAttitude} from "../../village-diplomacy.js";
// Neighbouring settlements use their own stores and a remembered reason for
// each outing. No resources appear when a trader or thief arrives home.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function rivalNeeds(world){
 const e=world.resource('Village');
 const s=e.rival,n=s.people.filter(w=>!(actorVitality(w)?.dead)).length;
 const target={food:Math.max(6,n*5),wood:Math.max(8,n*3+(settlementDevelopment(s).displaced??0)*3),stone:Math.max(4,n*2)};
 const shortage=Object.fromEntries(Object.keys(target).map(k=>[k,clamp((target[k]-settlementEconomy(s).stock[k])/target[k])]));
 return {target,shortage,shelter:Math.max(settlementDevelopment(s).displaced??0,n-settlementDevelopment(s).capacity,0)};
}
export function chooseRivalMotive(world){
 const e=world.resource('Village');
 const s=e.rival,needs=rivalNeeds(world),kind=Object.keys(needs.shortage).sort((a,b)=>needs.shortage[b]-needs.shortage[a])[0];
 if(needs.shelter>0)return 'shelter';
 if(needs.shortage.food>.65&&(settlementDiplomacy(s).failedTrades??0)>=2&&civilisationAttitude(e,s)<.15&&(settlementDiplomacy(s).aidedUntil??0)<=e.time)return 'theft';
 return needs.shortage[kind]>.15?'need-'+kind:'friendship';
}
export function progressRivalNeeds(world,home,n){
 const e=world.resource('Village');
 const s=e.rival,c=e.wishDrawContext??{},bad=(c.rain??0)>.75||Number.isFinite(c.temperature)&&(c.temperature<3||c.temperature>35);
 const yieldRate=bad?.22:1;
 settlementEconomy(s).stock.food=clamp(settlementEconomy(s).stock.food+home.length*(.65+e.random()*.8)*yieldRate-n*.6,0,150);
 settlementEconomy(s).stock.wood=clamp(settlementEconomy(s).stock.wood+home.length*.5,0,150);settlementEconomy(s).stock.stone=clamp(settlementEconomy(s).stock.stone+home.length*.25,0,150);
 if(bad&&(settlementDevelopment(s).weatherLossAfter??0)<=e.time){settlementDevelopment(s).weatherLossAfter=e.time+300;settlementDevelopment(s).lastSetback={kind:'failed-harvest',at:e.time};settlementEconomy(s).stock.food*=.7;if((c.rain??0)>.9&&e.random()<.25){settlementDevelopment(s).displaced=Math.min(n,(settlementDevelopment(s).displaced??0)+2);settlementDevelopment(s).lastSetback={kind:'damaged-homes',at:e.time};}}
 if((settlementDevelopment(s).displaced??0)>0&&settlementEconomy(s).stock.wood>=10&&settlementEconomy(s).stock.stone>=6&&settlementEconomy(s).stock.food>=n*2){settlementEconomy(s).stock.wood-=6;settlementEconomy(s).stock.stone-=4;settlementDevelopment(s).displaced=Math.max(0,settlementDevelopment(s).displaced-2);}
}
export function rivalTradeOffer(world,offers){
 const e=world.resource('Village');
 const s=e.rival,need=rivalNeeds(world),n=e.workers.filter(w=>!(actorVitality(w)?.dead)).length;
 const targets={food:n*4+4,wood:Math.max(8,n*3),stone:Math.max(4,n*2)};
 const score=([pay,a,give,b])=>{
  const localNeed=Math.max(0,targets[give]-e.stock[give])/targets[give];
  const rivalNeed=need.shortage[pay];
  return localNeed*2+rivalNeed*2-(Math.max(0,targets[pay]-e.stock[pay]+a)/targets[pay])-(Math.max(0,need.target[give]-settlementEconomy(s).stock[give]+b)/need.target[give]);
 };
 return offers.filter(([pay,n,give,m])=>e.stock[pay]>=n+(pay==='food'?targets.food:2)&&settlementEconomy(s).stock[give]>=m+(give==='food'?s.people.filter(w=>!(actorVitality(w)?.dead)).length*2:0)).map(offer=>({offer,score:score(offer)})).filter(o=>o.score>.05).sort((a,b)=>b.score-a.score)[0]?.offer;
}
export function noteRivalTrade(world,w,accepted){
 const e=world.resource('Village');
 if(w.visit?.needRecorded)return;if(w.visit)w.visit.needRecorded=true;
 const s=e.rival;
 if(accepted){settlementDiplomacy(s).failedTrades=0;settlementDiplomacy(s).aidedUntil=e.time+360;if(settlementDiplomacy(s).raidMotive==='shortage'){settlementDiplomacy(s).raidAt=null;settlementDiplomacy(s).raidMotive=null;}}
 else if(rivalNeeds(world).shortage.food>.3){settlementDiplomacy(s).failedTrades=Math.min(10,(settlementDiplomacy(s).failedTrades??0)+1);if(settlementDiplomacy(s).failedTrades>=4&&civilisationAttitude(e,s)<-.25&&settlementDiplomacy(s).raidAt===null){settlementDiplomacy(s).raidAt=e.time+90;settlementDiplomacy(s).raidMotive='shortage';}}
}
export function returnRivalCargo(world,w,arrived){
 const e=world.resource('Village');
 if(!w.stolenCargo)return;
 const {kind,amount}=w.stolenCargo;if(arrived)settlementEconomy(e.rival).stock[kind]+=amount;else ((e.survival)==null?undefined:(survivalDrop(e.survival,w,kind,amount)));
 w.stolenCargo=null;w.cargo=null;
}
export function validRivalNeeds(s){return !s||['failedTrades','aidedUntil'].every(k=>settlementDiplomacy(s)[k]===undefined||Number.isFinite(settlementDiplomacy(s)[k])&&settlementDiplomacy(s)[k]>=0)&&['weatherLossAfter','displaced'].every(k=>settlementDevelopment(s)[k]===undefined||Number.isFinite(settlementDevelopment(s)[k])&&settlementDevelopment(s)[k]>=0)&&(!settlementDevelopment(s).lastSetback||['failed-harvest','damaged-homes'].includes(settlementDevelopment(s).lastSetback.kind)&&Number.isFinite(settlementDevelopment(s).lastSetback.at))&&s.people.every(w=>!w.stolenCargo||['food','wood','stone'].includes(w.stolenCargo.kind)&&Number.isFinite(w.stolenCargo.amount)&&w.stolenCargo.amount>0&&w.stolenCargo.amount<=4);}
