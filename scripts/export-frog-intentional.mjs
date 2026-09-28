import {UTTERANCES} from '../puppet-studio/experiments/expressive-character/frog/performance-audio.js';
import fs from 'node:fs/promises';
import {prepare} from '../puppet-studio/experiments/expressive-character/frog/intentional/performance.js';
import {exportIntentional} from '../puppet-studio/experiments/expressive-character/frog/intentional/studio-export.js';
import {validateProject} from '../puppet-studio/runtime.js';
const root='puppet-studio/experiments/expressive-character/frog',load=p=>fs.readFile(root+'/'+p,'utf8').then(JSON.parse);
const [drawings,original,manifest,native]=await Promise.all(['intentional/assets/svg/drawings.json','assets/performance/drawings.json','audio/babble/manifest.json','intentional/assets/native/artwork.json'].map(load));
const project=exportIntentional(prepare(drawings,original),native,manifest);
// This native portrait already has authored mouth animation baked into its SVG
// tracks. Attach the same recordings/timestamps without applying a second pose.
project.source.voicePlayback='Embedded Hume chunks on the native Speech timeline; existing SVG mouth animation retained.';
project.speech={version:1,chunks:{},rigs:{portrait:{name:'Authored portrait performance',poses:{rest:{}}}}};
for(const {id} of UTTERANCES){const c=manifest.clips[id],bytes=await fs.readFile(root+'/audio/'+c.file);project.speech.chunks[id]={name:id,src:'data:audio/mpeg;base64,'+bytes.toString('base64'),duration:c.duration,cues:c.cues,envelope:c.envelope,envelopeRate:c.envelopeRate};}
project.clips[0].dialogue=UTTERANCES.map(({at,id})=>({id:'voice-'+id,time:at,chunk:id,rig:'portrait',rate:1,gain:.72}));
validateProject(project);
const json=JSON.stringify(project);await fs.writeFile(root+'/intentional/frog-intentional.puppet.json',json);
console.log(JSON.stringify({assets:project.assets.length,shapes:project.assets.reduce((n,a)=>n+a.vector.shapes.length,0),keys:project.assets.reduce((n,a)=>n+a.vector.tracks.reduce((n,t)=>n+t.keys.length,0),0),megabytes:(json.length/1e6).toFixed(2)}));
