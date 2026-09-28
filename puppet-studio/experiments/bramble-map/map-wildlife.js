import {BirdDeathEffects} from './bird-death.js';
import {birdFlightPosition} from '../shared/village-birds.js';
import {createMapBird} from './map-bird-puppet.js';
export const birdParts=['body','head','wing','tail'];
export const wildlifeAssets=[...birdParts.map(part=>'map-wren-'+part),'map-bird-feather'];
export const nextBirdDelay=(random=Math.random,first=false)=>(first?18:40)+random()*(first?14:45);
export function flightPose(age,duration,reverse=false,lane=360){
 const t=Math.max(0,Math.min(1,age/duration)),x=-90+1620*t;
 return{x:reverse?1440-x:x,y:lane+Math.sin(t*Math.PI*2)*65-80*Math.sin(t*Math.PI),facing:reverse?'left':'right',done:age>=duration};
}
// One pooled generated wren, with independently articulated pieces. No idle flock or timers.
export class MapWildlife{
 constructor(scene,assets,random=Math.random){
  this.death=null;this.time=0;this.deathEffects=new BirdDeathEffects(scene,assets);this.random=random;this.next=nextBirdDelay(random,true);this.active=null;
  this.puppet=createMapBird(assets);this.puppet.root.scale.setScalar(50);this.puppet.root.visible=false;scene.add(this.puppet.root);

 }
 enableClicks(svg,audio){
  const NS='http://www.w3.org/2000/svg',target=document.createElementNS(NS,'g'),shape=document.createElementNS(NS,'ellipse');target.setAttribute('data-map-bird','true');target.setAttribute('role','button');target.setAttribute('aria-label','Bird');shape.setAttribute('rx','45');shape.setAttribute('ry','32');shape.setAttribute('fill','transparent');target.append(shape);svg.querySelector('#world').insertBefore(target,svg.querySelector('#clouds'));this.target=target;this.audio=audio;this.syncTarget();
  target.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.hit();}});
 }
 syncTarget(){if(!this.target)return;const available=this.puppet.root.visible&&!this.death;this.target.style.display=available?'':'none';this.target.setAttribute('tabindex',available?'0':'-1');this.target.setAttribute('transform',`translate(${this.puppet.root.position.x} ${-this.puppet.root.position.y-25})`);this.target.setAttribute('data-bird-state',this.death?'dead':available?'flying':'away');}
 hit(){if(this.death||!this.puppet.root.visible||!this.position)return false;this.death={at:this.time,origin:{...this.position}};this.active.until=this.time+4;this.deathEffects.hit(this.position,this.time,this.random()*Math.PI*2);this.audio?.birdHit();this.syncTarget();return true;}
 tick(time,gentle,visit){
  this.time=time;this.deathEffects.update(time,gentle);const root=this.puppet.root;root.visible=!gentle&&visit?.kind==='bird';if(!root.visible){this.syncTarget();return;}
  if(this.active!==visit){this.active=visit;this.death=null;this.callAt=visit.at+2+this.random()*3;const reverse=visit.side<0,z=2.6+visit.seed*4;
   this.flight={at:visit.at,duration:visit.until-visit.at,from:{x:reverse?15.3:-.9,z,y:.15},to:{x:reverse?-.9:15.3,z:z+(visit.seed-.5)*3,y:.25},arc:1.4+visit.seed*.6};}
  const age=this.death?time-this.death.at:0,p=this.death?{...this.death.origin,y:Math.max(0,this.death.origin.y-age*age*3)}:birdFlightPosition(this.flight,time);this.position=p;if(this.death&&!this.death.landed&&p.y<=0){this.death.landed=true;this.audio?.birdLand?.();}if(!this.death&&time>=this.callAt&&p.x>.8&&p.x<13.6){this.callAt=Infinity;this.audio?.birdCall?.();}if(this.death&&age>=2.2)root.visible=false;root.position.set(p.x*100,-p.z*100+p.y*100,0);root.userData.flightPosition={x:p.x*100,z:p.z*100,height:p.y*100};
  this.puppet.render({id:'map-bird-1',state:'flying',facing:visit.side<0?'left':'right',phase:time*4.8,bornAt:visit.at-1,dead:!!this.death,diedAt:this.death?.at,hitAt:this.death?.at},time);
  this.syncTarget();root.traverse(n=>{if(n.isMesh){n.userData.partOrder??=n.renderOrder-1200;n.renderOrder=100+p.z*50+p.y*.01+n.userData.partOrder*.001;}});
 }
}
