import fs from 'node:fs/promises';
import sharp from 'sharp';
import polygon from 'polygon-clipping';
import {DOMParser} from '@xmldom/xmldom';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
import {svgText,validateVector} from '@shapeshift-labs/studio-core/vector/model';
import {contours} from '../puppet-studio/experiments/expressive-character/frog/performance.js';
import {bounds} from '../puppet-studio/experiments/expressive-character/frog/intentional/composition.js';
globalThis.DOMParser=DOMParser;
const root='puppet-studio/experiments/expressive-character/frog',out=root+'/layered/assets';
const docs=JSON.parse(await fs.readFile(root+'/intentional/assets/svg/drawings.json'));
const native=JSON.parse(await fs.readFile(root+'/intentional/assets/native/artwork.json'));
const palette=['#231f25','#37303a','#504450','#70515b','#917068','#cfb58b','#eed6a0','#fff0c8','#ffbf50','#c58e3f','#285360','#397684','#548f99','#69aaaf','#87bab6','#a85f64'];
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),snap=h=>{const a=rgb(h);return palette.toSorted((p,q)=>rgb(p).reduce((n,v,i)=>n+(a[i]-v)**2,0)-rgb(q).reduce((n,v,i)=>n+(a[i]-v)**2,0))[0];};
const defaults={hidden:false,locked:false,fill:'#231f25',stroke:'none',strokeWidth:0,opacity:1,fillRule:'nonzero',lineCap:'round',lineJoin:'round'};
const shape=(id,commands,points,extra={})=>({...defaults,id,name:id,commands,points,...extra});
const path=(id,rings,extra={})=>shape(id,rings.flatMap(r=>['M',...Array(r.length-1).fill('L'),'Z']),rings.flat(2),{fillRule:'evenodd',...extra});
const outer=s=>contours(s).sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)))[0];
const area=r=>r.reduce((n,p,i)=>{const q=r[(i+1)%r.length];return n+p[0]*q[1]-p[1]*q[0];},0);
const quantize=r=>r.map(p=>p.map(v=>Math.round(v*100)/100)).filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
const polys=s=>{let p=[];for(const raw of contours(s)){const r=quantize(raw);if(r.length>2)p=polygon.xor(p,[[r]]);}return p;};
function clipped(s,mask,id=s.id){let p;try{p=polygon.intersection(polys(s),mask.map(poly=>poly.map(quantize)));}catch(e){throw Error('Clipping '+s.id+': '+e.message);}return p.length?path(id,p.flat(),{fill:s.fill,opacity:s.opacity}):null;}
const rect=(x,y,w,h)=>[[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]];
function strokeSilhouette(s,id,width=8){
 const ring=outer(s),r=ring.filter((p,i)=>!i||Math.hypot(p[0]-ring[i-1][0],p[1]-ring[i-1][1])>.001);if(Math.hypot(r[0][0]-r.at(-1)[0],r[0][1]-r.at(-1)[1])<.001)r.pop();const sign=Math.sign(area(r));
 const offset=r.map((p,i)=>{const a=r[(i+r.length-1)%r.length],b=r[(i+1)%r.length],normal=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;return [sign*dy/len,-sign*dx/len];},n=normal(a,p),m=normal(p,b),sum=[n[0]+m[0],n[1]+m[1]],len=Math.hypot(...sum)||1,u=sum.map(v=>v/len),d=Math.min(width*1.5,width/2/Math.max(.25,u[0]*n[0]+u[1]*n[1]));return p.map((v,k)=>v+u[k]*d);});
 return path(id,[offset],{fill:'#231f25'});
}
function regionArt(doc,base,id){const mask=[[outer(base)]],outline=strokeSilhouette(base,id+'-ink');return [outline,...doc.shapes.map((s,i)=>clipped(s,mask,id+'-'+i)).filter(Boolean)];}
function fit(shapes,target){const box=[Math.min(...shapes.map(s=>bounds(s)[0])),Math.min(...shapes.map(s=>bounds(s)[1])),Math.max(...shapes.map(s=>bounds(s)[2])),Math.max(...shapes.map(s=>bounds(s)[3]))];return shapes.map(s=>({...s,points:s.points.map((v,i)=>target[i%2]+(v-box[i%2])*(target[i%2+2]-target[i%2])/(box[i%2+2]-box[i%2]))}));}
const assets={},poses={},registrations={};
async function add(id,shapes,anchor=[0,0],name=id){
 const local=shapes.map((s,i)=>({...defaults,...s,id:id+'-'+i,name:s.name??id,points:s.points.map((v,i)=>Math.round((v-anchor[i%2])*100)/100)}));
 const v=validateVector({version:1,viewBox:[-320,-320,640,640],duration:8.8,loop:false,swatches:palette.map((color,i)=>({id:"color-"+i,name:"Palette "+i,color})),shapes:local,tracks:[]});
 assets[id]={id,name,vector:v};await fs.writeFile(out+'/svg/'+id+'.svg',svgText(v));return id;
}
async function generated(id,target){let svg;try{svg=await fs.readFile(out+'/generated/'+id+'.svg','utf8');}catch{const png=await fs.readFile(out+'/generated/'+id+'.png'),result=await convert(png,{preset:'cel',colors:16,preserveDarkColors:true});svg=result.svg.replace(/fill="(#[a-f0-9]{6})"/gi,(_,h)=>`fill="${snap(h)}"`);await fs.writeFile(out+'/generated/'+id+'.svg',svg);await fs.writeFile(out+'/generated/'+id+'.stats.json',JSON.stringify(result.stats));}
 const shapes=[];for(const [i,p]of new SVGLoader().parse(svg).paths.entries()){const commands=[],points=[];for(const sub of p.subPaths){if(!sub.curves.length)continue;const q=sub.curves[0].getPoint(0);commands.push('M');points.push(q.x,q.y);for(const c of sub.curves){if(c.isLineCurve){commands.push('L');points.push(c.v2.x,c.v2.y);}else{commands.push('C');points.push(c.v1.x,c.v1.y,c.v2.x,c.v2.y,c.v3.x,c.v3.y);}}commands.push('Z');}if(commands.length)shapes.push(shape(id+'-'+i,commands,points,{fill:p.userData.style.fill}));}
 registrations[id]={target,method:'Explicit shared-canvas registration; source alpha preserved through Little Gods cel conversion'};return fit(shapes,target);
}
await fs.mkdir(out+'/svg',{recursive:true});
const head=await generated('head',[135,240,512,501]),costume=await generated('costume',[50,441,580,601]);
await add('head',head,[320,430],'Reconstructed head');await add('costume',costume,[320,600],'Reconstructed costume');
// Hat and hanging ties retain the approved vector ink. The ties sit behind the head.
await add('hat',native.hat,[320,250],'Original hat and brim');
const brimUnderlay=[Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;return [325+278*Math.cos(a),307+119*Math.sin(a)];})];
const tieShapes=[clipped(docs.composed.shapes[0],[brimUnderlay],'hat-lining')];for(const i of [14,16]){const s=docs.composed.shapes[i];tieShapes.push(strokeSilhouette(s,'tie-'+i,10),s);}
await add('hat-ties',tieShapes,[320,250],'Hat ties');
const mapping={composed:{hands:[12,8],eyes:[5,4],mouth:19},anticipation:{hands:[11,6],eyes:[10,12],lids:[21,29],mouth:23},release:{hands:[6,5],eyes:[3,4],mouth:19},lift:{hands:[4,5],eyes:[7,6],mouth:19},approach:{hands:[5,6],eyes:[13,12],lids:[26,21],mouth:4,tongue:9},contact:{hands:[5,6],eyes:[11,14],lids:[22,25],mouth:3,tongue:9},overshoot:{hands:[5,6],handSource:'contact',eyes:[16,17],lids:[24,25],mouth:4,tongue:10},settle:{hands:[5,6],eyes:[12,11],lids:[21,23],mouth:3,tongue:9}};
for(const [pose,m]of Object.entries(mapping)){
 const doc=docs[pose],entries={};
 for(let side=0;side<2;side++){
  const prefix=side?'right':'left',hd=docs[m.handSource??pose],base=hd.shapes[m.hands[side]];let handArt=regionArt(hd,base,pose+'-'+prefix),b=bounds(base);
  if(['composed','anticipation'].includes(pose)){
   try{handArt=await generated(prefix+'-clasp',side?[290,480,410,600]:[214,510,327,600]);b=[side?290:214,side?480:510,side?410:327,600];}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  const wrist=[(b[0]+b[2])/2,b[1]+(b[3]-b[1])*.70],elbow=[wrist[0],b[3]-4];
  const full=handArt.map((s,i)=>s.strokeWidth?{...s,id:pose+'-'+prefix+'-outline'}:s);
  // Two overlapping pieces share one painted wrist, with no new cut-edge ink.
  const hand=full.map(s=>clipped(s,rect(0,0,640,wrist[1]+13))).filter(Boolean),arm=full.map(s=>clipped(s,rect(0,wrist[1]-14,640,640-wrist[1]+14))).filter(Boolean);
  // Filled outline geometry below is kept once as a silhouette; curves stay editable.
  entries[prefix+'Arm']={asset:await add(pose+'-'+prefix+'-arm',arm,elbow),position:elbow,parent:'root'};
  entries[prefix+'Hand']={asset:await add(pose+'-'+prefix+'-hand',hand,wrist),position:wrist,parent:prefix+'Arm'};
  const eye=doc.shapes[m.eyes[side]],eb=bounds(eye),center=[(eb[0]+eb[2])/2,(eb[1]+eb[3])/2],mask=[[outer(eye)]];
  const pupilShapes=[],eyeShapes=[strokeSilhouette(eye,'eye-ink',9),eye];
  for(const s of doc.shapes.slice(m.eyes[side]+1)){const b=bounds(s);if(b[0]>=eb[0]-2&&b[2]<=eb[2]+2&&b[1]>=eb[1]-2&&b[3]<=eb[3]+2){if(['#231f25','#fff0c8','#eed6a0'].includes(s.fill))pupilShapes.push(s);else eyeShapes.push(s);}}
  entries[prefix+'Eye']={asset:await add(pose+'-'+prefix+'-eye',eyeShapes,center),position:center,parent:'head'};
  entries[prefix+'Pupil']={asset:await add(pose+'-'+prefix+'-pupil',pupilShapes,center),position:center,parent:prefix+'Eye'};
  const lid=m.lids?.[side],lidArt=lid===undefined?[]:[strokeSilhouette(doc.shapes[lid],'lid-ink',7),doc.shapes[lid]];
  entries[prefix+'Lid']={asset:await add(pose+'-'+prefix+'-lid',lidArt,center),position:center,parent:prefix+'Eye'};
 }
 const mouth=doc.shapes[m.mouth],mouthAnchor=[320,405],mouthArt=[mouth];
 entries.mouth={asset:await add(pose+'-mouth',mouthArt,mouthAnchor),position:mouthAnchor,parent:'head'};
 entries.tongue={asset:await add(pose+'-tongue',m.tongue===undefined?[]:[clipped(doc.shapes[m.tongue],[[outer(mouth)]])].filter(Boolean),mouthAnchor),position:mouthAnchor,parent:'mouth'};
 const nose=doc.shapes.filter(s=>{const b=bounds(s);return s.fill==='#231f25'&&b[0]>285&&b[2]<355&&b[1]>310&&b[3]<375&&(b[2]-b[0])<20;});
 entries.nose={asset:await add(pose+'-nose',nose,[320,345]),position:[320,345],parent:'head'};
 poses[pose]=entries;console.log(pose,'separated');
}
await fs.writeFile(out+'/layers.json',JSON.stringify({version:1,canvas:[640,640],assets,poses,registrations,notes:{overshoot:'Uses contact hand drawings with pose controls; preserves finger topology rather than guessing through the source’s merged hand/cheek path.'}}));
console.log('Layer assets:',Object.keys(assets).length);
