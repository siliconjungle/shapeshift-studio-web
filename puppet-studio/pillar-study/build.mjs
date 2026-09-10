import {build} from 'esbuild';
await build({entryPoints:[new URL('./study.js',import.meta.url).pathname],outfile:new URL('./study.bundle.js',import.meta.url).pathname,bundle:true,format:'esm',minify:true,legalComments:'eof',plugins:[{name:'shared-three',setup(b){b.onResolve({filter:/^three$/},()=>({path:new URL('../scene3d/vendor.js',import.meta.url).pathname}));}}]});
