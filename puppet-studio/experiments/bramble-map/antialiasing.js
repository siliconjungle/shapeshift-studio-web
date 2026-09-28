// Keep the game's grade pass and native render resolution at every quality.
export function antialiasingMode(value){return value==='off'||value==='high'?value:'light';}
export function configureAntialiasing(pass,mode){
 pass.mapOriginalShader??=pass.material.fragmentShader;
 let shader=pass.mapOriginalShader;
 if(mode==='off')shader=shader.replace('void main(){smoothScene();','void main(){gl_FragColor=texture2D(tDiffuse,vUv);');
 if(mode==='light')shader=shader
  .replace('#define EDGE_STEP_COUNT 6','#define EDGE_STEP_COUNT 3')
  .replace('#define EDGE_STEPS 1.0, 1.5, 2.0, 2.0, 2.0, 4.0','#define EDGE_STEPS 1.0, 2.0, 4.0')
  .replace('_ContrastThreshold = 0.0312','_ContrastThreshold = 0.05')
  .replace('_RelativeThreshold = 0.063','_RelativeThreshold = 0.125')
  .replace('_SubpixelBlending = 1.0','_SubpixelBlending = 0.65');
 const samples=mode==='high'?4:0;
 if(pass.target.samples!==samples){pass.target.dispose();pass.target.samples=samples;}
 if(pass.material.fragmentShader!==shader){pass.material.fragmentShader=shader;pass.material.needsUpdate=true;}
}
