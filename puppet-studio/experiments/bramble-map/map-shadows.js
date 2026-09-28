import {SUN_DIRECTION} from '../shared/sunlight-shadows.js';
import {shadowProjection} from './map-atmosphere.js';
// Flat-map adaptation of Little Gods' silhouette casters. Each caster reuses
// the rendered vector geometry and wind pose. MAX blending unions every piece
// before softening, avoiding darker triangle seams or puppet joint overlaps.
export class MapShadows{
 constructor(T,scene,svg){
  this.T=T;this.svg=svg;this.entries=[];this.puppets=[];this.color=new T.Color();
  this.layers=[this.layer(scene,-50,2.2),this.layer(scene,450,10)];
 }
 layer(scene,order,blur){
  const T=this.T,target=new T.WebGLRenderTarget(1440,960,{depthBuffer:false,stencilBuffer:false});
  const material=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{mask:{value:target.texture},texel:{value:new T.Vector2(1/1440,1/960)},blur:{value:blur},ink:{value:new T.Color('#514b40')}},vertexShader:'varying vec2 uvMask;void main(){uvMask=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
   uniform sampler2D mask;uniform vec2 texel;uniform float blur;uniform vec3 ink;varying vec2 uvMask;
   void main(){float coverage=0.;float weights=0.;
    for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){float weight=exp(-float(x*x+y*y)*.65);coverage+=texture2D(mask,uvMask+vec2(float(x),float(y))*texel*blur).a*weight;weights+=weight;}
    gl_FragColor=vec4(ink,coverage/weights);
    #include <colorspace_fragment>
   }`});
  const overlay=new T.Mesh(new T.PlaneGeometry(2,2),material);overlay.renderOrder=order;overlay.frustumCulled=false;scene.add(overlay);
  return{target,scene:new T.Scene(),overlay};
 }
 add(record){
  if(record.node.closest('[data-feedback]'))return;
  const cloud=record.name.startsWith('cloud-'),owner=record.node.closest('[data-location],[data-biome],#traveller');
  if(!cloud&&(!owner||record.name==='banner'))return;
  const T=this.T,material=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,blending:T.CustomBlending,blendEquation:T.MaxEquation,blendSrc:T.OneFactor,blendDst:T.OneFactor,uniforms:{coverage:{value:0},contact:{value:0},phase:record.uniform??{value:0},strength:record.strength??{value:0}},vertexShader:`uniform float phase;uniform float strength;varying float localY;void main(){vec3 p=position;localY=p.y;p.x+=sin(phase+p.y*.8)*pow(1.-p.y,2.)*strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:'uniform float coverage;uniform float contact;varying float localY;void main(){float alpha=coverage*mix(1.,smoothstep(.72,.93,localY),contact);gl_FragColor=vec4(alpha);}'});
  const mesh=new T.Mesh(record.mesh.geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;this.layers[cloud?1:0].scene.add(mesh);this.entries.push({record,mesh,owner,cloud,traveller:!!record.node.closest('#traveller')});
  if(!cloud&&!record.node.closest('#traveller')){const foot=new T.Mesh(record.mesh.geometry,material.clone());foot.material.uniforms.contact.value=1;foot.material.uniforms.phase=material.uniforms.phase;foot.material.uniforms.strength=material.uniforms.strength;foot.matrixAutoUpdate=false;foot.frustumCulled=false;this.layers[0].scene.add(foot);this.entries.push({record,mesh:foot,owner,cloud:false,contact:true});}
 }
 // Dynamic puppet casters share the existing soft-shadow target and source geometry.
 addPuppet(root,{coverage=.23,layer=1,ground}={}){
  const T=this.T,casters=[];
  root.traverse(source=>{if(!source.isMesh)return;
   // Game scenery supplies a depth material with its exact foliage, hit and
   // dissolve deformation. Ordinary puppet joints use their live world matrices.
   const material=source.userData.shadowMaterial??new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
   Object.assign(material,{transparent:true,depthTest:false,depthWrite:false,blending:T.CustomBlending,blendEquation:T.MaxEquation,blendSrc:T.OneFactor,blendDst:T.OneFactor});
   const mesh=new T.Mesh(source.geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;this.layers[layer].scene.add(mesh);casters.push({source,mesh});
  });
  const entry={root,casters,ground,coverage,projection:new T.Matrix4()};this.puppets.push(entry);
  return()=>{const index=this.puppets.indexOf(entry);if(index<0)return;this.puppets.splice(index,1);for(const {source,mesh}of casters){this.layers[layer].scene.remove(mesh);if(mesh.material!==source.userData.shadowMaterial)mesh.material.dispose();}};
 }
 render(renderer,camera){
  const root=this.svg.getCTM();if(!root)return;const inverse=root.inverse();
  for(const e of this.entries){const {record:r,mesh,cloud,owner,contact,traveller}=e;mesh.visible=r.mesh.visible;if(!mesh.visible)continue;
   mesh.material.uniforms.coverage.value=r.material.opacity*(cloud?.075:contact?.23:traveller?.25:.13);
   if(contact){mesh.matrix.copy(r.mesh.matrix);mesh.matrix.elements[12]+=1.5;mesh.matrix.elements[13]-=3.5;}
   else if(cloud){mesh.matrix.copy(r.mesh.matrix);mesh.matrix.elements[12]+=32;mesh.matrix.elements[13]-=24;}
   else{const ground=inverse.multiply(owner.getCTM());mesh.matrix.multiplyMatrices(shadowProjection(this.T,ground.f),r.mesh.matrix);}
   mesh.matrixWorldNeedsUpdate=true;
  }
  for(const p of this.puppets){
   p.root.updateWorldMatrix(true,true);
   const flight=p.root.userData.flightPosition,groundZ=p.ground?.()??flight?.z??-p.root.position.y,height=flight?.height??0;
   // Intersect the actual elevated silhouette with the ground along game sunlight.
   const ray={x:-SUN_DIRECTION.x/SUN_DIRECTION.y,y:-SUN_DIRECTION.z/SUN_DIRECTION.y};
   p.projection.copy(shadowProjection(this.T,groundZ,ray));
   for(const {source,mesh}of p.casters){mesh.visible=p.root.visible&&source.visible;if(!mesh.visible)continue;mesh.material.opacity=p.coverage*(source.material.opacity??1)/(1+height/180);mesh.matrix.multiplyMatrices(p.projection,source.matrixWorld);mesh.matrixWorldNeedsUpdate=true;}
  }
  const previous=renderer.getRenderTarget(),alpha=renderer.getClearAlpha(),autoClear=renderer.autoClear;renderer.getClearColor(this.color);renderer.setClearColor(0,0);renderer.autoClear=true;
  try{for(const layer of this.layers){renderer.setRenderTarget(layer.target);renderer.clear();renderer.render(layer.scene,camera);}}
  finally{renderer.setRenderTarget(previous);renderer.setClearColor(this.color,alpha);renderer.autoClear=autoClear;}
 }
}
