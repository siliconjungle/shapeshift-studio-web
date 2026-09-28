import {matrix,point,multiply,identity} from '@shapeshift-labs/studio-core/joint-transforms';
import {pathData,svgText,validateVector} from '@shapeshift-labs/studio-core/vector/model';
import {clamp} from '../../../portrait/controls.js';
const INK='#211d24',TEAL='#68b1ad',DARK='#337487';
const s=(id,commands,points,fill=TEAL,stroke=INK,width=4)=>({id,name:id,commands:commands.split(''),points,fill,stroke,strokeWidth:width,opacity:1,hidden:false,locked:false,fillRule:'nonzero',lineCap:'round',lineJoin:'round'});
const ellipse=(id,x,y,rx,ry,fill,stroke=INK,width=4)=>s(id,'MCCCCZ',[x+rx,y,x+rx,y+ry*.5523,x+rx*.5523,y+ry,x,y+ry,x-rx*.5523,y+ry,x-rx,y+ry*.5523,x-rx,y,x-rx,y-ry*.5523,x-rx*.5523,y-ry,x,y-ry,x+rx*.5523,y-ry,x+rx,y-ry*.5523,x+rx,y],fill,stroke,width);
const transform=(shapes,fn)=>shapes.map(s=>({...s,points:s.points.map((v,i,a)=>i%2?fn(a[i-1],v)[1]:fn(v,a[i+1])[0])}));
const norm=(model,x,y,w,h)=>{const [vx,vy,vw,vh]=model.viewBox;return transform(model.shapes,(a,b)=>[x+(a-vx)/vw*w,y+(b-vy)/vh*h]);};
const layer=(id,shapes,t={},parent='root',order=0)=>({id,shapes,t:{...identity(),...t},parent,order});
export function prepareArtwork(models){return {hat:norm(models.hat,-251,-338,502,355),face:norm(models.face,-177,-112,354,237),costume:norm(models.costume,-238,72,476,240),hands:Object.fromEntries(['curled','point','open'].map(k=>[k,norm(models['hand-'+k],-49,-149,98,170).map(s=>({...s,id:k+'-'+s.id}))]))};}
function mouth(p){
 const round=p.round,smile=p.smile,j=clamp(p.jaw)*(1-p.puff*.98),w=(113+smile*18)*(1-round*.64),cy=66-p.puff*37-j*13,open=j*(88+round*29),corner=cy+12-smile*31,upper=cy-smile*3;
 const lip=s('mouth','MCCCCZ',[-w,corner,-w*.65,cy-j*round*52,-w*.35,cy-j*round*52,0,cy-j*round*52,w*.35,cy-j*round*52,w*.65,cy-j*round*52,w,corner,w*(.65+.13*j),cy+open*.66,w*(.35+.11*j),cy+open,0,cy+open,-w*(.35+.11*j),cy+open,-w*(.65+.13*j),cy+open*.66,-w,corner],j>.015?INK:'none',INK,4.4);
 // Tongue is authored inside the opening, following the jaw rather than floating.
 const tw=w*.44,ty=cy+open*.78,th=open*(.14+p.tongue*.12);
 const tongue=ellipse('tongue',0,ty,tw,Math.max(.01,th),'#ad686a','none',0);tongue.opacity=clamp(j*9)*(1-p.puff);
 const creases=[-1,1].map(side=>s('cheek-'+side,'MC',[side*(w-4),corner-4,side*(w+3),corner-8,side*(w+8),corner-4,side*(w+9),corner+2],'none',INK,3));
 return [lip,tongue,...creases];
}
function eyes(p){const shapes=[];
 for(const side of [-1,1]){const id=side<0?'l':'r',x=side*91,y=-39+side*p.worry*5,rx=(side<0?47:45)*(1+p.stretch*.05),ry=(side<0?55:53)*(1+p.stretch*.14),lid=clamp((side<0?p.lidL:p.lidR)+p.anger*.26),happy=p.happy;
  const h=clamp(happy/.8),eye=ellipse('eye-'+id,x,y,rx,ry,'#efb74c',INK,5.3);
  const crescent=[x+rx,y+14,x+rx*.6,y-10,x+rx*.3,y-16,x,y-16,x-rx*.3,y-16,x-rx*.6,y-10,x-rx,y+14,x-rx,y-18,x-rx*.45,y-36,x,y-36,x+rx*.45,y-36,x+rx,y-18,x+rx,y+14];
  eye.points=eye.points.map((v,i)=>v+(crescent[i]-v)*h);shapes.push(eye);
  const px=x+clamp(p.gazeX,-1,1)*15,py=y+clamp(p.gazeY,-1,1)*15+4,pr=(23.5-p.worry*9-p.jaw*p.round*6)*(1-lid*.08);
  shapes.push(ellipse('pupil-'+id,px,py,pr,pr*1.2,INK,'none',0),ellipse('glint-'+id,px-9,py-15,9,9,'#fff1cb','none',0));
  shapes.at(-1).opacity=1-h;shapes.at(-2).opacity=1-h;
  const ly=y-ry+lid*(ry*2-5),a=-p.anger*side*24;
  // Filled caps cover pupils within the original eye contour; lip curve is separate.
  shapes.push(s('upper-lid-'+id,'MCCCCZ',[x-rx,y,x-rx,y-ry*.55,x-rx*.55,y-ry,x,y-ry,x+rx*.55,y-ry,x+rx,y-ry*.55,x+rx,y,x+rx,y+ry*.5*(lid>.5?1:0),x+rx,ly+a,x+rx,ly+a,x+rx*.4,ly+8,x-rx*.4,ly+8,x-rx,ly-a],TEAL,'none',0));
  // Restrict cap to eye through a native SVG clip in the live renderer. The bake
  // uses matching curved eyelid geometry clipped to the globe (see clippedShapes).
  const cap=shapes.at(-1);cap.clip='eye-'+id;cap.opacity=lid>.002?1-h:0;
  const line=s('lid-line-'+id,'MC',[x-rx,ly-a,x-rx*.4,ly+8,x+rx*.4,ly+8,x+rx,ly+a],'none',INK,4);line.clip='eye-'+id;line.opacity=cap.opacity;shapes.push(line);
  const hy=y+ry-happy*(ry*1.24);
  const lower=s('lower-lid-'+id,'MCCCCZ',[x-rx,hy,x-rx*.5,hy-28*happy,x+rx*.5,hy-28*happy,x+rx,hy,x+rx,y+ry*.55,x+rx*.55,y+ry,x,y+ry,x-rx*.55,y+ry,x-rx,y+ry*.55,x-rx,hy,x-rx,hy,x-rx,hy,x-rx,hy],TEAL,INK,4);lower.clip='eye-'+id;lower.opacity=0;shapes.push(lower);
 }
 shapes.push(ellipse('nostril-l',-13,22,2.7,2.2,INK,'none',0),ellipse('nostril-r',13,22,2.7,2.2,INK,'none',0));return shapes;
}
function sleeve(id,ax,ay,bx,by){const w=19,cx=(ax+bx)/2+(ax<0?-18:18),cy=(ay+by)/2+20;return [s(id,'MCCCCZ',[ax-w,ay,ax-w,ay+25,cx-w,cy,bx-w*.7,by,bx-w*.5,by-8,bx+w*.5,by-8,bx+w*.7,by,cx+w,cy,ax+w,ay+25,ax+w,ay,ax,ay-8,ax-w,ay-8,ax-w,ay],'#342c38',INK,5)];}
export function frogFrame(art,p,time=0,{debug=false}={}){
 const headT={...identity(),x:p.headX,y:p.headY,rotation:p.tilt,scaleX:1-p.stretch*.11,scaleY:1+p.stretch*.17},hm=matrix(headT);
 const hpoint=(x,y)=>point(hm,{x,y});
 const layers=[];
 layers.push(layer('root',[],{},null,-100),layer('head',[],headT,'root',0));
 const lower=(y)=>clamp((y-2)/126);
 const face=transform(art.face,(x,y)=>[x*(1+p.puff*.4*lower(y)+Math.max(0,p.smile)*.1*lower(y)-p.jaw*p.round*.06*lower(y)),y+p.puff*90*lower(y)+p.jaw*66*lower(y)+p.happy*25*clamp(-y/112)]);
 const faceWarp=shapes=>transform(shapes,(x,y)=>[x*(1+p.puff*.08),y]);
 const hat=transform(art.hat,(x,y)=>{const weight=clamp((-y-60)/250);return [x+Math.sin(weight*Math.PI/2)*p.hat*1.1,y+weight*p.hat*.12];});
 layers.push(layer('hat',hat,{},'head',10));
 const sway=p.hat*.8;
 for(const side of [-1,1])layers.push(layer('tie-'+side,[s('tie','MCCCCZ',[side*173,-55,side*205,-33,side*203,4,side*207+sway,35,side*202+sway,47,side*207+sway,53,side*195+sway,70,side*181+sway,43,side*178,15,side*181,-5,side*183,-25,side*165,-42,side*173,-55],'#bda47d',INK,4)],{},'head',12));
 const bodyY=p.puff*57+p.jaw*43+p.headY*.22;layers.push(layer('costume',art.costume,{y:bodyY,rotation:p.tilt*.2,scaleX:1+p.puff*.09,scaleY:1+p.puff*.04},'root',14));
 layers.push(layer('face',face,{},'head',20));
 const spots=[[-24,-65,5,3],[-7,-69,4,3],[12,-66,5,3],[28,-57,3,2],[-31,-44,3,2],[16,-51,3,2]].map(([x,y,rx,ry],i)=>ellipse('spot-'+i,x,y+p.happy*12,rx,ry,'#4c989d','none',0));
 const features=[...spots,...eyes(p),...mouth(p)];layers.push(layer('features',faceWarp(features),{},'head',23));
 const anchors={};
 for(const side of [-1,1]){
  const contact=side<0?p.point:p.cheek,open=p.openHands,pose=contact>.4?(side<0?'point':'curled'):open>.36?'open':'curled';
  const rest={x:side*35,y:280+bodyY*.6},free={x:side*(188+open*27),y:170-open*21+p.headY*.6};
  const angle=side*(open*34-24)*(1-contact)+p.tilt*contact;
  const tip={x:side<0?10:6,y:side<0?-138:-119};
  const handScale=1.18,target=hpoint(side<0?-76:117,side<0?91:65),tm=matrix({...identity(),rotation:angle,scaleX:handScale,scaleY:handScale}),off=point(tm,tip);
  const wrist={x:rest.x*(1-open)+free.x*open,y:rest.y*(1-open)+free.y*open};
  wrist.x=wrist.x*(1-contact)+(target.x-off.x)*contact;wrist.y=wrist.y*(1-contact)+(target.y-off.y)*contact;
  const id=side<0?'left':'right',hand=art.hands[pose];
  layers.push(layer('sleeve-'+id,sleeve('sleeve',side*172,220+bodyY,wrist.x,wrist.y),{},'root',13));
  layers.push(layer('hand-'+id,hand,{x:wrist.x,y:wrist.y,rotation:angle,scaleX:(side<0?1:-1)*handScale,scaleY:handScale},'root',28));
  anchors[id]={wrist,contact:target,amount:contact};
 }
 const world=new Map();for(const l of layers){const m=matrix(l.t);world.set(l.id,l.parent?multiply(world.get(l.parent),m):m);l.world=world.get(l.id);}
 for(const l of layers)l.geometryKey=l.id==='hat'||l.id.startsWith('tie-')?String(p.hat):l.id==='face'?[p.puff,p.smile,p.jaw,p.happy].join(','):l.id==='costume'?'static':l.id.startsWith('hand-')?l.shapes[0]?.id:JSON.stringify(p);
 return {layers,anchors,pose:p,time};
}
export class SvgPuppet{
 constructor(svg,art){this.svg=svg;this.art=art;this.nodes=new Map();this.paths=new Map();this.geometry=new Map();this.layerPaths=new Map();this.defs=document.createElementNS('http://www.w3.org/2000/svg','defs');svg.append(this.defs);this.root=document.createElementNS(svg.namespaceURI,'g');this.root.setAttribute('transform','translate(410 400)');svg.append(this.root);}
 render(p,time){const frame=frogFrame(this.art,p,time),seen=new Set();
  for(const l of [...frame.layers].sort((a,b)=>a.order-b.order)){
   let g=this.nodes.get(l.id);if(!g){g=document.createElementNS(this.svg.namespaceURI,'g');g.dataset.piece=l.id;this.nodes.set(l.id,g);this.root.append(g);}const m='matrix('+l.world.join(' ')+')';if(g.getAttribute('transform')!==m)g.setAttribute('transform',m);
   if(this.geometry.get(l.id)===l.geometryKey){for(const key of this.layerPaths.get(l.id)??[])seen.add(key);continue;}this.geometry.set(l.id,l.geometryKey);const keys=[];this.layerPaths.set(l.id,keys);
   for(const shape of l.shapes){const key=l.id+'-'+shape.id;seen.add(key);keys.push(key);let path=this.paths.get(key);if(!path){path=document.createElementNS(this.svg.namespaceURI,'path');this.paths.set(key,path);g.append(path);}
    const d=pathData(shape);path.setAttribute('d',d);path.setAttribute('fill',shape.fill);path.setAttribute('stroke',shape.stroke);path.setAttribute('stroke-width',shape.strokeWidth);path.setAttribute('opacity',shape.opacity);path.setAttribute('stroke-linejoin','round');path.setAttribute('stroke-linecap','round');
    if(shape.clip){const clipId='frog-clip-'+shape.clip;let cp=this.defs.querySelector('#'+clipId);if(!cp){cp=document.createElementNS(this.svg.namespaceURI,'clipPath');cp.id=clipId;cp.append(document.createElementNS(this.svg.namespaceURI,'path'));this.defs.append(cp);}const source=l.shapes.find(s=>s.id===shape.clip);cp.firstChild.setAttribute('d',pathData(source));path.setAttribute('clip-path','url(#'+clipId+')');}else path.removeAttribute('clip-path');
   }
  }
  for(const [key,p]of this.paths)if(!seen.has(key)){p.remove();this.paths.delete(key);}this.frame=frame;return frame;
 }
 snapshot(){return this.svg.outerHTML;}
}
