import {World,Body,Plane,Vec3,ConvexPolyhedron,Material,ContactMaterial} from 'cannon-es';
import * as T from '../scene3d/vendor.js';
const DT=1/120;
export function randomGenerator(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function restingFace(solid,quaternion){const q=new T.Quaternion(...quaternion),faces=solid.faces.map(f=>({...f,y:new T.Vector3(...f.normal).applyQuaternion(q).y})),underside=solid.sides===4&&solid.kind==='die',sorted=faces.sort((a,b)=>underside?a.y-b.y:b.y-a.y),best=sorted[0];return{value:best.value,alignment:Math.abs(best.y),underside,valid:best.value>0&&Math.abs(best.y)>.975};}
// Physics determines the result. A fixed-step simulation is recorded into normal
// Studio animation tracks, so scrubbing/export reproduces the exact same throw.
export function simulateDice(solid,{seed=1,start=[0,0,0,1],position=null,maxSeconds=9}={}){
 const random=randomGenerator(seed),world=new World({gravity:new Vec3(0,-20,0),allowSleep:true});world.solver.iterations=18;world.solver.tolerance=1e-8;
 const stone=new Material('dice'),felt=new Material('table');world.addContactMaterial(new ContactMaterial(stone,felt,{friction:.48,restitution:.32,contactEquationStiffness:1e8,contactEquationRelaxation:4}));const floor=new Body({mass:0,shape:new Plane(),material:felt});floor.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(floor);
 const shape=new ConvexPolyhedron({vertices:solid.vertices.map(v=>new Vec3(...v)),faces:solid.faces.map(f=>f.ids)}),body=new Body({mass:1,shape,material:stone,position:new Vec3(...(position??[0,1,0])),linearDamping:.22,angularDamping:.2,allowSleep:true,sleepSpeedLimit:.12,sleepTimeLimit:.38});body.quaternion.set(...start);body.velocity.set(-body.position.x*.8+(random()-.5)*1.2,7.4,-body.position.z*.8+(random()-.5)*.9);const spin=[9+random()*7,(random()-.5)*13,7+random()*7];world.addBody(body);const impacts=[],samples=[];let clock=0,lastImpact=-1,settled=0;
 body.addEventListener('collide',e=>{// Positive means approaching; a resting die departing upward is not a landing.
 const speed=e.contact.getImpactVelocityAlongNormal();if(speed>.6&&clock-lastImpact>.075){impacts.push({time:clock,strength:Math.min(1,speed/9)});lastImpact=clock;}});
 const capture=()=>samples.push({time:clock,position:[body.position.x,body.position.y,body.position.z],quaternion:[body.quaternion.x,body.quaternion.y,body.quaternion.z,body.quaternion.w],velocity:body.velocity.length()});capture();
 for(let i=1;i<=Math.ceil(maxSeconds/DT);i++){clock=i*DT;if(i===15)body.angularVelocity.set(...spin);world.step(DT);if(i%2===0)capture();const slow=body.velocity.length()<.08&&body.angularVelocity.length()<.12;settled=slow?settled+DT:0;if(clock>1&&(body.sleepState===Body.SLEEPING||settled>.45)){if(i%2)capture();break;}}
 const last=samples.at(-1),result=restingFace(solid,last.quaternion),sleeping=body.sleepState===Body.SLEEPING||settled>.45;return{seed,samples,impacts,duration:last.time,result:{...result,valid:result.valid&&sleeping},settled:sleeping};
}
export function physicsRollClip(solid,simulation,{id='roll',body='die',rig='die-rig',squish=1,settleHold=.35,smear=0,followThrough=0}={}){
 // Extend the resting pose so impact deformation can finish on the animation clock.
 if(followThrough>0){const last=simulation.samples.at(-1),samples=[...simulation.samples],steps=Math.ceil(followThrough*120);for(let i=1;i<=steps;i++)samples.push({...last,time:simulation.duration+followThrough*i/steps});simulation={...simulation,samples,duration:simulation.duration+followThrough};}
 const tracks=[{node:body,channel:'rotation',keys:[]},{node:rig,channel:'position',keys:[]},{node:rig,channel:'deform.stretch',keys:[]},{node:rig,channel:'deform.bend',keys:[]}];let previous;
 for(const sample of simulation.samples){const q=new T.Quaternion(...sample.quaternion),e=new T.Euler().setFromQuaternion(q,'XYZ'),rotation=[e.x,e.y,e.z].map(T.MathUtils.radToDeg);if(previous)for(let i=0;i<3;i++){while(rotation[i]-previous[i]>180)rotation[i]-=360;while(rotation[i]-previous[i]<-180)rotation[i]+=360;}previous=rotation;
  let squash=0,bend=0;for(const hit of simulation.impacts){const age=sample.time-hit.time;if(age>=0&&age<.34){squash+=.3*hit.strength*Math.cos(age*25)*Math.exp(-age*13);bend+=.14*hit.strength*Math.sin(age*24)*Math.exp(-age*12);}}
  const airborne=Math.max(0,Math.min(1,(landingTime(simulation)-sample.time)/.12)),stretch=Math.max(.64,1-squash*squish)+Math.max(0,Math.min(1,smear))*.32*airborne*Math.min(1,sample.velocity/8);let minY=Infinity;for(const vertex of solid.vertices)minY=Math.min(minY,new T.Vector3(...vertex).applyQuaternion(q).y);const p=[...sample.position];p[1]+=(minY+1)*(1-stretch);[rotation,p,stretch,[bend*squish,0]].forEach((value,i)=>tracks[i].keys.push({time:sample.time,value,easing:'linear'}));}
 const duration=simulation.duration+settleHold;for(const t of tracks)t.keys.push({...structuredClone(t.keys.at(-1)),time:duration});return{id,name:'Physics roll · '+(simulation.result.valid?simulation.result.value:'cocked'),duration,loop:false,tracks,events:simulation.impacts.map((hit,i)=>({id:id+'-contact-'+i,type:'sound',time:hit.time,duration:.1,node:body,pitch:110+hit.strength*130,volume:.06+hit.strength*.22}))};
}
export function landingTime(simulation){return simulation.impacts[0]?.time??.65;}

// Locate the floor footprint at contact time, even when a frame passes the impact.
export function impactFloorPoint(simulation,time){
 const samples=simulation.samples;let lo=0,hi=samples.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(samples[mid].time<=time)lo=mid;else hi=mid;}
 const a=samples[lo],b=samples[hi],u=Math.max(0,Math.min(1,(time-a.time)/Math.max(1e-9,b.time-a.time)));
 return[a.position[0]+(b.position[0]-a.position[0])*u,0,a.position[2]+(b.position[2]-a.position[2])*u];
}
