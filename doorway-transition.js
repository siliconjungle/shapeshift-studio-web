export {DOORWAY_DURATION,beginHouseExit,doorwayPose} from './ecs/systems/doorway.js';
// Shared screen-door coverage avoids seeing through the overlapping hood,
// mask, sleeves and hands during a fade. The shadow uses the same coverage.
export function applyDoorwayFade(root,opacity){
 const uniform=root.userData.doorwayOpacity??(root.userData.doorwayOpacity={value:1});uniform.value=opacity;
 const bind=material=>{
  if(!material||material.userData.doorwayFade)return;
  material.userData.doorwayFade=true;const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=function(shader){previous.call(this,shader);shader.uniforms.doorwayOpacity=uniform;
   shader.fragmentShader='uniform float doorwayOpacity;\nfloat doorBayer2(vec2 p){vec2 b=mod(p,2.);return b.x*2.+b.y*3.-b.x*b.y*4.;}\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace(/void main\s*\(\s*\)\s*\{/,`void main() {
    vec2 doorPixel=mod(floor(gl_FragCoord.xy),4.);
    float doorCoverage=(doorBayer2(doorPixel)*4.+doorBayer2(floor(doorPixel/2.))+.5)/16.;
    if(doorwayOpacity<doorCoverage)discard;`);
  };material.customProgramCacheKey=()=>key()+'-doorway-fade-v1';material.needsUpdate=true;
 };
 root.traverse(mesh=>{if(mesh.isMesh){bind(mesh.material);bind(mesh.userData.shadowMaterial)}});
}
