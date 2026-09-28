import {toolOwns} from './sampling.js';
import {createStateMachine,blendMachineLayers} from './model.js';
import {createSceneSampler} from '../scene3d/animation.js';
import {createScenePlayer} from '../scene3d/runtime.js';
import {finalChannels,readPath,RESOLVED_3D} from '../authoring/resolved-channels.js';
import {machinePlayback,dominantSample} from './playback.js';
const valueAt=(node,channel)=>channel.startsWith('eye.')?Object.values(node?.surfaces??{}).find(s=>s.eye)?.eye[channel.slice(4)]:channel==='material.flash'?node?.flash??0:readPath(node,channel);
const numeric=v=>Number.isFinite(v)||Array.isArray(v)&&v.every(Number.isFinite);
export function createMachinePose3D(project,id){
 const machine=createStateMachine(project,id);if(machine.dimension!==3)throw Error('Choose a 3D state machine');
 const scene=project.scene3d,sampler=createSceneSampler(scene),nodes=new Map(scene.nodes.map(n=>[n.id,n])),clips=new Map(scene.clips.map(c=>[c.id,c])),rest=(id,channel)=>channel==='material.flash'?(nodes.get(id)?.flash??scene.materials.find(m=>m.id===nodes.get(id)?.material)?.flash??0):valueAt(nodes.get(id),channel);
 const usedClips=new Set(machine.definition.layers.flatMap(l=>l.states.map(s=>s.clip))),eyeChannels=new Set(scene.clips.filter(c=>usedClips.has(c.id)).flatMap(c=>[...c.tracks,...(c.resolvedTracks??[])].filter(t=>t.channel.startsWith('eye.')).map(t=>t.node+':'+t.channel)));
 const defaults=scene.nodes.flatMap(n=>RESOLVED_3D.filter(channel=>!channel.startsWith('eye.')||eyeChannels.has(n.id+':'+channel)).map(channel=>({node:n.id,channel,value:structuredClone(rest(n.id,channel))})).filter(v=>numeric(v.value)));
 function sample(s){const clip=clips.get(s.clip),pose=sampler.sample(s.clip,s.time),out=[];
  for(const n of pose.nodes)for(const channel of RESOLVED_3D){const value=channel==='material.flash'?(n.flash??rest(n.id,channel)):valueAt(n,channel),base=rest(n.id,channel),owned=clip.tracks.some(t=>t.node===n.id&&t.channel===channel)||toolOwns(clip,n.id,channel)||['position','rotation','scale'].includes(channel)&&scene.procedural;if(numeric(value)&&(owned||JSON.stringify(value)!==JSON.stringify(base)))out.push({node:n.id,channel,value:structuredClone(value)});}
  out.push(...finalChannels(clip,s.time));return out;
 }
 return{machine,dispose(){sampler.dispose();},resolve(frame=machine.snapshot()){const values=new Map(defaults.map(v=>[v.node+':'+v.channel,v]));for(const v of blendMachineLayers(frame,sample,rest))values.set(v.node+':'+v.channel,v);return [...values.values()];}};
}
export async function createSceneStateMachinePlayer(canvas,project,id,options={}){
 const pose=createMachinePose3D(project,id);let player;
 let blankId='machine-rest';while(project.scene3d.clips.some(c=>c.id===blankId))blankId+='-rest';
 try{player=await createScenePlayer(canvas,project,options);
  // The neutral sample is runtime-only, outside the authored 100-clip budget.
  const h=player.scene;h.project.scene3d.clips.push({id:blankId,name:'Rest pose',duration:1,fps:30,loop:false,tracks:[],events:[]});h.sampler.dispose();h.sampler=createSceneSampler(h.project.scene3d);if(h.pipeline)h.pipeline.sampler=h.sampler;
 }catch(e){pose.dispose();player?.dispose();throw e;}
 const api=machinePlayback(pose.machine,frame=>{const s=dominantSample(frame);player.scene.channelOverrides=pose.resolve(frame);player.scene.seek(s?.time??0,s?.clip??blankId,{audible:false});player.scene.render(true);},{...options,dispose(){pose.dispose();player.dispose();options.dispose?.();}});
 api.scene=player.scene;return api;
}
