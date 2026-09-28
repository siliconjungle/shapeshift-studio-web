import {nextLockedLocation} from './map-progression.js';
import {puffPose} from './feedback-motion.js';
const NS='http://www.w3.org/2000/svg',clamp=x=>Math.max(0,Math.min(1,x));
function el(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
export function lockRevealTime(locations,id){
 const i=locations.findIndex(n=>n.id===id),location=locations[i];
 // Land on the offbeat between this pop note and the next. Follow the
 // randomized reveal rhythm rather than adding an unrelated fixed delay.
 const beat=locations[i+1]?locations[i+1].reveal-location.reveal:i>0?location.reveal-locations[i-1].reveal:.58;
 return location.reveal+.04+beat/2;
}
export function lockPose(age,phase,gentle=false){
 if(phase==='unlock'){
  const t=clamp(age/.34),wave=Math.sin(t*Math.PI);
  return{x:gentle?1:1+.28*wave,y:gentle?1:Math.max(.02,1+.14*wave-t*t),dy:gentle?0:-12*wave,angle:gentle?0:Math.sin(t*15)*12*(1-t),opacity:1-clamp((t-.35)/.65)};
 }
 const t=clamp(age/.32),wave=Math.sin(t*10)*Math.exp(-t*5),scale=1-Math.exp(-t*8)*Math.cos(t*11);
 return{x:gentle?1:Math.max(.01,scale+.22*wave),y:gentle?1:Math.max(.01,scale-.22*wave),dy:gentle?0:6*wave,angle:gentle?0:-8*wave,opacity:clamp(age/.08)};
}
export function createMapLocks(svg,locations,scene,cleared,audio){
 const root=el('g',{'data-feedback':'lock','pointer-events':'none','aria-hidden':'true'},svg);
 const icon=el('g',{opacity:0},root);
 el('use',{href:'#location-lock',x:-29,y:-35,width:58,height:70},icon);
 const bursts=Array.from({length:2},()=>({age:1,x:0,y:0,nodes:Array.from({length:3},(_,i)=>el('use',{href:'#selection-puff',x:i?-13:-29,y:i?-13:-29,width:i?26:58,height:i?26:58,opacity:0},root))}));
 let shown=null,phase='wait',age=0,burstIndex=0,puffed=false;
 const anchor=id=>{const n=locations.get(id);return{x:n.x,y:n.y-n.height*.42};};
 function puff(id){Object.assign(bursts[burstIndex++%bursts.length],anchor(id),{age:0});}
 return{
  reset(){shown=null;phase='wait';age=0;puffed=false;icon.setAttribute('opacity',0);for(const b of bursts){b.age=1;for(const n of b.nodes)n.setAttribute('opacity',0);}},
  tick(dt,intro,gentle){
   age+=dt;const target=nextLockedLocation(scene.locations,cleared);
   if(shown&&shown!==target&&phase!=='unlock'){phase='unlock';age=0;puffed=false;audio.unlockLocation();}
   if(phase==='unlock'){
    if(age>=.14&&!puffed){puff(shown);puffed=true;}
    if(age>=.38){shown=null;phase='wait';age=0;}
   }
   if(!shown&&target&&intro>=lockRevealTime(scene.locations,target)){shown=target;phase='enter';age=0;puff(shown);audio.lockAppear();}
   if(phase==='enter'&&age>=.32)phase='locked';
   if(shown){const a=anchor(shown),p=phase==='locked'?{x:1,y:1,dy:0,angle:0,opacity:1}:lockPose(age,phase,gentle);icon.setAttribute('transform',`translate(${a.x} ${a.y+p.dy}) rotate(${p.angle}) scale(${p.x} ${p.y})`);icon.setAttribute('opacity',p.opacity);}else icon.setAttribute('opacity',0);
   root.dataset.lockLocation=shown??'';root.dataset.lockPhase=shown?phase:target?'wait':'complete';
   for(const b of bursts){b.age+=dt;for(const [i,node]of b.nodes.entries()){const p=puffPose(b.age,i,gentle);node.setAttribute('opacity',p.opacity);node.setAttribute('transform',`translate(${b.x+p.x} ${b.y+p.y}) scale(${p.scale})`);}}
  }
 };
}
