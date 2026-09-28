import {noodleDeformer} from './model.js';
import {sampleVector} from '../vector/model.js';
// Subdivide straight edges too: moving only a rectangle's four corners cannot
// bend its silhouette. Bakes keep these sampled points as editable vector paths.
export function deformVector(vector,sprite,definition,time=0,reference=sprite){
 const map=noodleDeformer(definition,2).point,[vx,vy,vw,vh]=vector.viewBox,h=reference.height;
 const point=p=>{const x=(p[0]-vx)/vw*sprite.width-sprite.pivotX*sprite.width,y=(p[1]-vy)/vh*sprite.height-sprite.pivotY*sprite.height,q=map([(x+(reference.pivotX-.5)*reference.width)/h,-(y+(reference.pivotY-.5)*h)/h,0]);return[q[0]*h-(reference.pivotX-.5)*reference.width,-q[1]*h-(reference.pivotY-.5)*h];};
 const shapes=sampleVector(vector,time).map(s=>{const commands=[],points=[];let offset=0,previous,start;
  const emit=(p,cmd='L')=>{commands.push(cmd);points.push(...point(p));};
  const segment=(end,controls)=>{const distance=controls?Math.hypot(controls[0][0]-previous[0],controls[0][1]-previous[1])+Math.hypot(controls[1][0]-controls[0][0],controls[1][1]-controls[0][1])+Math.hypot(end[0]-controls[1][0],end[1]-controls[1][1]):Math.hypot(end[0]-previous[0],end[1]-previous[1]),steps=Math.max(1,Math.min(128,Math.ceil(distance/Math.max(vw,vh)*80)));for(let i=1;i<=steps;i++){const t=i/steps,u=1-t;emit(controls?[0,1].map(k=>u*u*u*previous[k]+3*u*u*t*controls[0][k]+3*u*t*t*controls[1][k]+t*t*t*end[k]):previous.map((v,k)=>v+(end[k]-v)*t));}previous=end;};
  for(const c of s.commands){if(c==='M'){previous=s.points.slice(offset,offset+2);offset+=2;start=previous;emit(previous,'M');}else if(c==='L'){segment(s.points.slice(offset,offset+2));offset+=2;}else if(c==='C'){segment(s.points.slice(offset+4,offset+6),[s.points.slice(offset,offset+2),s.points.slice(offset+2,offset+4)]);offset+=6;}else if(c==='Z'){segment(start);commands.push('Z');}}
  return {...s,commands,points,strokeWidth:s.strokeWidth*Math.sqrt(Math.abs(sprite.width/vw*sprite.height/vh))};});
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const s of shapes)for(let i=0;i<s.points.length;i+=2){const pad=s.strokeWidth+1;minX=Math.min(minX,s.points[i]-pad);maxX=Math.max(maxX,s.points[i]+pad);minY=Math.min(minY,s.points[i+1]-pad);maxY=Math.max(maxY,s.points[i+1]+pad);}if(!Number.isFinite(minX)){minX=minY=0;maxX=maxY=1;}const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY);
 return{vector:{...vector,viewBox:[minX,minY,width,height],shapes,tracks:[],boil:undefined,duration:1,loop:false,boundFrame:time},sprite:{...sprite,width,height,pivotX:-minX/width,pivotY:-minY/height,boneBinding:undefined,mesh:undefined,crop:undefined}};
}
export function turningArtwork(n){const angle=((n.turn%360)+540)%360-180,side=Math.abs(angle)>45&&Math.abs(angle)<135,back=Math.abs(angle)>=135,asset=side?n.faces?.side:back?n.faces?.back:null;return{asset,definition:asset?{...n,turn:n.turn-(side?Math.sign(angle)*90:Math.sign(angle)*180)}:n};}
