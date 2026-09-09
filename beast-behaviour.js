import {ensureActorPersonality} from "./ecs/personality-actors.js";
import {ensureActorDivineResponse,actorDivineResponse} from "./ecs/religion-actors.js";
import {ensureActorFeeding} from './ecs/actor-feeding.js';
import {beastEffects} from './ecs/beast-effects.js';
import {ensureBeastEmotions,beastEmotions} from './ecs/beast-emotions.js';
import {ensureBeastRelationships,beastRelationships,findBeastRelationship,addBeastRelationship} from './ecs/beast-relationships.js';
import {ensureBeastLearning,beastLearning} from './ecs/beast-learning.js';
import {beastsCue} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {romanceResolve} from './village-romance.js';
import {ensureActorRomance} from './ecs/actor-romance.js';
import {setActorMemories,actorMemories} from './ecs/actor-memories.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {associateBeastFeedback} from './beast-associations.js';
import {initialiseBeastOrigin,beastTraits} from './beast-origins.js';
// Learned behaviour and relationships are saved actor data, never view state.
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const names={cryos:['Flurry','Nim','Snowdrop','Rime','Tundra','Mittens','Glint','Puffin','Frosty','Lumi','Shiver','Pebble'],hearth:['Bramble','Mallow','Bumble','Mossby','Clover','Pebble','Fig','Tumble','Acorn','Nettle','Bram','Fern'],solis:['Saffron','Pip','Cinder','Maru','Sundrop','Auri','Ochre','Solly','Dune','Mica','Halo','Amber']};
export const BEAST_LESSON_SECONDS=20;
export function initialiseBeastMind(b,e){
 initialiseBeastOrigin(b);ensureBeastLearning(b).trust??=.5;ensureBeastLearning(b).training??=.08;ensureBeastLearning(b).habits??={protect:.5,company:.5,lash:.2};ensureBeastRelationships(b);ensureActorFeeding(b).foodConsumed??=0;ensureBeastLearning(b).lessonSerial??=0;(actorMemories(b)??setActorMemories(b,[]));
 ensureBeastLearning(b).temperament??=['gentle','playful','stubborn','volatile'][Math.min(3,Math.floor(e.random()*4))];
 (ensureActorPersonality(b).trait)=(beastLearning(b)?.temperament);actorNeeds(b).social??=80;b.sex??=(Number(b.id.split('-').at(-1))%2?'male':'female');ensureActorRomance(b).sexuality??='bisexual';ensureBeastEmotions(b).anger??=0;ensureBeastEmotions(b).jealousy??=0;
 for(const r of beastRelationships(b))initialiseBeastRelation(b,r);
}
export function nameBeast(e){const pool=names[e.culture]??names.hearth,used=new Set([...(e.beasts?.actors??[]),...e.workers].map(w=>w.name)),start=Math.floor(e.random()*pool.length)%pool.length;for(let i=0;i<pool.length;i++){const name=pool[(start+i)%pool.length];if(!used.has(name))return name;}return pool[start]+' '+(e.beasts.summons+1);}
export function rememberBeast(b,e,text){actorMemories(b).push({text,at:e.time});if(actorMemories(b).length>12)actorMemories(b).splice(1,actorMemories(b).length-12);}
function seededBond(b,id,salt){let h=2166136261;for(const c of `${b.id}:${b.name}:${id}:${salt}`)h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return ((h^(h>>>16))>>>0)/4294967296;}
function initialiseBeastRelation(b,r){r.a=b.id;r.b=r.id;r.compatibility??=.3+seededBond(b,r.id,0)*.7;r.attractionAB??=seededBond(b,r.id,1);r.attractionBA??=seededBond(b,r.id,2);return r;}
export function beastRelation(b,w){let r=findBeastRelationship(b,w.id);if(!r){r={id:w.id,name:w.name,affinity:0,meetings:0};addBeastRelationship(b,r);}return initialiseBeastRelation(b,r);}
export function beastEncounter(b,w,e,amount,text){const r=beastRelation(b,w);r.affinity=clamp(r.affinity+amount,-1,1);r.meetings++;(ensureActorDivineResponse(w).memories)=[{text,at:e.time},...((actorDivineResponse(w)?.memories)??[])].slice(0,6);rememberBeast(b,e,text);if(amount>0){ensureBeastEmotions(b).anger=clamp(((beastEmotions(b)?.anger)??0)-.12);ensureBeastEmotions(b).jealousy=clamp(((beastEmotions(b)?.jealousy)??0)-.1);const outcome=romanceResolve(e.life?.romance,b,w,r,'chat');if(outcome==='accepted')e.emit('social-finish',b,null,{partnerId:w.id,kind:'affection',romanceOutcome:outcome,relationship:r.romanceStatus==='committed'?'Sweetheart':'Growing close'});}}
export function noteBeastBehaviour(b,e,kind,targetId=null){ensureBeastLearning(b).recentBehaviour={kind,targetId,at:e.time,serial:++ensureBeastLearning(b).lessonSerial};}
export function reinforceBeast(b,e,kind,{trace=(beastLearning(b)?.recentBehaviour),meaningful=true}={}){
 initialiseBeastMind(b,e);const explicit=kind==='praise'||kind==='scold';if((actorVitality(b)?.dead)||!meaningful||!explicit&&e.time<((beastLearning(b)?.lessonAfter)??0))return false;
 const positive=['praise','life','energy','shield','food','rescue'].includes(kind),negative=['scold','fire','redirect','dangerous-hand'].includes(kind);if(!positive&&!negative)return false;
 if(kind==='scold'){ensureBeastLearning(b).scoldStreak=e.time-((beastLearning(b)?.lastScoldAt)??-Infinity)<60?((beastLearning(b)?.scoldStreak)??0)+1:1;ensureBeastLearning(b).lastScoldAt=e.time;ensureBeastEmotions(b).fear=Math.min(1,((beastEmotions(b)?.fear)??0)+.05*(beastLearning(b)?.scoldStreak));}
 ensureBeastEmotions(b).anger=clamp(((beastEmotions(b)?.anger)??0)+(positive?-.16:kind==='scold'?.08*Math.min(4,(beastLearning(b)?.scoldStreak)):kind==='redirect'?.08:.3));if(negative)ensureBeastEmotions(b).emotionalReason='Upset by our god’s '+({fire:'fire',scold:'scolding',redirect:'interference','dangerous-hand':'rough handling'}[kind]??'decision');
 if(positive)ensureBeastEmotions(b).fear=Math.max(0,((beastEmotions(b)?.fear)??0)-.04);
 ensureBeastLearning(b).trust=clamp((beastLearning(b)?.trust)+(positive?.06:kind==='redirect'?-.025:kind==='scold'?-.04*Math.min(4,(beastLearning(b)?.scoldStreak)):-.14));ensureBeastLearning(b).lessonAfter=e.time+8;
 const label={praise:'praised me',scold:'scolded me',life:'healed me',energy:'restored my energy',shield:'shielded me',food:'provided food',rescue:'carried me to safety',fire:'burned me',redirect:'moved me away','dangerous-hand':'put me in danger'}[kind];
 const learned=trace&&e.time-trace.at<=BEAST_LESSON_SECONDS&&trace.serial!==(beastLearning(b)?.reinforcedSerial)&&Object.hasOwn((beastLearning(b)?.habits),trace.kind);
 if(learned){ensureBeastLearning(b).habits[trace.kind]=clamp((beastLearning(b)?.habits)[trace.kind]+(positive?.16:-.18)*((beastLearning(b)?.temperament)==='stubborn'?.7:1));ensureBeastLearning(b).reinforcedSerial=trace.serial;const helpful=trace.kind==='lash'?!positive:positive;ensureBeastLearning(b).training=clamp((beastLearning(b)?.training)+(helpful?.1:-.08)*beastTraits(b).learning*((beastLearning(b)?.temperament)==='stubborn'?.7:1));}
 const behaviour={protect:'protecting the village',company:'being gentle with a villager',lash:'lashing out'}[trace?.kind];
 if(explicit&&!learned)associateBeastFeedback(b,e,positive);
 else rememberBeast(b,e,`Our god ${label}.${learned?` I associate ${behaviour} with ${positive?'approval':'disapproval'}.`:''}`);
 beastsCue(e.beasts,b,positive?'love':kind==='redirect'?'confused':'nervous',positive?'happy':'worried');return true;
}
export function beastLashChance(b,e){const hunger=clamp((actorNeeds(b).hunger-55)/45),fright=e.time-((actorVitality(b)?.lastDamageAt)??-Infinity)<12?1:0;const distress=Math.max(0,((beastEmotions(b)?.anger)??0)-.5)*.65*(1-(beastLearning(b)?.training)*.85)*beastTraits(b).ferocity;return Math.min(.5,((beastEffects(b)?.settledUntil)>e.time?.25:1)*(distress+(1-(beastLearning(b)?.training))*(.015+hunger*.09+fright*.07+((beastEmotions(b)?.fear)??0)*.04+((beastLearning(b)?.temperament)==='volatile'?.05:0))*(.3+(beastLearning(b)?.habits).lash*2)*((beastLearning(b)?.temperament)==='gentle'?.65:1)*(1.25-(beastLearning(b)?.trust)*.5)));}
