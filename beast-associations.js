import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {BeastAssociations} from './ecs/beast-associations-data.js';
import {ensureBeastAssociations,beastAssociations} from './ecs/beast-associations.js';
import {beastLearning,ensureBeastLearning} from './ecs/beast-learning.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {beastRelation,rememberBeast} from './beast-behaviour.js';
const clamp=n=>Math.max(-1,Math.min(1,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// A guess is deliberately weaker than feedback about a witnessed action.
export function associateBeastFeedback(b,e,positive){
 const sign=positive?1:-1,near=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&distance(b,w)<3).sort((a,c)=>distance(b,a)-distance(b,c));
 const recent=(beastLearning(b)?.recentBehaviour),labels={protect:'protecting the village',company:'being gentle with others',lash:'lashing out',gather:'gathering supplies'};
 let key,label,confidence,target=null;
 if(recent&&e.time-recent.at<90&&recent.serial!==(beastLearning(b)?.reinforcedSerial)&&labels[recent.kind]){key='recent:'+recent.serial;label=labels[recent.kind]+' earlier';confidence=.4;}
 else if(b.node){key='resource:'+b.node.kind;label='being around '+({wood:'trees',food:'food plants',stone:'stone'}[b.node.kind]??'supplies');confidence=.35;}
 else if(near.length){target=near[0];key='person:'+target.id;label='spending time near '+target.name;confidence=.35;}
 else {const places=[...(e.life?.homes??[]).filter(h=>!(structuralCondition(h)?.destroyed)).map(h=>({id:'house:'+h.id,x:h.buildingX??h.x,z:h.buildingZ??h.z,name:h.name??'this building'})),...(e.campfire?.built?[{id:'campfire',...e.campfire,name:'the campfire'}]:[]),...(e.faith?.shrine?[{id:'shrine',...e.faith.shrine,name:'the shrine'}]:[])].filter(p=>distance(b,p)<4).sort((a,c)=>distance(b,a)-distance(b,c));target=places[0]??{id:'place:'+Math.round(b.x/3)+':'+Math.round(b.z/3),x:b.x,z:b.z,name:b.state==='sleeping'?'resting here':'being in this place'};key=String(target.id);label=target.name==='resting here'||target.name==='being in this place'?target.name:'being near '+target.name;confidence=.2;}
 ensureBeastAssociations(b).associations??=[];let a=(beastAssociations(b)?.associations).find(a=>a.key===key);if(!a){a={key,label,value:0,at:e.time,confidence,count:0,...(target?{x:target.x,z:target.z,...(typeof target.id==='number'?{personId:target.id}:{})}:{})};(beastAssociations(b)?.associations).push(a);if((beastAssociations(b)?.associations).length>12)(beastAssociations(b)?.associations).shift();}
 const amount=.12*confidence/(1+a.count*.5);a.value=clamp(a.value+sign*amount);a.at=e.time;a.count++;a.confidence=confidence;
 if(a.personId!==undefined){const w=e.workers.find(w=>w.id===a.personId),r=beastRelation(b,w);r.affinity=clamp(r.affinity+sign*amount);}
 else if(key.startsWith('recent:')&&Object.hasOwn((beastLearning(b)?.habits),recent.kind)){ensureBeastLearning(b).habits[recent.kind]=Math.max(0,Math.min(1,(beastLearning(b)?.habits)[recent.kind]+sign*amount));ensureBeastLearning(b).reinforcedSerial=recent.serial;}
 rememberBeast(b,e,`Our god ${positive?'praised':'scolded'} me. I think it was about ${label}, but I am not certain.`);ensureBeastAssociations(b).lastAssociation={key,label,confidence,at:e.time};return a;
}
export function beastPlacePreference(b,e){
 const places=((beastAssociations(b)?.associations)??[]).filter(a=>a.personId===undefined&&Number.isFinite(a.x)&&e.time-a.at<600).sort((a,c)=>c.value-a.value);
 const avoid=places.find(a=>a.value<0&&distance(b,a)<3);if(avoid){const dx=b.x-avoid.x||1,dz=b.z-avoid.z,n=Math.hypot(dx,dz);return {x:b.x+dx/n*4,z:b.z+dz/n*4};}return places.find(a=>a.value>0)??null;
}

export function beastResourcePreference(b,e,kind){return ((beastAssociations(b)?.associations)??[]).find(a=>a.key==='resource:'+kind&&e.time-a.at<600)?.value??0;}
export function validBeastAssociations(b){const data=beastAssociations(b);return !data||BeastAssociations.validate(data);}
