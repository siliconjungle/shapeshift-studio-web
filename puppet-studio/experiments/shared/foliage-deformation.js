import * as THREE from 'three';

// One small uniform update per plant replaces rewriting every vector vertex.
// Both the visible material and physical-depth material use this exact function.
export const foliageGLSL=`
uniform float foliageKind;
uniform float foliageHeight;
uniform float foliageWidth;
uniform float foliageTime;
uniform float foliagePhase;
uniform vec2 foliageBend;
uniform float foliageImpact;
vec3 deformFoliage(vec3 p){
 float h=foliageHeight,t=clamp(p.y/h,0.,1.),time=foliageTime,phase=foliagePhase;
 if(foliageKind<.5){
  float weight=t*t;
  float wind=sin(time*1.1+phase)*.055+sin(time*1.83+phase*.7)*.022;
  p.x+=(wind*h+foliageBend.x)*weight;
  p.y-=min(h*.34,length(foliageBend)*.28)*weight;
  p.z=foliageBend.y*weight;
 }else if(foliageKind<1.5){
  float weight=t*(2.-t);
  float angle=clamp(-foliageBend.x/h*.9,-.55,.55)+sin(time*1.2+phase)*.012;
  vec2 rotated=vec2(p.x*cos(angle)-p.y*sin(angle),p.x*sin(angle)+p.y*cos(angle));
  p.xy=mix(p.xy,rotated,weight);
  // A depth-only offset is invisible on a camera-facing card. Let a forward /
  // backward brush-through squash and rebound in the silhouette as well.
  p.y-=clamp(foliageBend.y*.55,-h*.22,h*.3)*weight;
  p.z=foliageBend.y*weight;
 }else{
  float x=p.x/foliageWidth+.5,y=p.y/h;
  float canopy=smoothstep(.44,.78,y);
  float left=exp(-((x-.23)*(x-.23)/.009+(y-.43)*(y-.43)/.009));
  float right=exp(-((x-.75)*(x-.75)/.009+(y-.50)*(y-.50)/.009));
  // Broad canopy sway with a slower gust envelope and smaller branch lag.
  float gust=.82+.18*sin(time*.37+phase*.3);
  float breeze=(sin(time*.83+phase)*.65+sin(time*1.31+phase*.6)*.35)*gust;
  p.x+=h*(canopy*breeze*.052+left*sin(time*1.8+phase)*.024+right*sin(time*1.6+phase+1.)*.024);
  p.y+=h*canopy*sin(time*1.12+phase+x*3.)*.014;
  p.x+=h*foliageImpact*(canopy+left*.28+right*.18);
  p.y-=h*abs(foliageImpact)*canopy*.16;
 }
 return p;
}
`;
export function attachFoliageDeformation(mesh,{kind='grass',height=mesh.userData.base,phase=0}={}){
 const uniforms={foliageKind:{value:kind==='tree'?2:kind==='grass'?0:1},foliageHeight:{value:height},foliageWidth:{value:height*mesh.userData.art.image.width/mesh.userData.art.image.height},foliageTime:{value:0},foliagePhase:{value:phase},foliageBend:{value:new THREE.Vector2()},foliageImpact:{value:0}};
 function patch(material){
  const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
  material.onBeforeCompile=shader=>{
   previous.call(material,shader);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=foliageGLSL+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=deformFoliage(transformed);');
  };
  material.customProgramCacheKey=()=>previousKey+'-foliage-v4';material.needsUpdate=true;
 }
 patch(mesh.material);
 const shadow=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false});patch(shadow);
 mesh.userData.shadowMaterial=shadow;mesh.userData.foliage=uniforms;
 return uniforms;
}
