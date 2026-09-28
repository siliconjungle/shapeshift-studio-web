import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),relative='puppet-studio/video-vectorizer',output=path.join(root,'dist',relative);
await fs.mkdir(output,{recursive:true});
await build({absWorkingDir:root,entryPoints:[relative+'/app.js',relative+'/worker.js'],outdir:output,bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'eof'});
for(const file of ['index.html','style.css'])await fs.copyFile(path.join(root,relative,file),path.join(output,file));
console.log('Built Studio video-to-SVG converter.');
