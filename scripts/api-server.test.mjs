import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createStudioServer} from './api-server.mjs';

test('broker isolates tabs, rejects cross-site writes, deduplicates requests and fails disconnected work',async()=>{
 const server=createStudioServer({pollTime:50});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=async(path,value,headers={})=>{const res=await fetch(base+path,{...value===undefined?{}:{method:'POST',body:JSON.stringify(value)},headers:{'Content-Type':'application/json',...headers}});return{status:res.status,data:await res.json()};};
 try{
  assert.equal((await request('/api/sessions',{}, {Origin:'https://foreign.test'})).status,403);
  const rebound=await new Promise(resolve=>{const req=http.request(base+'/api/sessions',{headers:{Host:'foreign.test:'+server.address().port}},res=>{res.resume();resolve(res.statusCode);});req.end();});assert.equal(rebound,403);
  const a=(await request('/api/sessions',{name:'A'})).data,b=(await request('/api/sessions',{name:'B'})).data;
  assert.ok(!(await request('/api/sessions')).data.sessions.some(s=>'secret'in s));
  const input={op:'document.dispatch',args:{commands:{op:'project.rename',name:'one'}},requestId:'fixed'};
  await request(`/api/sessions/${a.id}/call`,input);await request(`/api/sessions/${a.id}/call`,input);
  assert.equal((await request(`/api/sessions/${a.id}/call`,{...input,args:{}})).status,409);
  assert.equal((await request(`/api/sessions/${a.id}/next`)).status,403);
  assert.equal((await request(`/api/sessions/${b.id}/next`,undefined,{Authorization:'Bearer '+b.secret})).data.request,null);
  assert.equal((await request(`/api/sessions/${a.id}/next`,undefined,{Authorization:'Bearer '+a.secret})).data.request.id,'fixed');
  await request(`/api/sessions/${a.id}/result`,{id:'fixed',response:{ok:true,revision:1}}, {Authorization:'Bearer '+a.secret});
  assert.equal((await request('/api/requests/fixed')).data.status,'succeeded');
  assert.equal((await request(`/api/sessions/${a.id}/next`,undefined,{Authorization:'Bearer '+a.secret})).data.request,null);
  const queued=(await request(`/api/sessions/${a.id}/call`,{op:'history.undo'})).data;
  await request(`/api/sessions/${a.id}/disconnect`,{}, {Authorization:'Bearer '+a.secret});
  assert.equal((await request('/api/requests/'+queued.id)).data.response.error.code,'SESSION_DISCONNECTED');
  assert.equal((await request(`/api/sessions/${a.id}/call`,{op:'history.undo'})).status,410);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('catalogue discovery works before any editor registers and remains read-only',async()=>{
 const server=createStudioServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port;
  const search=await fetch(base+'/api/catalog?query=potion').then(r=>r.json());assert.ok(search.features.some(f=>f.id==='liquid'));
  const detail=await fetch(base+'/api/catalog?id=liquid').then(r=>r.json());assert.ok(detail.recipes.some(r=>r.id==='add-liquid'));
  const sessions=await fetch(base+'/api/sessions').then(r=>r.json());assert.deepEqual(sessions.sessions,[]);
  assert.equal((await fetch(base+'/api/catalog?id=missing')).status,400);
  assert.equal((await fetch(base+'/api/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
