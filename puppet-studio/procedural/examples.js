import {addSpineLimbs} from './spine-limbs.js';
import {addBendFins} from './bend-fins.js';
import {addSpriteWalker} from './sprite-walker.js';
import {addSoftCreature} from './soft-creature.js';
import {emptyProcedural} from '@shapeshift-labs/studio-core/procedural/model';
import {addProceduralPrimitive} from '@shapeshift-labs/studio-core/procedural/builders';
const identity=()=>({x:0,y:0,rotation:0,scaleX:1,scaleY:1});
export const PROCEDURAL_EXAMPLES=[['sprite-walker','Sprite pieces with stepping limbs'],['bend-fins','Bend-driven fins'],['spine-limbs','Spine with stepping limbs'],['soft-creature','Soft creature attachments'],['sprites','Outlined puppet pieces'],['swimmer','Swimming spine'],['walker','Walking limbs'],['soft','Soft & rigid playground'],['reach','Reaching tentacles']];
/** Example documents demonstrate combinations of ordinary authorable primitives. */
export function proceduralExample(kind){
 if(kind==='sprite-walker')return addSpriteWalker(proceduralExample('walker'));
 const project={format:'inkwell-puppet',version:1,name:PROCEDURAL_EXAMPLES.find(x=>x[0]===kind)?.[1]??'Procedural study',assets:[],joints:[{id:'root',name:'Origin',parent:null,rest:identity(),layer:0}],clips:[{id:'motion',name:'Motion',duration:12,fps:60,loop:true,tracks:{}}],procedural:emptyProcedural()};const p=project.procedural;
 if(kind==='spine-limbs')return addSpineLimbs(project);
 if(kind==='bend-fins')return addBendFins(project);
 if(kind==='soft-creature')return addSoftCreature(project);
 if(kind==='swimmer'){
  p.gravity=[0,0];addProceduralPrimitive(project,{id:'spine',kind:'spine',count:14,spacing:16,radius:25,position:[80,0],layer:2});
  p.drivers[0].origin=[0,0];p.drivers[0].amplitude=[120,75];p.drivers[0].frequency=.12;
  p.surfaces[0].fill='#8fbcba';p.surfaces[0].shapes[0].radii=[22,28,32,33,32,29,25,21,16,12,8,5,3,2];
  // Fins bind to the moving spine through the same rigid groups and springs.
  for(const [name,y]of [['upper',-48],['lower',48]]){const id='fin-'+name;p.particles.push({id,position:[140,y],mass:1,radius:3});p.distances.push({a:'spine-3',b:id,length:Math.hypot(12,y),stiffness:.55},{a:'spine-6',b:id,length:Math.hypot(36,y),stiffness:.65});p.surfaces.push({id,name:'Fin '+name,layer:1,fill:'#d6b680',stroke:'#202936',strokeWidth:3,outline:'ink',shapes:[{type:'polygon',particles:['spine-3',id,'spine-7']}]});}
 }else if(kind==='walker'){
  p.gravity=[0,0];p.colliders.push({type:'segment',a:[-450,100],b:[100,100]},{type:'segment',a:[100,100],b:[250,65]},{type:'segment',a:[250,65],b:[450,65]});
  const shapeParts=[];
  for(let i=0;i<4;i++){
   const side=i%2===0?-1:1,x=(i<2?-35:35),root='hip-'+i,mid='knee-'+i,foot='foot-'+i,target='step-'+i;
   p.particles.push({id:root,position:[x,-35],mass:0,radius:12},{id:mid,position:[x+side*40,10],mass:1,radius:7},{id:foot,position:[x+side*60,100],mass:1,radius:4},{id:target,position:[x+side*60,100],mass:0,radius:3});
   for(const [id,origin]of [[root,[x,-35]],[target,[x+side*60,100]]])p.drivers.push({particle:id,type:'orbit',origin,amplitude:[110,0],frequency:.06,phase:Math.PI/2});
   p.chains.push({id:'leg-'+i,particles:[root,mid,foot],lengths:[65,105],target,mode:'step',bendLimit:2.6,stepDistance:24,stepHeight:25,stepDuration:.25,overshoot:.5,group:i%2?'pair-b':'pair-a',direction:[0,1],reach:250});
   shapeParts.push({type:'tube',particles:[root,mid,foot],radii:[12,8,3]});
  }
  p.gaits.push({id:'walk',groups:[['leg-0','leg-3'],['leg-1','leg-2']]});
  p.supports.push({id:'body-support',particles:['hip-0','hip-1','hip-2','hip-3'],feet:['leg-0','leg-1','leg-2','leg-3'],height:120,direction:[0,1],maxOffset:100,maxTilt:.5,response:8,tilt:1});
  p.surfaces.push({id:'body',name:'Body and legs',layer:2,fill:'#b1a4cb',stroke:'#242334',strokeWidth:4,outline:'ink',shapes:[{type:'tube',particles:['hip-0','hip-2'],radii:[30,38]},...shapeParts]});
 }else if(kind==='soft'){
  p.colliders.push({type:'segment',a:[-350,150],b:[350,150],friction:.5},{type:'circle',center:[0,50],radius:35});
  addProceduralPrimitive(project,{id:'soft',kind:'soft',count:12,spacing:48,position:[-30,-100],layer:2});p.surfaces[0].fill='#94bdb6';
  addProceduralPrimitive(project,{id:'rigid',kind:'rigid',count:4,spacing:28,position:[100,-170],layer:3});p.surfaces[1].fill='#dfb77c';
  p.distances.push({a:'soft-0',b:'rigid-2',length:80,stiffness:.4});
  p.surfaces.push({id:'link',name:'Elastic link',layer:1,fill:'#bcd1b4',stroke:'#25312f',strokeWidth:3,outline:'ink',shapes:[{type:'tube',particles:['soft-0','rigid-2'],radii:[8,5]}]});
 }else{
  for(let i=0;i<3;i++){addProceduralPrimitive(project,{id:'reach-'+i,kind:'tentacle',count:10,spacing:20,position:[-130,-80+i*65],layer:i});const d=p.drivers.at(-1);d.origin=[20,-40+i*50];d.frequency=.15+i*.02;d.phase=i;p.surfaces.at(-1).fill=['#8ebbb2','#a8a5cc','#d4b582'][i];}
 }
 return project;
}

/** The same point rig drives existing cutout art and its opt-in contour join. */
export async function proceduralSpriteExample(){
 const {bodyJoinExample}=await import('../body-join-example/project.js');
 const {makeSpriteBinding}=await import('@shapeshift-labs/studio-core/procedural/bindings');
 const {restWorlds}=await import('../body-joins.js');
 const project=await bodyJoinExample(),p=project.procedural=emptyProcedural(),head=restWorlds(project).get('head');
 project.name='Outlined puppet · procedural head';p.gravity=[0,0];
 p.particles.push({id:'neck',position:[head[4],head[5]],mass:0,radius:4},{id:'look',position:[head[4],head[5]-60],mass:0,radius:4});
 p.drivers.push({particle:'look',type:'orbit',origin:[head[4],head[5]-60],amplitude:[42,12],frequency:1/6,phase:Math.PI/2});
 p.bindings.push(makeSpriteBinding(p,'head',['neck','look'],head));
 project.clips=[{id:'motion',name:'Procedural look',duration:6,fps:60,loop:true,tracks:{eye:project.clips[0].tracks.eye}}];
 return project;
}
