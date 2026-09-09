// Linked sources address ordinary editable joints and clips in the same document.
// They never replace the destination rig or flatten animation to image frames.
export function puppetSourceKey(node){return JSON.stringify([node.puppet?.source??'',node.variant??node.puppet?.variant??'']);}
export function puppetSource(project,variant,sourceId){
 project={...project,...project._variantSources?.[variant]};const definition=sourceId?project.puppetSources?.find(s=>s.id===sourceId):null;
 if(sourceId&&!definition)throw Error('Missing linked puppet source '+sourceId);
 let joints=project.joints,clips=project.clips;
 if(definition){const ids=new Set(definition.roots);let changed=true;while(changed){changed=false;for(const n of joints)if(ids.has(n.parent)&&!ids.has(n.id)){ids.add(n.id);changed=true;}}joints=joints.filter(j=>ids.has(j.id));clips=clips.filter(c=>definition.clips.includes(c.id));}
 const {format,version,fx,lighting}=project,source={format,version,name:definition?.name??project.name,joints,clips,fx:definition&&!definition.projectDefault?undefined:fx,lighting,audioLibraries:{...project.scene3d?.audioLibraries,...project.audioLibraries}},refs=new Set();
 function visit(v){if(typeof v==='string')refs.add(v);else if(v&&typeof v==='object')for(const x of Object.values(v))visit(x);}visit(source);
 return {...source,voiceOverrides:project.appearance?.variants.find(v=>v.id===(variant??project.appearance.active))?.voices,assets:project.assets.filter(a=>refs.has(a.id))};
}
export function validatePuppetSources(p){
 const check=(ok,message)=>{if(!ok)throw Error('Puppet source: '+message);},definitions=p.puppetSources??[];check(Array.isArray(definitions)&&definitions.length<=64,'maximum 64 linked sources');const ids=new Set();
 for(const s of definitions){check(typeof s.id==='string'&&/^[a-zA-Z0-9][\w.-]{0,79}$/.test(s.id)&&!['constructor','prototype','__proto__'].includes(s.id)&&!ids.has(s.id),'invalid source ID');ids.add(s.id);check(typeof s.name==='string'&&s.name.length<=200,'invalid source name');check(Array.isArray(s.roots)&&s.roots.length>0&&new Set(s.roots).size===s.roots.length&&s.roots.every(id=>p.joints.some(j=>j.id===id&&!j.parent)),'source roots must be editable root joints');check(Array.isArray(s.clips)&&s.clips.length>0&&new Set(s.clips).size===s.clips.length&&s.clips.every(id=>p.clips.some(c=>c.id===id)),'missing source animation');
  const source=puppetSource(p,undefined,s.id),joints=new Set(source.joints.map(j=>j.id));
  for(const c of source.clips){const references=[...Object.keys(c.tracks),...(c.effects??[]).map(e=>e.joint),...(c.resolvedTracks??[]).map(t=>t.node),...(c.lightingTracks??[]).map(t=>t.node)];for(const [end,chain]of Object.entries(c.ik??{}))references.push(end,chain.root,chain.mid);for(const t of [...(c.tools?.constraints??[]),...(c.tools?.follow??[])])references.push(...[t.joint,t.target,t.source,t.chain?.root,t.chain?.mid].filter(Boolean));for(const l of c.tools?.layers??[]){references.push(...Object.keys(l.values??{}),...(l.joints??[]));if(l.sourceClip)check(s.clips.includes(l.sourceClip),'layer animation belongs to a different source');}check(references.every(id=>joints.has(id)),'animation refers to a joint outside its source');}
 }
 for(const n of p.scene3d?.nodes??[]){if(n.type!=='puppet'||!n.puppet?.source)continue;check(ids.has(n.puppet.source),'missing linked rig');const source=puppetSource(p,undefined,n.puppet.source);check(source.clips.some(c=>c.id===n.puppet.clip),'animation belongs to a different puppet source');for(const child of p.scene3d.nodes)if(child.parent===n.id&&child.attachment)check(source.joints.some(j=>j.id===child.attachment),'missing attachment joint');}
}
