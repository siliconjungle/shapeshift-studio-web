import test from 'node:test';
import assert from 'node:assert/strict';
import {ProjectStore} from '../store.js';
import {starterProject} from '../authoring/starter.js';
import {applyCommand} from '../fx/commands.js';
import {patchDocument} from './document-commands.js';
const setup=()=>{const store=new ProjectStore(starterProject());return{store,run:commands=>store.edit(p=>(Array.isArray(commands)?commands:[commands]).map(c=>applyCommand(p,c)))};};
test('document batches are validated atomically and undo every changed domain together',()=>{
 const {store,run}=setup(),before=structuredClone(store.project);
 run([{op:'joint.add',id:'origin',parent:'root'},{op:'clip.add',id:'pulse',values:{duration:3}},{op:'project.patch',patches:[{op:'set',path:['name'],value:'Controller authoring'},{op:'set',path:['joints',1,'rest','rotation'],value:35}]}]);
 assert.equal(store.undoStack.length,1);assert.equal(store.project.joints[1].rest.rotation,35);const after=structuredClone(store.project);
 store.undo();assert.deepEqual(store.project,before);store.redo();assert.deepEqual(store.project,after);
 assert.throws(()=>run([{op:'project.rename',name:'Must roll back'},{op:'project.patch',patches:[{op:'set',path:['clips',0,'duration'],value:-1}]}]));assert.deepEqual(store.project,after);assert.equal(store.undoStack.length,1);
});
test('JSON patch preconditions, paths and prototype boundaries fail without changing committed data',()=>{
 const {store,run}=setup(),before=structuredClone(store.project);
 for(const patch of [{op:'set',path:['__proto__','polluted'],value:true},{op:'set',path:['joints',-1],value:{}},{op:'test',path:['name'],value:'wrong'}])assert.throws(()=>run({op:'project.patch',patches:[{op:'set',path:['name'],value:'temporary'},patch]}));
 assert.deepEqual(store.project,before);assert.throws(()=>run({op:'project.patch',patches:[{op:'set',path:['extra'],value:JSON.parse('{"__proto__":{"polluted":true}}')}]}));assert.equal({}.polluted,undefined);assert.equal(store.undoStack.length,0);
 const data={items:[1,3]};patchDocument(data,[{op:'insert',path:['items',1],value:2},{op:'remove',path:['items',0]}]);assert.deepEqual(data.items,[2,3]);
});
test('joint bindings and clip retiming preserve related tracks and undo',()=>{
 const {store,run}=setup();run({op:'key',joint:'body',clip:'idle',time:1,value:{rotation:20}});run({op:'joint.rename',id:'body',newId:'piece'});
 assert.equal(store.project.joints[1].id,'piece');assert.ok(store.project.clips[0].tracks.piece);assert.equal(store.project.clips[0].tracks.body,undefined);
 run({op:'clip.update',id:'idle',values:{duration:4}});assert.equal(store.project.clips[0].tracks.piece[0].time,2);
 store.undo();assert.equal(store.project.clips[0].tracks.piece[0].time,1);run({op:'clip.duplicate',id:'idle',newId:'copy'});run({op:'clip.remove',id:'copy'});assert.throws(()=>run({op:'clip.remove',id:'idle'}),/at least one/);
});

import {joystickExample} from '../joysticks/example.js';
import {soloExample} from '../solos/example.js';
import {drawOrderExample} from '../draw-order/example.js';
import {noodleExample} from '../noodle/example.js';
import {meshExample} from '../mesh/example.js';
import {constraintExample} from '../constraints/example.js';
import {validateProject,poseAt} from '../runtime.js';
for(const [name,make] of Object.entries({joysticks:joystickExample,solos:soloExample,drawOrder:drawOrderExample,noodle:noodleExample,mesh:meshExample,constraints:constraintExample})){
 test(`document commands preserve ${name} references and timing`,()=>{
  const p=make(),store=new ProjectStore(p),oldDuration=p.clips[0].duration;
  const oldPose=poseAt(p,p.clips[0],oldDuration*.3);
  for(const j of [...p.joints])store.edit(p=>applyCommand(p,{op:'joint.rename',id:j.id,newId:'renamed-'+j.id}));
  store.edit(p=>applyCommand(p,{op:'clip.update',id:p.clips[0].id,values:{duration:oldDuration*2}}));
  validateProject(store.project);
  const pose=poseAt(store.project,store.project.clips[0],oldDuration*.6);
  for(const [id,v]of oldPose)assert.deepEqual(pose.get('renamed-'+id).world,v.world);
  for(const [key,tracks]of Object.entries(p.clips[0]))if(key.endsWith('Tracks')||key==='constraintWeights')assert.deepEqual(store.project.clips[0][key].flatMap(t=>t.keys.map(k=>k.time)),tracks.flatMap(t=>t.keys.map(k=>k.time*2)));
  store.undo();assert.equal(store.project.clips[0].duration,oldDuration);
 });
}
test('deleting a joystick source clip releases its binding',()=>{
 const store=new ProjectStore(joystickExample());store.edit(p=>applyCommand(p,{op:'clip.remove',id:'look-x'}));
 assert.equal(store.project.joints.find(j=>j.id==='look').joystick.axes.x,null);validateProject(store.project);
});
test('renaming and retiming keep speech artwork, envelope and audio synchronized',()=>{
 const {store,run}=setup();run([{op:'speech.chunk',id:'hello',value:{src:'data:audio/wav;base64,AAAA',duration:.5,cues:[{start:0,end:.5,pose:'AI'}]}},{op:'speech.rig',id:'voice',value:{poses:{rest:{values:{body:{y:0}}},AI:{values:{body:{y:4}}}},envelope:{joint:'body',channel:'y',amount:1}}},{op:'speech.place',id:'line',clip:'idle',chunk:'hello',rig:'voice',time:.5}]);
 run({op:'joint.rename',id:'body',newId:'speaker'});run({op:'clip.update',id:'idle',values:{duration:4}});
 assert.equal(store.project.speech.rigs.voice.envelope.joint,'speaker');assert.equal(store.project.speech.rigs.voice.poses.AI.values.speaker.y,4);
 assert.equal(store.project.clips[0].dialogue[0].time,1);assert.equal(store.project.clips[0].dialogue[0].rate,.5);validateProject(store.project);
});
