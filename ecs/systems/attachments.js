import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {resourceCondition} from "../resource-state.js";
import {resourceCultivation} from "../resource-state.js";
import {resourceWoodland} from "../resource-state.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {faithChange} from "../../village-faith.js";
import {ensureActorPlaces,actorPlaces} from "../actor-places.js";
import {actorVitality} from '../actor-vitality.js';
import {lifeRest} from '../../village-life.js';
import {actorRomance} from '../actor-romance.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant} from '../care-participants.js';
import {dangerRisk} from '../../village-danger.js';
import {supportParticipant} from '../support-participants.js';
import {dangerAwareness} from '../danger-entities.js';
import {standingRoom} from '../../village-spacing.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const incarnation=n=>resourceWoodland(n)?.ecoBornAt??0;
export function attachmentsPlaces(world,id,w){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');
return (ensureActorPlaces(w).places)??={tree:null,rest:null,garden:null}
}
export function attachmentsTree(world,id,w){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');
const a=attachmentsPlaces(world,id,w).tree;return a&&!a.lost?state.economy.nodes.find(n=>n.id===a.id&&incarnation(n)===a.born&&resourceGrowth(n)?.state==='ready'):null
}
export function attachmentsNotice(world,id,event){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');

  const e=state.economy,w=e.workers.find(w=>w.id===event.workerId);
  if(event.type==='rest'&&w){
   const a=attachmentsPlaces(world,id,w),tree=e.nodes.filter(n=>n.kind==='wood'&&resourceGrowth(n)?.state==='ready'&&!resourceHarvest(n)?.hits&&distance(w,n)<4).sort((x,y)=>distance(w,x)-distance(w,y))[0];
   if(tree&&(!a.tree||a.tree.lost&&e.time-a.tree.lostAt>120)){a.tree={id:tree.id,born:incarnation(tree),x:tree.x,z:tree.z,lost:false};e.emit('place-loved',w,null,{kind:'tree'})}
   if(a.rest&&distance(a.rest,w)<2)a.rest.visits++;else if(!a.rest||a.rest.lost)a.rest={x:w.x,z:w.z,visits:1};
  }
  if((event.type==='crop-planted'||event.type==='plot-planted')&&w){
   const node=e.nodes.find(n=>n.id===event.nodeId),plot=e.farming?.plots.find(p=>p.id===(event.plotId??resourceCultivation(node)?.plotId));if(!plot)return;
   let garden=state.gardens.find(g=>g.id===plot.id);if(!garden){garden={id:plot.id,x:plot.x,z:plot.z,contributors:[]};state.gardens.push(garden)}
   if(!garden.contributors.includes(w.id))garden.contributors.push(w.id);
   if(attachmentsPlaces(world,id,w).garden?.id!==plot.id)attachmentsPlaces(world,id,w).garden={id:plot.id,x:plot.x,z:plot.z,partnerId:null};
   const partner=e.workers.find(p=>!(actorVitality(p)?.dead)&&p.id===(actorRomance(w)?.sweetheartId)&&garden.contributors.includes(p.id));
   if(partner){for(const [person,peer] of [[w,partner],[partner,w]])attachmentsPlaces(world,id,person).garden={id:plot.id,x:plot.x,z:plot.z,partnerId:peer.id};if(!garden.shared){garden.shared=true;e.emit('garden-shared',w,null,{partnerId:partner.id})}}
  }
 
}
export function attachmentsWorkBias(world,id,w,node){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');
const a=attachmentsPlaces(world,id,w);return node.kind==='wood'&&a.tree&&!a.tree.lost&&node.id===a.tree.id&&incarnation(node)===a.tree.born?-18:node.kind==='food'&&resourceCultivation(node)?.plotId===a.garden?.id?8:0
}
export function attachmentsRest(world,id,w){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');

  const e=state.economy,a=attachmentsPlaces(world,id,w);if(actorNeeds(w).energy<10||watchAssigned(e.life.watch,w)||supportParticipant(w)?.partnerId!=null||careParticipant(w)?.partnerId!=null||dangerAwareness(w)?.partnerId!=null)return false;
  const tree=attachmentsTree(world,id,w),garden=a.garden,preferred=tree?{x:tree.x+1.5,z:tree.z+.6}:a.rest?.visits>=2&&!a.rest.lost?a.rest:garden;
  if(!preferred||distance(w,preferred)<.75||distance(w,preferred)>7||!standingRoom(e,w,preferred))return false;
  const route=e.route(w,preferred);if(!route||dangerRisk(e,w,preferred,route))return false;
  releaseWork(e,w);w.state='rest-bound';w.route=route;w.wait=0;(ensureActorPlaces(w).restDeadline)=e.time+12;return true;
 
}
export function attachmentsHandle(world,id,w,dt){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');

  if(w.state!=='rest-bound')return false;const e=state.economy;
  const status=e.move(w,dt);if(status==='moving'&&e.time<(actorPlaces(w)?.restDeadline)&&actorNeeds(w).hunger<85&&actorNeeds(w).energy>3)return true;
  lifeRest(e.life,w,{here:true});return true;
 
}
export function attachmentsUpdate(world,id){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');

  const e=state.economy;if(e.time<state.nextCheck)return;state.nextCheck=e.time+2;
  for(const w of e.workers){if((actorVitality(w)?.dead))continue;const a=attachmentsPlaces(world,id,w),tree=a.tree;
   if(tree&&!tree.lost&&!attachmentsTree(world,id,w)){
    tree.lost=true;tree.lostAt=e.time;actorNeeds(w).social=Math.max(0,actorNeeds(w).social-12);e.emit('place-lost',w,null,{kind:'tree'});
    faithChange(e.faith,w,-.035,'favourite-tree-lost');
   }
   if(a.rest&&!a.rest.lost&&(e.obstacles().some(o=>distance(o,a.rest)<o.radius+.3)||!Number.isFinite(e.heightAt(a.rest.x,a.rest.z)))){a.rest.lost=true;actorNeeds(w).social=Math.max(0,actorNeeds(w).social-5);e.emit('place-lost',w,null,{kind:'rest'})}
   // Notice places during real pauses, not while sprinting past on a task.
   if(w.state==='resting'&&!(actorInterior(w)?.inside)){
    if(!a.tree||a.tree.lost&&e.time-a.tree.lostAt>120)attachmentsNotice(world,id,{type:'rest',workerId:w.id});
    const homeTree=attachmentsTree(world,id,w),atHome=homeTree&&distance(w,homeTree)<3||a.rest&&distance(w,a.rest)<1.5;
    if(atHome){actorNeeds(w).social=Math.min(100,actorNeeds(w).social+.7);if(((actorPlaces(w)?.cueAt)??0)<=e.time){(ensureActorPlaces(w).cueAt)=e.time+45;e.emit('place-content',w)}}
   }
   if(a.garden&&!(actorInterior(w)?.inside)&&distance(w,a.garden)<3&&((actorPlaces(w)?.gardenCueAt)??0)<=e.time){
    const crops=e.nodes.filter(n=>resourceCultivation(n)?.plotId===a.garden.id);if(crops.some(n=>(resourceCondition(n)?.burningUntil??0)>e.time)){(ensureActorPlaces(w).gardenCueAt)=e.time+35;actorNeeds(w).social=Math.max(0,actorNeeds(w).social-8);e.emit('place-lost',w,null,{kind:'garden'})}
    else if(crops.some(n=>resourceGrowth(n)?.state==='ready')){(ensureActorPlaces(w).gardenCueAt)=e.time+70;e.emit('place-content',w,null,{kind:'garden'});actorNeeds(w).social=Math.min(100,actorNeeds(w).social+3)}
   }
  }
 
}
export function attachmentsSnapshot(world,id){const state=world.get(id,'PlaceAttachmentsState');if(!state)throw Error('Missing PlaceAttachmentsState');
return {gardens:state.gardens.map(g=>({...g})),people:state.economy.workers.map(w=>({id:w.id,...attachmentsPlaces(world,id,w)}))}
}
