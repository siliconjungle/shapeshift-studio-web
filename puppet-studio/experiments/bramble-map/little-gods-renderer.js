import {characterDrawBases} from './character-depth.js';
import {WildlifeVisits} from './wildlife-visits.js';
import {MapWildlife} from './map-wildlife.js';
import {spriteMorphGLSL} from '../../fx/morph-profile.js';
import {MapProfiler} from './map-profiler.js';
import {MapShadows} from './map-shadows.js';
import {mapInk} from './ink-style.js';
import {assetSwayStrength} from './motion.js';
import {antialiasingMode,configureAntialiasing} from './antialiasing.js';
// Use the game's actual SVG mesh renderer, palette loader and final FXAA/grade
// pass. These are imports from Little Gods, not lookalike local implementations.
import * as T from 'three';
import {loadVectorArt,vectorGeometry,vectorMaterial} from '../shared/vector-art.js';
import {ColorGradingPass} from '../shared/color-grading-pass.js';
import {configureArtPalette,fetchArt,recolorSVG} from '../shared/art-palette.js';
import {identifyInkColours,tagInkColours} from '../../art/ink-colours.js';
export {fetchArt};
export async function configureMapPalette(assetRoot){
 const r=await fetch(new URL('palette.json',assetRoot));if(!r.ok)throw Error('Missing Little Gods palette mappings');
 const profile=await r.json();configureArtPalette(profile.settings,profile.mappings,assetRoot);return profile;
}
export class LittleGodsMapRenderer{
 constructor(svg,profile){
  const query=new URLSearchParams(location.search),aa=antialiasingMode(query.get('aa')),smoothEdges=aa==='high';
  this.profiler=query.has('profile')?new MapProfiler():null;
  this.svg=svg;this.profile=profile;this.records=[];this.routes=[];this.assets=new Map();this.revision=0;
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:smoothEdges});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0,0);
  this.canvas=this.renderer.domElement;this.canvas.className='map-renderer';this.canvas.setAttribute('aria-hidden','true');svg.before(this.canvas);
  // A foreground pass sits above live SVG labels as well as all map artwork.
  this.foreground=new T.WebGLRenderer({alpha:true,antialias:smoothEdges});this.foreground.setPixelRatio(Math.min(devicePixelRatio,2));this.foreground.outputColorSpace=T.SRGBColorSpace;this.foreground.setClearColor(0,0);
  this.foreground.domElement.className='map-renderer map-foreground';this.foreground.domElement.setAttribute('aria-hidden','true');svg.after(this.foreground.domElement);
  this.foregroundScene=new T.Scene();this.foregroundGrade=new ColorGradingPass(this.foreground);
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(0,1440,0,-960,.1,100);this.camera.position.z=10;
  this.grade=new ColorGradingPass(this.renderer);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(svg);this.resize();
  for(const pass of [this.grade,this.foregroundGrade])configureAntialiasing(pass,aa);
  svg.dataset.antialiasing=aa;
  this.shadows=new MapShadows(T,this.scene,svg);
  this.artwork=[];globalThis.__littleGodsAuthoring={artwork:this.artwork};
 }
 resize(){const b=this.svg.getBoundingClientRect(),p=this.svg.parentElement.getBoundingClientRect();if(!b.width||!b.height)return;this.canvas.style.left=b.left-p.left+'px';this.canvas.style.top=b.top-p.top+'px';this.renderer.setSize(b.width,b.height);this.foreground.setSize(b.width,b.height);this.foreground.domElement.style.left=this.canvas.style.left;this.foreground.domElement.style.top=this.canvas.style.top;this.setView(this.svg.viewBox.baseVal);}
 setView({x,y,width,height}){this.camera.left=x;this.camera.right=x+width;this.camera.top=-y;this.camera.bottom=-y-height;this.camera.updateProjectionMatrix();}
 async asset(name,source,url){
  const cached=this.assets.get(name);if(cached)return cached.svg;
  const report=identifyInkColours(source),tagged=tagInkColours(source,source.includes('data-ink-edge=')?[mapInk.color]:[]);
  const id='journey/'+name;this.artwork.push({id,svg:recolorSVG(tagged.svg,url),enabled:true});
  const data=await loadVectorArt(id),geometry=vectorGeometry(data),color=geometry.getAttribute('color'),mask=new Float32Array(color.count);
  const paints=tagged.paints.map(p=>({tag:new T.Color(p.tag),original:new T.Color(mapInk.color)}));
  for(let i=0;i<color.count;i++){const paint=paints.find(p=>Math.abs(color.getX(i)-p.tag.r)<1e-7&&Math.abs(color.getY(i)-p.tag.g)<1e-7&&Math.abs(color.getZ(i)-p.tag.b)<1e-7);if(paint){mask[i]=1;color.setXYZ(i,paint.original.r,paint.original.g,paint.original.b);}}
  geometry.setAttribute('mapInkMask',new T.BufferAttribute(mask,1));const svg=recolorSVG(source,url);this.assets.set(name,{data,geometry,ink:report,svg});
  return svg;
 }
 material(name,index){
  const material=vectorMaterial({transparent:true});material.depthTest=false;material.depthWrite=false;
  const inflate=['selection-arrow','destination-pennant'].includes(name)?{value:0}:null;
  const known={value:1},uniform={value:0},strength={value:assetSwayStrength(name)};
  const prior=material.onBeforeCompile;material.onBeforeCompile=shader=>{prior(shader);if(inflate){shader.uniforms.mapInflate=inflate;shader.vertexShader='uniform float mapInflate;\n'+spriteMorphGLSL+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.xy=spriteMorph(transformed.xy,mapInflate,0.,0.);');}shader.uniforms.mapKnown=known;shader.uniforms.mapSway=uniform;shader.uniforms.mapSwayStrength=strength;shader.fragmentShader='varying float vMapInkMask; uniform float mapKnown;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>','gl_FragColor.rgb=mix(vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722))),gl_FragColor.rgb,mix(mapKnown,1.,vMapInkMask));\n#include <colorspace_fragment>');shader.vertexShader='attribute float mapInkMask; varying float vMapInkMask; uniform float mapSway,mapSwayStrength;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','vMapInkMask=mapInkMask; transformed.x += sin(mapSway+position.y*.8)*pow(1.-position.y,2.)*mapSwayStrength;\n#include <project_vertex>');};
  material.customProgramCacheKey=()=> 'little-gods-vector-map-baked-ink-v4-'+Boolean(inflate);return{material,known,inflate,uniform,strength,phase:index*1.73};
 }
 mount(){
  for(const [i,node]of [...this.svg.querySelectorAll('use')].entries()){
   if(node.closest('defs'))continue;const name=node.getAttribute('href').slice(1),asset=this.assets.get(name);if(!asset)throw Error('Unknown vector '+name);
   const paint=this.material(name,i),mesh=new T.Mesh(asset.geometry,paint.material);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;mesh.renderOrder=node.closest('[data-feedback="emote"]')?2000:node.closest('[data-feedback]')?1500:name==='background'?-100:name.startsWith('cloud-')?600+i:name==='banner'?1000+i:i+10;const layer=node.closest('#traveller,[data-feedback]')?this.foregroundScene:this.scene;layer.add(mesh);this.records.push({node,mesh,name,...paint,aspect:asset.data.image.width/asset.data.image.height});
  }
  for(const record of this.records)this.shadows.add(record);
  this.visits=new WildlifeVisits();this.wildlife=new MapWildlife(this.scene,this.assets);this.shadows.addPuppet(this.wildlife.puppet.root);
  this.svg.classList.add('mesh-rendered');this.svg.dataset.renderer='Little Gods vector-art + ColorGradingPass';
 }
 async syncRoutes(){
  const revision=++this.revision;for(const r of this.routes){this.scene.remove(r.mesh);r.mesh.geometry.dispose();r.material.dispose();}this.routes=[];
  const records=await Promise.all([...this.svg.querySelectorAll('#routes path')].map(async(node,i)=>{
   const id=`journey/route-${revision}-${i}`;this.artwork.push({id,enabled:true,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960" viewBox="0 0 1440 960"><path d="${node.getAttribute('d')}" fill="#ffffff"/></svg>`});
   const data=await loadVectorArt(id),geometry=vectorGeometry(data),material=vectorMaterial({transparent:true});material.depthTest=false;material.depthWrite=false;
   const mesh=new T.Mesh(geometry,material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;mesh.renderOrder=2;return{node,mesh,material,aspect:1.5,route:true};
  }));
  if(revision!==this.revision){for(const r of records){r.mesh.geometry.dispose();r.material.dispose();}return;}
  this.routes=records;for(const r of records)this.scene.add(r.mesh);
 }
 render(time,gentle=false){
  this.sceneryEffects?.tick(time,gentle);const visit=this.visits?.tick(time,gentle);this.wildlife?.tick(time,gentle,visit);
  this.profiler?.configure(this,T);
  const root=this.svg.getCTM();if(!root)return;const inverse=root.inverse();
  const traveller=this.svg.querySelector('#traveller'),travellerParts=this.records.filter(r=>r.node.closest('#traveller'));
  const characters=[...(this.characters??[])];
  if(traveller&&travellerParts.length)characters.push({id:'traveller',ground:()=>inverse.multiply(traveller.getCTM()).f,setOrder:base=>{traveller.dataset.drawBase=base;travellerParts.forEach((r,i)=>r.mesh.renderOrder=base+i);}});
  const bases=characterDrawBases(characters.map(c=>({id:c.id,ground:c.ground()})));
  for(const c of characters)c.setOrder(bases.get(c.id));
  for(const r of [...this.records,...this.routes]){
   if(r.sceneryControlled){r.mesh.visible=false;continue;}
   let opacity=1;for(let n=r.node;n&&n!==this.svg;n=n.parentElement)opacity*=Number(n.getAttribute('opacity')??1);
   r.mesh.visible=opacity>.001;if(!r.mesh.visible)continue;r.material.opacity=Math.min(1,Math.max(0,opacity));
   if(r.inflate)r.inflate.value=Number(r.node.closest('[data-inflate]')?.dataset.inflate??0);
   if(r.known){const location=r.node.closest('[data-color-reveal]');r.known.value=r.name!=='banner'&&location?.dataset.colorReveal!==undefined?.22+.78*Number(location.dataset.colorReveal):1;}
   if(r.uniform)r.uniform.value=gentle?0:time*1.6+r.phase;if(r.strength)r.strength.value=gentle?0:assetSwayStrength(r.name);
   let x=0,y=0,w=1440,h=960;
   if(r.route)r.material.color.set(r.node.getAttribute('fill'));
   else{const ew=Number(r.node.getAttribute('width')),eh=Number(r.node.getAttribute('height'));w=Math.min(ew,eh*r.aspect);h=w/r.aspect;x=Number(r.node.getAttribute('x')??0)+(ew-w)/2;y=Number(r.node.getAttribute('y')??0)+(eh-h)/2;}
   const owner=r.node.closest('[data-location],[data-biome]');if(owner&&r.name!=='banner')r.mesh.renderOrder=100+inverse.multiply(owner.getCTM()).f*.5;
   const m=inverse.multiply(r.node.getCTM());r.mesh.matrix.set(m.a*w,m.c*h,0,m.a*x+m.c*y+m.e,-m.b*w,-m.d*h,0,-(m.b*x+m.d*y+m.f),0,0,1,0,0,0,0,1);r.mesh.matrixWorldNeedsUpdate=true;
  }
  const p=this.profiler;p?.mark('transforms');
  // Borders are already part of the cached SVG geometry: no live contour pass.
  const shadows=p?.mode!=='no-shadows';for(const layer of this.shadows.layers)layer.overlay.visible=shadows;
  let q=p?.query(this.renderer,'shadows');if(shadows)this.shadows.render(this.renderer,this.camera);p?.endQuery(q);p?.mark('shadows');
  q=p?.query(this.renderer,'main');
  if(p?.mode!=='no-grading')this.grade.begin(this.profile.grading,'hearth');this.renderer.render(this.scene,this.camera);if(p?.mode!=='no-grading')this.grade.end();
  p?.endQuery(q);p?.mark('mainDraw');
  q=p?.query(this.foreground,'foreground');
  if(p?.mode!=='no-grading'&&p?.mode!=='no-foreground-post')this.foregroundGrade.begin(this.profile.grading,'hearth');this.foreground.render(this.foregroundScene,this.camera);if(p?.mode!=='no-grading'&&p?.mode!=='no-foreground-post')this.foregroundGrade.end();
  p?.endQuery(q);p?.mark('foregroundDraw');
 }
}
