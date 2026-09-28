import {treeFollow} from './performance-motion.js';
import {defineGameData} from './game-data.js';
export const OBJECT_FEEL=defineGameData('action-effects.OBJECT_FEEL',{hitsToFell:3,fallDelay:.2,fallDuration:1.3,lean:1.5,leanDuration:1.05,dissolveAt:.83,dissolveDuration:.45,stumpLinger:18,stumpFade:3,kickDuration:.065,kickFrequencyX:230,kickFrequencyY:170,chipGravity:4});
import {createFallingLeaves} from './falling-leaves.js';
import * as THREE from 'three';
import {createArtMesh,loadVectorArt} from './vector-art.js';
import {setGroundAnchor} from './ground-depth.js';
import {hitPose,harvestLift} from './action-timing.js';


const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export const TREE_STUMP_ASSETS={tree:'tree-stump'};
export const STUMP_LINGER=18,STUMP_FADE=3;
export function attachObjectFeedback(mesh){
 if(mesh.userData.feedback)return mesh.userData.feedback;
 const uniforms={objectFlash:{value:0},objectFade:{value:1},objectScale:{value:new THREE.Vector2(1,1)},objectLean:{value:0}};
 function patch(material,visible){const previous=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=shader=>{
  previous.call(material,shader);Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='uniform vec2 objectScale;uniform float objectLean;varying vec2 feedbackUV;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
feedbackUV=position.xy;
transformed.xy*=objectScale;
float c=cos(objectLean),s=sin(objectLean);
transformed.xy=vec2(c*transformed.x-s*transformed.y,s*transformed.x+c*transformed.y);`);
  shader.fragmentShader='uniform float objectFlash;uniform float objectFade;varying vec2 feedbackUV;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {
float grain=fract(sin(dot(floor(feedbackUV*180.),vec2(12.9898,78.233)))*43758.5453);
if(objectFade<=0.||grain>objectFade)discard;`);
  if(visible)shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>','gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.),objectFlash);\n#include <colorspace_fragment>');
 };material.customProgramCacheKey=()=>key+'-object-feedback-v1';material.needsUpdate=true;}
 patch(mesh.material,true);
 mesh.userData.shadowMaterial??=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false});patch(mesh.userData.shadowMaterial,false);
 mesh.userData.feedback=uniforms;mesh.geometry.boundingSphere.radius+=mesh.userData.base??.3;
 return uniforms;
}
export async function createActionEffects(scene,cards,plots,audio,heightAt=()=>0,{stumpAssets=TREE_STUMP_ASSETS,leafArtIds}={}){
 const originals=cards.filter(c=>c.userData.name==='tree'),stumpArt=new Map(await Promise.all(Object.entries(stumpAssets).map(async ([id,asset])=>[id,await loadVectorArt('actions/'+asset)]))),trees=new Map(),hits=new Map(),particles=[];
 const leaves=await createFallingLeaves(scene,heightAt,{artIds:leafArtIds});
 let now=0,kickAt=-10,kickStrength=0,kickDuration=.065;
 const chipGeometry=new THREE.BufferGeometry();chipGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-.06,-.025,0,.06,-.02,0,.035,.025,0,-.06,-.025,0,.035,.025,0,-.04,.03,0],3));
 const root=new THREE.Group();root.name='action-particles';root.userData.noShadow=true;scene.add(root);
 const stoneColours=['#b9afa0','#77777b','#57545a'];
 const chipMaterials=['#e4ba79','#9c6a3d','#d8b66e','#748c35',...stoneColours].map(color=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,depthWrite:false}));
 function addTree(tree){
  if(trees.has(tree))return trees.get(tree);
  const art=stumpArt.get(tree.userData.variant),source=tree.userData.art;let lo=1,hi=0;
  for(let i=0;i<source.positions.length;i+=3)if(source.positions[i+1]>.82){lo=Math.min(lo,source.positions[i]);hi=Math.max(hi,source.positions[i])}
  const width=(hi-lo)*tree.userData.base*source.image.width/source.image.height,height=width*art.image.height/art.image.width;
  const stump=createArtMesh(art,width,height,{sharedPaint:true});stump.position.copy(tree.position);stump.visible=false;stump.renderOrder=10;stump.name='cut-'+tree.userData.variant;
  Object.assign(stump.userData,{name:'cut-stump',variant:tree.userData.variant,base:height,flip:tree.userData.flip,supportRadius:tree.userData.supportRadius});
  scene.add(stump);cards.push(stump);attachObjectFeedback(stump);attachObjectFeedback(tree);
  const state={stump,hits:0,fallAt:null,direction:1,landed:false,completed:false};trees.set(tree,state);return state;
 }
 for(const tree of originals)addTree(tree);
 for(const crop of plots){attachObjectFeedback(crop);crop.userData.cropHome=crop.position.clone()}
 function burst(position,direction=1,leaf=false,count=9,stone=false){
  for(let i=0;i<count;i++){
   const mesh=new THREE.Mesh(chipGeometry,chipMaterials[stone?4+i%3:leaf?3:i%3].clone());mesh.renderOrder=11;mesh.position.copy(position);root.add(mesh);
   particles.push({mesh,age:0,life:leaf?1.1:.48,vx:direction*(.3+Math.random()*1.1),vy:.7+Math.random()*1.3,vz:(Math.random()-.5)*.8,spin:(Math.random()-.5)*12});
  }
  while(particles.length>100){const p=particles.shift();root.remove(p.mesh);p.mesh.material.dispose()}
 }
 function kick(strength,duration=OBJECT_FEEL.kickDuration){kickAt=now;kickStrength=strength;kickDuration=duration}
 return {trees,leaves,addTree,cameraKick:kick,get time(){return now},burst,
  hit(mesh,kind,position,direction,closeup){
   attachObjectFeedback(mesh);hits.set(mesh,{at:now,kind,direction});audio.play(kind==='tree'?'chop':kind==='stone'?'mine':'wood',mesh.position);burst(position,direction,false,9,kind==='stone');
   if(closeup)kick(.8);
   if(kind==='tree'){leaves.emit(mesh,direction);const state=trees.get(mesh);state.hits++;mesh.userData.chopHits=state.hits;if(state.hits>=OBJECT_FEEL.hitsToFell){state.fallAt=now+OBJECT_FEEL.fallDelay;state.direction=direction;mesh.userData.felled=true;return true}}
   return false;
  },pull(crop,position){crop.userData.pulled=true;audio.play('pull',crop.userData.cropHome??crop.position);burst(position,1,true,7)},
  harvestPose(crop,p,camera,heroScale){
   if(crop.userData.rootedFood){crop.position.copy(crop.userData.cropHome);return;}
   crop.position.copy(crop.userData.cropHome);crop.position.addScaledVector(new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),harvestLift(p)*heroScale/100);
   crop.userData.feedback.objectFade.value=1-smooth((p-.83)/.12);setGroundAnchor(crop,crop.userData.cropHome);
  },finishHarvest(crop){crop.visible=!!crop.userData.rootedFood;crop.userData.harvested=true;audio.play('complete',crop.userData.cropHome??crop.position)},
  finishMining(mesh,position){hits.delete(mesh);mesh.visible=false;mesh.userData.mined=true;burst(position,1,false,14,true);audio.play('complete',mesh.position)},
  restoreResource(mesh){
   hits.delete(mesh);if(mesh.userData.foliage)mesh.userData.foliage.foliageImpact.value=0;const u=mesh.userData.feedback;u.objectFlash.value=0;u.objectFade.value=1;u.objectScale.value.set(1,1);u.objectLean.value=0;
   const state=trees.get(mesh);
   if(state){Object.assign(state,{hits:0,fallAt:null,landed:false,completed:false});state.stump.visible=false;mesh.userData.felled=false;mesh.userData.chopHits=0}
   else{mesh.userData.harvested=false;mesh.userData.pulled=false;mesh.userData.mined=false;if(mesh.userData.cropHome)mesh.position.copy(mesh.userData.cropHome)}
   mesh.visible=true;
  },
  restoreCrops(){for(const crop of plots){crop.userData.harvested=false;crop.userData.pulled=false;crop.visible=true;crop.position.copy(crop.userData.cropHome);crop.userData.feedback.objectFade.value=1}},
  update(dt,camera){
   now+=dt;leaves.update(dt,camera);
   for(const [mesh,hit] of hits){const age=now-hit.at,u=mesh.userData.feedback,pose=hitPose(age,hit.kind,hit.direction*(mesh.userData.flip?-1:1));u.objectFlash.value=pose.flash;u.objectScale.value.set(pose.x,pose.y);u.objectLean.value=pose.lean;if(mesh.userData.foliage)mesh.userData.foliage.foliageImpact.value=treeFollow(age,hit.direction*(mesh.userData.flip?-1:1));if(age>1.3){if(mesh.userData.foliage)mesh.userData.foliage.foliageImpact.value=0;hits.delete(mesh)}}
   for(const [tree,state] of trees){if(state.fallAt===null)continue;const age=now-state.fallAt;if(age<0)continue;const u=tree.userData.feedback;
    if(age<OBJECT_FEEL.fallDuration){u.objectLean.value=-state.direction*(tree.userData.flip?-1:1)*OBJECT_FEEL.lean*smooth(age/OBJECT_FEEL.leanDuration);u.objectFade.value=1-smooth((age-OBJECT_FEEL.dissolveAt)/OBJECT_FEEL.dissolveDuration);}
    else tree.visible=false;
    if(!state.landed&&age>=.8){state.landed=true;audio.play('fall',tree.position);leaves.emit(tree,state.direction,14,true);kick(2.8,.18)}
    state.stump.visible=age<OBJECT_FEEL.stumpLinger+OBJECT_FEEL.stumpFade;state.stump.userData.feedback.objectFade.value=1-smooth((age-OBJECT_FEEL.stumpLinger)/OBJECT_FEEL.stumpFade);
    if(age>=OBJECT_FEEL.fallDuration&&!state.completed){state.completed=true;audio.play('complete',tree.position)}
   }
   for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;if(p.age>=p.life){root.remove(p.mesh);p.mesh.material.dispose();particles.splice(i,1);continue}p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.vy-=4*dt;p.mesh.quaternion.copy(camera.quaternion);p.mesh.rotateZ(p.age*p.spin);p.mesh.material.opacity=1-p.age/p.life;}
  },applyCameraKick(camera,width,height){const age=now-kickAt;if(age>=kickDuration)return;const envelope=(1-age/kickDuration)**2;camera.projectionMatrix.elements[12]+=Math.sin(age*OBJECT_FEEL.kickFrequencyX)*kickStrength*envelope*2/width;camera.projectionMatrix.elements[13]+=Math.cos(age*OBJECT_FEEL.kickFrequencyY)*kickStrength*envelope*2/height;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()},
 };
}
