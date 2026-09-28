import {defineGameData} from './game-data.js';
export const HIT_FLASH=defineGameData('hit-flash.HIT_FLASH',{hold:.05,fade:.13,strength:.85});
// A short impact hold followed by a soft return to the original ink colours.
// Simulation time keeps hit feedback frozen with the rest of the game.
export function hitFlashStrength(time,hitAt=-Infinity){
 const age=time-hitAt;if(age<0||age>=HIT_FLASH.hold+HIT_FLASH.fade)return 0;
 const t=Math.max(0,(age-HIT_FLASH.hold)/HIT_FLASH.fade);return HIT_FLASH.strength*(1-t*t*(3-2*t));
}
export function bindHitFlash(material,uniform){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader){
  previous.call(this,shader);shader.uniforms.hitFlash=uniform;
  shader.fragmentShader='uniform float hitFlash;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>','gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.,.89,.62),hitFlash);\n#include <colorspace_fragment>');
 };
 material.customProgramCacheKey=()=>key+'-hit-flash-v1';
}
