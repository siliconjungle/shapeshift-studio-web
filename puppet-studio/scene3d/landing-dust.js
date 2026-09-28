import * as T from './vendor.js';
import {LayeredVectorEffect} from './core/vector-effects.js';
import {landingDustDefinition} from './landing-dust-definition.js';

// The laser-eye cube's original SVG, layer animation and ground projection.
// Anchors live outside the die project and stay at the point of contact.
export class LandingDust {
 static async create(scene,base,{reduced=false}={}){
  const [svg,parts]=await Promise.all([
   fetch(new URL('landing-sprite.svg',base)).then(r=>{if(!r.ok)throw Error('Landing artwork unavailable');return r.text();}),
   fetch(new URL('landing-sprite-parts.json',base)).then(r=>{if(!r.ok)throw Error('Landing artwork metadata unavailable');return r.json();})
  ]);
  return new LandingDust(scene,new T.SVGLoader().parse(svg),parts,{reduced});
 }
 constructor(scene,svg,parts,{reduced=false}={}){
  this.reduced=reduced;this.cursor=0;
  this.entries=Array.from({length:2},()=>{
   const anchor=new T.Group(),projection=new T.Matrix4(),effect=new LayeredVectorEffect(svg,parts,{...landingDustDefinition,curveSegments:4},{loader:T.SVGLoader,groundSize:200000});
   effect.setColor('#d9cfb9');
   // Freeze the floor projection at emission; dice-camera tracking cannot move it.
   for(const {mesh}of effect.layers){
    mesh.material.uniforms.dustViewProjection={value:projection};
    mesh.material.vertexShader='uniform mat4 dustViewProjection;'+mesh.material.vertexShader.replace('projectionMatrix*viewMatrix*world','dustViewProjection*world');
   }
   anchor.rotation.x=-Math.PI/2;anchor.add(effect.root);scene.add(anchor);
   return{anchor,effect,projection,at:-Infinity,strength:1,size:1};
  });
 }
 burst(position,clock,{strength=1,launch=false,camera}={}){
  if(this.reduced||strength<.12)return;
  const e=this.entries[this.cursor++%this.entries.length];
  if(camera)e.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  e.anchor.position.set(position[0],0,position[2]);e.at=clock;e.strength=strength;e.size=launch?.48:.85;
 }
 update(clock){let dirty=false;
  for(const e of this.entries){
   dirty ||= e.effect.root.visible;
   const age=clock-e.at;if(age<0||age>=.75){e.effect.hide();continue;}
   e.effect.animate(age,e.strength);e.effect.root.scale.multiplyScalar(e.size);
   // Keep the original dust and debris without bringing back the removed ring.
   for(const layer of e.effect.layers)if(layer.id==='shock')layer.mesh.visible=false;
   dirty ||= e.effect.root.visible;
  }
  return dirty;
 }
 clear(){for(const e of this.entries){e.at=-Infinity;e.effect.hide();}}
 dispose(){for(const e of this.entries){e.effect.dispose();e.anchor.removeFromParent();}this.entries.length=0;}
}
