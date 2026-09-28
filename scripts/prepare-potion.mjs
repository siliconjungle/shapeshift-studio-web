import fs from 'node:fs/promises';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const out='puppet-studio/experiments/potion/assets';
for(const name of ['bottle','bottle-open','bottle-plain']){
 const target=out+'/'+name+'-traced.svg';
 if(!process.argv.includes('--force')&&await fs.access(target).then(()=>true,()=>false)){console.log('Reusing '+target);continue;}
 const result=await convert(await fs.readFile(out+'/'+name+'-source.png'),{preset:'cel',colors:10,preserveDarkColors:true});
 await fs.writeFile(target,result.svg);await fs.writeFile(out+'/'+name+'-vectorization.json',JSON.stringify(result.stats,null,2));console.log(name,result.stats);
}
