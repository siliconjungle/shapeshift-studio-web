import {animationTime} from '../fx/presentation.js';
// Canvas gestures describe authored edits; projection and pointer state are session-only.
import {sampleLighting2D} from '../lighting-state.js';
import {sampleScene} from '../scene3d/animation.js';
import {sampleBackdrop} from './backdrop.js';
export function canvasEditCommands(project,context,edit){
 const {dimension=2,clip:clipId,time=0,animate=false,mode}=context,scene=dimension===3;
 const authoredTime=()=>scene?time:animationTime(clip,time);
 const doc=scene?project.scene3d:project,clip=doc?.clips.find(c=>c.id===clipId),node=(scene?doc?.nodes:doc?.joints)?.find(n=>n.id===edit.node);
 if(edit.kind==='backdrop'){
  const b=project.backdrop,layer=b?.layers.find(l=>l.id===edit.id);if(!layer)throw Error('Missing background layer');
  if(!['position','parallax','scale'].includes(edit.channel))throw Error('Unsupported layer handle');
  const keyed=animate||layer.tracks.some(t=>t.channel===edit.channel),timeAt=b.loop?time%b.duration:Math.min(time,b.duration);
  return [keyed?{op:'backdrop.key',id:edit.id,channel:edit.channel,time:timeAt,value:edit.value}:{op:'backdrop.update',id:edit.id,values:{[edit.channel]:edit.value}}];
 }
 if(edit.kind==='target'){
  const constraint=clip?.tools?.constraints?.find(t=>t.id===edit.id);if(!constraint)throw Error('Missing look target');
  if(animate||constraint.pointKeys?.length)return [{op:'motion.targetKey',dimension,clip:clipId,id:edit.id,time:authoredTime(),value:edit.value,easing:'linear'}];return [{op:'motion.update',dimension,clip:clipId,id:edit.id,values:{point:edit.value}}];
 }
 if(edit.kind==='decal'){
  const event=clip?.events?.find(e=>e.id===edit.id);if(!scene||event?.type!=='decal'||event.controllerOwned)throw Error('Choose an authored decal');
  return [{op:'scene3d.event.update',clip:clipId,id:edit.id,values:{[edit.channel]:edit.value}}];
 }
 if(!node)throw Error('Choose an object');
 if(edit.kind==='eye'){
  const face=edit.face??'front',surface=node.surfaces?.[face];if(!surface?.eye)throw Error('This face has no eye');
  const keyed=animate||clip?.tracks.some(t=>t.node===node.id&&t.channel==='eye.gaze');
  return [keyed?{op:'scene3d.key',clip:clipId,node:node.id,time,channel:'eye.gaze',value:edit.value,easing:'smooth'}:{op:'scene3d.surface.set',id:node.id,face,value:{...surface,eye:{...surface.eye,gaze:edit.value}}}];
 }
 if(edit.kind!=='light'||!node.light||!['light.range','light.offset'].includes(edit.channel))throw Error('Unsupported canvas property');
 const keyed=animate||(mode!=='rig'&&(scene?clip?.tracks:clip?.lightingTracks)?.some(t=>t.node===node.id&&t.channel===edit.channel));
 if(keyed)return [{op:scene?'scene3d.key':'lighting.key',clip:clipId,...(scene?{node:node.id}:{joint:node.id}),time:authoredTime(),channel:edit.channel,value:edit.value,easing:'smooth'}];
 return [{op:scene?'scene3d.node.update':'lighting.node',...(scene?{id:node.id}:{joint:node.id}),values:{light:{...node.light,[edit.channel.slice(6)]:edit.value}}}];
}
export function canvasValues(project,context,overrides=[]){const {dimension=2,clip,time=0}=context;return {nodes:dimension===3?sampleScene(project.scene3d,clip,time).nodes:[...sampleLighting2D(project,context.mode==='rig'?null:project.clips.find(c=>c.id===clip),animationTime(project.clips.find(c=>c.id===clip),time),overrides).values()],backdrop:sampleBackdrop(project.backdrop,time)};}
