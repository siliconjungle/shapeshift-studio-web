import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {gridMesh} from '@shapeshift-labs/studio-core/mesh';
import {VIEWS,CLIPS,sampleFlower,spriteLayout,artPart,bezier} from '../puppet-studio/experiments/sunflower-puppet/motion.js';
const root=path.resolve(import.meta.dirname,'..'),artRoot=path.join(root,'assets/sunflower-puppet'),relative='puppet-studio/experiments/sunflower-puppet';
const art=JSON.parse(await fs.readFile(path.join(artRoot,'parts.json'),'utf8'));
const identity=()=>({x:0,y:0,rotation:0,scaleX:1,scaleY:1});
const uri=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
function curvePositions(curve,vertices){return Array.from({length:vertices.length/2},(_,index)=>index*2).flatMap(i=>{const u=vertices[i],v=vertices[i+1],p=bezier(curve.points,v),a=bezier(curve.points,Math.max(0,v-.001)),b=bezier(curve.points,Math.min(1,v+.001)),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,off=(u-.5)*(curve.width+((curve.endWidth??curve.width)-curve.width)*v+4);return[(p[0]-dy/len*off)/100,(p[1]+dx/len*off)/100].map(n=>+n.toFixed(5));});}
for(const view of VIEWS){
 const rest=sampleFlower({view}),assets=[],joints=[{id:'root',name:'Ground',parent:null,rest:identity(),layer:-100}],clips=[];
 for(const [part,s]of Object.entries(rest.sprites)){
  const r=art.parts[view+'-'+artPart(part)],layout=spriteLayout(view,part,r);assets.push({id:part,src:uri(await fs.readFile(path.join(artRoot,r.src),'utf8'))});
  joints.push({id:part,name:part.replaceAll('-',' '),parent:'root',rest:{...identity(),...s},layer:layout.layer,sprite:{asset:part,...layout}});
 }
 for(const [part,c]of Object.entries(rest.curves)){
  const total=c.width+4,inset=2/total*100,mesh=gridMesh(2,16);mesh.positions=curvePositions(c,mesh.vertices);
  assets.push({id:part,src:uri(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="256" viewBox="0 0 100 256"><path d="M0 0H100V256H0Z" fill="#191c13"/><path d="M${inset} 0H${100-inset}V256H${inset}Z" fill="#788b40"/></svg>`)});
  joints.push({id:part,name:part.replaceAll('-',' ')+' · bendable mesh',parent:'root',rest:identity(),layer:c.layer,sprite:{asset:part,width:100,height:100,pivotX:0,pivotY:0,mesh}});
 }
 for(const [id,definition]of Object.entries(CLIPS)){
  const clip={id,name:{idle:'Breathe',walk:'Overworld walk',wave:'Hello!',delight:'Delighted'}[id],duration:definition.duration,loop:definition.loop,fps:24,tracks:{},meshTracks:[]};
  const n=Math.ceil(definition.duration*24),samples=Array.from({length:n+1},(_,i)=>({time:i/n*definition.duration,pose:sampleFlower({view,clip:id,time:i/n*definition.duration})}));
  for(const j of joints){if(j.id==='root')continue;if(j.sprite.mesh){clip.meshTracks.push({joint:j.id,keys:samples.map(({time,pose})=>({time,easing:'linear',value:curvePositions(pose.curves[j.id],j.sprite.mesh.vertices)}))});}else clip.tracks[j.id]=samples.map(({time,pose})=>{const s=pose.sprites[j.id];return {time,easing:'linear',value:{...identity(),x:s.x-j.rest.x,y:s.y-j.rest.y,rotation:s.rotation-j.rest.rotation,scaleX:(s.scaleX??1)/(j.rest.scaleX??1),scaleY:(s.scaleY??1)/(j.rest.scaleY??1)}};});}
  clips.push(clip);
 }
 const project={format:'inkwell-puppet',version:1,name:'Sunflower · '+view,source:{character:'sunflower',view,gait:'Little Gods performance-motion.gaitSample'},assets,joints,clips};
 await fs.writeFile(path.join(artRoot,'sunflower-'+view+'.puppet.json'),JSON.stringify(project)+'\n');
}
await fs.writeFile(path.join(artRoot,'rig.json'),JSON.stringify({format:'inkwell-directional-puppet',version:1,name:'Sunflower',views:Object.fromEntries(VIEWS.map(v=>[v,{project:`sunflower-${v}.puppet.json`,parts:Object.values(art.parts).filter(x=>x.view===v).map(x=>x.id)}])),facings:{front:'front',back:'back',right:'side',left:{view:'side',mirrorX:true}},clips:CLIPS,source:'Same gait sampler and layered SVG part strategy as bramble-map/traveller-puppet.js; curved plant limbs; head drawing is rigid.'},null,2));
await import('./prepare-map-sunflower.mjs');
const out=path.join(root,'dist',relative);await fs.mkdir(out,{recursive:true});
for(const file of ['index.html','style.css','README.md'])await fs.copyFile(path.join(root,relative,file),path.join(out,file));
await fs.cp(artRoot,path.join(root,'dist/assets/sunflower-puppet'),{recursive:true});
await build({absWorkingDir:root,entryPoints:[relative+'/app.js'],outfile:path.join(out,'app.js'),bundle:true,format:'esm',target:'es2022',minify:false});
console.log('Sunflower: http://127.0.0.1:4354/'+relative+'/index.html');
