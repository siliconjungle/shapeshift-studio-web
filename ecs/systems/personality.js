import {actorPersonality,actorWorkPreferences,ensureActorWorkPreferences,ensureActorExpeditionTemperament} from '../personality-actors.js';
import {validWorkValues} from '../personality-data.js';
const kinds=['food','wood','stone'],labels={food:'Food gathering',wood:'Woodcutting',stone:'Mining'};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const hash=n=>{const v=Math.sin(n*73.17+19.31)*43758.5453;return v-Math.floor(v)};
export function workPreferences(w){
 const traits={gentle:[.3,0,-.1],thoughtful:[.1,0,.2],playful:[.2,.1,-.1],quiet:[0,.2,.1],blunt:[-.1,.1,.3],outgoing:[.1,.1,0]};
 const values=actorWorkPreferences(w)?.values,trait=actorPersonality(w)?.trait;
 return Object.fromEntries(kinds.map((kind,i)=>[kind,clamp(Number.isFinite(values?.[kind])?values[kind]:hash((w.id??0)*7+i)+(traits[trait]?.[i]??0),0,1)]));
}
export function initialiseWorkPreferences(w){
 const row=ensureActorWorkPreferences(w),values=row.values;
 if(!values||kinds.some(k=>!Number.isFinite(values[k])||values[k]<0||values[k]>1))row.values=workPreferences(w);
 return row.values;
}
export function validWorkPreferences(w){return validWorkValues(actorWorkPreferences(w)?.values);}
export function workPreferenceDetails(w){
 const prefs=workPreferences(w),ranked=kinds.map(kind=>({kind,label:labels[kind],value:prefs[kind]})).sort((a,b)=>b.value-a.value);
 return ranked.map((p,i)=>({...p,feeling:i===0&&p.value>=.65&&p.value-ranked[1].value>.05?'Favourite':p.value>=.65?'Enjoys':p.value<=.3?'Dislikes':'Neutral'}));
}
export function expeditionTemperament(e,w){
 // Sample once from the world's RNG, then persist: the same archetype can have
 // different priorities in another village, without jittering each decision.
 return (ensureActorExpeditionTemperament(w).values)??={curiosity:clamp(e.random()*.7+(['playful','outgoing'].includes((actorPersonality(w)?.trait))?.3:.05)),caution:clamp(e.random()*.65+(['gentle','thoughtful','quiet'].includes((actorPersonality(w)?.trait))?.35:.05)),attachment:.25+e.random()*.75};
}
