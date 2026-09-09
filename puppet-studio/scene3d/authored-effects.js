import * as T from './vendor.js';
import {ProceduralEffects} from './core/procedural-effects.js';
import {ProceduralAudio} from './core/audio.js';
import {LayeredVectorEffect} from './core/vector-effects.js';
import {SurfaceContactEffect} from './core/surface-contact.js';
import {poseAt} from './core/motion.js';
import {parseSVG} from './geometry.js';
const Z=new T.Vector3(0,0,1),Y=new T.Vector3(0,1,0);
// Events bind reusable, serialized effect graphs to scene nodes. Artwork,
// programs, beam envelopes and sound palettes belong to the project.
export class AuthoredEffects {
 constructor(parent){this.parent=parent;this.entries=new Map();this.sounds=new Map();this.lastClip='';this.lastTime=-1;}
 async configure(project,asset){this.clear();const s=project.scene3d;try{
  for(const [id,definition]of Object.entries(s.audioLibraries??{}))this.sounds.set(id,new ProceduralAudio(definition));
  for(const clip of s.clips)for(const e of clip.events){if(!e.effect)continue;const definition=s.effectLibraries[e.effect.library],visuals=new ProceduralEffects(definition),entry={visuals,event:e};this.entries.set(clip.id+':'+e.id,entry);this.parent.add(visuals.root);
   if(e.contact){const svg=await parseSVG(asset(e.contact.asset));entry.template=new LayeredVectorEffect(svg,e.contact.parts,e.contact.vector,{groundSize:200000,loader:T.SVGLoader});entry.contact=new SurfaceContactEffect(entry.template,this.parent,this.parent,e.contact.program,{isGround:()=>false});}
  }
 }catch(error){this.clear();throw error;}}
 unlock(){for(const sound of this.sounds.values())sound.unlock();}
 stopAudio(){for(const sound of this.sounds.values())sound.stop();}
 update(time,clip,objects,defs,targets,palettes,toWorld,audible){
  const continuous=this.lastClip===clip.id&&time>=this.lastTime&&time-this.lastTime<.25,dt=continuous?time-this.lastTime:0,activeSounds=new Map();
  for(const entry of this.entries.values()){entry.visuals.root.visible=false;if(!continuous)entry.contact?.reset();if(entry.contact)entry.contact.decal.visible=entry.contact.spray.visible=false;}
  for(const e of clip.events){const age=time-e.time,active=age>=0&&age<e.duration;
   if(e.type==='sound'&&e.audio&&audible){const crossed=continuous?this.lastTime<e.time&&time>=e.time:active&&age<.08;if(crossed)this.sounds.get(e.audio.library)?.cue(e.audio.cue,e.audio.strength??1);}
   if(!e.effect||!active)continue;const fx=this.entries.get(clip.id+':'+e.id),node=defs.get(e.node);if(!fx||!node)continue;
   const v=fx.visuals,b=e.effect,color=e.color??node.effectColor??palettes.get(node.material)?.[1]??'#f0bf4b',local=new T.Vector3(...(e.origin??[0,0,node.dimensions[2]/2+.03])),origin=toWorld(local.clone(),node,objects,defs),direction=toWorld(local.add(new T.Vector3(...(e.direction??[0,0,1])).normalize()),node,objects,defs).sub(origin).normalize();v.root.visible=true;v.recolor(color);
   if(e.type==='particles'){const anchor=v.get(b.anchor);anchor.position.copy(origin);anchor.quaternion.setFromUnitVectors(Z,direction);v.sample(b.program,{...b.inputs,age:age/(e.normalizedDuration??e.duration)});}
   if(e.type==='beam'){
    const charge=e.charge??1.45,fire=age>=charge,fireAge=age-charge,beam=v.get(b.beam),charging=v.get(b.anchor);beam.visible=fire;charging.position.copy(origin);charging.quaternion.setFromUnitVectors(Z,direction);if(!fire)charging.rotateZ(age*3);v.sample(fire?b.fire:b.charge,{...b.inputs,age:fireAge,progress:age/charge});
    const hit=new T.Raycaster(origin,direction,.015,e.length??20).intersectObjects(targets.filter(m=>m.userData.node!==e.node),false)[0],length=hit?Math.max(.02,hit.distance):e.length??20,width=fire?(b.widthCurve?poseAt(fireAge,b.widthCurve)[0]:1)*(b.tremor===false?1:1+.05*Math.sin(fireAge*38)):0;
    beam.position.copy(origin).addScaledVector(direction,length/2);beam.quaternion.setFromUnitVectors(Y,direction);beam.scale.set(width,length,width*(b.tremor===false?1:.94+.06*Math.sin(fireAge*55)));
    if(fx.contact){fx.contact.setColor(color);if(!continuous)fx.contact.age=Math.max(0,fireAge-dt);fx.contact.update(dt,fire?hit:null,direction,width);}
    fx.visuals.root.userData.contact=fire&&hit?{node:hit.object.userData.node,point:hit.point.toArray()}:null;
    if(e.audio&&audible)activeSounds.set(e.audio.library,{state:fire?e.audio.fire:e.audio.charge,age:fire?fireAge:age/charge*(e.audio.chargeDuration??charge)});
   }
  }
  for(const [id,sound]of this.sounds){const active=activeSounds.get(id);if(audible)sound.sync(active?.state??'',active?.age??0);else sound.stop();}
  this.lastTime=time;this.lastClip=clip.id;
 }
 clear(){this.stopAudio();for(const sound of this.sounds.values())sound.dispose();this.sounds.clear();for(const {visuals,contact,template}of this.entries.values()){contact?.dispose();template?.dispose();visuals.dispose();}this.entries.clear();this.lastClip='';this.lastTime=-1;}
}
