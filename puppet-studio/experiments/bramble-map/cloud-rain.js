import * as T from 'three';
// Localized adaptation of Little Gods weather.js: seeded drop life, tapered
// streaks, downwind fall, and expanding contact rings. One pooled draw per cloud.
export class MapCloudRain{
 constructor(scene,clouds){this.scene=scene;this.entries=clouds.map((cloud,index)=>{
  const plane=new T.PlaneGeometry(1,1),geometry=new T.InstancedBufferGeometry();geometry.index=plane.index;geometry.attributes.position=plane.attributes.position;geometry.attributes.uv=plane.attributes.uv;
  const seeds=[],kinds=[];let seed=7349+index*997;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<40;i++){const values=[random(),random(),random(),random()];for(const kind of [0,1]){seeds.push(...values);kinds.push(kind);}}
  geometry.instanceCount=kinds.length;geometry.setAttribute('dropSeed',new T.InstancedBufferAttribute(new Float32Array(seeds),4));geometry.setAttribute('splash',new T.InstancedBufferAttribute(new Float32Array(kinds),1));
  const uniforms={weatherTime:{value:0},rainAmount:{value:0},origin:{value:new T.Vector2()},cloudWidth:{value:cloud.width},cloudHeight:{value:cloud.height},ink:{value:new T.Color('#6f807c')}};
  const material=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,uniforms,
   vertexShader:`attribute vec4 dropSeed;attribute float splash;uniform float weatherTime,rainAmount,cloudWidth,cloudHeight;uniform vec2 origin;varying vec2 shapeUV;varying float alpha,isSplash,age;
    void main(){
     float elapsed=weatherTime-dropSeed.w*1.3,cycles=max(0.,elapsed)*(7.+dropSeed.x*4.)/(9.+dropSeed.y*5.),life=fract(cycles);
     float height=110.+dropSeed.y*55.,above=(1.-life)*height;
     vec2 contact=vec2(origin.x+(dropSeed.x-.5)*cloudWidth*.72,origin.y+cloudHeight*.25+height);
     vec2 p;shapeUV=uv;isSplash=splash;age=life*1.3;
     if(splash>.5){float radius=3.5+age*36.;p=contact+vec2(position.x*radius*2.,position.y*radius*.6);alpha=step(1.,cycles)*step(age,.32)*(1.-smoothstep(.02,.32,age))*.35;}
     else{float length=8.+dropSeed.z*8.,width=1.6+dropSeed.z*.8;p=contact+vec2(-.035*above+position.x*width-position.y*length*.035,-above+position.y*length);alpha=smoothstep(0.,.035,life)*(1.-smoothstep(.975,1.,life))*.68;}
     alpha*=rainAmount*step(0.,elapsed);gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,-p.y,0.,1.);
    }`,
   fragmentShader:`uniform vec3 ink;varying vec2 shapeUV;varying float alpha,isSplash,age;
    void main(){float coverage;if(isSplash>.5){float r=length(shapeUV*2.-1.),edge=fwidth(r)*1.2;coverage=1.-smoothstep(.07,.07+edge,abs(r-.73));}else{float edge=1.-smoothstep(.12,1.,abs(shapeUV.x*2.-1.));float taper=smoothstep(0.,.2,shapeUV.y)*(1.-smoothstep(.6,1.,shapeUV.y));coverage=edge*taper;}gl_FragColor=vec4(ink,coverage*alpha);
    #include <colorspace_fragment>
   }`});
  const mesh=new T.Mesh(geometry,material);mesh.name='map-cloud-rain-'+index;mesh.frustumCulled=false;mesh.renderOrder=590;mesh.visible=false;scene.add(mesh);return{cloud,mesh,uniforms};
 });}
 update(time,gentle){for(const {cloud,mesh,uniforms:u}of this.entries){mesh.visible=cloud.rainAmount>.001;if(!mesh.visible)continue;u.weatherTime.value=gentle?2:time-cloud.play.rainAt;u.rainAmount.value=cloud.rainAmount;u.origin.value.set(cloud.pose.x,cloud.pose.y);}}
 dispose(){for(const {mesh}of this.entries){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}}
}
