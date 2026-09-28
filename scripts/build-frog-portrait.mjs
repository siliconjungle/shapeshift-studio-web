import fs from 'node:fs/promises';import {build} from 'esbuild';
const relative='puppet-studio/experiments/expressive-character/frog';
await fs.mkdir('dist/'+relative,{recursive:true});
await fs.rm('dist/'+relative+'/audio',{recursive:true,force:true});
for(const name of ['frog-performance.puppet.json','frog-wizard.puppet.json','index.html','style.css','control-lab.html','performance.css','assets','audio','README.md']){try{await fs.cp(relative+'/'+name,'dist/'+relative+'/'+name,{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}}
await build({entryPoints:[relative+'/app.js'],outfile:'dist/'+relative+'/app.js',bundle:true,format:'esm',target:'es2022',minify:false});
await build({entryPoints:[relative+'/performance-app.js'],outfile:'dist/'+relative+'/performance-app.js',bundle:true,format:'esm',target:'es2022',minify:false});
await fs.copyFile('puppet-studio/experiments/expressive-character/index.html','dist/puppet-studio/experiments/expressive-character/index.html');
console.log('Frog portrait: http://127.0.0.1:4354/'+relative+'/index.html');
await import('./build-frog-intentional.mjs');
await import('./build-frog-layers.mjs');
