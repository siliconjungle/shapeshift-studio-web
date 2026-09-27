export function connectEditor(api,{name,revision}) {
 let session=null,stopped=false,timer;
 const request=async(path,value)=>{const response=await fetch('/api/'+path,{...value===undefined?{}:{method:'POST',body:JSON.stringify(value)},headers:{'Content-Type':'application/json',...session?{Authorization:'Bearer '+session.secret}:{}}});if(!response.ok)throw Error('Live API connection '+response.status);return response.json();};
 async function loop(){
  while(!stopped){
   try{
    if(!session)session=await request('sessions',{name:name(),url:location.href,revision:revision()});
    const {request:next}=await request(`sessions/${session.id}/next`);
    if(next){const response=await api.call(next);await request(`sessions/${session.id}/result`,{id:next.id,response});}
   }catch{session=null;if(!stopped)await new Promise(resolve=>{timer=setTimeout(resolve,2000);});}
  }
 }
 const heartbeat=setInterval(()=>{if(session&&!stopped)request(`sessions/${session.id}/heartbeat`,{name:name(),revision:revision()}).catch(()=>{});},10000);
 function disconnect(){stopped=true;clearInterval(heartbeat);clearTimeout(timer);if(session)fetch(`/api/sessions/${session.id}/disconnect`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.secret},body:'{}',keepalive:true}).catch(()=>{});session=null;}
 // Hosted copies retain the browser API; only the loopback development server
 // offers machine access to a page. No project is sent to a hosted relay.
 if(['127.0.0.1','localhost','[::1]'].includes(location.hostname))loop();else clearInterval(heartbeat);
 window.addEventListener('pagehide',disconnect,{once:true});
 return{status:()=>({connected:!!session,id:session?.id??null}),disconnect};
}
