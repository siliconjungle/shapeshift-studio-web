import {svgText} from '../vector/model.js';
import {bindVector} from './model.js';
import {poseAt,identity} from '../runtime.js';
const shape=(id,commands,points,fill,stroke='none',strokeWidth=0)=>({id,name:id,commands,points,fill,stroke,strokeWidth,opacity:1,fillRule:'nonzero',lineCap:'round',lineJoin:'round',hidden:false,locked:false});
const polygon=(id,points,fill,stroke='none',width=0)=>shape(id,['M',...Array(points.length/2-1).fill('L'),'Z'],points,fill,stroke,width);
const gradient=(a,b)=>({type:'linear',units:'objectBoundingBox',x1:0,y1:0,x2:1,y2:0,stops:[{offset:0,color:a},{offset:1,color:b}]});
const vector=shapes=>({version:1,viewBox:[0,0,700,500],duration:4,loop:true,swatches:[],tracks:[],shapes});
// One oblique projection for the cover, resting pages and turning sheet.
const project=(x,depth,height=0)=>[300+x+depth*74/170,210-.13*x+depth-.65*height];
const quad=(left,right,front,back,height=0)=>[...project(left,front,height),...project(right,front,height),...project(right,back,height),...project(left,back,height)];
const plus=(a,b)=>a.map((v,i)=>v+b[i]),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
// A cylindrical cross-section of constant arc length, extruded along the spine.
// Top and bottom therefore share the same curl and cannot shear independently.
export function bookPagePoints(angle){const width=190,curve=.6*Math.sin(angle),bend=Math.abs(curve)>1e-6?curve:0,start=angle-bend,radius=bend?width/(2*bend):0;
 const edge=bend?[radius*(Math.sin(angle+bend)-Math.sin(start)),radius*(Math.cos(start)-Math.cos(angle+bend))]:[width*Math.cos(angle),width*Math.sin(angle)];
 const tangent=bend?4/3*Math.tan(bend/2)*radius:width/3,handle1=[tangent*Math.cos(start),tangent*Math.sin(start)],handle2=[edge[0]-tangent*Math.cos(angle+bend),edge[1]-tangent*Math.sin(angle+bend)];
 const top=project(0,0),bottom=project(0,170),innerTop=project(handle1[0],0,handle1[1]),outerTop=project(handle2[0],0,handle2[1]),edgeTop=project(edge[0],0,edge[1]),delta=[74,170],edgeBottom=plus(edgeTop,delta);
 return [...top,...innerTop,...outerTop,...edgeTop,...mix(edgeTop,edgeBottom,1/3),...mix(edgeTop,edgeBottom,2/3),...edgeBottom,...plus(outerTop,delta),...plus(innerTop,delta),...bottom,...top];
}
export function bookBindingExample(){
 const base=vector([
  shape('soft-shadow',['M','C','C','Z'],[128,407,126,446,610,444,605,391,598,372,151,378,128,407],'#c2b5a0'),
  polygon('leather-cover',quad(-204,204,-9,185,-17),'#694735','#694735',12),
  polygon('cover-lip',quad(-203,203,-9,181,-7),'#a9795b','#a9795b',9),
  polygon('page-block',quad(-190,190,0,170,-9),'#decaab'),
  ...[2,4,6,8].map((h,i)=>shape('page-edge-'+i,['M','L','L'],[...project(-190,170,-h),...project(190,170,-h),...project(190,0,-h)],'none','#bba281',.7)),
  polygon('left-paper',quad(-190,0,0,170),gradient('#f7ead1','#dcc8a8')),
  polygon('right-paper',quad(0,190,0,170),gradient('#d9c4a5','#f8edd9')),
  polygon('page-shadow',quad(0,190,0,170),'#8f7353'),
  shape('spine',['M','L'],[...project(0,0),...project(0,170)],'none','#b6a080',1.2),
  ...[0,1,2,3,4,5].flatMap(i=>[-1,1].map(side=>shape((side<0?'left':'right')+'-text-'+i,['M','L'],[...project(side<0?-166:25,30+i*18),...project(side<0?-30:164,30+i*18)],'none','#b6a488',1.1)))
 ]);base.shapes.find(s=>s.id==='page-shadow').opacity=.05;base.tracks=[{shape:'page-shadow',channel:'opacity',keys:[{time:0,value:0,easing:'smooth'},{time:1.1,value:.13,easing:'smooth'},{time:2,value:0,easing:'smooth'},{time:2.5,value:0,easing:'smooth'},{time:3.3,value:.13,easing:'smooth'},{time:4,value:0,easing:'smooth'}]}];
 const rest=bookPagePoints(0),guide=shape('turning-page',['M','C','C','C','L','Z'],rest,'none');guide.hidden=true;guide.name='Whole page control cage · hidden';
 const page=vector([guide]),stripWeights=new Map(),basis=t=>[(1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3],derivative=t=>[-3*(1-t)**2,3*(1-t)**2-6*(1-t)*t,6*(1-t)*t-3*t*t,3*t*t],control=w=>[0,1].map(axis=>w.reduce((sum,n,i)=>sum+n*rest[i*2+axis],0));
 // Separate surface strips resolve the overlap when a curled page is edge-on.
 // One self-overlapping filled outline would produce an artificial bow-tie hole.
 for(let i=0;i<16;i++){const a=i/16,b=(i+1)/16,wa=basis(a),wb=basis(b),w1=wa.map((n,k)=>n+(b-a)/3*derivative(a)[k]),w2=wb.map((n,k)=>n-(b-a)/3*derivative(b)[k]),weights=[wa,w1,w2,wb,wb,w2,w1,wa],top=[wa,w1,w2,wb].map(control),bottom=[...top].reverse().map(p=>plus(p,[74,170])),id='page-strip-'+i;
  page.shapes.push(shape(id,['M','C','L','C','Z'],[...top.flat(),...bottom.flat()],'#f7ead0','#f7ead0',2.2));stripWeights.set(id,weights);
  const ink=id+'-edge';page.shapes.push(shape(ink,['M','C','M','C'],[...top.flat(),...bottom.flat()],'none','#d4c09d',.65));stripWeights.set(ink,weights);
 }

 const controls=[['hinge-top','Spine · top',0],['hinge-bottom','Spine · bottom',9],['edge-top','Page edge · top',3],['edge-bottom','Page edge · bottom',6],['curl-top','Outer Bézier curl',2],['curl-bottom','Inner Bézier curl',8]];
 const p={format:'inkwell-puppet',version:1,name:'Book · bone-bound page turn',assets:[{id:'book-base',name:'Book cover and resting pages',vector:base,src:'data:image/svg+xml,'+encodeURIComponent(svgText(base))},{id:'turning-page',name:'Turning page · editable cubic path',vector:page,src:'data:image/svg+xml,'+encodeURIComponent(svgText(page))}],joints:[{id:'root',name:'Book rig',parent:null,layer:0,rest:identity()},{id:'book',name:'Cover and resting pages',parent:'root',layer:0,rest:identity(),sprite:{asset:'book-base',width:700,height:500,pivotX:0,pivotY:0}},{id:'page',name:'Turning page',parent:'root',layer:1,rest:identity(),sprite:{asset:'turning-page',width:700,height:500,pivotX:0,pivotY:0}},...controls.map(([id,name,index])=>({id,name,parent:'root',layer:2,rest:{...identity(),x:rest[index*2],y:rest[index*2+1]}}))],clips:[{id:'page-turn',name:'Turn and return',duration:4,fps:30,loop:true,tracks:{}}]};
 // Sample a smooth angular turn into ordinary editable joint keys. Linear
 // interpolation between dense poses avoids independent per-joint easing shear.
 for(const [id,,index]of controls.filter(c=>!c[0].startsWith('hinge'))){const keys=[];for(let frame=0;frame<=120;frame++){const time=frame/30,u=time<.25?0:time<1.9?(time-.25)/1.65:time<2.3?1:(4-time)/1.7,t=Math.max(0,Math.min(1,u)),angle=Math.PI*t*t*(3-2*t),points=bookPagePoints(angle);keys.push({time,value:{...identity(),x:points[index*2]-rest[index*2],y:points[index*2+1]-rest[index*2+1]},easing:'linear'});}p.clips[0].tracks[id]=keys;}
 const b=bindVector(p,'page',poseAt(p,p.clips[0],0),controls.map(c=>c[0]));
 const weights=[['hinge-top',1],['curl-bottom',1],['curl-top',1],['edge-top',1],['edge-top',2/3,'edge-bottom',1/3],['edge-top',1/3,'edge-bottom',2/3],['edge-bottom',1],['curl-top',1],['curl-bottom',1],['hinge-bottom',1],['hinge-top',1]];
 b.shapes[0].weights=weights.map(row=>Array.from({length:row.length/2},(_,i)=>({bone:row[i*2],weight:row[i*2+1]})));for(const binding of b.shapes.slice(1))binding.weights=stripWeights.get(binding.shape).map((w,i)=>w.flatMap((weight,k)=>weight>1e-10?[{bone:(i<4?['hinge-top','curl-bottom','curl-top','edge-top']:['hinge-bottom','curl-bottom','curl-top','edge-bottom'])[k],weight}]:[]));p.joints.find(j=>j.id==='page').sprite.boneBinding=b;return p;
}
