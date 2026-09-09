import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'studio-examples-'));
try{execFileSync('gh',['release','download','examples-v1','--repo','siliconjungle/shapeshift-studio-web','--pattern','studio-examples.zip','--dir',dir],{stdio:'inherit'});execFileSync('unzip',['-q','-o',path.join(dir,'studio-examples.zip'),'-d',root],{stdio:'inherit'});}finally{await fs.rm(dir,{recursive:true,force:true});}
