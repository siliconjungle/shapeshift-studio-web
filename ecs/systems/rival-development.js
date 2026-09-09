import {settlementEconomy,settlementDevelopment,settlementDiplomacy,settlementSchedule} from '../rival-entities.js';
import {actorVitality,ensureActorVitality} from '../actor-vitality.js';
import {actorNeeds} from '../actor-needs.js';
import {personAge,ensurePersonAge} from '../person-age.js';
import {AGE_RULES,initialiseAge} from '../../village-age.js';
import {RIVAL_RULES} from '../../village-rival.js';
import {progressRivalBeast} from '../../rival-beast.js';
import {progressRivalNeeds} from './rival-needs.js';
const clamp=(n,a=-1,b=1)=>Math.max(a,Math.min(b,n));
export function progressRivalDevelopment(world,spawn){
 const e=world.resource('Village');
 const s=e.rival,n=s.people.filter(w=>!(actorVitality(w)?.dead)).length;if(e.time<settlementSchedule(s).nextTick)return;settlementSchedule(s).nextTick=e.time+RIVAL_RULES.tick;
 const home=s.people.filter(w=>!(actorVitality(w)?.dead)&&!w.visit);progressRivalNeeds(world,home,n);
 settlementDevelopment(s).prosperity=clamp(.2+settlementEconomy(s).stock.food/Math.max(1,n*12)+Math.min(.15,settlementDevelopment(s).development*.03)-(settlementDiplomacy(s).warUntil>e.time?.25:0),0,1);
 if(settlementEconomy(s).stock.wood>=20&&settlementEconomy(s).stock.stone>=12&&settlementDevelopment(s).capacity<RIVAL_RULES.maxPopulation){settlementEconomy(s).stock.wood-=12;settlementEconomy(s).stock.stone-=8;settlementDevelopment(s).capacity+=2;settlementDevelopment(s).development++;}
 if(settlementEconomy(s).stock.food>n*5&&n+e.workers.filter(w=>w.rivalJourney).length<settlementDevelopment(s).capacity&&s.people.length<24&&e.random()<.16){settlementEconomy(s).stock.food-=6;spawn();}
 for(const w of s.people.filter(w=>!(actorVitality(w)?.dead))){ensurePersonAge(w).ageYears=((personAge(w)?.ageYears)??24)+RIVAL_RULES.tick/AGE_RULES.secondsPerAdultYear;initialiseAge(w,e.time);}
 for(const w of home){ensureActorVitality(w).health=Math.min(100,(actorVitality(w)?.health)+2);actorNeeds(w).hunger=clamp(70-settlementDevelopment(s).prosperity*60,0,100);actorNeeds(w).energy=80;}
 progressRivalBeast(e,RIVAL_RULES.tick);
 settlementDiplomacy(s).grievance=Math.max(0,settlementDiplomacy(s).grievance-.008);if(settlementDiplomacy(s).reputation<0)settlementDiplomacy(s).reputation=Math.min(0,settlementDiplomacy(s).reputation+.004);
}
