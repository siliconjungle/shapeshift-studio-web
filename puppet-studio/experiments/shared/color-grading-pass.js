import * as T from 'three';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {gradingGLSL,gradingUniforms,updateGradingUniforms} from './color-grading.js';
// Smooth the final ink edges in the existing grade pass, without supersampling the village.
export class ColorGradingPass{
 constructor(renderer){this.renderer=renderer;this.size=new T.Vector2();this.target=new T.WebGLRenderTarget(1,1,{samples:4,type:T.HalfFloatType});this.target.texture.name='final-scene-before-grade';this.scene=new T.Scene();this.camera=new T.Camera();this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tDiffuse:{value:this.target.texture},resolution:{value:new T.Vector2()},...gradingUniforms()},vertexShader:FXAAShader.vertexShader,fragmentShader:`${FXAAShader.fragmentShader.replace('void main()', 'void smoothScene()')}
${gradingGLSL}
void main(){smoothScene();gl_FragColor.rgb=gradeLinear(gl_FragColor.rgb);
#include <colorspace_fragment>
}`});this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.material));}
 begin(grading,biome){updateGradingUniforms(this.material.uniforms,grading,biome);this.active=true;const r=this.renderer;this.previous=r.getRenderTarget();this.autoClear=r.autoClear;r.getDrawingBufferSize(this.size);if(this.target.width!==this.size.x||this.target.height!==this.size.y)this.target.setSize(this.size.x,this.size.y);this.material.uniforms.resolution.value.set(1/this.size.x,1/this.size.y);r.setRenderTarget(this.target);r.autoClear=true;}
 end(){if(!this.active)return;const r=this.renderer;r.setRenderTarget(this.previous);r.autoClear=true;r.render(this.scene,this.camera);r.autoClear=this.autoClear;this.active=false;}
 dispose(){this.target.dispose();this.material.dispose();this.scene.children[0].geometry.dispose();}
}
