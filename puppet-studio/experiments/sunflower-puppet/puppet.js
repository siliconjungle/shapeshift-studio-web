import {VIEWS,sampleFlower,spriteLayout,artPart,curvePath,curveRibbon} from './motion.js';
const NS='http://www.w3.org/2000/svg',el=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;};
export function createFlowerPuppet(root,art,{assetBase='../../../assets/sunflower-puppet/'}={}){
 const views={};
 for(const view of VIEWS){
  const group=el('g',{'data-view':view}),nodes={},layers=[];root.append(group);
  const sample=sampleFlower({view});
  for(const [part,c]of Object.entries(sample.curves)){
   const g=el('g',{'data-part':part}),outline=el('path',{fill:'none',stroke:'#191c13','stroke-width':c.width+4,'stroke-linecap':'round'}),fill=el('path',{fill:'none',stroke:'#788b40','stroke-width':c.width,'stroke-linecap':'round'});if(c.endWidth!==undefined&&c.endWidth!==c.width){outline.setAttribute('fill','#191c13');outline.setAttribute('stroke','none');fill.setAttribute('fill','#788b40');fill.setAttribute('stroke','none');}g.append(outline,fill);nodes[part]={g,outline,fill};layers.push({g,layer:c.layer});
  }
  for(const part of Object.keys(sample.sprites)){
   const record=art.parts[view+'-'+artPart(part)],l=spriteLayout(view,part,record),g=el('g',{'data-part':part});
   if(l.crop){const [u,v,w,h]=l.crop,clip=el('svg',{x:-l.width*l.pivotX,y:-l.height*l.pivotY,width:l.width,height:l.height,viewBox:`${u*record.width} ${v*record.height} ${w*record.width} ${h*record.height}`,preserveAspectRatio:'none',overflow:'hidden'});clip.append(el('image',{href:assetBase+record.src,width:record.width,height:record.height}));g.append(clip);}
   else g.append(el('image',{href:assetBase+record.src,x:-l.width*l.pivotX,y:-l.height*l.pivotY,width:l.width,height:l.height}));nodes[part]={g,layout:l};layers.push({g,layer:l.layer});
  }
  layers.sort((a,b)=>a.layer-b.layer).forEach(x=>group.append(x.g));
  const joints=el('g',{'data-joints':'',fill:'#f09745',stroke:'#fff6df','stroke-width':1.5});group.append(joints);views[view]={group,nodes,joints};
 }
 function pose({view='front',time=0,clip='idle',cycle,weight=1,flip=false,explode=0,showJoints=false}={}){
  for(const [key,rig]of Object.entries(views))rig.group.style.display=key===view?'':'none';
  const rig=views[view],p=sampleFlower({view,time,clip,cycle,weight});root.setAttribute('transform',`scale(${flip?-1:1} 1)`);
  const offset=(part)=>{if(!explode)return[0,0];if(part==='head')return[0,-72*explode];if(part==='body')return[0,0];return[(part.endsWith('left')?-1:1)*65*explode,part.startsWith('foot')?40*explode:0];};
  for(const [part,s]of Object.entries(p.sprites)){const n=rig.nodes[part],o=offset(part);n.g.setAttribute('transform',`translate(${s.x+o[0]} ${s.y+o[1]}) rotate(${s.rotation}) scale(${s.scaleX??1} ${s.scaleY??1})`);}
  for(const [part,c]of Object.entries(p.curves)){const n=rig.nodes[part],d=curvePath(c.points);const taper=c.endWidth!==undefined&&c.endWidth!==c.width;n.outline.setAttribute('d',taper?curveRibbon(c):d);n.fill.setAttribute('d',taper?curveRibbon(c,2):d);n.g.setAttribute('opacity',1-explode*.8);}
  rig.joints.replaceChildren();if(showJoints)for(const s of Object.values(p.sprites))rig.joints.append(el('circle',{cx:s.x,cy:s.y,r:4}));
  root.dataset.view=view;root.dataset.clip=clip;return p;
 }
 pose();return {root,views,pose};
}
