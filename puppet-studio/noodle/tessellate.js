import * as T from '../scene3d/vendor.js';
// Add bendable points to coarse geometry, preserving UVs, source paint, hard
// normal seams and material groups. Bound the cost for imported dense meshes.
export function bendableGeometry(source,maxEdge){
 const g=source.clone(),names=Object.keys(g.attributes),sizes=names.map(k=>g.attributes[k].itemSize),values=names.map(k=>Array.from(g.attributes[k].array)),p=values[names.indexOf('position')],limit=maxEdge*maxEdge;
 let indices=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i),groups=g.groups.length?g.groups.map(v=>({...v})):[{start:0,count:indices.length,materialIndex:0}],changed=false;
 const distance=(a,b)=>[0,1,2].reduce((s,k)=>s+(p[a*3+k]-p[b*3+k])**2,0);
 for(let pass=0;pass<5&&indices.length*4<=600000;pass++){
  let longest=0;for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3);longest=Math.max(longest,distance(a,b),distance(b,c),distance(c,a));}if(longest<=limit)break;
  const mids=new Map(),next=[],mid=(a,b)=>{const key=a<b?a+','+b:b+','+a;if(mids.has(key))return mids.get(key);const id=p.length/3;for(let j=0;j<names.length;j++)for(let k=0;k<sizes[j];k++)values[j].push((values[j][a*sizes[j]+k]+values[j][b*sizes[j]+k])*.5);mids.set(key,id);return id;};
  // Split the same long edges on both neighboring triangles. Short bevel
  // edges stay intact, avoiding unnecessary refinement of rounded corners.
  const nextGroups=[];
  for(const group of groups){const start=next.length;for(let i=group.start;i<group.start+group.count;i+=3){const [a,b,c]=indices.slice(i,i+3),ab=distance(a,b)>limit?mid(a,b):null,bc=distance(b,c)>limit?mid(b,c):null,ca=distance(c,a)>limit?mid(c,a):null,mask=(ab!==null?1:0)+(bc!==null?2:0)+(ca!==null?4:0);
   switch(mask){case 0:next.push(a,b,c);break;case 1:next.push(a,ab,c,ab,b,c);break;case 2:next.push(b,bc,a,bc,c,a);break;case 4:next.push(c,ca,b,ca,a,b);break;case 3:next.push(b,bc,ab,a,ab,c,ab,bc,c);break;case 5:next.push(a,ab,ca,ab,b,c,ab,c,ca);break;case 6:next.push(c,ca,bc,a,b,ca,b,bc,ca);break;case 7:next.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);break;}}
   nextGroups.push({...group,start,count:next.length-start});}indices=next;groups=nextGroups;changed=true;
 }
 if(changed){for(let i=0;i<names.length;i++)g.setAttribute(names[i],new T.Float32BufferAttribute(values[i],sizes[i]));g.setIndex(indices);g.clearGroups();for(const v of groups)g.addGroup(v.start,v.count,v.materialIndex);g.normalizeNormals();}return g;
}
