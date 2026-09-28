import fs from 'node:fs/promises';
import {preparePuppet,puppetFrame} from '../puppet-studio/experiments/expressive-character/frog/layered/puppet.js';
import {exportPose} from '../puppet-studio/experiments/expressive-character/frog/layered/export.js';
import {validateProject,identity} from '../puppet-studio/runtime.js';
const root='puppet-studio/experiments/expressive-character/frog',load=p=>fs.readFile(root+'/'+p,'utf8').then(JSON.parse);
const [library,drawings,original]=await Promise.all(['layered/assets/layers.json','intentional/assets/svg/drawings.json','assets/performance/drawings.json'].map(load));
const rig=preparePuppet(library,drawings,original),base=exportPose(puppetFrame(rig,0,{pose:'composed'}));
base.name='Frog wizard · Layered pose library';base.assets=[];base.clips=[];base.source.description='Eight editable held poses sharing 17 independently controlled drawing layers. The browser study demonstrates the animated sequence and voiced mouth controls.';
for(const name of Object.keys(library.poses)){
 const pose=exportPose(puppetFrame(rig,0,{pose:name})),artwork={},tracks={};
 for(const a of pose.assets){const id=name+'-'+a.id;base.assets.push({...a,id});artwork[a.id]={asset:id,threshold:.5};}
 for(const j of pose.joints){const rest=base.joints.find(b=>b.id===j.id).rest;tracks[j.id]=[{time:0,easing:'step',value:Object.fromEntries(Object.keys(identity()).map(k=>[k,k.startsWith('scale')?j.rest[k]/rest[k]:j.rest[k]-rest[k]]))}];}
 base.clips.push({id:name,name:name[0].toUpperCase()+name.slice(1)+' pose',duration:2,fps:24,loop:false,tracks,tools:{layers:[{id:name+'-artwork',name:'Registered '+name+' drawings',enabled:true,weight:1,values:{},artwork}]}});
}
for(const j of base.joints)if(j.sprite)j.sprite.asset='composed-'+j.id;
validateProject(base);const file=root+'/layered/frog-layered.puppet.json',json=JSON.stringify(base);await fs.writeFile(file,json);console.log('Exported',base.joints.length,'joints,',base.clips.length,'poses,',(json.length/1e6).toFixed(2),'MB');
