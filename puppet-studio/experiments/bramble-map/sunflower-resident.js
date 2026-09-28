import {createSunflowerMapPuppet} from './sunflower-map-puppet.js';
import {CLIPS} from '../sunflower-puppet/motion.js';
const NS='http://www.w3.org/2000/svg';
const node=(name,attrs,parent)=>{const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};

// A second, independent actor using the exact same directional rig as the study.
export async function createSunflowerResident(world,grove,renderer){
 const assetBase='../../../assets/sunflower-puppet/';
 const x=grove.x+120,y=grove.y+22;
 const root=node('g',{'data-map-character':'sunflower',role:'button',tabindex:-1,'aria-label':'Wave to the sunflower at Warden’s Grove',opacity:0},world);
 root.style.cursor='pointer';
 const puppet=await createSunflowerMapPuppet(renderer,assetBase);
 puppet.root.position.set(x,-y,0);
 renderer.characters??=[];renderer.characters.push({id:'sunflower',ground:()=>y,setOrder:base=>{puppet.setOrder(base);root.dataset.drawBase=base;}});
 const removeShadow=renderer.shadows.addPuppet(puppet.root,{layer:0,ground:()=>y});
 window.addEventListener('pagehide',()=>{removeShadow();puppet.dispose();},{once:true});
 node('rect',{x:x-32,y:y-100,width:64,height:110,fill:'transparent'},root);
 let now=0,waveAt=-Infinity,near=false,visible=false;
 const wave=()=>{if(visible)waveAt=now;};
 root.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();wave();}});
 return {root,puppet,wave,tick(time,{intro,traveller,gentle=false}){
  if(time<now){waveAt=-Infinity;near=false;}now=time;
  const opacity=Math.max(0,Math.min(1,(intro-grove.reveal-.15)/.3));visible=opacity>.99;
  root.setAttribute('opacity',opacity);root.setAttribute('tabindex',visible?0:-1);root.style.pointerEvents=visible?'auto':'none';
  const close=Math.hypot(traveller.x-x,traveller.y-y)<130;
  if(close&&!near&&visible)wave();near=close;
  const age=time-waveAt,hello=age>=0&&age<CLIPS.wave.duration;
  puppet.pose({clip:gentle?'idle':hello?'wave':'idle',time:gentle?0:hello?age:time,opacity});
 },snapshot:()=>({x,y,visible,waving:now-waveAt<CLIPS.wave.duration})};
}
