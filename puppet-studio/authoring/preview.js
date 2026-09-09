import {renderSnapshot} from './preview-snapshot.js';
import {nodeDefaults,materialDefaults} from '../scene3d/schema.js';
const clone=x=>structuredClone(x),check=(v,m)=>{if(!v)throw Error('Preview: '+m);};
export function previewDefaults(p,{dimension=p.scene3d?3:2,clip,subject}={}){const doc=dimension===3?p.scene3d:p;return{id:'scenario',name:'Motion study',dimension,clip:clip??doc.clips[0].id,subject:subject??(dimension===3?doc.nodes.find(n=>n.controller||n.type==='puppet')??doc.nodes[0]:p.joints.find(j=>j.sprite))?.id??'',duration:6,variant:'',ground:{enabled:false,height:dimension===3?-1.5:110,amplitude:dimension===3?.3:25,span:dimension===3?5:450},gaze:{enabled:dimension===3,radius:[.6,.3],speed:.7},events:[]};}
export function validateScenario(s){
 check(s&&typeof s.id==='string'&&[2,3].includes(s.dimension)&&typeof s.name==='string','invalid scenario');
 check(Number.isFinite(s.duration)&&s.duration>=.1&&s.duration<=120,'duration must be .1–120 seconds');
 check(s.ground&&[s.ground.height,s.ground.amplitude,s.ground.span].every(Number.isFinite)&&s.ground.span>0&&s.ground.amplitude>=0,'invalid terrain');
 check(s.gaze&&s.gaze.radius?.length===2&&s.gaze.radius.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Number.isFinite(s.gaze.speed),'invalid gaze path');
 check(Array.isArray(s.events)&&s.events.length<=64,'at most 64 interruptions');
 for(const e of s.events)check(typeof e.clip==='string'&&Number.isFinite(e.time)&&e.time>=0&&e.time<s.duration,'invalid interruption');
}
export function validatePreview(p,validateDocument){
 if(!p.preview)return;const v=p.preview;
 check(v.version===1&&Array.isArray(v.scenarios)&&v.scenarios.length<=32,'invalid scenarios');
 const ids=new Set();for(const s of v.scenarios){validateScenario(s);check(!ids.has(s.id),'unique scenario ID');ids.add(s.id);}
 check(Array.isArray(v.references??[])&&v.references.length<=8,'at most eight references');const refs=new Set();
 for(const r of v.references??[]){
  check(typeof r.id==='string'&&!refs.has(r.id)&&typeof r.name==='string','invalid reference');refs.add(r.id);validateScenario(r.scenario);
  if(r.project){
   check(r.version===2&&!r.project.preview&&!r.project.library&&!r.project.actions,'reference must be a standalone render snapshot');
   validateDocument?.(r.project);
   const doc=r.scenario.dimension===3?r.project.scene3d:r.project;
   check(doc?.clips.some(c=>c.id===r.scenario.clip)&&r.scenario.events.every(e=>doc.clips.some(c=>c.id===e.clip)),'missing reference clip');
   if(r.camera)check(r.scenario.dimension===3&&['orthographic','perspective'].includes(r.camera.type)&&[r.camera.position,r.camera.target].every(v=>v?.length===3&&v.every(Number.isFinite))&&[r.camera.size,r.camera.zoom,r.camera.fov,r.camera.near,r.camera.far].every(v=>Number.isFinite(v)&&v>0),'invalid reference camera');
   if(r.framing)check(['minX','minY','maxX','maxY'].every(k=>Number.isFinite(r.framing[k]))&&r.framing.maxX>r.framing.minX&&r.framing.maxY>r.framing.minY,'invalid reference framing');
  }else{
   check(r.frames?.length>0&&r.frames.length<=12,'invalid legacy reference');
   for(const f of r.frames)check(Number.isFinite(f.time)&&typeof f.image==='string'&&f.image.startsWith('data:image/png;base64,')&&f.image.length<1500000,'invalid reference frame');
  }
 }
}
export function applyPreviewCommand(p,c){
 p.preview??={version:1,scenarios:[],references:[]};const v=p.preview;
 if(c.op==='preview.scenario'){const i=v.scenarios.findIndex(s=>s.id===c.value.id);if(i<0)v.scenarios.push(clone(c.value));else v.scenarios[i]=clone(c.value);return c.value.id;}
 if(c.op==='preview.reference'){check(!v.references.some(r=>r.id===c.value.id),'saved references cannot be overwritten; save a new reference');v.references.push(clone(c.value));return c.value.id;}
 if(c.op==='preview.removeReference'){check(!v.references.find(r=>r.id===c.id)?.protected,'this original reference is protected');v.references=v.references.filter(r=>r.id!==c.id);return;}
 throw Error('Unknown preview command');
}
export function previewSegment(s,time){let clip=s.clip,start=0;for(const event of [...s.events].sort((a,b)=>a.time-b.time))if(event.time<=time){clip=event.clip;start=event.time;}return{clip,time:time-start,start};}
export function previewHeight(ground,x){return ground.height+ground.amplitude*(Math.sin(x/ground.span*Math.PI*2)*.65+Math.sin(x/ground.span*Math.PI*4+.8)*.35);}
export function previewProject(project,s){const p=renderSnapshot(project);if(s.variant&&p.appearance?.variants.some(v=>v.id===s.variant))p.appearance.active=s.variant;
 if(s.dimension===3&&s.ground.enabled){const scene=p.scene3d;const unique=(base,items)=>{let id=base,i=1;while(items.some(v=>v.id===id))id=base+'-'+i++;return id;};const id=unique('preview-ground-material',scene.materials);scene.materials.push({...materialDefaults(id),palette:['#454b53','#555f6b','#77838c','#abb4b9']});const width=s.ground.span*4,height=s.ground.amplitude*2+1,points=Array.from({length:129},(_,i)=>{const x=-width/2+width*i/128;return [(x+width/2),height/2-(previewHeight(s.ground,x)-s.ground.height)];}),outline=points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ')+` L ${width} ${height} L 0 ${height} Z`,asset=unique('preview-ground-profile',p.assets);p.assets.push({id:asset,src:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path data-ink-role="body" fill="#77838c" d="${outline}"/></svg>`)});const n=nodeDefaults(unique('preview-ground',scene.nodes),'extrude');Object.assign(n,{name:'Preview ground',material:id,svg:asset,position:[0,s.ground.height,0],dimensions:[width,height,width],collider:true});scene.nodes.push(n);}

 return p;
}
