import {ProceduralSimulation,STEP} from '@shapeshift-labs/studio-core/procedural/simulation';
import {proceduralSurfaces} from '@shapeshift-labs/studio-core/procedural/surfaces';
import {poseAt,renderFrame,motionBounds} from '../runtime.js';

/** Live game-input player. The deterministic timeline remains independent. */
export function createProceduralPlayer(canvas,project,images,options={}){
 const clip=project.clips.find(c=>c.id===options.clipId)??project.clips[0],definition=project.procedural;
 if(!definition?.particles.length)throw Error('Create a procedural structure first');
 const targets={},drivers=new Set(definition.drivers.map(d=>d.particle)),timeAt=t=>clip?.loop?t%clip.duration:Math.min(t,clip?.duration??t);
 let anchorTime=-1,anchorPose,frame,accumulator=0,raf=0,playing=false,last=0;
 const simulation=new ProceduralSimulation(definition,{anchorAt(p,time){
  if(time!==anchorTime){anchorTime=time;anchorPose=poseAt(project,clip,timeAt(time),{procedural:false});}
  const m=anchorPose.get(p.joint)?.world;if(!m)return p.position;const [x,y]=p.offset??[0,0];return [m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
 }});
 const renderOptions={...options,width:canvas.width,height:canvas.height,framing:options.framing??(options.camera?undefined:motionBounds(project,clip))};
 function snapshot(){frame=simulation.frame();frame.surfaces=proceduralSurfaces(definition,frame);return frame;}
 function draw(){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderFrame(project,images,clip,timeAt(frame.time),{...renderOptions,proceduralPose:frame}),0,0);return frame;}
 function step(dt=STEP){simulation.step(dt,{targets});snapshot();return draw();}
 function update(seconds){
  if(!Number.isFinite(seconds)||seconds<0||seconds>1)throw Error('Live update must be 0–1 seconds');
  accumulator+=seconds;while(accumulator+1e-10>=STEP){simulation.step(STEP,{targets});accumulator-=STEP;}snapshot();return draw();
 }
 function tick(now){if(!playing)return;update(Math.max(0,Math.min(.25,(now-last)/1000)));last=now;raf=requestAnimationFrame(tick);}
 snapshot();draw();
 return {draw,step,update,frame:()=>frame,
  setTarget(id,position){if(!drivers.has(id))throw Error('Choose a driven target point');if(!Array.isArray(position)||position.length!==2||position.some(v=>!Number.isFinite(v)||Math.abs(v)>100000))throw Error('Target must contain finite XY coordinates');targets[id]=[...position];},
  releaseTarget(id){delete targets[id];},
  reset(){simulation.reset();accumulator=0;anchorTime=-1;snapshot();return draw();},
  play(){if(playing)return;playing=true;last=performance.now();raf=requestAnimationFrame(tick);},
  stop(){playing=false;cancelAnimationFrame(raf);},dispose(){this.stop();}
 };
}
