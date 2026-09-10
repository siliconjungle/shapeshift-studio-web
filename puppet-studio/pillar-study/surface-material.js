import * as T from '../scene3d/vendor.js';
export async function loadSurfaceMaps(name){
 const loader=new T.TextureLoader(),maps={};
 await Promise.all(['height','roughness','normal','ao'].map(async kind=>{const t=await loader.loadAsync(`./assets/${name}-${kind}.png`);t.colorSpace=T.NoColorSpace;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.minFilter=T.LinearMipmapLinearFilter;maps[kind]=t;}));return maps;
}
export function surfaceMaterial(maps){return new T.ShaderMaterial({
 side:T.FrontSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,
 uniforms:{heightMap:{value:maps.height},roughnessMap:{value:maps.roughness},normalMap:{value:maps.normal},aoMap:{value:maps.ao},viewMode:{value:0},relief:{value:1},lightDirection:{value:new T.Vector3(-.5,.8,.8).normalize()},depthRange:{value:new T.Vector2(8,16)}},
 vertexShader:`attribute vec3 sourcePaint;varying vec3 vPaint,vNormal,vPosition;varying vec2 vUv;varying float vDepth;
 void main(){vPaint=sourcePaint;vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vec4 world=modelMatrix*vec4(position,1.0);vPosition=world.xyz;vec4 view=viewMatrix*world;vDepth=-view.z;gl_Position=projectionMatrix*view;}`,
 fragmentShader:`uniform sampler2D heightMap,roughnessMap,normalMap,aoMap;uniform int viewMode;uniform float relief;uniform vec3 lightDirection;uniform vec2 depthRange;
 varying vec3 vPaint,vNormal,vPosition;varying vec2 vUv;varying float vDepth;
 void main(){
  vec3 n=normalize(vNormal);vec3 dx=dFdx(vPosition),dy=dFdy(vPosition);vec2 ux=dFdx(vUv),uy=dFdy(vUv);float det=ux.x*uy.y-ux.y*uy.x;
  vec3 detail=texture2D(normalMap,vUv).xyz*2.0-1.0;detail.xy*=relief;
  if(abs(det)>0.0000000001){vec3 tangent=normalize((dx*uy.y-dy*ux.y)/det);tangent=normalize(tangent-n*dot(n,tangent));vec3 bitangent=normalize(cross(n,tangent));vec3 originalBitangent=(dy*ux.x-dx*uy.x)/det;bitangent*=sign(dot(bitangent,originalBitangent));n=normalize(tangent*detail.x+bitangent*detail.y+n*detail.z);}
  float height=texture2D(heightMap,vUv).r,rough=texture2D(roughnessMap,vUv).r,ao=mix(1.0,texture2D(aoMap,vUv).r,relief);
  vec3 light=normalize(lightDirection);float diffuse=max(0.0,dot(n,light));float shade=.62+.38*floor(diffuse*3.0+.5)/3.0;
  vec3 halfVector=normalize(light+normalize(cameraPosition-vPosition));float spec=pow(max(0.0,dot(n,halfVector)),mix(90.0,5.0,rough));spec=floor(spec*4.0)/4.0*(1.0-rough)*.3;
  vec3 colour=vPaint*shade*ao+vec3(spec);
  if(viewMode==1){gl_FragColor=vec4(vec3(height),1.0);return;}
  if(viewMode==2){gl_FragColor=vec4(vec3(rough),1.0);return;}
  if(viewMode==3){gl_FragColor=vec4(n*.5+.5,1.0);return;}
  if(viewMode==4){gl_FragColor=vec4(vec3(texture2D(aoMap,vUv).r),1.0);return;}
  if(viewMode==5){float depth=1.0-clamp((vDepth-depthRange.x)/(depthRange.y-depthRange.x),0.0,1.0);gl_FragColor=vec4(vec3(depth),1.0);return;}
  gl_FragColor=vec4(colour,1.0);
  #include <colorspace_fragment>
 }`
});}
