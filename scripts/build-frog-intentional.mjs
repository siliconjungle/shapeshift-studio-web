import fs from 'node:fs/promises';import {build} from 'esbuild';
const source='puppet-studio/experiments/expressive-character/frog/intentional',dest='dist/'+source;await fs.mkdir(dest,{recursive:true});
for(const file of ['index.html','assets','README.md','frog-intentional.puppet.json']){try{await fs.cp(source+'/'+file,dest+'/'+file,{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}}
await build({entryPoints:[source+'/app.js'],outfile:dest+'/app.js',bundle:true,format:'esm',target:'es2022'});console.log('Built intentional pose study');
