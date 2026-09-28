import {gaitSample} from '../shared/performance-motion.js';
export const VIEWS=['front','back','side'];
export const CLIPS={idle:{duration:3.2,loop:true},walk:{duration:1.12,loop:true},wave:{duration:2.4,loop:false},delight:{duration:1.7,loop:false}};
const mix=(a,b,t)=>a+(b-a)*t, clamp=x=>Math.max(0,Math.min(1,x));
export const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const envelope=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
export function bezier(p,t){const s=1-t;return [s*s*s*p[0][0]+3*s*s*t*p[1][0]+3*s*t*t*p[2][0]+t*t*t*p[3][0],s*s*s*p[0][1]+3*s*s*t*p[1][1]+3*s*t*t*p[2][1]+t*t*t*p[3][1]];}
export function curveRibbon(curve,inset=0){
 const sides=[-1,1].map(sign=>Array.from({length:25},(_,i)=>{const t=i/24,p=bezier(curve.points,t),a=bezier(curve.points,Math.max(0,t-.001)),b=bezier(curve.points,Math.min(1,t+.001)),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,width=curve.width+((curve.endWidth??curve.width)-curve.width)*t,off=sign*((width+4)/2-inset);return[p[0]-dy/len*off,p[1]+dx/len*off];}));
 return 'M'+sides[0].concat(sides[1].reverse()).map(p=>p.join(',')).join(' L')+' Z';
}
export const curvePath=p=>`M${p[0]} C${p[1]} ${p[2]} ${p[3]}`;
// One deterministic sampler drives both the SVG preview and the editable
// Studio exports. Gait contact/swing timing is the actual overworld sampler.
export function sampleFlower({view='front',time=0,clip='idle',cycle,weight=1}={}){
 if(!VIEWS.includes(view))throw Error('Unknown flower view');
 const side=view==='side',walking=clip==='walk',phase=cycle??time/CLIPS.walk.duration*Math.PI*2,w=walking?weight:0;
 const wave=clip==='wave'?envelope(time,0,.4,1.75,2.4):0;
 const joy=clip==='delight'?envelope(time,0,.22,.82,1.7):0;
 const idlePhase=time/CLIPS.idle.duration*Math.PI*2;
 const breathe=Math.sin(idlePhase)*(1-w),sway=Math.sin(idlePhase-.35)*(1-w),bounce=Math.cos(phase*2)*5*w;
 const stretch=breathe*.035+w*Math.sin(phase*2-.4)*.035+joy*.065;
 const lean=sway*5+(side?3:1)*w+joy*4,bodyY=-128+breathe*3-bounce-joy*5;
 const headX=lean+Math.sin(idlePhase-.85)*9*(1-w)+Math.sin(phase-.65)*6*w+wave*3;
 const headY=-211+breathe*7-bounce*.7-joy*12;
 const headAngle=Math.sin(idlePhase-.85)*4.5*(1-w)+w*Math.sin(phase-.7)*4-wave*5+joy*3;
 const sprites={body:{x:lean,y:bodyY,rotation:sway*2+w*Math.sin(phase)*2,scaleX:1-stretch,scaleY:1+stretch},head:{x:headX,y:headY,rotation:headAngle,scaleX:1-stretch*.65,scaleY:1+stretch*.65}};
 // Rear stem crosses in front of the lower petals and covers the atlas socket cap.
 const back=view==='back',angle=headAngle*Math.PI/180,nx=back?5:0,ny=back?-24:-5;
 const socket=[headX+Math.cos(angle)*nx*(1-stretch*.65)-Math.sin(angle)*ny*(1+stretch*.65),headY+Math.sin(angle)*nx*(1-stretch*.65)+Math.cos(angle)*ny*(1+stretch*.65)];
 const curves={neck:{points:[[lean,bodyY-(back?20:36)],[lean+sway*8,bodyY-65],[socket[0]-sway*5,socket[1]+35],socket],width:17,endWidth:back?30:17,layer:back?45:15}};
 for(let i=0;i<2;i++){
  const sign=i?1:-1,id=i?'right':'left',g=gaitSample(phase,i),footX=(side?sign*11:sign*30)+g.stride*(side?25:4)*w;
  const footY=-14-g.lift*19*w+(side?0:g.stride*18*w*(view==='back'?-1:1));
  sprites['foot-'+id]={x:footX,y:footY,rotation:g.planted?0:-g.stride*7*w};
  const hip=[lean+sign*(side?4:10),bodyY+26],ankle=[footX,footY+5];
  curves['leg-'+id]={points:[hip,[hip[0]+sign*3,hip[1]+18],[footX-sign*10,footY-14],ankle],width:8,layer:i?9:1};
  const shoulder=[lean+sign*(side?7:10),bodyY-30];
  const swing=g.arm*23*w;
  let hand=[lean+sign*(side?27:73)+(side?swing:sign*Math.abs(swing)*.12),bodyY+10+Math.sin(idlePhase-1.2+sign*.3)*6*(1-w)+(side?-Math.abs(swing)*.15:swing*.35)];
  if(i===1){hand=[mix(hand[0],side?36:48,wave),mix(hand[1],-310+Math.sin(time*15)*7,-0+wave)];}
  hand=[mix(hand[0],sign*(side?62:95),joy),mix(hand[1],-213,joy)];
  const elbow=[mix(shoulder[0],hand[0],.45)+sign*9,Math.max(shoulder[1],hand[1])+25*(1-wave*(i===1?1:0))];
  curves['arm-'+id]={points:[shoulder,[shoulder[0]+sign*13,shoulder[1]+24],elbow,hand],width:7.5,layer:i?55:3};
  sprites['hand-'+id]={x:hand[0],y:hand[1],rotation:sign*(-8+joy*25)+Math.sin(idlePhase-1.5+sign*.3)*8*(1-w)+(i===1?wave*(-40+Math.sin(time*15)*14):0)};
 }
 return {view,sprites,curves,phase,ground:0};
}
export function spriteLayout(view,part,record){
 const side=view==='side';
 if(part==='head'){const height=288;return {width:height*record.width/record.height,height,pivotX:side?.45:.5,pivotY:.78,layer:40};}
 // Hide the atlas's detached top cap where the live stem enters the artwork.
 if(part==='body')return {width:side?56:78,height:110*.88,pivotX:.5,pivotY:(.5-.12)/.88,crop:[0,.12,1,.88],layer:view==='back'?50:20};
 if(part.startsWith('hand'))return {width:58,height:58*record.height/record.width,pivotX:part.endsWith('left')?.90:.10,pivotY:.5,layer:part.endsWith('left')?4:60};
 const width=side?59:58;return {width,height:width*record.height/record.width*.84,pivotX:side?.25:part.endsWith('left')?.69:.30,pivotY:(.11-.16)/.84,crop:[0,.16,1,.84],layer:part.endsWith('left')?2:10};
}
export function artPart(part){return part==='hand-left'?'hand-right':part==='hand-right'?'hand-left':part;}
