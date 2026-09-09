import {lightingGLSL as fragment} from './core/lighting-glsl.js';
import * as T from './vendor.js';
import {MAX_LIGHTS,lightPower,nightActivation,coloringDefaults} from './core/lighting-definition.js';

const srgb=(out,v)=>out.setRGB(...v,T.SRGBColorSpace);
export class SceneLighting{
 constructor(){this.bindings=[];this.active=[];this.white=new T.Color(1,1,1);this.defaultColoring=coloringDefaults();this.uniforms={puppetLightCount:{value:0},puppetLightPosition:{value:Array.from({length:MAX_LIGHTS},()=>new T.Vector4())},puppetLightColor:{value:Array.from({length:MAX_LIGHTS},()=>new T.Vector4())},puppetLightDirection:{value:Array.from({length:MAX_LIGHTS},()=>new T.Vector4())},puppetLightFalloff:{value:Array(MAX_LIGHTS).fill(2)},puppetWorldTint:{value:new T.Color(1,1,1)}};this.colour=new T.Color();this.point=new T.Vector3();this.tip=new T.Vector3();}
 reset(){this.bindings.length=0;this.uniforms.puppetLightCount.value=0;}
 bind(material,node,face=null){
  if(material.userData.puppetLighting)return;
  const u={...this.uniforms,puppetTint:{value:new T.Color(1,1,1)},puppetTintStrength:{value:0},puppetEmissionColor:{value:new T.Color()},puppetEmission:{value:0},puppetRegion:{value:new T.Vector4(.5,.5,.2,.2)},puppetRegionOnly:{value:0},puppetMask:{value:0}};
  this.bindings.push({u,node,face});material.userData.puppetLighting=u;
  if(material.isShaderMaterial){Object.assign(material.uniforms,u);material.fragmentShader=fragment+material.fragmentShader;material.fragmentShader=material.fragmentShader.replace('#include <colorspace_fragment>','gl_FragColor.rgb=puppetLighting(gl_FragColor.rgb,c,vWorld,vec2(vUv.x,1.-vUv.y),r>2.5&&r<3.5?1.:0.);\n#include <colorspace_fragment>');}
  else {const compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=shader=>{compile(shader);Object.assign(shader.uniforms,u);shader.vertexShader='varying vec3 puppetWorld;varying vec2 puppetUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\npuppetWorld=(modelMatrix*vec4(transformed,1.)).xyz;puppetUV=vec2(uv.x,1.-uv.y);');shader.fragmentShader='varying vec3 puppetWorld;varying vec2 puppetUV;\n'+fragment+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=puppetLighting(outgoingLight,diffuseColor.rgb,puppetWorld,puppetUV,paint>.5&&vRole>2.5&&vRole<3.5?1.:0.);\n#include <opaque_fragment>');};material.customProgramCacheKey=()=>key+'-authored-lights-v1';}
  material.needsUpdate=true;
 }
 update(sample,environment,time,objects,projectPoint){
  const night=environment.night??0;srgb(this.uniforms.puppetWorldTint.value,environment.nightTint??[.28,.34,.5]);this.uniforms.puppetWorldTint.value.lerp(this.white,1-night);
  let count=0;this.active.length=0;
  const visible=n=>{for(let p=n;p;p=sample.byId.get(p.parent))if(!p.visible)return false;return true;};
  for(const n of sample.nodes){if(count>=MAX_LIGHTS)break;const l=n.light;if(!l||!visible(n))continue;const power=lightPower(l,time,night);if(power<=0)continue;const p=projectPoint(new T.Vector3(...l.offset),n);const tip=projectPoint(new T.Vector3(...l.offset).add(new T.Vector3(...l.direction)),n).sub(p).normalize();
   if(l.colorMode==='environment')this.colour.set(environment.lightColor);else srgb(this.colour,l.color);
   this.uniforms.puppetLightPosition.value[count].set(p.x,p.y,p.z,l.range);this.uniforms.puppetLightColor.value[count].set(this.colour.r,this.colour.g,this.colour.b,power);this.uniforms.puppetLightDirection.value[count].set(tip.x,tip.y,tip.z,l.frontOnly?1:0);this.uniforms.puppetLightFalloff.value[count]=l.falloff;
   this.active.push({node:n.id,position:p.toArray(),direction:tip.toArray(),power,range:l.range,color:this.colour.toArray()});count++;
  }
  this.uniforms.puppetLightCount.value=count;
  for(const {u,node,face}of this.bindings){const c=sample.byId.get(node)?.coloring??this.defaultColoring;srgb(u.puppetTint.value,c.tint);u.puppetTintStrength.value=c.strength;if(c.colorMode==='environment')u.puppetEmissionColor.value.set(environment.lightColor);else srgb(u.puppetEmissionColor.value,c.emissionColor);u.puppetEmission.value=(c.face==='all'||c.face===face?c.emission:0)*(c.nightOnly?nightActivation(night):1);u.puppetRegion.value.fromArray(c.region);u.puppetRegionOnly.value=c.regionOnly?1:0;u.puppetMask.value=['all','warm','dark'].indexOf(c.mask);}
 }
 snapshot(){return structuredClone(this.active);}
}
