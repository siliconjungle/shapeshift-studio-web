import {CHARACTER_POSES,POSE_SEQUENCES,poseAtProgress,motionFrames} from './character-motion.js';
const asset=(name,pose)=>new URL(`../scene3d/assets/dice/characters/${name}-${pose}.svg`,import.meta.url).href;
export class DuelCharacters{
 constructor({hero,enemy,reduced=false}){
  this.reduced=reduced;this.actors={};
  for(const [side,element,name,direction]of [['hero',hero,'orange',1],['enemy',enemy,'skeleton',-1]]){
   this.actors[side]={element,motion:element.querySelector('.character-motion'),sprite:element.querySelector('.character-sprite'),name,direction,animations:[],sequence:null,pose:null,terminal:false};
   this.pose(side,'idle');
  }
 }
 async load(){await Promise.all(Object.values(this.actors).flatMap(a=>CHARACTER_POSES.map(p=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Could not load '+a.name+' '+p));image.src=asset(a.name,p);}))))}
 pose(side,pose){const a=this.actors[side];if(a.pose===pose)return;a.pose=pose;a.element.dataset.pose=pose;a.sprite.src=asset(a.name,pose);}
 cancel(a){a.animations.forEach(animation=>animation.cancel());a.animations=[];a.sequence=null;}
 play(side,kind,duration,{speed=1,terminal=false}={}){
  const a=this.actors[side];if(a.terminal)return;this.cancel(a);
  a.terminal=terminal;duration/=Math.max(1,Math.min(1.6,speed));
  a.sequence={kind,at:performance.now(),duration};this.pose(side,POSE_SEQUENCES[kind][0][1]);
  if(!this.reduced)a.animations.push(a.motion.animate(motionFrames(kind,a.direction),{duration,easing:'linear'}));
 }
 windup(){for(const side of ['hero','enemy'])if(!this.actors[side].sequence)this.play(side,'windup',620);}
 attack(side,speed=1){this.play(side,'attack',510,{speed});}
 hurt(side,{dead=false,speed=1}={}){
  this.play(side,dead?'defeat':'hurt',dead?760:660,{speed,terminal:dead});
  // Little Gods: warm 50 ms impact hold, then a 130 ms fade to original ink.
  this.actors[side].animations.push(this.actors[side].sprite.animate([{filter:'brightness(2.3) sepia(.6) saturate(.6)'},{filter:'brightness(2.3) sepia(.6) saturate(.6)',offset:.28},{filter:'none'}],{duration:180,easing:'ease-out'}));
 }
 dodge(){this.play('enemy','dodge',480);}
 win(side){this.play(side,'victory',720,{terminal:true});}
 update(now){for(const [side,a]of Object.entries(this.actors)){const seq=a.sequence;if(!seq)continue;const progress=Math.min(1,Math.max(0,(now-seq.at)/seq.duration));this.pose(side,poseAtProgress(POSE_SEQUENCES[seq.kind],progress));if(progress===1)a.sequence=null;}}
 reset(){for(const [side,a]of Object.entries(this.actors)){this.cancel(a);a.terminal=false;this.pose(side,'idle');}}
 dispose(){for(const a of Object.values(this.actors))this.cancel(a);}
}
