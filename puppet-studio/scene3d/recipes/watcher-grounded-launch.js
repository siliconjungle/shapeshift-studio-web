import {watcherController} from './watcher-controller.js';
// Studio choreography: reuse the authored edge-pivot roll to land face-down
// before charging the lift. The action interpreter has no launch/Watcher branch.
export function groundedWatcherController(){
 const recipe=structuredClone(watcherController),v=path=>['var',path],replace=(value,from,to)=>Array.isArray(value)?value.map(x=>replace(x,from,to)):value===from?to:value;
 const findSlam=value=>{if(!Array.isArray(value))return; if(value[0]==='if'&&JSON.stringify(value[1])===JSON.stringify(['eq',v('action'),'slam']))value[2]=[['set','dir',['literal',[0,0,1]]],['set','axis',['literal',[1,0,0]]],['enter','launch-windup']];else value.forEach(findSlam);};findSlam(recipe.procedures.start);
 recipe.enter.unshift(['if',['eq',v('nextState'),'face-roll'],[['emit','audio.cue',{cue:'roll'}]]]);
 recipe.states['launch-windup']=replace(recipe.states['roll-windup'],'roll','face-roll');
 recipe.states['face-roll']=structuredClone(recipe.states.roll);
 recipe.states['face-roll'].at(-1)[2]=[['call','impact',{strength:1.25}],['enter','launch-charge']];
 recipe.states['launch-charge']=[['call','chargeUp',{progress:['div',v('t'),1.45]}],['if',['gte',v('t'),1.45],[['enter','launch'],['set','freeze',.065]]]];
 recipe.states.hover.unshift(['set','root.position.2',['lerp',v('from.2'),v('base.2'),['smooth',['div',v('t'),.5]]]]);
 return recipe;
}
// Small migration preserves materials, custom geometry and spring settings.
export function watcherStudioFeelCommands(scene){const retired=new Set(['laser-ray','spin-beam','laser-ray-recoil','spin-beam-recoil','hurt-sound','slam-sound','slam-dust','hurt-face','eye-splash','eye-shake','roll-sound','roll-impact-sound','roll-dust','roll-shake','lift-beam','face-pound-dust','face-pound-sound','face-pound-shake','fall-sound','impact-shake','hurt-freeze']);const bindings=scene.clips.flatMap(c=>c.events.filter(e=>retired.has(e.id)).map(e=>({op:'scene3d.event.update',clip:c.id,id:e.id,values:{controllerOwned:true}})));if(scene.watcherStudioFeelVersion)return[{op:'scene3d.settings',values:{controllerLibraries:{watcher:groundedWatcherController()},watcherStudioFeelVersion:3}},...bindings];const n=scene.nodes.find(n=>n.id==='watcher'),commands=[{op:'scene3d.settings',values:{controllerLibraries:{watcher:groundedWatcherController()},watcherStudioFeelVersion:3,rendering:{outlines:{surfaceEdges:0,antialias:'msaa'}},camera:{...scene.camera,zoom:1,position:[5,2,7],target:[0,-.5,0],size:6.5}}},{op:'scene3d.node.update',id:n.id,values:{illustration:{strokeWidth:1},controller:{presentation:{beamAim:{downward:.24,maximumLength:20}}}}}];
 const slam=scene.clips.find(c=>c.id==='slam');if(slam)commands.push({op:'scene3d.clip.update',id:'slam',values:{duration:5.4}});return [...commands,...bindings];}
