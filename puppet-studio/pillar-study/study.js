import * as T from '../scene3d/vendor.js';
import {parseSVG,svgGeometry} from '../scene3d/geometry.js';
import {chamferArtwork,bodyFace} from './chamfer.js';
import {loadSurfaceMaps,surfaceMaterial} from './surface-material.js';

const themes={hearth:{stone:'#344c40',top:'#53604a'},cryos:{stone:'#354e6a',top:'#607b94'},solis:{stone:'#ad623e',top:'#d49a57'}};
const views=[];let rotating=false,showArt=true,wire=false,relief=true,movingLight=false,lightAngle=0,viewMode=0,underside=false;
const W=1.3,H=4.6,B=.055;
function inkHull(source){const positions=source.attributes.position,unique=new Map(),points=[],indices=[];for(let i=0;i<positions.count;i++){const p=[positions.getX(i),positions.getY(i),positions.getZ(i)],key=p.map(v=>Math.round(v*1e6)).join();if(!unique.has(key)){unique.set(key,points.length/3);points.push(...p);}indices.push(unique.get(key));}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();const mat=new T.ShaderMaterial({side:T.BackSide,uniforms:{resolution:{value:new T.Vector2(500,700)},thickness:{value:3.0}},vertexShader:'uniform vec2 resolution;uniform float thickness;void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);vec3 n=normalize(normalMatrix*normal);vec2 dir=(projectionMatrix*vec4(n,0.0)).xy;float l=length(dir);if(l>0.001)p.xy+=dir/l*thickness*2.0/resolution*p.w;gl_Position=p;}',fragmentShader:'void main(){gl_FragColor=vec4(0.025,0.035,0.030,1.0);}',depthWrite:false});return new T.Mesh(g,mat);}
async function create(card){const id=card.dataset.id,c=card.querySelector('canvas'),theme=themes[id];const renderer=new T.WebGLRenderer({canvas:c,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;const scene=new T.Scene();scene.background=new T.Color('#eae7dd');const camera=new T.OrthographicCamera(-2.4,2.4,3.3,-3.3,.1,60);camera.position.set(6.5,4.8,10);const controls=new T.OrbitControls(camera,c);controls.target.set(0,2.25,0);controls.enablePan=false;controls.enableDamping=true;controls.minZoom=.7;controls.maxZoom=2.5;controls.maxPolarAngle=Math.PI*.95;controls.update();controls.saveState();scene.add(new T.HemisphereLight('#fff8e8','#6c7468',2.2));const light=new T.DirectionalLight('#fff6df',2.4);light.position.set(-3,9,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-5;light.shadow.camera.right=5;light.shadow.camera.top=7;light.shadow.camera.bottom=-5;light.shadow.normalBias=.02;scene.add(light);
const pillar=new T.Group();pillar.position.y=H/2;scene.add(pillar);
const definitions=[
 ...Array.from({length:4},(_,i)=>({name:id,width:W,height:H,depth:W,rotation:[0,i*Math.PI/2,0]})),
 {name:id+'-top',width:W,height:W,depth:H,rotation:[-Math.PI/2,0,0]},
 {name:id+'-bottom',width:W,height:W,depth:H,rotation:[Math.PI/2,0,0]}
];
const pieces=definitions.map(d=>bodyFace(d.width,d.height,d.depth,B).applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...d.rotation))));
const geo=T.mergeGeometries(pieces);pieces.forEach(g=>g.dispose());
const body=new T.Mesh(geo,new T.MeshStandardMaterial({color:theme.stone,roughness:.92,flatShading:true}));body.castShadow=true;body.receiveShadow=true;pillar.add(body);
const outline=inkHull(geo);outline.renderOrder=-1;pillar.add(outline);
const prepared=new Map();
await Promise.all(definitions.filter((d,i)=>i===0||i>=4).map(async d=>{
 const [parsed,maps]=await Promise.all([parseSVG(`./assets/${d.name}.svg`),loadSurfaceMaps(d.name)]);
 const flat=svgGeometry(parsed,d.width,d.height,12,0),geometry=chamferArtwork(flat,d.width,d.height,d.depth,B);flat.dispose();prepared.set(d.name,{geometry,maps});
}));
const faces=[];
for(const d of definitions){const {geometry,maps}=prepared.get(d.name),frame=new T.Group();frame.rotation.set(...d.rotation);const mesh=new T.Mesh(geometry,surfaceMaterial(maps));mesh.renderOrder=2;mesh.name=d.name;frame.add(mesh);pillar.add(frame);faces.push(mesh);}
const ground=new T.Mesh(new T.PlaneGeometry(100,100),new T.ShadowMaterial({opacity:.18}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const wireMesh=new T.Mesh(geo,new T.MeshBasicMaterial({color:'#172820',wireframe:true,transparent:true,opacity:.35}));wireMesh.scale.setScalar(1.001);wireMesh.visible=false;pillar.add(wireMesh);
const v={renderer,scene,camera,controls,pillar,faces,wireMesh,outline,ground,light,triangles:faces.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0)};views.push(v);
const resize=()=>{const {width,height}=c.getBoundingClientRect();renderer.setSize(width,height,false);const a=width/height;camera.left=-3.05*a;camera.right=3.05*a;camera.top=3.05;camera.bottom=-3.05;camera.updateProjectionMatrix();outline.material.uniforms.resolution.value.set(width,height);};new ResizeObserver(resize).observe(c);resize();return v;
}
document.getElementById('relief').onclick=()=>{relief=!relief;press('relief',relief);for(const v of views)for(const f of v.faces)f.material.uniforms.relief.value=Number(relief);};
document.getElementById('light').onclick=()=>{movingLight=!movingLight;press('light',movingLight);};
document.getElementById('surface').onchange=e=>{viewMode=Number(e.target.value);for(const v of views){v.outline.visible=viewMode===0;v.ground.visible=viewMode===0&&!underside;for(const f of v.faces)f.material.uniforms.viewMode.value=viewMode;}};
const press=(id,value)=>document.getElementById(id).setAttribute('aria-pressed',String(value));
document.getElementById('rotate').onclick=()=>{rotating=!rotating;press('rotate',rotating);};
document.getElementById('art').onclick=()=>{showArt=!showArt;press('art',showArt);for(const v of views)for(const f of v.faces)f.visible=showArt;};
document.getElementById('wire').onclick=()=>{wire=!wire;press('wire',wire);for(const v of views){v.wireMesh.visible=wire;for(const f of v.faces)f.material.wireframe=wire;}};
function inspectCap(bottom){rotating=false;press('rotate',false);for(const v of views){v.pillar.rotation.y=0;underside=bottom;v.ground.visible=!bottom&&viewMode===0;v.camera.position.set(6.5,bottom?-6:11,9);v.controls.target.set(0,2.25,0);v.camera.zoom=1;v.camera.updateProjectionMatrix();v.controls.update();}}
document.getElementById('top').onclick=()=>inspectCap(false);
document.getElementById('bottom').onclick=()=>inspectCap(true);
document.getElementById('reset').onclick=()=>{rotating=false;press('rotate',false);for(const v of views){v.pillar.rotation.y=0;underside=false;v.ground.visible=viewMode===0;v.controls.reset();}};
try{await Promise.all([...document.querySelectorAll('.card')].map(create));document.getElementById('status').textContent='3 models ready · SVGs wrap all faces and bevels · surface maps ready';}catch(e){document.getElementById('status').textContent='Unable to load pillar artwork: '+e.message;document.getElementById('status').className='error';console.error(e);}
let prev=performance.now();rendererLoop();function rendererLoop(){requestAnimationFrame(rendererLoop);const now=performance.now(),dt=Math.min(.05,(now-prev)/1000);prev=now;if(movingLight)lightAngle+=dt*.6;for(const v of views){if(rotating)v.pillar.rotation.y+=dt*.35;v.controls.update();
const direction=new T.Vector3(-.5,.8,.8).applyAxisAngle(new T.Vector3(0,1,0),lightAngle).normalize();v.light.position.copy(direction).multiplyScalar(10);const distance=v.camera.position.distanceTo(v.controls.target);
for(const f of v.faces){f.material.uniforms.lightDirection.value.copy(direction);f.material.uniforms.depthRange.value.set(distance-3.5,distance+3.5);}
v.renderer.render(v.scene,v.camera);}}
