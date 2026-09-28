#!/usr/bin/env node
import fs from 'node:fs/promises';
import {queryCatalog,commandInfo,expandRecipe,featureCatalog} from '@shapeshift-labs/studio-core/catalog';
import { randomUUID } from 'node:crypto';

const argv=process.argv.slice(2),options={};
for(let i=0;i<argv.length;)if(argv[i].startsWith('--')){const key=argv.splice(i,1)[0].slice(2);options[key]=argv.splice(i,1)[0];}else i++;
const base=options.url??process.env.STUDIO_URL??'http://127.0.0.1:4354';
async function request(path,value){const res=await fetch(base+path,value===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const data=await res.json();if(!res.ok)throw Error(data.error??res.statusText);return data;}
async function main(){
 const [command='help',operation]=argv;
 if(command==='help'){console.log('Usage: studio catalog [feature-id] | recipe <recipe-id> | sessions | inspect | capabilities | call <operation> | dispatch | export <format> | result <id>\nOptions: --url URL --session ID --json JSON --file FILE --revision N --context TOKEN --request-id ID --answers JSON --out FILE --timeout MS\nOffline discovery: catalog --query TEXT --scope core|web --category CATEGORY; catalog --command COMMAND; catalog --all true. Recipe inputs: recipe ID --json JSON. Discovery prints data and never executes recipes.\nUse capabilities for operation arguments; inspect exposes current UI control references.');return;}
 if(command==='catalog')return options.all==='true'?featureCatalog:options.command?commandInfo(options.command):queryCatalog({id:operation,query:options.query??'',category:options.category,scope:options.scope});
 if(command==='recipe')return expandRecipe(operation,options.file?JSON.parse(await fs.readFile(options.file,'utf8')):JSON.parse(options.json??'{}'));
 if(command==='sessions')return request('/api/sessions');
 if(command==='result')return request('/api/requests/'+encodeURIComponent(operation));
 const sessions=(await request('/api/sessions')).sessions;
 const session=options.session?sessions.find(s=>s.id===options.session):sessions.length===1?sessions[0]:null;
 if(!session)throw Error(sessions.length?'Choose an editor with --session ID; use sessions to list open tabs.':'No live editor. Run npm start and open its URL in a browser.');
 const args=options.file?JSON.parse(await fs.readFile(options.file,'utf8')):options.json?JSON.parse(options.json):{};
 const op=command==='call'?operation:command==='dispatch'?'document.dispatch':command==='export'?'export':command==='inspect'?'editor.inspect':command==='capabilities'?'api.describe':null;
 if(!op)throw Error('Unknown command; use help');
 const submitted=await request(`/api/sessions/${session.id}/call`,{op,...options.context?{expectedContext:options.context}:{},...options.answers?{answers:JSON.parse(options.answers)}:{},args:command==='dispatch'?{commands:args}:command==='export'?{...args,format:operation}:args,...options.revision!==undefined?{expectedRevision:Number(options.revision)}:{},requestId:options['request-id']??randomUUID()});
 const end=Date.now()+Number(options.timeout??60000);let result=submitted;
 while(!result.response&&Date.now()<end){await new Promise(resolve=>setTimeout(resolve,100));result=await request('/api/requests/'+submitted.id);}
 if(!result.response){process.exitCode=2;return{...result,message:'Command is still pending. Use result with this ID; do not submit it again.'};}
 if(!result.response.ok){process.exitCode=1;return result.response;}
 if(options.out){const artifact=result.response.result?.artifact??result.response.artifacts?.[0];if(!artifact)throw Error('This operation returned no artifact');await fs.writeFile(options.out,artifact.encoding==='base64'?Buffer.from(artifact.data,'base64'):artifact.data);return{ok:true,revision:result.response.revision,file:options.out,name:artifact.name,type:artifact.type};}
 return result.response;
}
try{const result=await main();if(result!==undefined)console.log(JSON.stringify(result,null,2));}catch(error){console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=1;}
