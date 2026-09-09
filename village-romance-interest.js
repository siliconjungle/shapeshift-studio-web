import {actorRomance,ensureActorRomance} from './ecs/actor-romance.js';
// Interest in pursuing romance is independent of orientation and sociability.
// Seed once from identity so old saves gain stable variation without consuming
// simulation randomness or changing somebody's existing relationships.
function seededInterest(w){
 let hash=2166136261;for(const c of `romance:${w.id}:${w.name??''}:${w.culture??''}`)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 const roll=(hash>>>0)/4294967296;
 return roll<.28?.1+roll/.28*.25:.5+(roll-.28)/.72*.5;
}
const boundedInterest=(w,value)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):seededInterest(w);
export const romanceInterest=w=>boundedInterest(w,actorRomance(w)?.romanceInterest);
export function initialiseRomanceInterest(w){const romance=ensureActorRomance(w);return romance.romanceInterest=boundedInterest(w,romance.romanceInterest);}
export const validRomanceInterest=w=>{const value=actorRomance(w)?.romanceInterest;return value===undefined||Number.isFinite(value)&&value>=0&&value<=1;};
export const romanceOutlook=w=>romanceInterest(w)<.35?'Content without romance':romanceInterest(w)<.5?'Selective about romance':romanceInterest(w)<.8?'Open to romance':'Romantic';
const reluctance=w=>Math.max(0,1-romanceInterest(w)*2);
export function specialConnection(r){return !!r&&r.affinity>=.8&&(r.compatibility??0)>=.7&&r.meetings>=5;}
export function romanceThreshold(w,r,kind='accept'){
 const base=({propose:.65,accept:.55,crush:.68})[kind],extra=({propose:.25,accept:.35,crush:.24})[kind];
 return base+reluctance(w)*(extra-(specialConnection(r)?.14:0));
}
export function interestedInRomance(w,r,kind='accept'){
 const attraction=r.a===w.id?r.attractionAB:r.attractionBA;
 return attraction>romanceThreshold(w,r,kind)&&r.affinity>(kind==='crush'?.2:kind==='propose'?.45:.5)+reluctance(w)*(specialConnection(r)?.08:.2);
}
// A casual rejection matters less when romance is not a priority. A genuinely
// established attachment can still hurt, regardless of general romantic interest.
export function romanticHurtFactor(w,other,r){
 const established=(actorRomance(w)?.sweetheartId)===other.id||w.leaderBelovedId===other.id||r?.romanceStatus==='committed'||r?.leaderRomance||specialConnection(r);
 return established?1:1-reluctance(w)*.65;
}
