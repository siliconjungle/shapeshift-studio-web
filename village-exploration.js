import {structuralCondition} from './ecs/home-entities.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {skillLevel} from './village-skills.js';
import {gridFor,migrateGrid,validGrid} from './village-grid-migration.js';
import {WATCHTOWER_RULES} from './village-watchtowers.js';
import {defineGameData} from './game-data.js';
import {WORLD_BOUNDS} from './village-layout.js';
import {inVillageCore} from './village-wilderness.js';
export const EXPLORATION_RULES=defineGameData('village-exploration.EXPLORATION_RULES',Object.freeze({cell:.5,sight:5.7,beastSight:8,buildingSight:7.5,refresh:.25}));
export const EXPLORATION_GRID=defineGameData('village-exploration.EXPLORATION_GRID',Object.freeze({x:WORLD_BOUNDS.left,z:WORLD_BOUNDS.back,width:Math.round((WORLD_BOUNDS.right-WORLD_BOUNDS.left)/.5),height:Math.round((WORLD_BOUNDS.front-WORLD_BOUNDS.back)/.5)}));
export function configureExplorationGrid(){Object.assign(EXPLORATION_GRID,gridFor(.5));}
const count=()=>EXPLORATION_GRID.width*EXPLORATION_GRID.height;
export function explorationState(e){
 const s=e.exploration??={version:1,seen:Array(count()).fill(0),visible:Array(count()).fill(0),nextAt:0,revision:0,camps:[],finds:[]};
 return migrateGrid(s,['seen','visible'],gridFor(.5));
}
function index(x,z){const col=Math.floor((x-EXPLORATION_GRID.x)/.5),row=Math.floor((z-EXPLORATION_GRID.z)/.5);return col<0||col>=EXPLORATION_GRID.width||row<0||row>=EXPLORATION_GRID.height?-1:row*EXPLORATION_GRID.width+col;}
export function exploredAt(e,x,z){if(!e?.exploration)return true;const i=index(x,z);return i>=0&&e.exploration.seen[i]>0;}
export function visibleAt(e,x,z){if(!e?.exploration)return true;const i=index(x,z);return i>=0&&(e.exploration.visible?.[i]??0)>.12;}
export function updateExploration(e,{force=false}={}){
 const s=e.exploration;if(!s||!force&&e.time<s.nextAt)return;s.nextAt=e.time+EXPLORATION_RULES.refresh;s.visible??=Array(count()).fill(0);s.visible.fill(0);
 const sources=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.exiled&&!w.divineHeld&&!w.rivalJourney).map(w=>({x:w.x,z:w.z,r:(personAge(w)?.child)?4.4:EXPLORATION_RULES.sight+skillLevel(w,'exploring')*.45}));
 for(const b of e.beasts?.actors??[])if(!(actorVitality(b)?.dead)&&!b.gone&&!b.exiled&&!b.divineHeld)sources.push({x:b.x,z:b.z,r:EXPLORATION_RULES.beastSight});
 for(const h of e.life?.homes??[])if(!(structuralCondition(h)?.destroyed)&&((structuralCondition(h)?.health)??100)>0)sources.push({x:h.buildingX??h.x,z:h.buildingZ??h.z,r:h.kind==='watchtower'?WATCHTOWER_RULES.sight:h.kind==='chapel'?8.5:7.5});
 for(const p of [e.depot,e.faith?.shrine])if(p)sources.push({...p,r:6.5});
 for(const f of [e.campfire,...(s.camps??[]).map(c=>c.fire)])if(f?.built&&(!f.discoveryId||f.discovered))sources.push({x:f.x,z:f.z,r:f.lit?5:3.2});
 for(const p of sources){const left=Math.max(0,Math.floor((p.x-p.r-.8-EXPLORATION_GRID.x)/.5)),right=Math.min(EXPLORATION_GRID.width-1,Math.floor((p.x+p.r+.8-EXPLORATION_GRID.x)/.5)),back=Math.max(0,Math.floor((p.z-p.r-.8-EXPLORATION_GRID.z)/.5)),front=Math.min(EXPLORATION_GRID.height-1,Math.floor((p.z+p.r+.8-EXPLORATION_GRID.z)/.5));
  for(let row=back;row<=front;row++)for(let col=left;col<=right;col++){const x=EXPLORATION_GRID.x+(col+.5)*.5,z=EXPLORATION_GRID.z+(row+.5)*.5,d=Math.hypot(x-p.x,z-p.z),v=Math.max(0,Math.min(1,(p.r+.7-d)/1.4)),i=row*EXPLORATION_GRID.width+col;if(v>s.visible[i])s.visible[i]=v;if(v>.12)s.seen[i]=1;}
 }
 s.revision++;
}
export function explorationFrontiers(e,w){const s=e.exploration;if(!s)return [];const points=[];
 for(let row=2;row<EXPLORATION_GRID.height-2;row+=2)for(let col=2;col<EXPLORATION_GRID.width-2;col+=2){const i=row*EXPLORATION_GRID.width+col;if(s.seen[i]||![i-1,i+1,i-EXPLORATION_GRID.width,i+EXPLORATION_GRID.width].some(j=>s.seen[j]))continue;const x=EXPLORATION_GRID.x+(col+.5)*.5,z=EXPLORATION_GRID.z+(row+.5)*.5,d=Math.hypot(x-w.x,z-w.z);if(d>3&&d<15&&Number.isFinite(e.heightAt(x,z)))points.push({x,z,d});}
 return points.sort((a,b)=>a.d-b.d).slice(0,12);
}
export function validExploration(s,bounds=WORLD_BOUNDS){
 if(s==null)return true;
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=bounds.left&&p.x<=bounds.right&&p.z>=bounds.back&&p.z<=bounds.front;
 if(s.version!==1||!Array.isArray(s.seen)||![59400,14850,99*75].includes(s.seen.length)||!validGrid(s.grid,.5,s.seen.length)||!s.seen.every(v=>v===0||v===1)||!Array.isArray(s.visible)||s.visible.length!==s.seen.length||!s.visible.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!Number.isFinite(s.nextAt)||s.nextAt<0||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.camps)||s.camps.length>1||!Array.isArray(s.finds)||s.finds.length>3)return false;
 if(s.seed!==undefined&&(!Number.isSafeInteger(s.seed)||s.seed<1||s.seed>4294967295))return false;
 return new Set(s.finds.map(f=>f.id)).size===s.finds.length&&s.finds.every(f=>point(f)&&typeof f.id==='string'&&['camp','seed-2','seed-5'].includes(f.kind)&&[f.seenAt,f.claimedAt].every(t=>t===null||Number.isFinite(t)&&t>=0)&&(f.reservedBy===null||Number.isSafeInteger(f.reservedBy))&&Number.isFinite(f.retryAt)&&f.retryAt>=0)&&s.camps.every(c=>point(c.fire)&&c.id===c.fire.id&&s.finds.some(f=>f.id===c.id&&f.kind==='camp')&&typeof c.fire.discovered==='boolean'&&Number.isFinite(c.fire.fuel)&&c.fire.fuel>=0);
}
