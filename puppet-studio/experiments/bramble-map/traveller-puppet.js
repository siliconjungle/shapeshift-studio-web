import {gaitSample,socialAccent} from '../shared/performance-motion.js';
const NS='http://www.w3.org/2000/svg';
// Local joint positions and layered sprite pieces are independent of the route.
// All art goes through the same real Little Gods vector/palette renderer.
export const travellerRig={
 facings:['side','front','back'],
 parts:['head','body','backpack','arm-left','arm-right','staff','leg-left','leg-right','cape'],
 joints:{hips:[0,-24],neck:[0,-44],shoulders:[[-17,-42],[18,-42]],feet:[[-10,0],[10,0]],handRight:[0,24]}
};
travellerRig.assets=travellerRig.facings.flatMap(f=>travellerRig.parts.map(p=>'traveller-'+f+'-'+p));
export function createTravellerPuppet(root,assetInfo){
 root.replaceChildren();root.dataset.puppet='little-gods-traveller';const rigs={};
 for(const view of travellerRig.facings){const group=document.createElementNS(NS,'g');group.dataset.puppetView=view;group.setAttribute('opacity',view==='side'?1:0);root.append(group);rigs[view]=createView(group,view,assetInfo);}
 return{root,rigs};
}
function createView(root,view,assetInfo){
 const nodes={};
 function part(name,x,y,w,h,pivot=[0,0],parent=root){const g=document.createElementNS(NS,'g');g.dataset.puppetPart=name;const art=document.createElementNS(NS,'use');for(const[k,v]of Object.entries({href:'#traveller-'+view+'-'+name,x,y,width:w,height:h}))art.setAttribute(k,v);g.append(art);parent.append(g);nodes[name]={g,pivot};return g;}
 part('backpack',view==='back'?-17:-30,-48,view==='back'?34:26,view==='back'?38:34);
 part('cape',-23,-40,32,31);
 part('leg-left',-9,-27,18,27,[-10,0]);part('leg-right',-9,-27,18,27,[10,0]);
 part('arm-left',-6,-1,13,31,[-17,-42]);
 part('body',-23,-48,46,37);
 const arm=part('arm-right',-6,-1,13,31,[18,-42]);
 // Preserve the generated silhouette's aspect ratio and align its actual shaft
 // with the hand socket. Draw the hand over the shaft so it visibly grips it.
 const staffInfo=assetInfo['traveller-'+view+'-staff'],staffHeight=62,staffWidth=staffHeight*staffInfo.width/staffInfo.height;
 const gripX={side:.30,front:.43,back:.68}[view],gripY=.70;
 const staff=part('staff',-staffWidth*gripX,-staffHeight*gripY,staffWidth,staffHeight,travellerRig.joints.handRight,arm);
 arm.insertBefore(staff,arm.firstChild);
 part('head',-27,-49,54,54,[0,-44]);
 if(view==='back')root.insertBefore(nodes.backpack.g,nodes.head.g);if(view==='front')nodes.backpack.g.setAttribute('opacity',0);
 return{root,nodes};
}
export function poseTraveller(puppet,{cycle=0,weight=0,time=0,facing='right',gentle=false,reaction=null}={}){
 const view=facing==='up'?'back':facing==='down'?'front':'side';for(const [key,rig]of Object.entries(puppet.rigs))rig.root.setAttribute('opacity',key===view?1:0);const nodes=puppet.rigs[view].nodes;
 puppet.root.dataset.facing=facing;
 const accent=socialAccent(gentle?null:reaction);
 const w=gentle?0:weight,legs=[gaitSample(cycle,0),gaitSample(cycle,1)],bob=w*Math.cos(cycle*2)*1.8+(1-w)*Math.sin(time*2)*.6;
 const transform=(name,dx=0,dy=0,angle=0)=>{const n=nodes[name];n.g.setAttribute('transform',`translate(${n.pivot[0]+dx} ${n.pivot[1]+dy}) rotate(${angle})`);};
 for(let i=0;i<2;i++){const g=legs[i];transform(i?'leg-right':'leg-left',g.stride*(view==='side'?7:1.5)*w,-g.lift*9*w+(view==='side'?0:g.stride*3*w),g.planted?0:-g.stride*12*w);}
 transform('body',0,-bob-accent.bodyY*.15,w*Math.sin(cycle)*2);transform('backpack',0,-bob*.75,w*Math.sin(cycle-.4)*3);
 transform('cape',0,-bob*.7,gentle?0:Math.sin(time*2+cycle*.15)*3+w*Math.sin(cycle-.6)*5);
 transform('arm-left',0,-bob,legs[0].arm*20*w-5-accent.armLift*25);transform('arm-right',0,-bob,legs[1].arm*20*w+5+accent.armLift*25);
 transform('staff');transform('head',w*Math.sin(cycle-.25)*.7+accent.headX*.18,-bob*.6,gentle?0:Math.sin(time*1.8)*.7+w*Math.sin(cycle-.4)*2+accent.headTilt*40);
 puppet.root.setAttribute('transform',`scale(${facing==='left'?-1:1} 1)`);
}
