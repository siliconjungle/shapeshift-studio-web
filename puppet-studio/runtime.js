import {prepareBodyJoinProfiles} from './body-join-profiles.js';
export {prepareBodyJoinProfiles} from './body-join-profiles.js';
import {validateBodyJoins,bodyJoinFrame,deformBodyPoint} from './body-joins.js';
import {drawJoinedArtwork} from './body-join-render.js';
export {makeBodyJoin,bodyJoinFrame,deformBodyPoint,deformBodyPositions,bindBodyJoinGeometry} from './body-joins.js';
import {validateEntityLibrary} from './entities/definitions.js';
import {validateAbilities} from './authoring/abilities.js';
import {validatePuppetSources} from './puppet-sources.js';
import {ensureArtPalette,artImageURL} from '../art-palette.js';
import {validateLibrary} from './authoring/library.js';
import {finalChannels,validateResolvedTracks} from './authoring/resolved-channels.js';
import {validateTiming} from './authoring/timing.js';
import {validateSound,ClipAudio} from './authoring/sound.js';
import {validatePreview} from './authoring/preview.js';
import {validateActions} from './authoring/actions.js';
import {validateBackdrop} from './authoring/backdrop.js';
import {validateBezier} from './authoring/easing.js';
import {validateAppearance,styledAssets,pruneAppearanceTargets,projectAppearance} from './authoring/appearance.js';
import {migrateLegacyAppearance} from './integrations/little-gods/legacy-appearance.js';
import {validateVector} from './vector/model.js';
import {validateGrading} from '../rendering/color-grading.js';
import {poseLayers,solvePoseTools,validateTools,cleanToolReferences} from './motion-tools/core.js';
import {validateLighting2D} from './lighting-state.js';
import {validateScene} from './scene3d/schema.js';
import {validateNative} from './native/schema.js';
import {sampleParticleSystem} from './fx/particles.js';
import {validateVisual,finiteTree} from './fx/validate.js';
import {dynamicMotion} from './fx/motion.js';
import {validateCues,presentationAt,animationTime} from './fx/presentation.js';
import {validateFX} from './fx/schema.js';
import {easing,easeNames} from './fx/math.js';
import {renderSceneFrame} from './fx/render.js';
export {presentationAt,animationTime};
// Shapeshift Studio v1: dependency-free, named-joint cutout animation player.
// Coordinates are pixels, Y down; rotations are degrees. Animation transforms
// are offsets from the rig's rest pose (scale is a multiplier).
export const FORMAT = 'inkwell-puppet';
import {CHANNELS,identity,clone,clamp,multiply,point,inverse,matrix,sampleTrack} from './joint-transforms.js';
export {CHANNELS,identity,clone,clamp,multiply,point,inverse,matrix,sampleTrack};
function buildPose(project,transforms){
  const result=new Map(),joints=new Map(project.joints.map(j=>[j.id,j]));
  function visit(j){if(result.has(j.id))return result.get(j.id);const t=transforms.get(j.id),local=matrix(t),parent=j.parent?visit(joints.get(j.parent)).world:[1,0,0,1,0,0];const value={joint:j,local,world:multiply(parent,local),transform:t};result.set(j.id,value);return value;}
  for(const j of project.joints)visit(j);
  let children;
  Object.defineProperty(result,'updateBranch',{value(id){
    if(!children){children=new Map();for(const j of project.joints){if(!children.has(j.parent))children.set(j.parent,[]);children.get(j.parent).push(j.id);}}
    function update(key){const p=result.get(key);p.local=matrix(transforms.get(key));p.world=multiply(p.joint.parent?result.get(p.joint.parent).world:[1,0,0,1,0,0],p.local);for(const child of children.get(key)??[])update(child);}
    update(id);
  }});
  return result;
}
const origin=m=>({x:m[4],y:m[5]});
const angleDelta=(a,b)=>((a-b+Math.PI*3)%(Math.PI*2))-Math.PI;
export function effectDelta(effect,time){
  const span=effect.span??effect.duration??1,age=time-(effect.delay??0),u=clamp(age/span,0,1),value=identity();
  if(['hit','fall','reveal','bounce'].includes(effect.type)){
    const decay=effect.decay??4;
    if(effect.type==='hit')value.rotation=age<0?0:Math.sin(u*Math.PI*2*effect.cycles)*Math.exp(-decay*u)*(1-u)**2*effect.amount;
    if(effect.type==='fall')value.rotation=u*u*(3-2*u)*effect.amount;
    if(effect.type==='reveal'){const t=u-1,progress=1+2.70158*t*t*t+1.70158*t*t;value.scaleX=value.scaleY=Math.max(.01,progress);value.y=(1-progress)*effect.amount;}
    if(effect.type==='bounce')value.y=-Math.abs(Math.sin(u*Math.PI*effect.cycles))*Math.exp(-decay*u)*(1-u)*effect.amount;
    return value;
  }
  if(age<0)return value;
  const wave=Math.sin(u*Math.PI*2*effect.cycles+effect.phase*Math.PI/180),amount=effect.amount*wave;
  if(effect.type==='wiggle')value.rotation=amount;
  if(effect.type==='bob')value.y=amount;
  if(effect.type==='sway')value.x=amount;
  if(effect.type==='squash'){value.scaleY=Math.max(.1,1+amount/100);value.scaleX=effect.volume===false?1:1/value.scaleY;}
  return value;
}
export function poseAt(project,clip,time,{solveIK=true,tools=true,dynamics=true,overrides=[]}={}){
  const transforms=new Map(),deltas=new Map();
  for(const j of project.joints){const delta=sampleTrack(clip?.tracks[j.id],time),t={...j.rest};deltas.set(j.id,delta);for(const c of CHANNELS)t[c]=c.startsWith('scale')?t[c]*delta[c]:t[c]+((clip?.ik?.[j.id]&&['x','y'].includes(c))?0:delta[c]);transforms.set(j.id,t);}
  for(const effect of clip?.effects??[]){if(effect.enabled===false)continue;const t=transforms.get(effect.joint),d=effectDelta({...effect,duration:clip.duration},time);for(const c of CHANNELS)t[c]=c.startsWith('scale')?t[c]*d[c]:t[c]+d[c];}
  if(dynamics)for(const j of project.joints){const t=transforms.get(j.id),d=dynamicMotion(j.visual?.motion,time);for(const c of CHANNELS)t[c]=c.startsWith('scale')?t[c]*d[c]:t[c]+d[c];}
  if(tools)poseLayers(transforms,clip?.tools,time,clip?.duration??1,(layer,at)=>{const source=project.clips.find(c=>c.id===layer.sourceClip),age=Math.max(0,at-(layer.start??0))*(layer.speed??1)+(layer.offset??0),t=layer.loop===false?Math.min(source.duration,age):age%source.duration,sampled=poseAt(project,source,t,{tools:false,dynamics:false}),values={};for(const id of layer.joints){const p=sampled.get(id);values[id]=Object.fromEntries(CHANNELS.map(k=>[k,k.startsWith('scale')?p.transform[k]/p.joint.rest[k]:p.transform[k]-p.joint.rest[k]]));}return values;});
  let result=buildPose(project,transforms);
  const ikTargets=new Map();
  if(clip?.ik&&solveIK){
    const rest=buildPose(project,new Map(project.joints.map(j=>[j.id,{...j.rest}])));
    for(const [endId,chain]of Object.entries(clip.ik)){
      const root=result.get(chain.root),mid=result.get(chain.mid),end=result.get(endId);if(!root||!mid||!end)continue;
      const parentId=root.joint.parent,parent=parentId?result.get(parentId).world:[1,0,0,1,0,0],restParent=parentId?rest.get(parentId).world:[1,0,0,1,0,0];
      const anchor=point(inverse(restParent),origin(rest.get(endId).world)),delta=deltas.get(endId),targetLocal={x:anchor.x+delta.x,y:anchor.y+delta.y},target=point(parent,targetLocal);
      const a=point(inverse(parent),origin(root.world)),b=point(inverse(parent),origin(mid.world)),c=point(inverse(parent),origin(end.world));
      let l1=Math.hypot(b.x-a.x,b.y-a.y),l2=Math.hypot(c.x-b.x,c.y-b.y),distance=Math.hypot(targetLocal.x-a.x,targetLocal.y-a.y);
      if(l1<.001||l2<.001)continue;
      const stretch=clamp(distance/(l1+l2),1,chain.stretch??1);
      if(stretch>1){const t=transforms.get(chain.root);t.scaleX*=stretch;t.scaleY*=stretch;l1*=stretch;l2*=stretch;result.updateBranch(chain.root);}
      // Seed the requested elbow side analytically, then refine in each bone's
      // parent coordinates. The refinement also handles mirrored/nonuniform rigs.
      const d=clamp(distance,Math.abs(l1-l2)+.0001,l1+l2-.0001),heading=Math.atan2(targetLocal.y-a.y,targetLocal.x-a.x),bend=chain.bend??1;
      const theta=heading+bend*Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
      const elbowWorld=point(parent,{x:a.x+Math.cos(theta)*l1,y:a.y+Math.sin(theta)*l1});
      function aim(id,tipId,goal){const p=result.get(id),pm=p.joint.parent?result.get(p.joint.parent).world:[1,0,0,1,0,0],inv=inverse(pm),start=point(inv,origin(p.world)),tip=point(inv,origin(result.get(tipId).world)),g=point(inv,goal);const change=angleDelta(Math.atan2(g.y-start.y,g.x-start.x),Math.atan2(tip.y-start.y,tip.x-start.x));transforms.get(id).rotation+=change*180/Math.PI;result.updateBranch(id);}
      aim(chain.root,chain.mid,elbowWorld);aim(chain.mid,endId,target);
      for(let i=0;i<36;i++){const e=origin(result.get(endId).world);if(Math.hypot(e.x-target.x,e.y-target.y)<.015)break;aim(chain.mid,endId,target);aim(chain.root,endId,target);}
      ikTargets.set(endId,target);
    }
  }
  if(tools)solvePoseTools(project,clip,time,result,transforms,t=>poseAt(project,clip,t,{solveIK,tools:false}));
  for(const [id,p]of result){p.delta=deltas.get(id);const target=ikTargets.get(id);if(target){p.ikTarget=target;p.ikError=Math.hypot(p.world[4]-target.x,p.world[5]-target.y);}}
  for(const t of finalChannels(clip,time,overrides)){const p=result.get(t.node);if(p&&CHANNELS.includes(t.channel)){transforms.get(t.node)[t.channel]=t.value;result.updateBranch(t.node);}}
  return result;
}
// Preserve the current visible endpoint while switching its translation track
// to IK target offsets. Existing rotation/scale channels remain wrist controls.
export function enableIK(project,clip,endId,time,{bend=1,stretch=1}={}){
  const end=project.joints.find(j=>j.id===endId),mid=project.joints.find(j=>j.id===end?.parent),root=project.joints.find(j=>j.id===mid?.parent);
  if(!end||!mid||!root||!root.parent)throw Error('Choose the end of a two-bone chain, such as a wrist. It needs an elbow and shoulder.');
  if(clip.ik?.[endId])return;
  const original=clone(clip),frames=new Set([0,time,clip.duration,...Object.values(clip.tracks).flatMap(keys=>keys.map(k=>k.time))]);
  const rest=poseAt(project,null,0),rp=rest.get(root.parent).world,anchor=point(inverse(rp),origin(rest.get(endId).world));
  clip.ik??={};clip.ik[endId]={root:root.id,mid:mid.id,bend,stretch};
  for(const t of [...frames].sort((a,b)=>a-b)){const pose=poseAt(project,original,t),p=point(inverse(pose.get(root.parent).world),origin(pose.get(endId).world)),value=sampleTrack(original.tracks[endId],t);value.x=p.x-anchor.x;value.y=p.y-anchor.y;setKey(clip,endId,t,value);}
}
export function bakeMotion(project,clip){
  const original=clone(clip),tracks={},previous=new Map();
  const times=[];for(let frame=0;frame/clip.fps<clip.duration;frame++)times.push(frame/clip.fps);times.push(clip.duration);
  for(const time of times){const rawProject={...project,joints:project.joints.map(j=>({...j,visual:j.visual?{...j.visual,motion:{...j.visual.motion,enabled:false}}:undefined}))};const pose=poseAt(rawProject,original,time);for(const j of project.joints){const t=pose.get(j.id).transform,v=identity();for(const c of CHANNELS)v[c]=c.startsWith('scale')?t[c]/j.rest[c]:t[c]-j.rest[c];const old=previous.get(j.id);if(old!==undefined){while(v.rotation-old>180)v.rotation-=360;while(v.rotation-old<-180)v.rotation+=360;}previous.set(j.id,v.rotation);(tracks[j.id]??=[]).push({time,value:v,easing:'linear'});}}
  clip.tracks=tracks;delete clip.ik;delete clip.effects;delete clip.tools;
}
export function setKey(clip,id,time,value,easing='smooth'){
  const keys=clip.tracks[id]??(clip.tracks[id]=[]),existing=keys.find(k=>Math.abs(k.time-time)<.00001);
  if(existing){existing.value={...identity(),...value};existing.easing=easing;}
  else keys.push({time,value:{...identity(),...value},easing});
  keys.sort((a,b)=>a.time-b.time);
}
// Move an origin in the joint's local coordinates while keeping its artwork
// and immediate children stationary in the rest pose.
export function moveOrigin(project,id,delta){
  const j=project.joints.find(j=>j.id===id),m=matrix(j.rest);
  for(const part of project.joints)if(part.bodyJoin?.targetNode===id){part.bodyJoin.anchor[0]-=delta.x;part.bodyJoin.anchor[1]-=delta.y;}
  j.rest.x+=m[0]*delta.x+m[2]*delta.y;j.rest.y+=m[1]*delta.x+m[3]*delta.y;
  if(j.sprite){j.sprite.pivotX+=delta.x/j.sprite.width;j.sprite.pivotY+=delta.y/j.sprite.height;}
  for(const child of project.joints)if(child.parent===id){child.rest.x-=delta.x;child.rest.y-=delta.y;}
}
export function removeJoint(project,id){
  const ids=new Set([id]);let changed=true;
  while(changed){changed=false;for(const j of project.joints)if(ids.has(j.parent)&&!ids.has(j.id)){ids.add(j.id);changed=true;}}
  project.joints=project.joints.filter(j=>!ids.has(j.id));for(const j of project.joints)if(ids.has(j.bodyJoin?.targetNode))delete j.bodyJoin;pruneAppearanceTargets(project);
  for(const c of project.clips){cleanToolReferences(c,new Set(project.joints.map(j=>j.id)));if(c.resolvedTracks)c.resolvedTracks=c.resolvedTracks.filter(t=>!ids.has(t.node));if(c.lightingTracks)c.lightingTracks=c.lightingTracks.filter(t=>!ids.has(t.node));for(const key of ids)delete c.tracks[key];if(c.effects)c.effects=c.effects.filter(e=>!ids.has(e.joint));for(const [end,chain]of Object.entries(c.ik??{}))if(ids.has(end)||ids.has(chain.root)||ids.has(chain.mid))delete c.ik[end];}
}
export function validateProject(input){
 if(input?.game)validateNative(input.game);
  if(!input||input.format!==FORMAT||input.version!==1)throw Error('Choose a Shapeshift Studio v1 project JSON.');
  const p=migrateLegacyAppearance(clone(input)),fail=message=>{throw Error(message);};
  if(typeof p.name!=='string'||p.name.length>200)fail('Invalid project name.');
  if(!Array.isArray(p.joints)||!p.joints.length||p.joints.length>256)fail('A rig needs 1–256 joints.');
  if(!Array.isArray(p.assets)||p.assets.length>256)fail('Too many images.');
  if(!Array.isArray(p.clips)||!p.clips.length||p.clips.length>100)fail('A project needs 1–100 clips.');
  const numeric=(v,label,max=100000)=>{if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>max)fail('Invalid '+label);};
  const ids=new Set(),assetIds=new Set();
  for(const a of p.assets){validateVector(a.vector);if(typeof a.id!=='string'||assetIds.has(a.id)||typeof a.src!=='string'||!(/^(data:image\/(png|jpeg|webp|svg\+xml)[;,]|https?:\/\/|\.\.?\/|assets\/)/i.test(a.src)))fail('Invalid image source. Use PNG, SVG, WebP or JPEG images.');if(a.frames&&(!Array.isArray(a.frames)||a.frames.length>1000||a.frames.some(src=>typeof src!=='string'||!/^data:image\/(png|jpeg|webp|svg\+xml)[;,]/.test(src))))fail('Animated frames must be embedded images (maximum 1000).');assetIds.add(a.id);}
  for(const j of p.joints){
    j.parent??=null;validateVisual(j.visual);
    if(typeof j.id!=='string'||!/^[a-zA-Z0-9_.-]{1,80}$/.test(j.id)||j.id in Object.prototype||ids.has(j.id))fail('Joint names must be unique, non-reserved letters, numbers, underscores, dots or dashes.');ids.add(j.id);
    if(typeof j.name!=='string')j.name=j.id;
    if(!j.rest)fail('Missing rest pose.');for(const c of CHANNELS)numeric(j.rest[c],'joint '+c);
    if(Math.abs(j.rest.scaleX)<.01||Math.abs(j.rest.scaleY)<.01)fail('Joint scale cannot be zero.');
    numeric(j.layer,'layer');
    if(j.sprite){const s=j.sprite;if(!assetIds.has(s.asset))fail('Missing image '+s.asset);for(const c of ['width','height','pivotX','pivotY'])numeric(s[c],'sprite '+c);if(s.width<1||s.height<1)fail('Image dimensions must be positive.');
      if(s.crop){if(!Array.isArray(s.crop)||s.crop.length!==4)fail('Invalid crop.');s.crop.forEach(v=>numeric(v,'crop',1));if(s.crop.some(v=>v<0)||s.crop[2]<=0||s.crop[3]<=0||s.crop[0]+s.crop[2]>1.00001||s.crop[1]+s.crop[3]>1.00001)fail('Invalid crop bounds.');}}
  }
  for(const j of p.joints){let next=j,seen=new Set();while(next){if(seen.has(next.id))fail('The joint hierarchy contains a cycle.');seen.add(next.id);if(next.parent&&!ids.has(next.parent))fail('Missing parent joint.');next=p.joints.find(j=>j.id===next.parent);}}
  validateBodyJoins(p);
  const clipIds=new Set();
  for(const c of p.clips){
    if(typeof c.id!=='string'||clipIds.has(c.id)||typeof c.name!=='string')fail('Invalid clip name.');clipIds.add(c.id);
    numeric(c.duration,'clip duration',120);if(c.duration<.1)fail('Clip must be at least 0.1 seconds.');
    numeric(c.fps,'frame rate',120);if(c.fps<1||!Number.isInteger(c.fps))fail('Frame rate must be 1–120.');
    if(!c.tracks||Array.isArray(c.tracks)||typeof c.tracks!=='object')fail('Missing animation tracks.');
    if(c.effects!==undefined){if(!Array.isArray(c.effects)||c.effects.length>100)fail('Too many motion effects.');for(const e of c.effects){if(!ids.has(e.joint)||!['wiggle','bob','sway','squash','hit','fall','reveal','bounce'].includes(e.type))fail('Invalid motion effect.');numeric(e.amount,'effect amount',e.type==='squash'?85:360);numeric(e.cycles,'effect cycles',40);numeric(e.phase,'effect phase',3600);if(e.cycles<0)fail('Cycles cannot be negative.');for(const k of ['span','delay','decay'])if(e[k]!==undefined){numeric(e[k],'effect '+k,120);if(e[k]<0||k==='span'&&e[k]<.1)fail('Invalid effect timing.');}}}
    if(c.ik!==undefined){if(!c.ik||typeof c.ik!=='object'||Array.isArray(c.ik)||Object.keys(c.ik).length>32)fail('Invalid IK chains.');const used=new Set();for(const [end,chain]of Object.entries(c.ik)){const e=p.joints.find(j=>j.id===end),m=p.joints.find(j=>j.id===chain.mid),r=p.joints.find(j=>j.id===chain.root);if(!e||!m||!r||e.parent!==m.id||m.parent!==r.id||!r.parent)fail('IK requires an end, its parent, and grandparent beneath a parent joint.');if(![-1,1].includes(chain.bend))fail('IK bend must be -1 or 1.');numeric(chain.stretch,'IK stretch',2);if(chain.stretch<1)fail('IK stretch must be 1–2.');for(const id of [end,chain.mid,chain.root]){if(used.has(id))fail('IK chains cannot share driven joints.');used.add(id);}if(Math.hypot(e.rest.x,e.rest.y)<.001||Math.hypot(m.rest.x,m.rest.y)<.001)fail('IK bones need nonzero length.');}}
    for(const [id,keys]of Object.entries(c.tracks)){
      if(!ids.has(id))fail('Animation refers to missing joint '+id);
      if(!Array.isArray(keys)||keys.length>15000)fail('Too many keyframes.');
      keys.sort((a,b)=>a.time-b.time);
      for(let i=0;i<keys.length;i++){const k=keys[i];numeric(k.time,'key time');if(k.time<0||k.time>c.duration||i>0&&Math.abs(k.time-keys[i-1].time)<.00001)fail('Keyframes must have unique times inside the clip.');if(!easeNames.includes(k.easing))fail('Unknown easing.');validateBezier(k);for(const channel of CHANNELS)numeric(k.value?.[channel],'key '+channel);if(k.value.scaleX<.01||k.value.scaleY<.01)fail('Animated scales must stay positive. Use the rig flip controls for mirroring.');}
    }
  }
  for(const c of p.clips)validateTools(c.tools,p.joints,c.duration,2,p.clips);
  if(p.entityDefinitions)validateEntityLibrary(p.entityDefinitions);validateAbilities(p);validatePuppetSources(p);validateLibrary(p);validateResolvedTracks(p);validateTiming(p);validateSound(p);validatePreview(p,validateProject);validateActions(p);validateBackdrop(p);validateAppearance(p);validateGrading(p.grading);validateLighting2D(p);finiteTree(p);if(p.scene3d){validateScene(p.scene3d,p.assets);if(p.appearance&&(p.scene3d.nodes.some(n=>n.variant||n.puppet?.variant)||p.appearance.variants.some(v=>v.effects||v.voices))){const view=projectAppearance(p);validateScene(view.scene3d,view.assets);}}validateFX(p);for(const c of p.clips){if(c.fx)validateFX({...p,fx:c.fx});validateCues(c);}
  return p;
}
export async function loadImages(project){
 await ensureArtPalette();
 const entries=await Promise.all(styledAssets(project).map(async a=>{const img=new Image();img.crossOrigin='anonymous';img.src=await artImageURL(a.src);await img.decode();if(a.frames){img.frames=await Promise.all(a.frames.map(async src=>{const frame=new Image();frame.crossOrigin='anonymous';frame.src=await artImageURL(src);await frame.decode();return frame;}));}img.frameDurations=a.frameDurations;img.vectorModel=a.vector;return[a.id,img];}));const images=new Map(entries);images.contours=new Map();
 for(const a of project.assets){const img=images.get(a.id);if([project.fx,...(project.clips??[]).map(c=>c.fx)].some(f=>f?.emitters?.some(e=>e.contour===a.id))){const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(64,64):Object.assign(document.createElement('canvas'),{width:64,height:64}),ctx=c.getContext('2d');ctx.drawImage(img,0,0,64,64);const d=ctx.getImageData(0,0,64,64).data,points=[];for(let y=1;y<63;y++)for(let x=1;x<63;x++){const i=y*64+x;if(d[i*4+3]>100&&[i-1,i+1,i-64,i+64].some(j=>d[j*4+3]<100))points.push({x:x/64,y:y/64});}images.contours.set(a.id,points);}}
 const models=[...(project.fx?.models??[]),...(project.clips??[]).flatMap(c=>(c.fx?.models??[]).map(m=>({...m,id:c.id+':'+m.id})))];if(models.length){const {loadModels}=await import('./fx/models.js');images.models=await loadModels(models);}return images;
}
export function drawPuppet(ctx,project,images,pose,{alpha=1}={}){
  const joins=bodyJoinFrame(project,pose,prepareBodyJoinProfiles(project,images));
  for(const j of [...project.joints].sort((a,b)=>a.layer-b.layer)){
    if(j.hidden||!j.sprite)continue;const s=j.sprite,img=images.get(s.asset);if(!img)continue;
    ctx.save();ctx.globalAlpha*=alpha;ctx.transform(...pose.get(j.id).world);
    const crop=s.crop??[0,0,1,1];if(joins.has(j.id)&&!s.crop){drawJoinedArtwork(ctx,img,s,joins.get(j.id));ctx.restore();continue;}ctx.drawImage(img,crop[0]*img.naturalWidth,crop[1]*img.naturalHeight,crop[2]*img.naturalWidth,crop[3]*img.naturalHeight,-s.pivotX*s.width,-s.pivotY*s.height,s.width,s.height);ctx.restore();
  }
}
export function bounds(project,pose){
  const joins=bodyJoinFrame(project,pose),pts=[];for(const j of project.joints){if(j.hidden)continue;const s=j.sprite,m=pose.get(j.id).world;if(!s){pts.push(point(m,{x:0,y:0}));continue;}const morph=j.visual?.morph,max=v=>Array.isArray(v)?Math.max(0,...v.map(k=>Math.abs(k.value))):Math.abs(v??0),padding=morph?.enabled?s.width*(max(morph.inflate)+max(morph.taper)+2*max(morph.bend))/2:0;if(joins.has(j.id)){for(let row=0;row<=24;row++)for(let col=0;col<=24;col++)pts.push(point(m,deformBodyPoint((col/24-s.pivotX)*s.width,(row/24-s.pivotY)*s.height,joins.get(j.id))));}for(const x of [-s.pivotX*s.width-padding,(1-s.pivotX)*s.width+padding])for(const y of [-s.pivotY*s.height,(1-s.pivotY)*s.height])pts.push(point(m,{x,y}));}
  return {minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minY:Math.min(...pts.map(p=>p.y)),maxY:Math.max(...pts.map(p=>p.y))};
}
// Fit the motion envelope, so a falling tree or reaching arm stays in view.
export function motionBounds(project,clip){if(clip?.fx)project={...project,fx:clip.fx};
  const samples=[bounds(project,poseAt(project,null,0))];
  if(clip){const times=new Set(Array.from({length:49},(_,i)=>i*clip.duration/48));for(const keys of Object.values(clip.tracks))for(const k of keys)times.add(k.time);for(const t of times)samples.push(bounds(project,poseAt(project,clip,t)));}
  for(const f of project.fx?.fluids??[])if(f.enabled!==false)samples.push({minX:f.x-f.width/2,maxX:f.x+f.width/2,minY:f.y-f.height/2,maxY:f.y+f.height/2});
  for(const m of project.fx?.models??[])if(m.enabled!==false)samples.push({minX:m.x-m.width/2,maxX:m.x+m.width/2,minY:m.y-m.height/2,maxY:m.y+m.height/2});
  if(clip&&project.fx?.emitters?.length)for(let i=0;i<=12;i++){const systems=sampleParticleSystem(project.fx.emitters,clip.duration*i/12,{loopDuration:clip.loop?clip.duration:0});for(const {particles}of systems)for(const p of particles)samples.push({minX:p.x-p.size,maxX:p.x+p.size,minY:p.y-p.size,maxY:p.y+p.size});}
  return {minX:samples.reduce((v,b)=>Math.min(v,b.minX),Infinity),minY:samples.reduce((v,b)=>Math.min(v,b.minY),Infinity),maxX:samples.reduce((v,b)=>Math.max(v,b.maxX),-Infinity),maxY:samples.reduce((v,b)=>Math.max(v,b.maxY),-Infinity)};
}
export function createPlayer(canvas,project,images){
  const ctx=canvas.getContext('2d'),sound=new ClipAudio();let playing=false,raf=0,start=0,clip=project.clips[0],framing=motionBounds(project,clip);
  function draw(time=0){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderFrame(project,images,clip,time,{width:canvas.width,height:canvas.height,framing}),0,0);}
  function frame(now){if(!playing)return;let t=(now-start)/1000;if(clip.loop)t%=clip.duration;else if(t>=clip.duration){t=clip.duration;playing=false;}sound.sync(project,clip,t,{audible:true});draw(t);if(playing)raf=requestAnimationFrame(frame);}
  return {draw,play(id=clip.id){clip=project.clips.find(c=>c.id===id)??clip;framing=motionBounds(project,clip);cancelAnimationFrame(raf);sound.begin(clip,0);playing=true;start=performance.now();raf=requestAnimationFrame(frame);},stop(){playing=false;cancelAnimationFrame(raf);sound.stop();},dispose(){this.stop();sound.dispose();}};
}

export function renderFrame(project,images,clip,time,options={}){if(clip?.fx)project={...project,fx:clip.fx};const width=options.width??project.fx?.settings.width??512,height=options.height??project.fx?.settings.height??512;let camera=options.camera;if(!camera){const b=options.framing??motionBounds(project,clip),padding=project.fx?.settings.padding??50,scale=Math.min(width/(b.maxX-b.minX+padding*2||1),height/(b.maxY-b.minY+padding*2||1));camera=[scale,0,0,scale,width/2-(b.minX+b.maxX)/2*scale,height/2-(b.minY+b.maxY)/2*scale];}return renderSceneFrame(project,images,clip,time,{...options,width,height,camera,background:options.background??project.fx?.settings.background??'transparent'},options.overrides?.length?(p,c,t)=>poseAt(p,c,t,{overrides:options.overrides}):poseAt);}
