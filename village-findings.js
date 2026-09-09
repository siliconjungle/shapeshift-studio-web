import {resourceCultivation} from "./ecs/resource-state.js";
import {resourceGrowth} from "./ecs/resource-state.js";
import {discoveryClear} from './village-discovery.js';
import {createCooking} from './village-cooking.js';
import {createCampfire} from './village-campfire.js';
import {generateWilderness} from './village-wilderness.js';
import {explorationState,visibleAt} from './village-exploration.js';
import {forageRules} from './village-foraging.js';
export function initialiseFindings(e,layout){
 if(!e.exploration||e.exploration.seed)return;
 if(!layout){const discoveries=[];for(let seed=301;seed<601&&discoveries.length<3;seed++){const kind=['camp','seed-2','seed-5'][discoveries.length],p=generateWilderness(seed).discoveries.find(p=>p.kind===kind);if(p&&((domainState)=>domainState==null?undefined:(discoveryClear(domainState,p,1.4)))(e.discovery)&&discoveries.every(q=>Math.hypot(q.x-p.x,q.z-p.z)>7)&&e.route(e.depot,{x:p.x,z:p.z+1.2}))discoveries.push({...p,id:'wilderness-'+discoveries.length});}layout={seed:301,discoveries};}
 const s=explorationState(e);s.seed=layout.seed;s.finds=[];
 for(const original of layout.discoveries){
  const candidates=[original];for(const radius of [.75,1.5,2.5,4])for(let i=0;i<12;i++)candidates.push({...original,x:original.x+Math.cos(i*Math.PI/6)*radius,z:original.z+Math.sin(i*Math.PI/6)*radius});
  for(let seed=1;seed<65;seed++)candidates.push({...generateWilderness((layout.seed+seed)>>>0||1).discoveries.find(p=>p.kind===original.kind),id:original.id});
  let searches=0;const p=!layout.version?original:candidates.find(p=>!s.finds.some(f=>Math.hypot(f.x-p.x,f.z-p.z)<6)&&(!e.discovery||discoveryClear(e.discovery,p,1.25))&&++searches<=40&&e.route(e.depot,{x:p.x,z:p.z+1.2}));
  if(!p)throw Error('No reachable wilderness clearing for '+original.kind);
  s.finds.push({...p,id:original.id,seenAt:null,claimedAt:null,reservedBy:null,retryAt:0});
 }
 for(const f of s.finds){
  if(f.kind==='camp'){const fire=createCampfire(e,{...f,built:true,discoveryId:f.id,discovered:false}),cooking=createCooking(e,fire);fire.cooking=cooking;s.camps.push({id:f.id,fire,cooking});}
  else {const multiplier=Number(f.kind.slice(-1));e.addResource({id:f.id,kind:'food',foodSource:'strange-seed',seedMultiplier:multiplier,x:f.x,z:f.z,base:multiplier===5?1.25:.95,state:'depleted',growth:0,hits:0,readyAt:null,reservedBy:null,unplanted:true});}
 }
}
export function noticeFindings(e){for(const f of e.exploration?.finds??[])if(f.seenAt===null&&visibleAt(e,f.x,f.z)){f.seenAt=e.time;e.emit('wilderness-found',null,null,{...f,name:findName(f)});}}
export function findName(f){return f.kind==='camp'?'An abandoned hearth':f.kind==='seed-5'?'A crownseed · 5× food':'A twinseed · 2× food';}
export function claimFinding(e,f,w){
 if(f.claimedAt!==null||!visibleAt(e,f.x,f.z)||Math.hypot(w.x-f.x,w.z-f.z)>2)return false;
 f.claimedAt=e.time;f.reservedBy=null;
 if(f.kind==='camp'){const c=e.exploration.camps.find(c=>c.id===f.id);c.fire.discovered=true;c.cooking.after=e.time;}
 else {const n=e.nodes.find(n=>n.id===f.id),rules=forageRules(n);((Object.assign(resourceCultivation(n),{unplanted:false}),n),Object.assign(resourceGrowth(n),{state:'growing',growth:.08,initialGrow:rules.grow,readyAt:e.time+rules.grow}),n);e.emit('regrow',w,n);}
 e.emit('wilderness-claimed',w,null,{...f,name:findName(f)});return true;
}
