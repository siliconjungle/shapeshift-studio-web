import {littleGodsMaterialStyle} from '../scene3d/schema.js';
import {primitiveWalkerScene} from '@shapeshift-labs/studio-core/procedural3d/builders';

/** A mesh shell and eight instances of one editable, animated puppet link. */
export function hybridWalkerProject(project){
 const p=structuredClone(project),used=new Set();
 for(const list of [p.assets,p.joints,p.clips,p.puppetSources??[]])for(const item of list)used.add(item.id);
 const unique=base=>{let id=base,i=2;while(used.has(id))id=base+'-'+i++;used.add(id);return id;};
 const source=unique('hybrid-leg'),root=unique('hybrid-link'),detail=unique('hybrid-mark'),clip=unique('hybrid-pulse'),art=unique('hybrid-link-art'),mark=unique('hybrid-mark-art');
 p.puppetSources??=[];
 if(!p.puppetSources.some(s=>s.projectDefault))p.puppetSources.push({id:unique('project-rig'),name:p.name,projectDefault:true,roots:p.joints.filter(j=>!j.parent).map(j=>j.id),clips:p.clips.map(c=>c.id)});
 const svg=(id,w,h,content)=>({id,src:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`)});
 p.assets.push(svg(art,28,200,'<path d="M14 2 C27 2 26 48 21 106 L17 194 Q14 202 11 194 L7 106 C2 48 1 2 14 2Z" fill="#839fb8" stroke="#1a2531" stroke-width="3"/>'),svg(mark,12,36,'<path d="M3 3 Q9 0 9 6 L8 31 Q6 36 4 31Z" fill="#edf0dc"/>'));
 const rest={x:0,y:0,rotation:0,scaleX:1,scaleY:1};
 p.joints.push({id:root,name:'Leg artwork',parent:null,rest:{...rest},layer:0,sprite:{asset:art,width:28,height:200,pivotX:.5,pivotY:.5}},{id:detail,name:'Animated leg marking',parent:root,rest:{...rest,y:-40},layer:1,sprite:{asset:mark,width:12,height:36,pivotX:.5,pivotY:.5}});
 p.clips.push({id:clip,name:'Leg marking pulse',duration:2,fps:30,loop:true,tracks:{[detail]:[1,.5,1].map((scaleY,time)=>({time,easing:'smooth',value:{...rest,scaleY}}))}});
 p.puppetSources.push({id:source,name:'Editable illustrated leg',roots:[root],clips:[clip]});
 p.scene3d=primitiveWalkerScene({legs:4});p.scene3d.name='Mesh body with puppet legs';Object.assign(p.scene3d.materials[0],littleGodsMaterialStyle(p.scene3d.materials[0]));p.scene3d.nodes.find(n=>n.id==='shell').segments=64;
 for(const chain of p.scene3d.procedural.chains)for(const [i,id]of chain.segments.entries()){
  const n=p.scene3d.nodes.find(n=>n.id===id);n.type='puppet';n.name=`${chain.id} puppet ${i+1}`;n.dimensions=[.2,1,.02];n.puppet={source,clip,pixelsPerUnit:200,fit:'bounds',facing:'axis-y',start:0,offset:i*.5,speed:1,loop:true};
 }
 return p;
}
