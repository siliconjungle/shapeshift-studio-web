import {ClipAudio} from './sound.js';
import {previewProject,previewSegment,previewHeight} from './preview.js';
import {loadImages,renderFrame,motionBounds} from '../runtime.js';

// The arena owns the only clock. A lane never schedules frames or writes into
// the editor project; both lanes receive the same presentation timestamp.
export class PreviewPlayer{
 constructor(canvas){this.canvas=canvas;this.audio=new ClipAudio();this.time=0;this.segment='';this.disposed=false;}
 async load(project,scenario,{camera,framing}={}){
  this.scenario=structuredClone(scenario);this.source=previewProject(project,scenario);
  if(scenario.dimension===3){const {IllustratedScene}=await import('../scene3d/runtime.js');if(this.disposed)return;globalThis.__INK_VECTOR_WORKER__=new URL('../scene3d/vector-worker.js',import.meta.url).href;this.scene=new IllustratedScene(this.canvas,{controls:true});await this.scene.load(this.source);if(this.disposed){this.scene.dispose();return;}if(camera)this.scene.setCamera(camera);}
  else{this.images=await loadImages(this.source);this.framing=framing??motionBounds(this.source,this.source.clips.find(c=>c.id===scenario.clip)??this.source.clips[0]);this.ownFraming=structuredClone(this.framing);if(this.disposed)this.disposeImages();}
 }
 resize(w,h){if(this.scene)this.scene.resize(w,h);else{this.canvas.width=Math.max(1,Math.round(w));this.canvas.height=Math.max(1,Math.round(h));}}
 gaze(at){const g=this.scenario.gaze,actor=this.scene?.pipeline??this.scene?.facials;if(actor){actor.pointer=g.enabled?{x:Math.sin(at*g.speed)*g.radius[0],y:Math.cos(at*g.speed*.73)*g.radius[1]}:null;}}
 seek(at,{continuous=false,audible=false}={}){
  if(this.disposed)return;const time=Math.max(0,Math.min(this.scenario.duration,at)),part=previewSegment(this.scenario,time),key=part.clip+':'+part.start,doc=this.scene?this.source.scene3d:this.source,clip=doc.clips.find(c=>c.id===part.clip);
  if(!clip)throw Error('Preview clip no longer exists: '+part.clip);
  const local=clip.loop?part.time%clip.duration:Math.min(part.time,clip.duration),same=key===this.segment;
  if(continuous&&same&&time===this.time){if(at>=this.scenario.duration)this.pause();return;}
  if(this.scene){
   if(continuous&&!same){this.pause();this.gaze(part.start);this.scene.seek(0,clip.id,{audible:false});this.scene.preparePlayback({audible});let t=0;while(t<local-1e-9){const next=Math.min(local,t+1/60);this.gaze(part.start+next);this.scene.seek(next,clip.id,{continuous:true,audible,clock:part.start+next});t=next;}}else{
   if(!same)this.pause();const forward=continuous&&same&&time>=this.time&&local>=this.local;
   // Match controller integration on both lanes, including slower UI frames.
   if(forward&&local>this.local){let t=this.local;while(t<local-1e-9){const next=Math.min(local,t+1/60);this.gaze(time-(local-next));this.scene.seek(next,clip.id,{continuous:true,audible,clock:time-(local-next)});t=next;}}
   else{this.gaze(time);this.scene.seek(local,clip.id,{continuous:false,audible:false,clock:time});}
   if(audible&&!same)this.scene.preparePlayback({audible:true});
   }
  }else{
   const c=structuredClone(clip),s=this.scenario;
   if(s.gaze.enabled&&this.source.joints.some(j=>j.id===s.subject)){c.tools??={};c.tools.constraints??=[];c.tools.constraints.push({id:'preview-gaze',type:'look',joint:s.subject,point:[Math.sin(time*s.gaze.speed)*220,Math.cos(time*s.gaze.speed*.73)*100-140],origin:[0,0],weight:1,start:0,end:c.duration,blend:0,enabled:true,limit:60,forward:0});}
   const g=s.ground,frame=renderFrame(this.source,this.images,c,local,{width:this.canvas.width,height:this.canvas.height,framing:this.framing,background:'#33353b',underlay:g.enabled?ctx=>{ctx.fillStyle='#515b61';ctx.strokeStyle='#22262a';ctx.lineWidth=2;ctx.beginPath();for(let x=-2000;x<=2000;x+=8){const y=previewHeight(g,x);if(x===-2000)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.lineTo(2000,3000);ctx.lineTo(-2000,3000);ctx.closePath();ctx.fill();ctx.stroke();}:undefined});
   if(audible&&!same)this.audio.begin(c,continuous?0:local);this.audio.sync(this.source,c,local,{audible});this.canvas.getContext('2d').drawImage(frame,0,0);
  }
  if(this.scene&&!this.scene.pipeline)this.scene.facials.setClock(local,{reset:!continuous||!same||local<this.local});
  this.time=time;this.local=local;this.segment=key;
 }
 render({idle=false}={}){if(this.scene){if(idle&&!this.scene.controls?.update()&&!this.scene.dirty)return;if(this.scene.pipeline)this.scene.pipeline.didStep=true;this.scene.render(true);}}
 async play(audible){
  if(!audible){this.pause();return;}
  if(this.scene){await this.scene.effects.unlock();this.scene.effects.muted=false;this.scene.preparePlayback({audible:true});this.scene.effects.resume?.();}
  else{const p=previewSegment(this.scenario,this.time),c=this.source.clips.find(c=>c.id===p.clip);this.audio.begin(c,this.local);}
 }
 pause(){this.audio.stop();if(this.scene){this.scene.effects.pause();for(const a of this.scene.pipeline?.actors.values()??[])a.audio?.stop();}}
 disposeImages(){for(const m of this.images?.models?.values()??[])m.dispose?.();this.images=null;}
 dispose(){this.disposed=true;this.pause();this.audio.dispose();this.scene?.dispose();this.disposeImages();}
 snapshot(){return{time:this.time,local:this.local,segment:this.segment,scene:this.scene?.snapshot()??null};}
}
