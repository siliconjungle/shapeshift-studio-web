import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {gridFor,migrateGrid,validGrid} from './village-grid-migration.js';
import {defineGameData} from './game-data.js';
import {WORLD_BOUNDS} from './village-layout.js';
import {DAY_LENGTH_SECONDS} from './village-time.js';

// Quantised simulation data, independent of textures/render frames. The entire
// field is bounded (~60k integers) and uses the existing plain save format.
export const DESIRE_PATH_RULES=defineGameData('village-desire-paths.DESIRE_PATH_RULES',Object.freeze({cell:.25,radius:.58,wearPerMetre:.22,max:65535,halfLife:DAY_LENGTH_SECONDS,decayInterval:5,visible:.08,traffic:.25}));
export const PATH_GRID=Object.freeze({get x(){return WORLD_BOUNDS.left},get z(){return WORLD_BOUNDS.back},get width(){return Math.ceil((WORLD_BOUNDS.right-WORLD_BOUNDS.left)/DESIRE_PATH_RULES.cell)},get height(){return Math.ceil((WORLD_BOUNDS.front-WORLD_BOUNDS.back)/DESIRE_PATH_RULES.cell)}});
const {cell,max}=DESIRE_PATH_RULES;
export function desirePathState(e){const s=e.desirePaths??={version:1,wear:Array(PATH_GRID.width*PATH_GRID.height).fill(0),decayedAt:e.time,revision:0};
 return migrateGrid(s,['wear'],gridFor(DESIRE_PATH_RULES.cell));}
export function validDesirePaths(state){return state==null||state.version===1&&Number.isFinite(state.decayedAt)&&state.decayedAt>=0&&Number.isSafeInteger(state.revision)&&state.revision>=0&&Array.isArray(state.wear)&&[237600,59400,198*150].includes(state.wear.length)&&validGrid(state.grid,.25,state.wear.length)&&state.wear.every(v=>Number.isInteger(v)&&v>=0&&v<=max);}
export function updateDesirePaths(e,weather={}){
 const state=e.desirePaths;if(!state||e.time-state.decayedAt<DESIRE_PATH_RULES.decayInterval)return;
 const dt=e.time-state.decayedAt,rain=Math.max(0,Math.min(1,weather?.rain??0));
 // Moisture brings back grass more quickly; dry sand settles back into drifts.
 const halfLife=DESIRE_PATH_RULES.halfLife*(e.culture==='solis'?1.4:1)/(1+rain*(e.culture==='solis'?.15:.65));
 const fade=Math.pow(.5,dt/halfLife);let changed=false;
 for(let i=0;i<state.wear.length;i++){const old=state.wear[i];if(!old)continue;const next=Math.floor(old*fade);state.wear[i]=next;changed||=next!==old;}
 state.decayedAt=e.time;if(changed)state.revision++;
}
export function recordPathTravel(e,w,fromX,fromZ){
 const state=e.desirePaths;if(!state||(actorVitality(w)?.dead)||(actorInterior(w)?.inside)||w.divineHeld||w.species==='ghost')return;
 const distance=Math.hypot(w.x-fromX,w.z-fromZ);
 // Called only from successful walk steps. Guard discontinuities as well so
 // relocation, spawning and loading can never draw a straight scar across land.
 if(!Number.isFinite(distance)||distance<.0001||distance>1)return;
 const samples=Math.max(1,Math.ceil(distance/(cell*.5))),amount=distance/samples*DESIRE_PATH_RULES.wearPerMetre*((personAge(w)?.child)?.7:1),radius=DESIRE_PATH_RULES.radius;
 let changed=false;
 for(let s=0;s<samples;s++){
  const t=(s+.5)/samples,x=fromX+(w.x-fromX)*t,z=fromZ+(w.z-fromZ)*t;
  const left=Math.max(0,Math.floor((x-radius-PATH_GRID.x)/cell)),right=Math.min(PATH_GRID.width-1,Math.floor((x+radius-PATH_GRID.x)/cell));
  const back=Math.max(0,Math.floor((z-radius-PATH_GRID.z)/cell)),front=Math.min(PATH_GRID.height-1,Math.floor((z+radius-PATH_GRID.z)/cell));
  for(let row=back;row<=front;row++)for(let col=left;col<=right;col++){
   const px=PATH_GRID.x+(col+.5)*cell,pz=PATH_GRID.z+(row+.5)*cell,d=Math.hypot(px-x,pz-z);if(d>=radius)continue;
   const i=row*PATH_GRID.width+col,old=state.wear[i],next=Math.min(max,old+Math.round(amount*(1-d/radius)**2*max));
   if(next!==old){state.wear[i]=next;changed=true;}
  }
 }
 if(changed)state.revision++;
}
export function desirePathWear(state,x,z){
 if(!state||!Number.isFinite(x)||!Number.isFinite(z))return 0;
 const col=Math.floor((x-PATH_GRID.x)/cell),row=Math.floor((z-PATH_GRID.z)/cell);
 return col<0||col>=PATH_GRID.width||row<0||row>=PATH_GRID.height?0:state.wear[row*PATH_GRID.width+col]/max;
}
export function busyDesirePath(e,x,z,radius=0){
 const state=e.desirePaths;if(!state)return false;
 const left=Math.max(0,Math.floor((x-radius-PATH_GRID.x)/cell)),right=Math.min(PATH_GRID.width-1,Math.floor((x+radius-PATH_GRID.x)/cell));
 const back=Math.max(0,Math.floor((z-radius-PATH_GRID.z)/cell)),front=Math.min(PATH_GRID.height-1,Math.floor((z+radius-PATH_GRID.z)/cell));
 for(let row=back;row<=front;row++)for(let col=left;col<=right;col++)if(state.wear[row*PATH_GRID.width+col]/max>=DESIRE_PATH_RULES.traffic)return true;
 return false;
}
