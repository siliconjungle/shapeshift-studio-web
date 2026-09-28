import {makeSpriteBinding} from '@shapeshift-labs/studio-core/procedural/bindings';

/** Ordinary sprite pieces bound to four three-segment stepping chains. */
export function addSpriteWalker(project){
 project.name='Sprite pieces with stepping limbs';const p=project.procedural;
 const asset=(id,content)=>({id,src:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${content}</svg>`)});
 project.assets.push(asset('leg-art','<path d="M0 8 Q12 6 100 46 L100 54 Q12 94 0 92Z" fill="#172128"/>'),asset('body-art','<ellipse cx="50" cy="50" rx="49" ry="48" fill="#172128"/>'));
 function piece(id,a,b,width,height,asset,pivotX=0){
  const from=p.particles.find(p=>p.id===a).position,to=p.particles.find(p=>p.id===b).position,angle=Math.atan2(to[1]-from[1],to[0]-from[0]),c=Math.cos(angle),s=Math.sin(angle),world=[c,s,-s,c,...from];
  project.joints.push({id,name:id.replaceAll('-',' '),parent:'root',rest:{x:from[0],y:from[1],rotation:angle*180/Math.PI,scaleX:1,scaleY:1},layer:id==='body-piece'?3:2,sprite:{asset,width,height,pivotX,pivotY:.5}});
  p.bindings.push(makeSpriteBinding(p,id,[a,b],world));
 }
 for(const [i,chain]of p.chains.entries()){
  const mid=p.particles.find(p=>p.id===chain.particles[1]),foot=p.particles.find(p=>p.id===chain.particles[2]),id='ankle-'+i;
  p.particles.push({id,position:mid.position.map((v,k)=>(v+foot.position[k])/2),mass:1,radius:5});chain.particles.splice(2,0,id);chain.lengths=[65,52.5,52.5];chain.bendLimit=Math.PI;
  for(let j=0;j<3;j++)piece(`leg-${i}-piece-${j}`,chain.particles[j],chain.particles[j+1],chain.lengths[j]+1,12-j*3,'leg-art');
 }
 piece('body-piece','hip-0','hip-2',100,60,'body-art',.15);
 const ground=[[-450,100],[100,100],[250,65],[450,65],[450,190],[-450,190]];
 ground.forEach((position,i)=>p.particles.push({id:'ground-'+i,position,mass:0,radius:0}));
 p.surfaces=[{id:'ground',name:'Ground',layer:-1,fill:'#353e46',stroke:'none',strokeWidth:0,outline:'round',shapes:[{type:'polygon',particles:ground.map((_,i)=>'ground-'+i)}]}];
 return project;
}
