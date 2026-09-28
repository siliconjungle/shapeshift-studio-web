import {svgFrame,animatedSVG} from '@shapeshift-labs/studio-core/video-vectorizer';
self.onmessage=async({data})=>{
 try{
  if(data.type==='export')self.postMessage({type:'export',svg:animatedSVG(data.clip,{loop:data.loop})});
  else if(data.type==='frames')for(let i=0;i<data.clip.frameCount;i++)self.postMessage({type:'frame',index:i,svg:svgFrame(data.clip,{frame:i})});
 }catch(error){self.postMessage({type:'error',message:error.message})}
};
