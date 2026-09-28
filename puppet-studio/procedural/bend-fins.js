import {addProceduralPrimitive} from '@shapeshift-labs/studio-core/procedural/builders';
import {applyAttachments} from '@shapeshift-labs/studio-core/procedural/attachments';

/** Editable example of measured turns driving ordinary attached contour points. */
export function addBendFins(project){
 const p=project.procedural;p.gravity=[0,0];
 addProceduralPrimitive(project,{id:'spine',kind:'spine',count:12,spacing:16,radius:20,position:[80,0],layer:2});
 Object.assign(p.drivers[0],{origin:[0,0],amplitude:[80,55],frequency:.08});p.chains[0].bendLimit=Math.PI/8;
 const ids=p.chains[0].particles,body=p.surfaces[0];body.fill='#4689aa';body.shapes[0]={type:'tube',particles:ids.slice(0,10),radii:[17,20,21,21,19,16,13,10,8,5],curve:1};
 const surface=(id,layer,fill)=>{const s={id,name:id.replaceAll('-',' '),layer,fill,stroke:'#24323e',strokeWidth:2,outline:'ink',shapes:[]};p.surfaces.push(s);return s;};
 function attach(id,index,offset,bend){
  const orient=index===11?[ids[10],ids[11]]:[ids[index],ids[index+1]],a={id:id+'-attachment',particle:id,sources:[ids[index]],offset,orient,...(bend?{bend}:{})};
  const points=new Map(p.particles.map(n=>[n.id,{p:[...n.position],w:0}]));points.set(id,{p:[0,0],w:0});applyAttachments([a],points);p.particles.push({id,position:points.get(id).p,mass:0,radius:1});p.attachments.push(a);return id;
 }
 const fins=surface('paired-fins',1,'#a0ced0');
 for(const [index,size]of [[3,1],[7,.6]])for(const side of [-1,1]){
  const offsets=[[-10,14],[5,34],[30,24],[14,12]],particles=offsets.map(([x,y],i)=>attach(`fin-${index}-${side<0?'left':'right'}-${i}`,index,[x*size,y*side*size]));
  fins.shapes.push({type:'polygon',particles,curve:1});
 }
 const tail=surface('bend-tail',1,'#a0ced0'),lower=[],upper=[];
 for(let i=8;i<12;i++){
  lower.push(attach('tail-lower-'+i,i,[0,-1],{particles:[...ids],scale:[0,-.375*(i-8)**2],limit:Math.PI*4}));
  upper.push(attach('tail-upper-'+i,i,[0,1],{particles:[...ids],scale:[0,1.5],limit:13/6}));
 }
 tail.shapes.push({type:'polygon',particles:[...lower,...upper.reverse()],curve:1});
 const dorsal=surface('bend-dorsal',3,'#a0ced0');
 dorsal.shapes.push({type:'polygon',particles:[ids[4],ids[5],ids[6],ids[7],attach('dorsal-6',6,[0,1],{particles:ids.slice(0,9),scale:[0,4],limit:Math.PI*4}),attach('dorsal-5',5,[0,1],{particles:ids.slice(0,8),scale:[0,4],limit:Math.PI*4})],curve:1});
 surface('eyes',4,'#f4edce').shapes.push({type:'discs',particles:[attach('eye-left',0,[-2,-12]),attach('eye-right',0,[-2,12])],radii:[3,3]});
 return project;
}
