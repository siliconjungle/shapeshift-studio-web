import {identity,inverse,multiply} from '@shapeshift-labs/studio-core/joint-transforms';
import {svgText} from '@shapeshift-labs/studio-core/vector/model';
import {expandClips} from '../../../../portrait/studio-export.js';
import {labels} from './puppet.js';
export function exportPose(frame){
 const project={format:'inkwell-puppet',version:1,name:'Frog wizard · layered '+frame.pose,source:{character:'frog-wizard',method:'Image-to-image hidden-area reconstruction + original vector pieces',pose:frame.pose},assets:[],joints:[{id:'root',name:'Portrait root',parent:null,rest:identity(),layer:0}],clips:[{id:'pose',name:frame.pose,duration:2,fps:24,loop:false,tracks:{}}]};
 for(const l of frame.layers){let shapes=l.shapes;
  if(l.id==='tongue'&&shapes.some(s=>s.clip))shapes=expandClips([...frame.layers.find(l=>l.id==='mouth').shapes,...shapes]).slice(1);
  const v={version:1,viewBox:[-320,-320,640,640],duration:2,loop:false,shapes:shapes.map((s,i)=>({hidden:false,locked:false,stroke:'none',strokeWidth:0,opacity:1,fillRule:'nonzero',lineCap:'round',lineJoin:'round',...s,id:l.id+'-'+i,name:l.id+' '+i,clip:undefined})),tracks:[],swatches:[]};
  project.assets.push({id:l.id,name:labels[l.id],vector:v,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText(v))});
  const parent=frame.layers.find(e=>e.id===l.parent),local=parent?multiply(inverse(parent.world),l.world):l.world,[a,b,c,d,x,y]=local;
  project.joints.push({id:l.id,name:labels[l.id],parent:l.parent,layer:l.order,rest:{x,y,rotation:Math.atan2(b,a)*180/Math.PI,scaleX:Math.hypot(a,b),scaleY:Math.hypot(c,d)},sprite:{asset:l.id,width:640,height:640,pivotX:.5,pivotY:.5}});
 }
 return project;
}
