import {COMBAT_REACTIONS,ReactionState,reactionEnvelope} from './reactions.js';
import {ReactionAudio} from './reaction-audio.js';
const iconURL=id=>new URL(`../scene3d/assets/dice/emotes/${id}.svg`,import.meta.url).href;
export class DuelEmotes{
 constructor(characters,sound){
  this.characters=characters;this.sound=sound;this.state=new ReactionState();this.audio=new ReactionAudio(sound);this.anchors={};this.elements={};
  for(const [side,a]of Object.entries(characters.actors)){
   const el=document.createElement('span');el.className='character-emote';el.hidden=true;el.setAttribute('role','img');
   const image=document.createElement('img');image.alt='';image.draggable=false;el.append(image);a.motion.append(el);this.elements[side]=el;
  }
 }
 async load(){
  const response=await fetch(new URL('../scene3d/assets/dice/characters/pose-bounds.json',import.meta.url));if(!response.ok)throw Error('Missing character head anchors');this.anchors=await response.json();
  await Promise.all([...new Set(Object.values(COMBAT_REACTIONS).map(r=>r.icon))].map(id=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Missing emote '+id));image.src=iconURL(id);})))
 }
 trigger(side,kind){
  // Keep the stage readable: emotes are reserved for damage and match endings.
  // Routine timing feedback already has tile flashes and hit sounds.
  if(!['hurt','death','victory'].includes(kind))return;
  const event=this.state.trigger(side,kind,performance.now());if(!event)return;
  const el=this.elements[side];el.firstChild.src=iconURL(event.icon);el.setAttribute('aria-label',(side==='hero'?'You: ':'Skeleton: ')+kind);el.dataset.emotion=kind;el.hidden=false;
  if(kind==='death'||kind==='victory')this.audio.play(side,kind);
  if(kind==='death')this.sound.play(kind);
 }
 update(now){
  for(const [side,el]of Object.entries(this.elements)){
   const event=this.state.events[side];if(!event)continue;const age=(now-event.at)/1000;
   if(age>=event.duration){el.hidden=true;this.state.events[side]=null;continue;}
   const a=this.characters.actors[side],anchor=this.anchors[a.name+'-'+a.pose]?.bounds.top??64;
   el.style.top=(anchor/512*100)+'%';
   const env=reactionEnvelope(age,event.duration),wobble=this.characters.reduced?0:Math.sin(age*(event.kind==='hurt'?22:6))*Math.exp(-age*2)*(event.kind==='hurt'?7:3);
   el.style.opacity=env.opacity;el.style.transform=`translate(-50%,calc(-100% - ${10+env.rise}px)) rotate(${wobble}deg) scale(${this.characters.reduced?1:env.scale})`;
  }
 }
 reset(){this.state.clear();this.audio.reset();for(const el of Object.values(this.elements))el.hidden=true;}
 dispose(){this.reset();this.audio.dispose();for(const el of Object.values(this.elements))el.remove();}
}
