import {SceneryRegrowth} from './scenery-regrowth.js';
import {stumpLayout,sceneryEffectAssets} from './scenery-art.js';
import {resourceDropPose,resourceDropBurst} from './resource-drop.js';
import {recolorSVG} from '../shared/art-palette.js';
import {treeMotion} from '../shared/scenery-motion.js';
import * as T from 'three';
import {vectorMaterial,loadVectorArt,createArtMesh} from '../shared/vector-art.js';
import {createActionEffects} from '../shared/action-effects.js';
import {RESOURCE_RULES} from '../shared/resource-rules.js';
function attachKnown(mesh,known={value:1}){
 if(!mesh.geometry.hasAttribute('mapInkMask')){const c=mesh.geometry.attributes.color,mask=new Float32Array(c.count);for(let i=0;i<c.count;i++)mask[i]=Math.max(c.getX(i),c.getY(i),c.getZ(i))<.025?1:0;mesh.geometry.setAttribute('mapInkMask',new T.BufferAttribute(mask,1));}
 const prior=mesh.material.onBeforeCompile,key=mesh.material.customProgramCacheKey();mesh.material.onBeforeCompile=shader=>{prior(shader);shader.uniforms.mapKnown=known;shader.vertexShader='attribute float mapInkMask;varying float mapInk;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmapInk=mapInkMask;');shader.fragmentShader='varying float mapInk;uniform float mapKnown;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>','gl_FragColor.rgb=mix(vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722))),gl_FragColor.rgb,mix(mapKnown,1.,mapInk));\n#include <colorspace_fragment>');};mesh.material.customProgramCacheKey=()=>key+'-map-scenery-known-v1';mesh.userData.mapKnown=known;
}
// Run the actual game's effects in its metre-based X/Y/Z coordinates.
// Only the final projection converts that miniature world into the map plane.
export async function createMapSceneryEffects(map,scenery,audio,assetRoot){
 const regions=['hearth','solis','cryos'],stumpAssets=Object.fromEntries(Object.entries(stumpLayout).map(([asset,parts])=>[asset,parts[0].art])),leafArtIds=regions.map(region=>'actions/map-leaf-'+region);
 for(const name of sceneryEffectAssets.filter(n=>!n.startsWith('map-resource-'))){
  const url=new URL(name+'.svg',assetRoot),response=await fetch(url);if(!response.ok)throw Error('Missing map effect '+name);
  map.artwork.push({id:'actions/'+name,enabled:true,svg:recolorSVG(await response.text(),url)});
 }
 const resourceArt={};
 for(const kind of ['wood','stone']){const url=new URL('map-resource-'+kind+'.svg',assetRoot),response=await fetch(url);if(!response.ok)throw Error('Missing resource '+kind);map.artwork.push({id:'resources/'+kind,enabled:true,svg:recolorSVG(await response.text(),url)});resourceArt[kind]=await loadVectorArt('resources/'+kind);}

 const world=new T.Group();world.matrixAutoUpdate=false;world.matrix.set(100,0,0,0,0,100,-100,0,0,0,.001,0,0,0,0,1);map.scene.add(world);
 const cards=[],states=new Map(),camera=new T.Camera();
 for(const [i,s]of scenery.entries()){
  const r=map.records.find(r=>r.node.closest('[data-scenery]')===s.g);if(!r)continue;
  r.sceneryControlled=true;r.mesh.visible=false;
  const geometry=r.mesh.geometry.clone(),p=geometry.attributes.position,asset=map.assets.get(r.name).data,height=s.width*asset.image.height/asset.image.width;
  for(let j=0;j<p.count;j++)p.setXYZ(j,(p.getX(j)-.5)*s.width/100,(1-p.getY(j))*height/100,0);geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,vectorMaterial({transparent:true}));mesh.material.depthTest=false;mesh.material.depthWrite=false;mesh.position.set(s.x/100,0,s.y/100);mesh.frustumCulled=false;
  attachKnown(mesh);
  const tree=!s.asset.includes('rocks');Object.assign(mesh.userData,{name:tree?'tree':'stone',variant:s.asset,leafArtId:'actions/map-leaf-'+(s.asset.startsWith('solis')?'solis':s.asset.startsWith('cryos')?'cryos':'hearth'),art:asset,base:height/100});world.add(mesh);cards.push(mesh);
  states.set(String(i),{mesh,s,tree,sway:tree?treeMotion(mesh):null,hits:0,done:false,restoring:false,regrowth:new SceneryRegrowth()});
 }
 const effects=await createActionEffects(world,cards,[],{play:kind=>audio.play(kind,{level:.6})},()=>0,{stumpAssets,leafArtIds});
 for(const state of states.values()){
  const primary=effects.trees.get(state.mesh)?.stump;if(!primary)continue;
  state.stumps=[];
  for(const [i,part]of stumpLayout[state.s.asset].entries()){
   const art=await loadVectorArt('actions/'+part.art),width=part.width*state.s.width/100,height=width*art.image.height/art.image.width;
   const stump=i?createArtMesh(art,width,height,{sharedPaint:true}):primary;
   if(i){world.add(stump);cards.push(stump);stump.visible=false;}else{const oldWidth=stump.userData.base*art.image.width/art.image.height;stump.geometry.scale(width/oldWidth,width/oldWidth,1);stump.geometry.computeBoundingSphere();}
   stump.position.copy(state.mesh.position);stump.position.x+=part.x*state.s.width/100;stump.userData.base=height;
   attachKnown(stump,state.mesh.userData.mapKnown);state.stumps.push(stump);
  }
  state.s.g.dataset.stumpWidth=state.stumps.map(stump=>{stump.geometry.computeBoundingBox();return (stump.geometry.boundingBox.max.x-stump.geometry.boundingBox.min.x)*100;}).join(',');
 }

 for(const mesh of cards)map.shadows.addPuppet(mesh,{coverage:.2,layer:0,ground:()=>mesh.position.z*100});
 const pops=[];
 function popResource(state){if(state.resourcePopped)return;state.resourcePopped=true;
  const kind=state.tree?'wood':'stone',art=resourceArt[kind],height=.5*art.image.height/art.image.width;
  for(const launch of resourceDropBurst()){
   const icon=createArtMesh(art,.5,height,{anchored:false});icon.material.transparent=true;icon.material.depthTest=false;icon.material.depthWrite=false;icon.frustumCulled=false;icon.renderOrder=910;icon.visible=false;world.add(icon);
   const removeShadow=map.shadows.addPuppet(icon,{coverage:.26,layer:0,ground:()=>icon.position.z*100});
   pops.push({icon,removeShadow,kind,age:-launch.delay,side:launch.side,depth:launch.depth,center:height/2,landed:false,origin:state.mesh.position.clone()});
  }

 }
 let last=null;
 return{world,states,effects,
  hit(id){const state=states.get(id);if(!state||state.done)return;const {mesh,s,tree}=state;state.hits++;s.g.dataset.hits=String(state.hits);
   effects.hit(mesh,tree?'tree':'stone',new T.Vector3(mesh.position.x,mesh.userData.base*.55,mesh.position.z),state.hits%2?1:-1,true);
   if(state.hits>=RESOURCE_RULES[tree?'wood':'stone'].hits){state.done=true;s.g.setAttribute('tabindex','-1');s.g.setAttribute('aria-disabled','true');s.g.style.pointerEvents='none';if(!tree){effects.finishMining(mesh,mesh.position.clone().add(new T.Vector3(0,.3,0)));popResource(state);state.regrowth.destroy(last??0);}}
  },
  tick(time,gentle){const dt=last===null?0:Math.max(0,time-last);last=time;effects.update(dt,camera);
   for(const state of states.values()){
    const {mesh,s,tree}=state,treeState=tree&&effects.trees.get(mesh),stump=treeState?.stump;
    if(state.done&&!state.restoring&&treeState?.completed){
     stump.visible=true;stump.userData.feedback.objectFade.value=1;popResource(state);
     if(state.regrowth.at===Infinity)state.regrowth.destroy(time);
    }
    const growth=state.regrowth.sample(time);
    if(state.done&&growth.phase!=='waiting'){
     if(!state.restoring){effects.restoreResource(mesh);state.restoring=true;}
     if(growth.phase==='ready'){
      state.done=false;state.restoring=false;state.hits=0;state.resourcePopped=false;state.regrowth.reset();for(const part of state.stumps??[])part.visible=false;
      s.g.setAttribute('tabindex','0');s.g.removeAttribute('aria-disabled');s.g.style.pointerEvents='';s.g.dataset.hits='0';
     }
    }
    mesh.userData.mapKnown.value=.22+.78*Number(s.g.dataset.colorReveal??0);mesh.renderOrder=100+s.y*.5;
    mesh.material.opacity=Number(s.g.getAttribute('opacity')??1)*(state.restoring?growth.opacity:1);
    if(!state.done||state.restoring)state.sway?.(gentle?0:time);
    if(stump){
     if(state.restoring)stump.visible=true;
     stump.material.opacity=state.restoring?1-growth.opacity:1;
     for(const part of state.stumps){part.visible=stump.visible;part.renderOrder=mesh.renderOrder-.1;part.material.opacity=stump.material.opacity;part.material.transparent=true;part.material.depthTest=false;part.material.depthWrite=false;part.frustumCulled=false;}
     s.g.dataset.stumpVisible=String(stump.visible);
    }
    s.g.dataset.state=state.restoring?'returning':!state.done?'standing':tree?(treeState.completed?'stump':'falling'):'depleted';
    if(state.done)s.g.dataset.regrowAt=String(state.regrowth.at);else delete s.g.dataset.regrowAt;
   }

   for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.age+=dt;p.icon.visible=p.age>=0;if(!p.icon.visible)continue;const pose=resourceDropPose(p.age,p.side,gentle);if(pose.done){p.removeShadow();world.remove(p.icon);p.icon.geometry.dispose();p.icon.material.dispose();pops.splice(i,1);continue;}p.icon.position.copy(p.origin);p.icon.position.x+=pose.x;p.icon.position.y+=pose.height-.16+p.center;p.icon.position.z+=p.depth*Math.min(1,p.age/.72);p.icon.rotation.z=pose.rotation;p.icon.scale.set(pose.scaleX,pose.scaleY,1);p.icon.material.opacity=pose.opacity;p.icon.userData.flightPosition={z:p.icon.position.z*100,height:p.icon.position.y*100};if(!p.landed&&p.age>=.72){p.landed=true;audio.play(p.kind==='wood'?'wood':'mine',{level:p.kind==='wood'?.17:.14});}}
   world.updateMatrixWorld(true);world.traverse(n=>{if(n.isMesh){n.material.transparent=true;n.material.depthTest=false;n.material.depthWrite=false;if(n.parent!==world)n.renderOrder=900;}});
   map.camera.updateProjectionMatrix();if(!gentle)effects.applyCameraKick(map.camera,map.canvas.width,map.canvas.height);
  }
 };
}
