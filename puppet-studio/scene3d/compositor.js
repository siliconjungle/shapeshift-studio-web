import {gradingGLSL,gradingUniforms,updateGradingUniforms} from '../../rendering/color-grading.js';
import * as T from './vendor.js';
// The depth attachment contains the actual shared 3D scene, with the same
// deformed vertices used by the colour pass. Perspective depth is linearised.
export class SceneCompositor{
 constructor(renderer){this.renderer=renderer;this.target=new T.WebGLRenderTarget(1,1,{samples:4});this.target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);this.target.texture.name='illustrated-colour';this.target.depthTexture.name='illustrated-depth';this.scene=new T.Scene();this.camera=new T.Camera();this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{...gradingUniforms(),map:{value:this.target.texture},depth:{value:this.target.depthTexture},cameraNear:{value:.05},cameraFar:{value:160},perspective:{value:0},mode:{value:0},depthWindow:{value:new T.Vector2(1,12)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`${gradingGLSL}
#include <packing>\nuniform sampler2D map,depth;uniform float cameraNear,cameraFar,perspective,mode;uniform vec2 depthWindow;varying vec2 vUv;void main(){vec4 c=texture2D(map,vUv);if(mode>1.5&&mode<2.5){float d=texture2D(depth,vUv).r;float z=perspective>.5?-perspectiveDepthToViewZ(d,cameraNear,cameraFar):-orthographicDepthToViewZ(d,cameraNear,cameraFar);float shade=d>=1.?0.:1.-smoothstep(depthWindow.x,depthWindow.y,z);gl_FragColor=vec4(vec3(shade),1.);return;}gl_FragColor=c;if(mode>.5)return;gl_FragColor.rgb=gradeLinear(c.rgb);\n#include <colorspace_fragment>\n}`});this.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.material));}
 setGrading(g){updateGradingUniforms(this.material.uniforms,g);}
 resize(w,h){this.target.setSize(w,h);}
 render(scene,camera,mode=0){const r=this.renderer;r.info.autoReset=false;r.info.reset();const u=this.material.uniforms;u.cameraNear.value=camera.near;u.cameraFar.value=camera.far;u.perspective.value=camera.isPerspectiveCamera?1:0;u.mode.value=mode;const distance=camera.position.length();u.depthWindow.value.set(Math.max(camera.near,distance-5),distance+9);r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(null);r.render(this.scene,this.camera);}
 dispose(){this.target.dispose();this.material.dispose();this.scene.children[0].geometry.dispose();}
}
