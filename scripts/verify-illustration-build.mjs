import {build} from 'esbuild';
import {writeFile} from 'node:fs/promises';
await build({entryPoints:['puppet-studio/illustration/browser-check.js'],outfile:'dist/illustration-check.js',bundle:true,format:'esm'});
await writeFile('dist/illustration-check.html','<!doctype html><meta charset="utf-8"><title>Illustration rendering check</title><p>Original / Baked edges / Higher resolution</p><script type="module" src="illustration-check.js"></script>');
console.log('Open http://127.0.0.1:4354/illustration-check.html with npm start running.');
