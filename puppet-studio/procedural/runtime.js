import {ProceduralTimeline} from '@shapeshift-labs/studio-core/procedural/simulation';
import {proceduralSurfaces} from '@shapeshift-labs/studio-core/procedural/surfaces';
const cache=new WeakMap();
export function proceduralFrame(project,clip,time,samplePose,overrides=[]){
 const definition=project.procedural;if(!definition?.particles.length)return null;
 const signature=JSON.stringify([definition,project.joints,project.clips,clip?.id,overrides]);
 let entry=cache.get(definition);
 if(!entry||entry.signature!==signature){
  let at=-1,pose;
  entry={signature,timeline:new ProceduralTimeline(definition,{anchorAt(p,time){if(time!==at){pose=samplePose(time);at=time;}const m=pose.get(p.joint)?.world;if(!m)return p.position;const [x,y]=p.offset??[0,0];return[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];}})};cache.set(definition,entry);
 }
 const tick=Math.floor(Math.max(0,time)*60+1e-7);
 if(entry.tick!==tick){entry.frame=entry.timeline.sample(Math.min(120,Math.max(0,time)));entry.frame.surfaces=proceduralSurfaces(definition,entry.frame);entry.tick=tick;}
 return entry.frame;
}
