// Common manually stepped / requestAnimationFrame playback API for both renderers.
export function machinePlayback(machine,draw,{onFrame=()=>{},dispose=()=>{}}={}){
 let raf=0,last=0,playing=false,disposed=false;
 const render=frame=>{draw(frame);onFrame(frame);return frame;};
 const api={machine,
  setInput(id,value){machine.setInput(id,value);return api;},fire(id){machine.fire(id);return api;},
  advance(dt=0){if(disposed)throw Error('Player is disposed');return render(machine.advance(dt));},
  snapshot(){return machine.snapshot();},
  reset(){api.pause();return render(machine.reset());},
  play(){if(disposed)throw Error('Player is disposed');if(playing)return;playing=true;last=performance.now();raf=requestAnimationFrame(tick);},
  pause(){playing=false;cancelAnimationFrame(raf);},stop(){api.pause();},
  dispose(){if(disposed)return;api.pause();disposed=true;dispose();}
 };
 function tick(now){if(!playing)return;const dt=Math.max(0,Math.min(.1,(now-last)/1000));last=now;try{api.advance(dt);}catch(error){api.pause();throw error;}if(playing)raf=requestAnimationFrame(tick);}
 render(machine.snapshot());return api;
}
export function dominantSample(frame){return frame.layers.flatMap(l=>l.samples).filter(s=>s.weight>0).reduce((best,s)=>!best||s.weight>=best.weight?s:best,null);}
