import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const shared={name:'shared-three',setup(b){b.onResolve({filter:/^three(?:\/addons\/(?:loaders\/SVGLoader|shaders\/FXAAShader)\.js)?$/},()=>({path:path.join(root,'puppet-studio/scene3d/vendor.js')}));}};
await build({absWorkingDir:root,entryPoints:['scripts/noodle-proof-entry.js'],outfile:'dist/puppet-studio/noodle-proof.js',bundle:true,format:'esm',plugins:[shared]});
await fs.writeFile(path.join(root,'dist/puppet-studio/noodle-proof.html'),`<!doctype html><meta charset="utf-8"><title>Noodle rendering proof</title><style>body{background:#edf0dc;color:#28383a;font:16px system-ui}#frames{display:flex;flex-wrap:wrap}figure{margin:12px}canvas{width:360px;height:300px}</style><h1 id="status">Checking rendering</h1><pre id="result"></pre><div id="frames"></div><script type="module" src="./noodle-proof.js"></script>`);
