import {identity,setKey} from './runtime.js';
// The same attachment coordinates used by the game's intruder puppet, exposed
// as ordinary editable joints. Styles switch the generated facial drawings.
export const INTRUDER_PRESETS=[{id:'cryos-wight',label:'Cryos frost wight',intruder:true}];
export async function makeIntruderPreset(id){
 const parts=['head','head-sneaky','head-angry','head-afraid','head-hurt','body','arm','hand','leg','foot','bag','turnip'],assets=[],sizes={};
 for(const part of parts){const src=new URL(`../assets/vector/characters/${id}/${part}.svg`,location.href).href,img=new Image();img.src=src;await img.decode();sizes[part]=img.naturalWidth/img.naturalHeight;assets.push({id:part,src});}
 const joints=[],add=(id,parent,x,y,layer,asset,height,extra={})=>joints.push({id,name:id.replaceAll('_',' '),parent,rest:{...identity(),x,y},layer,...(asset?{sprite:{asset,width:height*sizes[asset],height,pivotX:.5,pivotY:.5,...extra}}:{})});
 add('root',null,0,0,0);add('body','root',0,-153,10,'body',146);add('head','body',8,-135,30,'head',206);

 add('bag','body',-52,28,11,'bag',57);
 for(const [i,side]of ['l','r'].entries()){const sign=i?1:-1;add('upper_arm_'+side,'body',sign*37,-45,i?20:5,'arm',60,{pivotY:0,crop:[0,0,1,.44]});add('forearm_'+side,'upper_arm_'+side,sign*13,45,i?21:6,'arm',50,{pivotY:0,crop:[0,.38,1,.40]});add('hand_'+side,'forearm_'+side,0,47,i?22:7,'hand',44);add('leg_'+side,'root',sign*25,-80,3,'leg',85,{crop:[0,0,1,.76]});add('foot_'+side,'root',sign*25+10,-20,4,'foot',49);}
 const clips=[];for(const kind of ['idle','walk','sneaky','angry','afraid','hurt']){const c={id:kind,name:kind,duration:2.4,fps:24,loop:true,tracks:{}};for(const [i,t]of [0,.6,1.2,1.8,2.4].entries()){const n=Math.sin(i*Math.PI/2);setKey(c,'body',t,{...identity(),y:kind==='walk'?-Math.abs(n)*4:n*1.5});for(const [j,side]of ['l','r'].entries()){const sign=j?1:-1;setKey(c,'foot_'+side,t,{...identity(),x:kind==='walk'?n*sign*20:0,y:kind==='walk'?-Math.max(0,n*sign)*12:0});setKey(c,'upper_arm_'+side,t,{...identity(),rotation:kind==='walk'?n*sign*13:0});}}clips.push(c);}
 return {format:'inkwell-puppet',version:1,name:'Cryos frost wight',source:{character:id,view:'front',intruder:true},assets,joints,clips,appearance:{version:1,roles:[],active:'neutral',grades:[],bindings:[],variants:['neutral','sneaky','angry','afraid','hurt'].map(kind=>({id:kind,name:kind,colors:{},assets:kind==='neutral'?{}:{head:'head-'+kind}}))}};
}
