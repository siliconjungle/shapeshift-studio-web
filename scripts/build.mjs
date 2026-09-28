import {featureCatalog} from '@shapeshift-labs/studio-core/catalog';
import fs from 'node:fs/promises';import path from 'node:path';import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..');const out=path.join(root,'dist');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const shared={name:'shared-three',setup(b){b.onResolve({filter:/^three(?:\/addons\/(?:loaders\/SVGLoader|shaders\/FXAAShader)\.js)?$/},()=>({path:path.join(root,'puppet-studio/scene3d/vendor.js')}));}};
const options={absWorkingDir:root,bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'eof'};
await build({...options,entryPoints:['puppet-studio/app.js'],outdir:'dist/puppet-studio',chunkNames:'chunks/[name]-[hash]',splitting:true,plugins:[shared]});
await build({...options,entryPoints:['puppet-studio/dice/app.js'],outfile:'dist/puppet-studio/dice/app.js',plugins:[shared]});
for(const [input,output] of [['puppet-studio/shape-lab/worker.js','shape-lab/worker.js'],['puppet-studio/runtime.js','runtime.js'],['puppet-studio/runtime.js','runtime.portable.js'],['puppet-studio/entities/definitions.js','entities.js'],['puppet-studio/scene3d/runtime.js','scene3d/runtime.js'],['puppet-studio/scene3d/vector-worker-entry.js','scene3d/vector-worker.js']])await build({...options,entryPoints:[input],outfile:'dist/puppet-studio/'+output,plugins:[shared]});
await build({...options,entryPoints:['puppet-studio/scene3d/runtime.js'],outfile:'dist/puppet-studio/scene3d/player.bundle.js',format:'iife',globalName:'Illustrated3D',plugins:[shared],define:{'import.meta.url':JSON.stringify('')}});
for(const file of await fs.readdir(path.join(root,'puppet-studio'),{recursive:true})){const relative='puppet-studio/'+file;const stat=await fs.stat(path.join(root,relative));if(!stat.isFile())continue;if(/\.(html|css|json|txt)$/.test(file)&&!file.includes('assets/')){await fs.mkdir(path.dirname(path.join(out,relative)),{recursive:true});await fs.copyFile(path.join(root,relative),path.join(out,relative));}}
for(const folder of ['puppet-studio/scene3d/assets/dice','assets/bramble-map','assets/sunflower-puppet','puppet-studio/experiments/potion/assets'])await fs.cp(path.join(root,folder),path.join(out,folder),{recursive:true});
for(const name of ['landing-sprite.svg','landing-sprite-parts.json'])await fs.copyFile(path.join(root,'puppet-studio/scene3d/assets',name),path.join(out,'puppet-studio/scene3d/assets',name));
await fs.cp(path.join(root,'puppet-studio/body-join-example'),path.join(out,'puppet-studio/body-join-example'),{recursive:true});
await fs.writeFile(path.join(out,'index.html'),'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./puppet-studio/index.html"><title>Shapeshift Studio</title><a href="./puppet-studio/index.html">Open Shapeshift Studio</a>');
await import('./build-frog-portrait.mjs');
await import('./build-video-vectorizer.mjs');
for(const name of ['bramble-map','sunflower-puppet','potion']){
 const relative='puppet-studio/experiments/'+name;
 await build({...options,entryPoints:[relative+'/app.js'],outfile:'dist/'+relative+'/app.js'});
 for(const file of await fs.readdir(path.join(root,relative)))if(/\.(html|css|json|svg)$/.test(file))await fs.copyFile(path.join(root,relative,file),path.join(out,relative,file));
}

await build({...options,entryPoints:['features/app.js'],outfile:'dist/features/app.js'});
await fs.copyFile(path.join(root,'features/index.html'),path.join(out,'features/index.html'));
await fs.writeFile(path.join(out,'features/catalog.json'),JSON.stringify(featureCatalog));
await fs.cp(path.join(root,'docs'),path.join(out,'docs'),{recursive:true});
console.log('Built standalone Shapeshift Studio.');
