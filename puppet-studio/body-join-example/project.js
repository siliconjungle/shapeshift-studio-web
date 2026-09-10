import {identity,setKey} from '../runtime.js';
import {makeBodyJoin} from '../body-joins.js';
export async function bodyJoinExample({base=new URL('./body-join-example/',document.baseURI).href}={}){
 const body=await fetch(base+'body.json').then(r=>r.json());
 const solid=(id,svg)=>({id,src:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">${svg}</svg>`)});
 const p={format:'inkwell-puppet',version:1,name:'Snake · soft body join',assets:[{id:'snake-body',src:base+'body.svg'},{id:'snake-head',src:base+'head.svg'},solid('eye','<ellipse cx="50" cy="50" rx="46" ry="48" fill="#211824"/>'),solid('glint','<circle cx="50" cy="50" r="46" fill="#fff8df"/>')],joints:[],clips:[]};
 const add=(id,name,parent,x,y,layer,sprite)=>p.joints.push({id,name,parent,rest:{...identity(),x,y},layer,...(sprite?{sprite}:{})});
 add('root','Snake',null,0,0,0);add('body','Body','root',-70,-40,10,{asset:'snake-body',...body});
 const hh=104,hw=hh*392/285;
 add('head','Head','body',158.6,-60,20,{asset:'snake-head',width:hw,height:hh,pivotX:.3,pivotY:1});
 add('eye','Eye','head',hw*.235,-hh*.56,25,{asset:'eye',width:8.8,height:19.2,pivotX:.5,pivotY:.5});
 add('glint','Eye highlight','eye',-1.2,-3,26,{asset:'glint',width:3.2,height:3.2,pivotX:.5,pivotY:.5});
 p.joints.find(j=>j.id==='head').bodyJoin=makeBodyJoin(p,'head','body',{radius:115});
 const clip=(id,name,duration)=>{const c={id,name,duration,fps:30,loop:true,tracks:{}};p.clips.push(c);return c;};
 const sway=clip('sway','Look & sway',6),turn=clip('turn','Big head turns',4),strike=clip('strike','Strike & recover',2.4);
 const key=(c,id,t,v)=>setKey(c,id,t,{...identity(),...v});
 for(const [t,rotation,x,y]of [[0,-22,-5,0],[1.5,30,12,-12],[3,-30,-12,8],[4.5,22,10,-10],[6,-22,-5,0]]){key(sway,'head',t,{rotation,x,y});key(sway,'body',t,{rotation:Math.sin(t*Math.PI/3)*2});}
 for(const [t,r]of [[0,0],[1,45],[2,0],[3,-45],[4,0]])key(turn,'head',t,{rotation:r});
 for(const [t,r,x,y]of [[0,0,0,0],[.6,-22,-15,8],[.85,32,48,-10],[1.05,25,42,-5],[1.65,-12,-8,0],[2.4,0,0,0]])key(strike,'head',t,{rotation:r,x,y});
 for(const c of p.clips)for(const [t,s]of [[0,1],[c.duration*.68,1],[c.duration*.7,.08],[c.duration*.73,1],[c.duration,1]])key(c,'eye',t,{scaleY:s});
 return p;
}
