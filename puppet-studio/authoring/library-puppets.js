import {puppetSource,puppetSourceKey} from '../puppet-sources.js';
import {projectAppearance} from './appearance.js';
import {captureComponentDependencies,importComponentDependencies,componentDependencyNodes} from './library-dependencies.js';
import {captureComponentMotion,captureMotionDependencies,bindComponentClip} from './library-motion.js';
const copy=x=>structuredClone(x),check=(ok,m)=>{if(!ok)throw Error('Library puppet: '+m);};
export function capturePuppetDependencies(p,nodes){
 const result={},styled=projectAppearance(p);
 for(const n of nodes){if(n.type!=='puppet')continue;const key=puppetSourceKey(n);if(result[key])continue;
 const source=copy(puppetSource(styled,n.variant??n.puppet.variant,n.puppet.source));for(const j of source.joints){delete j.librarySource;delete j.facialSource;}
 // Resolve the selected voice palette before importing into another style catalog.
 for(const c of source.clips)for(const e of c.cues??[])if(e.audio&&source.voiceOverrides?.[e.audio.library])e.audio.library=source.voiceOverrides[e.audio.library];delete source.voiceOverrides;
 const motion=captureComponentMotion(source,2,source.joints),dependencies=captureComponentDependencies(source,2,source.joints);captureMotionDependencies(source,2,motion,dependencies);
 result[key]={name:source.name,nodes:source.joints,motion,dependencies};
 }return result;
}
export function importPuppetDependencies(p,item){
 const packets=item.dependencies?.puppets??{},maps={};if(!Object.keys(packets).length)return maps;p.puppetSources??=[];
 // Pin existing 'whole project' instances before appending another editable rig.
 // Otherwise adding a source would make those instances render both characters.
 if(!p.puppetSources.some(s=>s.projectDefault)){
  let id='project-rig',i=2;while(p.puppetSources.some(s=>s.id===id))id='project-rig-'+i++;
  p.puppetSources.push({id,name:p.name,projectDefault:true,roots:p.joints.filter(j=>!j.parent).map(j=>j.id),clips:p.clips.map(c=>c.id)});
  for(const n of p.scene3d?.nodes??[])if(n.type==='puppet'&&!n.puppet.source)n.puppet.source=id;
 }
 for(const [key,packet]of Object.entries(packets)){
 // Existing placed uses share their editable rig. A new source revision receives
 // its own definition so unrelated hand-edited sources cannot be overwritten.
 const existing=p.puppetSources.find(s=>s.library?.id===item.id&&s.library.key===key&&s.library.revision===item.revision);
 if(existing){maps[key]={source:existing.id,joints:copy(existing.library.joints),clips:copy(existing.library.clips)};continue;}
 const prefix=item.id.slice(0,32)+'-rig-'+p.puppetSources.length,joints={},clips={},usedJoints=new Set(p.joints.map(j=>j.id)),usedClips=new Set(p.clips.map(c=>c.id));
 const unique=(base,used)=>{let id=base,i=2;while(used.has(id))id=base+'-'+i++;used.add(id);return id;};
 for(const [i,j]of packet.nodes.entries())joints[j.id]=unique(prefix+'-'+i,usedJoints);for(const [i,c]of packet.motion.clips.entries())clips[c.id]=unique(prefix+'-clip-'+i,usedClips);
 const deps=importComponentDependencies(p,{id:prefix,dimension:2,dependencies:packet.dependencies}),added=componentDependencyNodes(packet.nodes,deps).map(n=>({...n,id:joints[n.id],parent:n.parent?joints[n.parent]:null,...(n.bodyJoin?{bodyJoin:{...n.bodyJoin,targetNode:joints[n.bodyJoin.targetNode]}}:{})}));
 p.joints.push(...added);for(const c of packet.motion.clips)p.clips.push(bindComponentClip(c,2,joints,clips,deps));
 const id=unique(prefix,new Set(p.puppetSources.map(s=>s.id)));p.puppetSources.push({id,name:packet.name,roots:added.filter(j=>!j.parent).map(j=>j.id),clips:Object.values(clips),library:{id:item.id,key,revision:item.revision,joints:copy(joints),clips:copy(clips)}});maps[key]={source:id,joints,clips};
 }return maps;
}
export function remapPuppetNodes(nodes,maps){
 const sourceNodes=new Map(nodes.map(n=>[n.id,n]));return nodes.map(original=>{const n=copy(original);if(n.type==='puppet'){const m=maps[puppetSourceKey(n)];if(m){check(m.clips[n.puppet.clip],'missing source animation');n.puppet.source=m.source;n.puppet.clip=m.clips[n.puppet.clip];delete n.puppet.variant;delete n.variant;}}
 if(n.attachment){const parent=sourceNodes.get(n.parent),m=parent&&maps[puppetSourceKey(parent)];if(m){check(m.joints[n.attachment],'missing source attachment');n.attachment=m.joints[n.attachment];}}
 return n;});
}
