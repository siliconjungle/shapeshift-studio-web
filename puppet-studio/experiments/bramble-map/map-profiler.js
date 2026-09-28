// Opt-in diagnosis only: ?profile=1. No timers or probes on normal map visits.
import {configureAntialiasing} from './antialiasing.js';
const modes=['all','no-shadows','no-grading','all'];
const postModes=['all','no-fxaa','no-colour-grade','no-msaa','byte-target','no-foreground-post','all'];
const stats=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return{n:a.length,mean:a.reduce((s,n)=>s+n,0)/a.length,p95:a[Math.floor((a.length-1)*.95)],p99:a[Math.floor((a.length-1)*.99)],max:a.at(-1)}};
export class MapProfiler{
 constructor(){const profile=new URLSearchParams(location.search).get('profile');this.modes=profile==='aa'?['high','light','light','high']:profile==='post'?postModes:modes;this.phase=0;this.frames=0;this.samples=[];this.pending=[];this.gpu=new Map();this.last=0;this.results=[];this.output=document.createElement('script');this.output.type='application/json';this.output.id='map-profile';document.body.append(this.output);this.publish();}
 get mode(){return this.modes[this.phase]??'all'}
 // Diagnostic variants change one stage at a time; normal rendering never calls this.
 configure(map,T){
  if(this.configuredMode===this.mode)return;this.configuredMode=this.mode;
  if(this.mode==='high'||this.mode==='light'){for(const pass of [map.grade,map.foregroundGrade])configureAntialiasing(pass,this.mode);return;}
  for(const pass of [map.grade,map.foregroundGrade]){
   pass.profileOriginal??={shader:pass.material.fragmentShader,samples:pass.target.samples,type:pass.target.texture.type};
   const original=pass.profileOriginal;
   let shader=original.shader;
   if(this.mode==='no-fxaa')shader=shader.replace('void main(){smoothScene();','void main(){gl_FragColor=texture2D(tDiffuse,vUv);');
   if(this.mode==='no-colour-grade')shader=shader.replace('gl_FragColor.rgb=gradeLinear(gl_FragColor.rgb);','');
   if(shader!==pass.material.fragmentShader){pass.material.fragmentShader=shader;pass.material.needsUpdate=true;}
   const samples=this.mode==='no-msaa'?0:original.samples,type=this.mode==='byte-target'?T.UnsignedByteType:original.type;
   if(samples!==pass.target.samples||type!==pass.target.texture.type){pass.target.dispose();pass.target.samples=samples;pass.target.texture.type=type;}
  }
 }
 begin(now){this.poll();this.start=this.stamp=performance.now();this.current={phase:this.phase,mode:this.mode,cpu:{},gpu:{},frame:this.last?now-this.last:0,valid:this.frames>=60};this.last=now;}
 mark(name){const t=performance.now();this.current.cpu[name]=t-this.stamp;this.stamp=t;}
 query(renderer,name){if(this.done)return;const gl=renderer.getContext();let g=this.gpu.get(gl);if(!g){g={gl,ext:gl.getExtension('EXT_disjoint_timer_query_webgl2')};this.gpu.set(gl,g);}if(!g.ext)return;const query=gl.createQuery();gl.beginQuery(g.ext.TIME_ELAPSED_EXT,query);return{...g,query,name,sample:this.current};}
 endQuery(q){if(q){q.gl.endQuery(q.ext.TIME_ELAPSED_EXT);this.pending.push(q);}}
 poll(){this.pending=this.pending.filter(q=>{const {gl,ext,query}=q;if(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE))return true;if(!gl.getParameter(ext.GPU_DISJOINT_EXT))q.sample.gpu[q.name]=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(query);return false;});}
 end(renderer){if(this.done)return;this.current.cpu.total=performance.now()-this.start;this.samples.push(this.current);this.frames++;if(this.frames>=150){this.results.push({phase:this.phase,mode:this.mode,counts:{records:renderer.records.length,routes:renderer.routes.length,outlines:0,shadowCasters:renderer.shadows.entries.length,buffer:[renderer.canvas.width,renderer.canvas.height]}});this.phase++;this.frames=0;if(this.phase===this.modes.length){this.done=true;setTimeout(()=>{this.poll();this.publish();},500);}this.publish();}}
 publish(){this.output.textContent=JSON.stringify({status:this.done?'complete':'running',phase:this.phase,mode:this.mode,gpuSupported:[...this.gpu.values()].some(g=>!!g.ext),summaries:this.results.map(r=>{const samples=this.samples.filter(s=>s.valid&&s.phase===r.phase);const keys=['animation','transforms','shadows','mainDraw','foregroundDraw','total'];return{...r,frame:stats(samples.map(s=>s.frame)),cpu:Object.fromEntries(keys.map(k=>[k,stats(samples.map(s=>s.cpu[k]))])),gpu:Object.fromEntries(['shadows','main','foreground'].map(k=>[k,stats(samples.map(s=>s.gpu[k]))])),hitches:samples.filter(s=>s.frame>50).length}}),samples:this.done?this.samples.filter(s=>s.valid):undefined});}
}
