import {EmotePlayer,REACTION_BY_ID,emoteEnvelope,deformReaction} from '../shared/emote-motion.js';
import {emoteFrame} from './emote-layout.js';
import {arrowPose,puffPose,FootContacts,chooseReaction,nextEmoteDelay,feedbackReactions} from './feedback-motion.js';
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
export function createMapFeedback(svg,locations,audio){
 const root=el('g',{'data-feedback':'selection','pointer-events':'none','aria-hidden':'true'},svg);
 const arrow=el('g',{'data-inflate':0},root);el('use',{href:'#selection-arrow',x:-27,y:-64,width:54,height:64},arrow);
 const bursts=Array.from({length:2},()=>({age:1,x:0,y:0,nodes:Array.from({length:3},(_,i)=>el('use',{href:'#selection-puff',x:i?-10:-22,y:i?-10:-22,width:i?20:44,height:i?20:44,opacity:0},root))}));let burstIndex=0;
 const destinationRoot=el('g',{'data-feedback':'destination','pointer-events':'none','aria-hidden':'true',opacity:0},svg),destinationIcon=el('g',{'data-inflate':0},destinationRoot);
 el('use',{href:'#destination-pennant',x:-24,y:-58,width:48,height:58},destinationIcon);
 let destinationShown=null,destinationAge=0;
 const emoteRoot=el('g',{'data-feedback':'emote','pointer-events':'none','aria-hidden':'true'},svg),icons=new Map();
 for(const id of feedbackReactions){const g=el('g',{opacity:0},emoteRoot);el('use',{href:'#emote-'+id,x:emoteFrame.x,y:emoteFrame.y,width:emoteFrame.size,height:emoteFrame.size},g);icons.set(id,g);}
 const player=new EmotePlayer(),contacts=new FootContacts();let shown='camp',target='camp',age=0,exiting=false,nextEmote=nextEmoteDelay(),lastEmote=null,wasWalking=false;
 function anchor(id){const n=locations.get(id);return{x:n.x,y:Math.max(78,n.y-n.height-12)};}
 function puff(id){const p=anchor(id),b=bursts[burstIndex++%bursts.length];Object.assign(b,{...p,y:p.y-25,age:0});audio.puff();}
 function reaction(id){player.trigger(id,{intensity:.75});lastEmote=id;}
 return{
  select(id){if(id===target)return;target=id;if(!exiting){exiting=true;age=0;puff(shown);}},
  reset(){destinationShown=null;destinationAge=0;destinationRoot.setAttribute('opacity',0);shown=target='camp';age=0;exiting=false;player.clear();nextEmote=nextEmoteDelay();for(const b of bursts)b.age=1;},
  tick(dt,time,{pos,gait,walking,biome,gentle,intro,destination=null}){
   age+=dt;
   if(exiting&&age>=.13){shown=target;exiting=false;age=0;puff(shown);}
   const p=arrowPose(age,time,gentle,exiting),a=anchor(shown);
   arrow.setAttribute('transform',`translate(${a.x} ${a.y+p.dy}) rotate(${p.angle}) scale(${p.x} ${p.y})`);arrow.setAttribute('opacity',intro>.26?p.opacity:0);arrow.dataset.inflate=String(p.inflate);
   const otherDestination=destination&&destination!==target&&!(shown===destination&&exiting)?destination:null;
   if(otherDestination!==destinationShown){destinationShown=otherDestination;destinationAge=0;}else destinationAge+=dt;
   destinationRoot.dataset.destination=destinationShown??'';destinationRoot.setAttribute('opacity',destinationShown?1:0);
   if(destinationShown){const a=anchor(destinationShown),p=arrowPose(destinationAge,time+.7,gentle);destinationIcon.setAttribute('transform',`translate(${a.x} ${a.y+p.dy*.7}) rotate(${p.angle}) scale(${p.x} ${p.y})`);destinationIcon.setAttribute('opacity',p.opacity);destinationIcon.dataset.inflate=String(p.inflate);}
   root.dataset.selection=shown;root.dataset.transition=exiting?'exit':age<.34?'enter':'bob';
   for(const b of bursts){b.age+=dt;for(const [i,node]of b.nodes.entries()){const p=puffPose(b.age,i,gentle);node.setAttribute('opacity',p.opacity);node.setAttribute('transform',`translate(${b.x+p.x} ${b.y+p.y}) scale(${p.scale})`);}}
   if(contacts.update(gait.cycle,walking))audio.step(biome);
   if(!walking&&wasWalking)audio.arrive();
   wasWalking=walking;const wasReacting=!!player.active;player.update(dt);
   if(wasReacting&&!player.active)nextEmote=time+nextEmoteDelay();
   if(time>=nextEmote&&!player.active){reaction(chooseReaction(Math.random,lastEmote,walking,biome));nextEmote=Infinity;}
   const event=player.active;audio.update(event);emoteRoot.dataset.reaction=event?.id??'';
   for(const [id,node]of icons){if(event?.id!==id){node.setAttribute('opacity',0);continue;}
    const r=REACTION_BY_ID.get(id),e=emoteEnvelope(event.age,r.duration),bend=gentle?{x:0,y:.5}:deformReaction(r.motion,0,.5,event.age,.75);
    node.setAttribute('transform',`translate(${pos.x+bend.x*35} ${pos.y-103-(bend.y-.5)*30-e.rise*30}) rotate(${bend.x*30}) scale(${e.scale})`);node.setAttribute('opacity',e.opacity);
   }
   return event;
  },get diagnostics(){return{selection:shown,target,transition:root.dataset.transition,nextEmoteAt:Number.isFinite(nextEmote)?nextEmote:null,reaction:player.active?.id??null,audio:audio.diagnostics};}
 };
}
