import {toolOwns} from './sampling.js';
import {createStateMachine,blendMachineLayers} from './model.js';
import {poseAt,renderFrame,motionBounds,CHANNELS} from '../runtime.js';
import {finalChannels,readPath} from '../authoring/resolved-channels.js';
import {machinePlayback,dominantSample} from './playback.js';
export function createMachinePose2D(project,id){
 const machine=createStateMachine(project,id);if(machine.dimension!==2)throw Error('Choose a 2D state machine');
 const joints=new Map(project.joints.map(j=>[j.id,j])),clips=new Map(project.clips.map(c=>[c.id,c]));
 const rest=(node,channel)=>CHANNELS.includes(channel)?joints.get(node)?.rest[channel]:readPath(joints.get(node),channel);
 const defaults=project.joints.flatMap(j=>CHANNELS.map(channel=>({node:j.id,channel,value:j.rest[channel]})));
 function sample(s){const clip=clips.get(s.clip),pose=poseAt(project,clip,s.time,{constraints:false}),out=[];
  for(const [node,p]of pose){const owned=Object.hasOwn(clip.tracks??{},node)||clip.effects?.some(e=>e.joint===node)||project.procedural;for(const channel of CHANNELS)if(owned||toolOwns(clip,node,channel)||p.transform[channel]!==rest(node,channel))out.push({node,channel,value:p.transform[channel]});}
  out.push(...finalChannels(clip,s.time));return out;
 }
 return{machine,resolve(frame=machine.snapshot()){const values=new Map(defaults.map(v=>[v.node+':'+v.channel,v]));for(const v of blendMachineLayers(frame,sample,rest))values.set(v.node+':'+v.channel,v);return [...values.values()];}};
}
export function createStateMachinePlayer(canvas,project,images,id,options={}){
 const pose=createMachinePose2D(project,id),ctx=canvas.getContext('2d'),ids=new Set(pose.machine.definition.layers.flatMap(l=>l.states.map(s=>s.clip)).filter(Boolean)),bounds=[...ids].map(id=>motionBounds(project,project.clips.find(c=>c.id===id))),framing=options.framing??(bounds.length?{minX:Math.min(...bounds.map(b=>b.minX)),minY:Math.min(...bounds.map(b=>b.minY)),maxX:Math.max(...bounds.map(b=>b.maxX)),maxY:Math.max(...bounds.map(b=>b.maxY))}:undefined);
 const blank={id:'machine-blank',duration:1,fps:30,loop:false,tracks:{}};
 return machinePlayback(pose.machine,frame=>{const s=dominantSample(frame),clip=s?project.clips.find(c=>c.id===s.clip):blank;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderFrame(project,images,clip,s?.time??0,{...options,effectData:{...frame.inputs,...(typeof options.effectData==='function'?options.effectData(frame):options.effectData)},effectStates:Object.fromEntries(frame.layers.map(l=>[l.id,l.state])),illustration:typeof options.illustration==='function'?options.illustration(frame):options.illustration,width:canvas.width,height:canvas.height,framing,finalOverrides:true,overrides:pose.resolve(frame)}),0,0);},options);
}
