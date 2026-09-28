import {bindVector,normalizeWeights,validateBoneBindings} from './model.js';
import {poseAt} from '../runtime.js';
export function applyBoneBindingCommand(project,c){const j=project.joints.find(j=>j.id===c.joint);if(!j?.sprite)throw Error('Select a sprite in the 2D rig');const previous=j.sprite.boneBinding;try{
 if(c.op==='boneBinding.bind'){const clip=project.clips.find(x=>x.id===c.clip)??project.clips[0];j.sprite.boneBinding=bindVector(project,j.id,poseAt(project,clip,c.time??0),c.bones,{shapes:c.shapes,influences:c.influences});}
 else if(c.op==='boneBinding.unbind')delete j.sprite.boneBinding;
 else{if(!previous)throw Error('Bind bones first');const b=j.sprite.boneBinding=structuredClone(previous);if(c.op==='boneBinding.enabled')b.enabled=c.enabled;else if(c.op==='boneBinding.weights'){const shape=b.shapes.find(s=>s.shape===c.shape);if(!shape)throw Error('Choose a bound path');const weights=normalizeWeights(c.weights,b.bones.map(b=>b.joint));if(!Array.isArray(c.points)||!c.points.length||c.points.some(i=>!Number.isInteger(i)||i<0||i>=shape.weights.length))throw Error('Choose valid vertices or handles');for(const i of c.points)shape.weights[i]=structuredClone(weights);}else throw Error('Unknown bone binding command');}
 validateBoneBindings(project);return j.id;
 }catch(error){if(previous)j.sprite.boneBinding=previous;else delete j.sprite.boneBinding;throw error;}}
