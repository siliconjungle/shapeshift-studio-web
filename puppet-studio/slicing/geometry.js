import * as T from '../scene3d/vendor.js';
import {slicingMaps,sliceCoordinate} from './model.js';
export const slicingSourceSize=n=>n.slicing?.enabled?n.slicing.sourceSize:n.dimensions;
export function faceSlicing(node,face,volume=false){
 if(!node.slicing?.enabled)return undefined;
 const axes={front:[[0,1],[1,1]],back:[[0,-1],[1,1]],right:[[2,-1],[1,1]],left:[[2,1],[1,1]],top:[[0,1],[2,-1]],bottom:[[0,1],[2,1]]}[face];
 if(volume)axes.push({front:[2,1],back:[2,-1],right:[0,1],left:[0,-1],top:[1,1],bottom:[1,-1]}[face]);
 return {enabled:true,sourceSize:[...axes.map(([i])=>node.slicing.sourceSize[i]),...(volume?[]:[1])],axes:[...axes.map(([i,sign])=>{const axis=node.slicing.axes[i];return sign>0?axis:{cuts:axis.cuts.map(x=>1-x).reverse(),fixed:[...axis.fixed].reverse()};}),...(volume?[]:[{cuts:[],fixed:[false]}])]};
}
// Insert vertices at every cut plane before warping. Merely moving existing
// vertices would round across cuts and distort sparse meshes such as pillars.
// All attributes and material groups survive, including UVs and source paint.
export function sliceGeometry(geometry,slicing,target){
 if(!geometry||!slicing?.enabled)return geometry;
 const maps=slicingMaps(slicing,target),source=slicing.sourceSize,attributes=Object.entries(geometry.attributes),offsets={};let stride=0;
 for(const [name,attribute]of attributes){offsets[name]=stride;stride+=attribute.itemSize;}
 const position=offsets.position,normal=offsets.normal,outputs=Object.fromEntries(attributes.map(([name])=>[name,[]])),result=new T.BufferGeometry();
 const vertex=index=>{const data=[];for(const [,attribute]of attributes)for(let k=0;k<attribute.itemSize;k++)data.push(attribute.getComponent(index,k));return data;};
 const cut=(polygon,axis,plane)=>{
  const low=[],high=[],at=position+axis;
  for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[at]-plane,db=b[at]-plane;
   if(da<=0)low.push(a);if(da>=0)high.push(a);
   if(da*db<0){const t=da/(da-db),p=a.map((v,k)=>v+(b[k]-v)*t);p[at]=plane;low.push(p);high.push(p);}
  }
  return [low,high].filter(p=>p.length>=3);
 };
 const emit=(triangle,scales)=>{
  for(const original of triangle){const v=[...original];for(let axis=0;axis<3;axis++)v[position+axis]=sliceCoordinate(v[position+axis]+source[axis]/2,maps[axis])-target[axis]/2;
   if(normal!==undefined){const n=v.slice(normal,normal+3).map((value,i)=>value/Math.max(scales[i],1e-10)),length=Math.hypot(...n)||1;for(let i=0;i<3;i++)v[normal+i]=n[i]/length;}
   for(const [name,attribute]of attributes)for(let k=0;k<attribute.itemSize;k++)outputs[name].push(v[offsets[name]+k]);
  }
 };
 const count=geometry.index?.count??geometry.attributes.position.count,groups=geometry.groups.length?geometry.groups:[{start:0,count,materialIndex:0}];
 for(const group of groups){const start=outputs.position.length/3;
  for(let i=group.start;i<Math.min(count,group.start+group.count);i+=3){let polygons=[[0,1,2].map(k=>vertex(geometry.index?geometry.index.getX(i+k):i+k))];
   for(let axis=0;axis<3;axis++)for(const fraction of slicing.axes[axis].cuts){const plane=(fraction-.5)*source[axis];polygons=polygons.flatMap(p=>{const values=p.map(v=>v[position+axis]);return Math.min(...values)<plane&&Math.max(...values)>plane?cut(p,axis,plane):[p];});}
   for(const polygon of polygons){const center=[0,1,2].map(axis=>polygon.reduce((sum,p)=>sum+p[position+axis],0)/polygon.length+source[axis]/2),scales=maps.map((bands,axis)=>(bands.find(b=>center[axis]<=b.to)??bands.at(-1)).scale);
    for(let j=1;j<polygon.length-1;j++)emit([polygon[0],polygon[j],polygon[j+1]],scales);
   }
  }
  if(outputs.position.length/3>start)result.addGroup(start,outputs.position.length/3-start,group.materialIndex);
 }
 for(const [name,attribute]of attributes)result.setAttribute(name,new T.Float32BufferAttribute(outputs[name],attribute.itemSize));
 result.computeBoundingBox();result.computeBoundingSphere();geometry.dispose();return result;
}
