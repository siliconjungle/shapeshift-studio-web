import {sample,beats,DURATION,performanceAt,prepare,frame as facialFrame} from '../intentional/performance.js';
import {matrix,multiply,identity} from '@shapeshift-labs/studio-core/joint-transforms';
export {DURATION};
export const labels={costume:'Scarf & shoulders',head:'Head',hatTies:'Hat ties',hat:'Hat & brim',leftArm:'Left forearm',leftHand:'Left hand',rightArm:'Right forearm',rightHand:'Right hand',leftEye:'Left eye',rightEye:'Right eye',leftPupil:'Left pupil',rightPupil:'Right pupil',leftLid:'Left eyelid',rightLid:'Right eyelid',mouth:'Mouth',tongue:'Tongue',nose:'Nose'};
const trans=(x,y)=>[1,0,0,1,x,y],clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function preparePuppet(library,drawings,original){return {library,mouths:prepare(drawings,original)};}
const positionKeys=[...beats,[.70,'composed'],[6.65,'settle']].sort((a,b)=>a[0]-b[0]);
function posePosition(library,time,id,forced){if(forced)return library.poses[forced][id].position;let i=0;while(i<positionKeys.length-1&&time>=positionKeys[i+1][0])i++;const a=positionKeys[i],b=positionKeys[Math.min(i+1,positionKeys.length-1)],u=smooth((time-a[0])/(b[0]-a[0]||1));return library.poses[a[1]][id].position.map((v,j)=>v+(library.poses[b[1]][id].position[j]-v)*u);}
export function puppetFrame(rig,time,{pose:forced=null,headTurn=0,leftReach=0,rightReach=0,gaze=0,explode=0,manifest=null}={}){
 const {library}=rig,{pose:p,weights}=manifest?performanceAt(time,manifest,forced):{pose:sample(time),weights:null};if(forced)p.drawing=forced;
 const definition=library.poses[p.drawing],head=matrix({...identity(),x:320,y:430+p.headY,rotation:p.tilt+headTurn,scaleX:p.sx,scaleY:p.sy});
 const entries=[];
 const add=(id,asset,world,order,parent='root',shapes=null)=>entries.push({id,asset,world,order,parent,shapes:shapes??library.assets[asset].vector.shapes});
 add('costume','costume',trans(320,600),0);
 add('hatTies','hat-ties',multiply(head,trans(0,-180)),1,'head');
 add('head','head',head,2);
 for(const side of ['left','right']){
  const eid=side+'Eye',entry=definition[eid],pos=posePosition(library,time,eid,forced),eyeWorld=multiply(head,trans(pos[0]-320,pos[1]-430));
  add(eid,entry.asset,eyeWorld,3,'head');
  add(side+'Pupil',definition[side+'Pupil'].asset,multiply(eyeWorld,trans(gaze*5,0)),4,eid);
  add(side+'Lid',definition[side+'Lid'].asset,eyeWorld,5,eid);
 }
 const mouthWorld=multiply(head,trans(0,-25));
 let mouthShapes=null,tongueShapes=null;
 if(p.drawing==='settle'){
  const neutral={...p,headY:0,tilt:0,sx:1,sy:1,hat:0},shapes=facialFrame(rig.mouths,neutral,weights);
  const local=s=>({...s,points:s.points.map((v,i)=>v-[320,405][i%2])});mouthShapes=[local(shapes.find(s=>s.id==='settle-3'))];tongueShapes=[local(shapes.find(s=>s.id==='settle-9'))];
 }
 add('mouth',definition.mouth.asset,mouthWorld,6,'head',mouthShapes);
 add('tongue',definition.tongue.asset,mouthWorld,7,'mouth',tongueShapes);
 add('nose',definition.nose.asset,multiply(head,trans(0,-85)),8,'head');
 add('hat','hat',multiply(head,matrix({...identity(),x:p.hat*.3,y:-180,rotation:p.hat*.15})),9,'head');
 for(const side of ['left','right']){
  const armId=side+'Arm',handId=side+'Hand',arm=definition[armId],hand=definition[handId],elbow=posePosition(library,time,armId,forced),wrist=posePosition(library,time,handId,forced);
  const reach=side==='left'?leftReach:rightReach;
  // A small skin deformation keeps the wrist connected when its control moves.
  const contact=['approach','contact','overshoot','settle'].includes(p.drawing)?1:0;
  const hx=head[0]*(wrist[0]-320)+head[2]*(wrist[1]-430)+head[4],hy=head[1]*(wrist[0]-320)+head[3]*(wrist[1]-430)+head[5];
  const wx=wrist[0]+(hx-wrist[0])*contact+reach*(side==='left'?-1:1),wy=wrist[1]+(hy-wrist[1])*contact-Math.abs(reach)*.35;
  const original=hand.position.map((v,i)=>v-arm.position[i]),desired=[wx-elbow[0],wy-elbow[1]],armShapes=library.assets[arm.asset].vector.shapes.map(s=>({...s,points:s.points.map((v,i,a)=>{const h=clamp(-a[i-i%2+1]/Math.max(1,-original[1]));return v+(desired[i%2]-original[i%2])*h;})}));
  add(armId,arm.asset,trans(...elbow),10,'root',armShapes);
  add(handId,hand.asset,multiply(trans(wx,wy),matrix({...identity(),rotation:(p.tilt+headTurn)*contact})),11+(side==='right'?1:0),armId);
 }
 const offsets={costume:[0,65],head:[0,0],hat:[0,-135],hatTies:[0,-95],leftArm:[-150,70],rightArm:[150,70],leftHand:[-225,-30],rightHand:[225,-30],leftEye:[-115,-15],rightEye:[115,-15],leftPupil:[-175,-65],rightPupil:[175,-65],leftLid:[-115,-85],rightLid:[115,-85],mouth:[0,105],tongue:[80,135],nose:[0,-40]};
 for(const e of entries){e.world=e.world.slice();e.world[4]+=(offsets[e.id]?.[0]??0)*explode;e.world[5]+=(offsets[e.id]?.[1]??0)*explode;}
 return {pose:p.drawing,layers:entries.sort((a,b)=>a.order-b.order)};
}
