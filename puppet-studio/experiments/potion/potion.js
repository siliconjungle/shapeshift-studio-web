import {liquidSoundPreset} from '@shapeshift-labs/studio-core/illustration/liquid-audio';
import {popPose,returnPose,RELEASE,RETURN_SEAT} from './motion.js';
import {identity,validateProject,setKey} from '../../runtime.js';
import {soundDefaults} from '../../authoring/sound.js';
import {defaultFluid,ensureFX,defaultVisual} from '../../fx/schema.js';
export function potionSounds(){return liquidSoundPreset(soundDefaults({frequency:520,duration:.14,volume:.1,spread:1.3}));}
export function potionProject(art,{sound=false,gas=true}={}){const sprite=asset=>({asset,width:520,height:620,pivotX:.5,pivotY:360/620}),project={format:'inkwell-puppet',version:1,name:'Potion workshop · contained liquid',assets:Object.values(art.assets),joints:[{id:'root',name:'Potion root',parent:null,rest:identity(),layer:0},{id:'bottle',name:'Glass bottle · liquid container',parent:'root',rest:identity(),layer:2,sprite:sprite('front'),liquid:structuredClone(art.liquid)},{id:'glass-back',name:'Glass interior',parent:'bottle',rest:identity(),layer:1,sprite:sprite('back')},{id:'cork',name:'Cork · independent puppet piece',parent:'bottle',rest:{...identity(),x:art.mouth[0],y:art.mouth[1]},layer:3,sprite:sprite('cork')},{id:'glass-lip',name:'Glass lip · foreground occlusion',parent:'bottle',rest:identity(),layer:4,sprite:sprite('lip'),visual:{...defaultVisual(),opacity:[{time:0,value:1,easing:'step'},{time:2.7+RELEASE+.08,value:0,easing:'step'},{time:4.64,value:1,easing:'step'}]}}],clips:[{id:'slosh-pop',name:'Tilt, slosh & uncork',duration:8,fps:60,loop:false,tracks:{},cues:[]}],audioLibraries:{potion:potionSounds()}};
 const clip=project.clips[0];for(const [time,rotation,x]of [[0,0,0],[.6,-27,-15],[1.2,33,14],[1.7,-18,-8],[2.3,0,0],[8,0,0]])setKey(clip,'bottle',time,{...identity(),rotation,x},'smooth');
 const origin={x:art.mouth[0],y:art.mouth[1],rotation:0},rest={...identity()};setKey(clip,'cork',0,rest,'linear');setKey(clip,'cork',2.7,rest,'linear');
 const offset=p=>({x:p.x-origin.x,y:p.y-origin.y,rotation:p.rotation,scaleX:p.scaleX,scaleY:p.scaleY});
 for(let i=0;i<=90;i++)setKey(clip,'cork',2.7+i/60,offset(popPose(i/60,origin)),'linear');
 const landed=popPose(1.6,origin);for(let i=0;i<=38;i++)setKey(clip,'cork',4.3+i/60,offset(returnPose(i/60,landed,origin)),'linear');setKey(clip,'cork',8,rest,'linear');
 const cue=(id,time,name,enabled=sound,amount=1)=>({id,type:'sound',time,duration:.25,amount,enabled,audio:{library:'potion',cue:name}});
 clip.cues=[cue('cork-pop',2.7+RELEASE,'pop'),cue('gas-hiss',2.7+RELEASE,'hiss',sound&&gas),cue('cork-land',2.7+Array.from({length:180},(_,i)=>i/120).find(t=>popPose(t,origin).landed),'tap'),cue('cork-return',4.3,'return'),cue('cork-plug',4.3+RETURN_SEAT,'plug'),...[[.45,.35],[1,.6],[1.55,.5],[2.05,.2]].map(([t,a],i)=>cue('slosh-'+i,t,'slosh',sound,a))];
 const fx=ensureFX(project);fx.settings.background='#f4f0e6';fx.fluids.push({...defaultFluid('neck-vapour'),name:'Vapour plume from opening',enabled:gas,x:art.mouth[0],y:art.mouth[1]-64,layer:5,delay:2.7+RELEASE,duration:.32,resolution:32,width:110,height:160,sourceY:.9,sourceRadius:.085,rate:1.7,buoyancy:.45,vorticity:9,dissipation:1.5,velocityY:-22,vectorContours:true,threshold:.16,strokeWidth:0,colors:['#d9c9e7','#d9c9e7'],seed:23});
 return validateProject(project);
}
