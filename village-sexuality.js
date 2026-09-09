import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {actorRomance,ensureActorRomance} from './ecs/actor-romance.js';
export const SEXUALITIES=['straight','gay','bisexual','asexual'];
export function attractedTo(a,b){
 if(!a||!b||(personAge(a)?.child)||(personAge(b)?.child)||(actorVitality(a)?.dead)||(actorVitality(b)?.dead))return false;
 const sexuality=(actorRomance(a)?.sexuality)??'bisexual';
 return sexuality==='bisexual'||sexuality==='straight'&&a.sex!==b.sex||sexuality==='gay'&&a.sex===b.sex;
}
export const mutuallyAttracted=(a,b)=>attractedTo(a,b)&&attractedTo(b,a);
export function assignSexuality(e,w){
 if((personAge(w)?.child)||SEXUALITIES.includes((actorRomance(w)?.sexuality)))return (actorRomance(w)?.sexuality);
 // Migration preserves an existing adult relationship; new adults draw once.
 const partner=e.workers.find(p=>p.id===(actorRomance(w)?.sweetheartId)&&!(actorVitality(p)?.dead)&&!(personAge(p)?.child));
 if(partner)return ensureActorRomance(w).sexuality=partner.sex===w.sex?'gay':'straight';
 const roll=e.random();return ensureActorRomance(w).sexuality=roll<.65?'straight':roll<.85?'gay':roll<.97?'bisexual':'asexual';
}
