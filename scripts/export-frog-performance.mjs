import fs from 'node:fs/promises';
import {preparePerformance} from '../puppet-studio/experiments/expressive-character/frog/performance.js';
import {exportPerformance} from '../puppet-studio/experiments/expressive-character/frog/performance-export.js';
import {validateProject} from '../puppet-studio/runtime.js';
const root='puppet-studio/experiments/expressive-character/frog',art=preparePerformance(JSON.parse(await fs.readFile(root+'/assets/performance/drawings.json'))),manifest=JSON.parse(await fs.readFile(root+'/audio/babble/manifest.json'));
const p=exportPerformance(art,manifest);validateProject(p);await fs.writeFile(root+'/frog-performance.puppet.json',JSON.stringify(p));console.log('Saved',p.joints.length,'joints and',p.assets.length,'editable drawing assets');
