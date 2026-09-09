import {libraryPreviewProject} from './library.js';

// One preview runs at a time. Hovering a shelf must not create a WebGL context
// per card, play sound, alter the editor's camera, or advance its playhead.
export function libraryPreview(){
 let generation=0,queue=Promise.resolve(),active=null,raf=0,diagnostic=null;
 function release(){cancelAnimationFrame(raf);active?.dispose();active=null;}
 function stop(){generation++;release();}
 function play(project,item,canvas,onError=()=>{}){
  const ticket=++generation;release();diagnostic={id:item.id,frames:0,time:0};
  queue=queue.catch(()=>{}).then(async()=>{
   if(ticket!==generation)return;const {project:p,clip:id}=item.category==='sounds'?{project:null,clip:null}:libraryPreviewProject(project,item),clip=item.category==='sounds'?{duration:Math.max(1,item.packet.duration+.4)}:(item.dimension===3?p.scene3d:p).clips.find(c=>c.id===id);let draw,dispose;
   if(item.category==='sounds'){draw=t=>drawSound(canvas,item,t,clip.duration);dispose=()=>{};}else if(item.dimension===3){
    const [{IllustratedScene},T]=await Promise.all([import('../scene3d/runtime.js'),import('../scene3d/vendor.js')]);if(ticket!==generation)return;
    const surface=document.createElement('canvas'),scene=new IllustratedScene(surface);scene.resize(256,168);
    try{await scene.load(p);scene.effects.muted=true;if(ticket!==generation){scene.dispose();return;}
     if(item.category!=='actions'){const root=scene.objects.get(item.root??(item.category==='expressions'?item.expression.node:undefined));if(root){const box=new T.Box3().setFromObject(root),center=box.getCenter(new T.Vector3()),size=Math.max(.5,box.getSize(new T.Vector3()).length());scene.setCamera({...p.scene3d.camera,type:'orthographic',position:[center.x+size*(item.category==='expressions'?.25:1),center.y+size*(item.category==='expressions'?.15:.65),center.z+size*1.5],target:center.toArray(),size:size*1.25,zoom:1});}}
     else scene.setCamera({...p.scene3d.camera,zoom:1});
     let last=-1;draw=t=>{if(scene.pipeline&&last>=0&&t>=last){for(let at=last;at<t-1e-9;){at=Math.min(t,at+1/30);scene.seek(at,id,{continuous:true,audible:false});}}else scene.seek(t,id,{continuous:t>=last,audible:false});last=t;scene.render(true);if(item.category==='expressions'){const a=scene.pipeline?.actors.get(item.expression.node)??scene.facials.actors.get(item.expression.node),face=a?.facial??a,open=scene.readChannel(item.expression.node,'eye.open');Object.assign(diagnostic,{faceTime:face?.time,open,minOpen:Math.min(diagnostic.minOpen??open,open),maxOpen:Math.max(diagnostic.maxOpen??open,open)});}const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(surface,0,0,canvas.width,canvas.height);};dispose=()=>scene.dispose();
    }catch(e){scene.dispose();throw e;}
   }else{
    const {loadImages,renderFrame,motionBounds,poseAt,point}=await import('../runtime.js'),images=await loadImages(p);let framing=motionBounds(p,clip);if(item.category==='expressions'){const poses=poseAt(p,clip,1),points=Object.keys(item.expression.values).flatMap(id=>{const v=poses.get(id),s=v?.joint.sprite;if(!v)return[];return s?[[0,0],[1,0],[0,1],[1,1]].map(([x,y])=>point(v.world,{x:(x-s.pivotX)*s.width,y:(y-s.pivotY)*s.height})):[point(v.world,{x:0,y:0})];});if(points.length){const xs=points.map(v=>v.x),ys=points.map(v=>v.y),x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2,size=Math.max(1,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))*1.3;framing={minX:x-size,maxX:x+size,minY:y-size,maxY:y+size};}}dispose=()=>{for(const model of images.models?.values()??[])model.dispose?.();};
    draw=t=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(renderFrame(p,images,clip,t,{width:canvas.width,height:canvas.height,framing,background:'#292a2d'}),0,0);};
   }
   if(ticket!==generation){dispose();return;}active={dispose};const start=performance.now();let previous=-1,playhead=0;
   const tick=now=>{if(ticket!==generation)return;if(now-previous>=1000/24){if(previous>=0)playhead=(playhead+Math.min(.1,(now-previous)/1000))%Math.max(.05,clip.duration);previous=now;draw(playhead);diagnostic.time=playhead;diagnostic.frames++;canvas.dataset.ready='true';canvas.dataset.previewTime=String(playhead);}raf=requestAnimationFrame(tick);};tick(start);
  }).catch(e=>{if(ticket===generation){release();onError(e);}});
  return queue;
 }
 return{play,stop,dispose:stop,snapshot:()=>({...diagnostic,running:!!active})};
}

function drawSound(canvas,item,time,duration){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,layers=item.packet.events.flatMap(e=>(item.packet.audioLibraries[e.audio?.library]?.cues[e.audio?.cue]??[]).map(v=>({time:e.time+(v.delay??0),duration:v.duration,gain:v.gain,kind:v.kind})));c.fillStyle='#252528';c.fillRect(0,0,w,h);c.fillStyle='#d2d7e0';c.font='12px system-ui';c.fillText('Sound · '+layers.length+' layers',16,23);const n=Math.min(8,layers.length),row=90/Math.max(1,n);for(let i=0;i<n;i++){const v=layers[i];c.fillStyle=v.kind==='noise'?'#b793cc':'#85a9d1';c.globalAlpha=.45+Math.min(.55,v.gain*2);c.fillRect(16+v.time/duration*(w-32),38+i*row,Math.max(2,v.duration/duration*(w-32)),Math.max(3,row-4));}c.globalAlpha=1;c.strokeStyle='#eef1f7';c.beginPath();c.moveTo(16+time/duration*(w-32),32);c.lineTo(16+time/duration*(w-32),134);c.stroke();c.fillStyle='#a6a9b3';c.font='10px system-ui';c.fillText('Listen to hear the next variation',16,h-14);
}
