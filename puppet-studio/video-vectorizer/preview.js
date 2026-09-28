import * as T from 'three';
import {parseVectorArt,vectorGeometry,vectorMaterial} from '../experiments/shared/vector-art.js';
import {ColorGradingPass} from '../experiments/shared/color-grading-pass.js';
export {GRADING_PRESETS} from '../experiments/shared/color-grading.js';

// Use the game's actual SVG triangulation, paint ordering, MSAA, FXAA and grade.
export class VectorPreview {
 constructor(host){
  this.host=host;this.frames=[];this.current=-1;this.grading={preset:'neutral'};
  this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor('#f8f0db');host.append(this.renderer.domElement);
  this.renderer.domElement.setAttribute('aria-label','SVG animation with Little Gods anti-aliasing and colour grading');
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-.5,.5,.5,-.5,.1,100);this.camera.position.z=10;
  this.material=vectorMaterial();this.material.userData.fogIgnore.value=1;this.material.userData.worldLighting.value=0;
  this.mesh=new T.Mesh(new T.BufferGeometry(),this.material);this.mesh.scale.set(1,-1,1);this.mesh.position.set(-.5,.5,0);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
  this.grade=new ColorGradingPass(this.renderer);this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
 }
 reset(width,height){this.clear();this.aspect=height/width;this.host.style.aspectRatio=width+'/'+height;this.resize();}
 resize(){if(this.host.clientWidth)this.renderer.setSize(this.host.clientWidth,this.host.clientWidth*(this.aspect??1));}
 add(svg){const geometry=vectorGeometry(parseVectorArt(svg),{sharedPaint:true});this.frames.push(geometry);if(this.frames.length===1)this.show(0);}
 show(i){if(this.frames[i]&&i!==this.current){this.mesh.geometry=this.frames[i];this.current=i;}}
 render(){this.grade.begin(this.grading,'hearth');this.renderer.render(this.scene,this.camera);this.grade.end();}
 clear(){const active=this.mesh.geometry;for(const g of this.frames)g.dispose();if(!this.frames.includes(active))active.dispose();this.frames=[];this.current=-1;this.mesh.geometry=new T.BufferGeometry();}
 dispose(){this.observer.disconnect();this.clear();this.mesh.geometry.dispose();this.material.dispose();this.grade.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
