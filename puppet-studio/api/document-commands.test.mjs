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
