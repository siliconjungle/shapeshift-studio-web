import {queryCatalog} from '@shapeshift-labs/studio-core/catalog';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';

const types={'.md':'text/markdown; charset=utf-8','.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>192*1024*1024)throw Error('Request exceeds 192 MB');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
const equal=(a,b)=>typeof a==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));

// Sessions belong to one page lifetime. A replacement page never inherits an
// unfinished command, since its project and human editing context may differ.
export function createStudioServer({root=path.resolve(import.meta.dirname,'../dist'),sessionTTL=45000,pollTime=20000}={}){
 const sessions=new Map(),requests=new Map();
 function expire(session){sessions.delete(session.id);if(session.poll){clearTimeout(session.poll.timer);json(session.poll.res,410,{error:'Session disconnected'});}for(const request of requests.values())if(request.session===session.id&&!request.response){request.status='disconnected';request.response={ok:false,error:{code:'SESSION_DISCONNECTED',message:'The editor disconnected; inspect the project before submitting another command.'}};}}
 function info(session){return{id:session.id,name:session.name,url:session.url,revision:session.revision,lastSeen:session.lastSeen};}
 function deliver(session){if(!session.poll||!session.queue.length)return;const poll=session.poll;session.poll=null;clearTimeout(poll.timer);const request=session.queue.shift();request.status='running';json(poll.res,200,{request:{...request.command,id:request.id}});}
 const server=http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host??'';
   if(!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)){json(res,403,{error:'Loopback host required'});return;}
   const url=new URL(req.url,'http://'+host),pathname=url.pathname;
   if(pathname.startsWith('/api/')){
    // Reject cross-site browser requests, including DNS rebinding and form POSTs.
    if(req.headers.origin&&req.headers.origin!=='http://'+host){json(res,403,{error:'Same-origin requests only'});return;}
    if(req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'Same-origin requests only'});return;}
    if(req.method==='POST'&&!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON content type required'});return;}
    if(pathname==='/api/catalog'&&req.method==='GET'){json(res,200,queryCatalog({query:url.searchParams.get('query')??'',id:url.searchParams.get('id')??undefined,category:url.searchParams.get('category')??undefined,scope:url.searchParams.get('scope')??undefined}));return;}
    for(const session of sessions.values())if(Date.now()-session.lastSeen>sessionTTL)expire(session);
    if(pathname==='/api/sessions'&&req.method==='GET'){json(res,200,{sessions:[...sessions.values()].map(info)});return;}
    if(pathname==='/api/sessions'&&req.method==='POST'){
     const input=await body(req),session={id:randomUUID(),secret:randomBytes(32).toString('hex'),name:String(input.name??'Studio'),url:String(input.url??''),revision:input.revision??0,lastSeen:Date.now(),queue:[],poll:null};sessions.set(session.id,session);json(res,201,{...info(session),secret:session.secret});return;
    }
    const match=pathname.match(/^\/api\/sessions\/([^/]+)\/(call|next|result|heartbeat|disconnect)$/);
    if(match){
     const session=sessions.get(match[1]),action=match[2];if(!session){json(res,410,{error:'Session disconnected'});return;}
     if(action==='call'&&req.method==='POST'){
      const command=await body(req);if(!sessions.has(session.id)){json(res,410,{error:'Session disconnected'});return;}if(typeof command?.op!=='string')throw Error('An operation is required');
      const id=command.requestId??randomUUID();if(typeof id!=='string'||id.length>160)throw Error('Invalid request ID');delete command.requestId;
      const previous=requests.get(id);if(previous){if(previous.session!==session.id||JSON.stringify(previous.command)!==JSON.stringify(command)){json(res,409,{error:'Request ID already used for different input'});return;}json(res,200,{id,status:previous.status,response:previous.response});return;}
      if(session.queue.length>=100)throw Error('Editor queue is full');
      const request={id,session:session.id,command,status:'queued',createdAt:Date.now()};requests.set(id,request);session.queue.push(request);deliver(session);json(res,202,{id,status:request.status});return;
     }
     if(!equal(req.headers.authorization?.replace(/^Bearer /,''),session.secret)){json(res,403,{error:'Invalid session credential'});return;}
     session.lastSeen=Date.now();
     if(action==='next'&&req.method==='GET'){
      if(session.poll){json(res,409,{error:'A poll is already connected'});return;}
      const timer=setTimeout(()=>{session.poll=null;json(res,200,{request:null});},pollTime);session.poll={res,timer};req.on('close',()=>{if(session.poll?.res===res){clearTimeout(timer);session.poll=null;expire(session);}});deliver(session);return;
     }
     if(action==='result'&&req.method==='POST'){
      const input=await body(req),request=requests.get(input.id);if(!request||request.session!==session.id)throw Error('Unknown request');
      if(!request.response){request.response=input.response;request.status=input.response?.ok?'succeeded':'failed';}
      session.revision=input.response?.revision??session.revision;json(res,200,{ok:true});return;
     }
     if(action==='heartbeat'&&req.method==='POST'){const input=await body(req);session.name=String(input.name??session.name);session.revision=input.revision??session.revision;json(res,200,{ok:true});return;}
     if(action==='disconnect'&&req.method==='POST'){expire(session);json(res,200,{ok:true});return;}
    }
    const requestMatch=pathname.match(/^\/api\/requests\/([^/]+)$/);
    if(requestMatch&&req.method==='GET'){const request=requests.get(requestMatch[1]);json(res,request?200:404,request?{id:request.id,session:request.session,status:request.status,response:request.response}:{error:'Unknown request'});return;}
    json(res,404,{error:'Unknown API route'});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
   const name=decodeURIComponent(pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error('Invalid path');
   const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){if(!res.headersSent)json(res,400,{error:error.message});else res.end();}
 });
 const sweep=setInterval(()=>{for(const session of sessions.values())if(Date.now()-session.lastSeen>sessionTTL)expire(session);for(const [id,request]of requests)if(request.response&&Date.now()-request.createdAt>3600000)requests.delete(id);},Math.min(10000,sessionTTL));sweep.unref();
 server.on('close',()=>{clearInterval(sweep);for(const session of sessions.values())expire(session);});
 return server;
}
