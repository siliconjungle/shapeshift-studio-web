import {watcherEye} from './watcher-eye.js';
import {watcherRollTracks,watcherRollSteps} from './watcher-roll.js';
import {watcherLaunchTracks} from './watcher-launch.js';
import {watcherEffects} from './watcher-effects.js';
import {watcherAudio} from './watcher-audio.js';
import {watcherLanding,watcherLaserContact} from './watcher-decals.js';
import {watcherMotion} from './watcher-motion.js';
// This migration only updates shipped event IDs; authored geometry, materials,
// clips and other events remain editable and are not replaced.
export async function watcherPlaybackCommands(scene,{base='./scene3d/assets/'}={}){
 const parts=await fetch(base+'landing-sprite-parts.json').then(r=>{if(!r.ok)throw Error('Landing artwork metadata unavailable');return r.json();}),commands=[],libraries={effectLibraries:{'watcher-energy':watcherEffects},audioLibraries:{'watcher-voice':watcherAudio},cameraMotion:watcherMotion.shake,watcherPlaybackVersion:10};
 commands.push({op:'scene3d.settings',values:libraries});if(!scene.nodes.find(n=>n.id==='watcher')?.facial)commands.push({op:'scene3d.node.update',id:'watcher',values:{facial:{expression:'neutral',expressions:watcherEye.expressions,automatic:true,response:12,blink:watcherEye.blink,gaze:{mode:'curious',response:9,amplitude:[.24,.08],frequency:[.72,.51]}}}});
 const audio=(cue,strength=1)=>({library:'watcher-voice',cue,strength});
 const add=(clip,id,type,values)=>commands.push({op:clip.events.some(e=>e.id===id)?'scene3d.event.update':'scene3d.event.add',clip:clip.id,id,type,values:{type,...values}});
 for(const clip of scene.clips){if(clip.id==='idle'&&!scene.nodes.find(n=>n.id==='watcher')?.facial)commands.push({op:'scene3d.clip.update',id:clip.id,values:{tracks:clip.tracks.filter(t=>t.node!=='watcher'||!t.channel.startsWith('eye.'))}});
  for(const event of clip.events){
   if(['laser-ray','spin-beam'].includes(event.id)&&event.type==='beam'){
    const effect={library:'watcher-energy',anchor:'charge',beam:'beam',charge:'charge',fire:'fire',widthCurve:watcherMotion.curves.beamWidth,inputs:{moteCount:14}};
    add(clip,event.id+'-recoil','shake',{time:event.time+1.45,duration:.5,amount:.035});
    add(clip,event.id,'beam',{effect,lockFace:false,faceControl:{open:'clip',tilt:'clip',gaze:[0,0],blink:false},charge:1.45,duration:3.25,audio:{library:'watcher-voice',charge:'beam-charge',fire:'beam',chargeDuration:1.45},contact:{asset:'watcher-impact-art',parts,vector:watcherLanding,program:watcherLaserContact}});
   }
   if(event.id==='laser-sound')commands.push({op:'scene3d.event.remove',clip:clip.id,id:event.id});
   if(event.id==='hurt-sound')add(clip,event.id,'sound',{audio:audio('hurt')});
   if(event.id==='slam-sound')add(clip,event.id,'sound',{audio:audio('impact',1.5)});
   if(event.id==='slam-dust')add(clip,event.id,'decal',{asset:'watcher-impact-art',parts,vector:watcherLanding,origin:[0,0,0],direction:[0,-1,0],length:12,receiver:'floor',strength:1.5,size:1});
  }
  if(clip.id==='hurt'){
   add(clip,'hurt-face','face',{time:0,duration:Math.min(.85,clip.duration),node:'watcher',faceControl:{open:'clip',blink:false}});
   add(clip,'eye-splash','particles',{time:.16,duration:.7,node:'watcher',origin:[-.0009,-.0211,1.2],direction:[0,0,1],effect:{library:'watcher-energy',anchor:'splash',program:'splash'}});
   add(clip,'eye-shake','shake',{time:.16,duration:.35,amount:.065});
  }
  if(clip.id==='roll'){const motion=watcherRollTracks(),channels=new Set(motion.map(t=>t.channel));commands.push({op:'scene3d.clip.update',id:clip.id,values:{loop:false,tracks:[...clip.tracks.filter(t=>t.node!=='watcher'||!channels.has(t.channel)),...motion]}});
   add(clip,'roll-sound','sound',{time:0,duration:.3,audio:audio('roll')});
   add(clip,'roll-impact-sound','sound',{time:.68,duration:.4,audio:audio('impact',.45)});
   add(clip,'roll-dust','decal',{time:.68,duration:.75,node:'watcher',asset:'watcher-impact-art',parts,vector:watcherLanding,origin:[0,0,0],direction:[0,0,-1],worldDirection:[0,-1,0],receiver:'floor',length:12,strength:.45,size:1});
   add(clip,'roll-shake','shake',{time:.68,duration:.25,amount:.03375});
  }
  if(clip.id==='slam'){
   const motion=watcherLaunchTracks(),channels=new Set(motion.map(t=>t.channel));commands.push({op:'scene3d.clip.update',id:clip.id,values:{tracks:[...clip.tracks.filter(t=>t.node!=='watcher'||!channels.has(t.channel)),...motion]}});
   add(clip,'lift-beam','beam',{lockFace:false,faceControl:{open:'clip',tilt:'clip',gaze:[0,0],blink:false},time:0,duration:1.85,charge:1.45,node:'watcher',origin:[-.0009,-.0211,1.17],direction:[0,0,1],length:5.4,effect:{library:'watcher-energy',anchor:'charge',beam:'beam',charge:'charge',fire:'fire',inputs:{moteCount:14},tremor:false},audio:{library:'watcher-voice',charge:'launch-charge',fire:'launch',chargeDuration:1.45},contact:{asset:'watcher-impact-art',parts,vector:watcherLanding,program:watcherLaserContact}});
   add(clip,'face-pound-dust','decal',{time:.48,duration:.75,node:'watcher',asset:'watcher-impact-art',parts,vector:watcherLanding,origin:[0,0,0],direction:[0,-1,0],worldDirection:[0,-1,0],receiver:'floor',length:12,strength:1.25,size:1});
   add(clip,'face-pound-sound','sound',{time:.48,duration:.5,audio:audio('impact',1.1)});
   add(clip,'face-pound-shake','shake',{time:.48,duration:.4,amount:.10});
   add(clip,'fall-sound','sound',{time:2.65,duration:.22,audio:audio('fall')});
   // Earlier commands replace the original impact event; update its timing in
   // that same command so fresh scenes and saved-scene migrations are identical.
   for(const command of commands)if(command.clip===clip.id&&['slam-dust','slam-sound','impact-shake'].includes(command.id))command.values.time=2.87;
   add(clip,'impact-shake','shake',{time:2.87,duration:.4,amount:.1125});
  }
 }
 if((!scene.sequence||scene.sequence.name==='Play all')&&['roll','laser','slam','spin','hurt'].every(id=>scene.clips.some(c=>c.id===id)))commands.push({op:'scene3d.settings',values:{sequence:{name:'Play all',loop:true,steps:[...watcherRollSteps,...['laser','slam','spin','hurt'].map(clip=>({clip}))]}}});
 return commands;
}
