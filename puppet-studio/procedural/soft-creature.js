import {addProceduralPrimitive} from '@shapeshift-labs/studio-core/procedural/builders';
import {signedArea} from '@shapeshift-labs/studio-core/procedural/model';
import {applyAttachments} from '@shapeshift-labs/studio-core/procedural/attachments';
import {makeSpriteBinding} from '@shapeshift-labs/studio-core/procedural/bindings';

/** Example data: soft loop + weighted anchors + ordinary springs and sprite art. */
export function addSoftCreature(project){
 const p=project.procedural;p.gravity=[0,240];p.damping=2.5;p.iterations=32;
 addProceduralPrimitive(project,{id:'body',kind:'soft',count:16,spacing:70,position:[0,-110],radius:5,layer:2});
 for(const n of p.particles)n.position[1]=-110+(n.position[1]+110)*.8;
 const point=id=>p.particles.find(n=>n.id===id),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 for(const c of p.distances)c.length=distance(point(c.a).position,point(c.b).position);
 p.areas[0].area=signedArea(p.areas[0].particles.map(id=>point(id).position));p.areas[0].stiffness=1;
 p.colliders=[{type:'segment',a:[-350,150],b:[350,150],friction:.45,bounce:.05},{type:'circle',center:[95,120],radius:35,friction:.3}];
 const body=p.surfaces[0];body.name='Soft body and front limbs';body.fill='#77ac95';body.stroke='#24363b';body.strokeWidth=4;body.shapes[0].curve=1;
 const back={...structuredClone(body),id:'back-legs',name:'Hind limbs',layer:1,shapes:[]};p.surfaces.push(back);
 function anchor(id,sources,weights,offset){
  const a={id:id+'-attachment',particle:id,sources,weights,offset,orient:['body-10','body-14']};p.attachments.push(a);
  const points=new Map(p.particles.map(n=>[n.id,{p:n.position,w:0}]));points.set(id,{p:[0,0],w:0});applyAttachments([a],points);p.particles.push({id,position:points.get(id).p,mass:0,radius:3});return id;
 }
 for(let i=0;i<4;i++){
  const side=i%2?-1:1,front=i<2,sources=front?['body-10','body-14']:['body-6','body-2'],weights=side<0?[.8,.2]:[.2,.8],offset=[0,front?30:0],hip=anchor('hip-'+i,sources,weights,offset),guide=anchor('guide-'+i,sources,weights,[0,offset[1]-20]),at=point(hip).position,knee='knee-'+i,foot='foot-'+i;
  p.particles.push({id:knee,position:[at[0]+side*(front?28:65),at[1]+(front?48:12)],mass:1,radius:8},{id:foot,position:[at[0]+side*(front?42:78),at[1]+(front?95:75)],mass:1,radius:6});
  for(const [a,b]of [[hip,knee],[knee,foot]])p.distances.push({a,b,length:distance(point(a).position,point(b).position),stiffness:1});
  const angle=(a,b,c)=>{const u=point(a).position,v=point(b).position,w=point(c).position;return Math.atan2(Math.sin(Math.atan2(w[1]-v[1],w[0]-v[0])-Math.atan2(v[1]-u[1],v[0]-u[0])),Math.cos(Math.atan2(w[1]-v[1],w[0]-v[0])-Math.atan2(v[1]-u[1],v[0]-u[0])));};
  p.bends.push({a:guide,b:hip,c:knee,angle:angle(guide,hip,knee),limit:1.1,stiffness:.8},{a:hip,b:knee,c:foot,angle:angle(hip,knee,foot),limit:1.5,stiffness:.8});
  (front?body:back).shapes.push({type:'tube',particles:[hip,knee,foot],radii:[13,10,7]});
 }
 const face=anchor('face',['body-10','body-14'],[1,1],[0,14]),heading=anchor('face-direction',['body-10','body-14'],[1,1],[45,14]),at=point(face).position;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="112" height="58"><g stroke="#24363b" stroke-width="3"><ellipse cx="27" cy="20" rx="15" ry="18" fill="#efc474"/><ellipse cx="85" cy="20" rx="15" ry="18" fill="#efc474"/><ellipse cx="27" cy="21" rx="8" ry="5" fill="#24363b"/><ellipse cx="85" cy="21" rx="8" ry="5" fill="#24363b"/><path d="M24 44Q56 57 88 44" fill="none" stroke-linecap="round"/></g></svg>';
 project.assets.push({id:'face-art',src:'data:image/svg+xml,'+encodeURIComponent(svg)});
 project.joints.push({id:'face-piece',name:'Face artwork',parent:'root',rest:{x:at[0],y:at[1],rotation:0,scaleX:1,scaleY:1},layer:4,sprite:{asset:'face-art',width:112,height:58,pivotX:.5,pivotY:.5}});
 p.bindings.push(makeSpriteBinding(p,'face-piece',[face,heading],[1,0,0,1,...at]));
 return project;
}
