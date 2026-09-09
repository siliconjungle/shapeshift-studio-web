import {actorRomance} from './ecs/actor-romance.js';
import {romanceInterest} from './village-romance-interest.js';
// Necessary bond thresholds; interest, rejection and miracle rules are checked
// separately by the full label/eligibility functions.
export const meetsSweetheartThreshold=r=>r.affinity>.72&&r.meetings>=5&&r.attractionAB>.55&&r.attractionBA>.55;
export function relationshipLabel(r,a,b){
 if(r.socialMiracle==='enmity'&&r.affinity<-.3)return 'Enemy';
 if(r.socialMiracle==='friendship'&&r.affinity>.28)return 'Friend';
 if(r.romanceStatus==='ended')return 'Former sweethearts';
 if(r.romanceStatus==='rejected')return r.affinity>.28?'Friend':'Acquaintance';
 if(r.affinity<-.3)return 'Rival';
 if(a&&b&&[a,b].some(w=>romanceInterest(w)<.5)&&!['courting','committed','devoted'].includes(r.romanceStatus)&&!((actorRomance(a)?.sweetheartId)===b.id&&(actorRomance(b)?.sweetheartId)===a.id))return r.affinity>.28?'Friend':'Acquaintance';
 if(meetsSweetheartThreshold(r))return 'Sweetheart';
 if(r.affinity>.5&&r.attractionAB>.55&&r.attractionBA>.55)return 'Growing close';
 return r.affinity>.28?'Friend':'Acquaintance';
}
