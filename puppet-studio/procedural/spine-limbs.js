import {addProceduralPrimitive} from '@shapeshift-labs/studio-core/procedural/builders';
import {applyAttachments} from '@shapeshift-labs/studio-core/procedural/attachments';

/** Following spine + attached shoulders/homes + four target-position stepping chains. */
export function addSpineLimbs(project){
 const p=project.procedural;p.gravity=[0,0];
 addProceduralPrimitive(project,{id:'spine',kind:'spine',count:14,spacing:14,radius:20,position:[80,0],layer:2});
 Object.assign(p.drivers[0],{origin:[0,0],amplitude:[80,50],frequency:.06});p.chains[0].bendLimit=Math.PI/8;
 const body=p.surfaces[0];body.fill='#77ac95';body.shapes[0].radii=[18,20,18,22,24,23,20,18,14,10,7,5,3,2];body.shapes[0].curve=1;
 function attach(id,index,offset){
  const a={id:id+'-attachment',particle:id,sources:['spine-'+index],orient:['spine-'+(index+1),'spine-'+index],offset};p.attachments.push(a);
  const points=new Map(p.particles.map(n=>[n.id,{p:n.position,w:0}]));points.set(id,{p:[0,0],w:0});applyAttachments([a],points);p.particles.push({id,position:points.get(id).p,mass:0,radius:2});return points.get(id).p;
 }
 const limbs={id:'limbs',name:'Stepping limbs',layer:1,fill:body.fill,stroke:body.stroke,strokeWidth:4,outline:'ink',shapes:[]};p.surfaces.push(limbs);
 for(let i=0;i<4;i++){
  const side=i%2?-1:1,index=i<2?3:7,root='hip-'+i,target='home-'+i,knee='knee-'+i,foot='foot-'+i,at=attach(root,index,[0,side*15]),home=attach(target,index,[i<2?10:-10,side*54]);
  p.particles.push({id:knee,position:[at[0]+(i<2?20:-20),at[1]-side*20],mass:1,radius:5},{id:foot,position:[...home],mass:1,radius:3});
  p.chains.push({id:'leg-'+i,mode:'step',placement:'target',particles:[root,knee,foot],target,lengths:[32,36],bendLimit:Math.PI,stepDistance:12,stepDuration:.18,stepHeight:0,overshoot:0,direction:[0,1],reach:100});
  limbs.shapes.push({type:'tube',particles:[root,knee,foot],radii:[7,5,2],curve:1});
 }
 p.gaits=[{id:'diagonal',groups:[['leg-0','leg-3'],['leg-1','leg-2']]}];
 for(const [i,side]of [[0,-1],[1,1]])attach('eye-'+i,0,[5,side*10]);
 p.surfaces.push({id:'eyes',name:'Eye details',layer:3,fill:'#f3e4ae',stroke:body.stroke,strokeWidth:2,outline:'ink',shapes:[{type:'discs',particles:['eye-0','eye-1'],radii:[4,4]}]});return project;
}
