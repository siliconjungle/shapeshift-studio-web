import {registryForVillage} from '../../gameplay-effects/village-library.js';
import {RELIC_ART_KEYS} from '../../village-relics.js';
import {validateGameArtwork,applyGameArtworkCommand} from '../integrations/little-gods/artwork.js';
import {validateGrading} from '../../rendering/color-grading.js';
import {jsonValue} from '../../game-data.js';
import {RENDER_MODES,EFFECT_KINDS,validateRender,validateAbilityPresentation} from '../authoring/presentation-schema.js';
export {RENDER_MODES,EFFECT_KINDS,validateRender,validateAbilityPresentation};
export const NATIVE_ACTIONS=['performance','pose','reaction','sound','voice','hit','burst','shake','weather','hour','camera','render','call','wish','event','freeze','speed','flash'];
export function nativeProject(){return {format:'little-gods-authoring',version:1,data:{},nodes:[],bindings:[],variations:[],scenarios:[{id:'character',name:'Character performance',mode:'character',culture:'hearth',character:'female',duration:5,fps:30,seed:1,hour:12,weather:'clear',events:[{id:'greeting',time:.2,action:{type:'reaction',id:'delight',intensity:1}}]}]};}
const finite=(v,min,max,label)=>{if(!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+label);};
export function validateAction(a){
 jsonValue(a);if(!a||!NATIVE_ACTIONS.includes(a.type))throw Error('Unknown native action '+a?.type);
 if(a.duration!==undefined)finite(a.duration,0,120,'action duration');
 if(a.type==='pose'){if(a.carry!==undefined&&a.carry!==null&&a.carry!==''&&!RELIC_ART_KEYS.includes(a.carry))throw Error('Unknown relic carry art');if(a.motion&&!['idle','walk','work','chop','mine','till','fight','shoot','harvest'].includes(a.motion))throw Error('Unknown native motion');if(a.facing&&!['front','back','left','right'].includes(a.facing))throw Error('Unknown facing');if(a.phase!==undefined)finite(a.phase,0,1,'pose phase');}
 if(a.type==='hour')finite(a.value,0,24,'hour');if(a.type==='weather'&&!['clear','rain','storm'].includes(a.mode))throw Error('Unknown weather');
 if(a.type==='speed'||a.speed!==undefined)finite(a.value??a.speed,0,8,'playback speed');if(a.type==='burst')finite(a.count??9,1,100,'particle count');
 if(a.type==='reaction'&&typeof a.id!=='string')throw Error('Reaction ID required');if(a.type==='sound'&&typeof a.id!=='string')throw Error('Sound ID required');if(a.type==='voice'&&(!/^[a-z0-9-]+$/.test(a.variant??'')||!/^[a-z0-9-]+$/.test(a.clip??'')))throw Error('Voice variant and clip required');
 if(a.type==='render')validateRender(a);if(a.type==='call'&&(typeof a.system!=='string'||typeof a.method!=='string'||!Array.isArray(a.args??[])))throw Error('A native call needs system, method and JSON arguments');
}

export function validateNative(p){validateGrading(p?.grading);validateAbilityPresentation(p?.abilityPresentation);
 jsonValue(p);if(p.abilityLibrary){if(p.abilityLibrary.format!=='shapeshift-abilities'||p.abilityLibrary.version!==1)throw Error('Unsupported native ability library');registryForVillage({abilityLibrary:p.abilityLibrary})}
 validateGameArtwork(p.artwork);if(p.format!=='little-gods-authoring'||p.version!==1)throw Error('Unsupported native game project');
 for(const k of ['nodes','bindings','scenarios','variations']){if(!Array.isArray(p[k]))throw Error('Missing '+k);const ids=new Set();for(const v of p[k]){if(typeof v.id!=='string'||!v.id||ids.has(v.id))throw Error('Missing or duplicate '+k+' ID');ids.add(v.id);}}
 for(const n of p.nodes){validateRender(n);if(n.asset&&(!/^[a-zA-Z0-9_/-]+$/.test(n.asset)||n.asset.includes('..')))throw Error('Invalid native vector asset');}
 if(!p.scenarios.length)throw Error('At least one native scenario is required');
 for(const s of p.scenarios){if(s.events&&!Array.isArray(s.events))throw Error('Scenario events must be an array');if(!['character','village'].includes(s.mode))throw Error('Invalid scenario mode');if(!['hearth','solis','cryos'].includes(s.culture))throw Error('Invalid culture');finite(s.duration,1/120,600,'scenario duration');finite(s.fps,1,120,'scenario FPS');finite(s.seed,1,4294967295,'scenario seed');for(const e of s.events??[]){finite(e.time,0,s.duration,'event time');validateAction(e.action);}}
 for(const b of p.bindings){if(typeof b.event!=='string'||!Array.isArray(b.actions))throw Error('Event binding needs event and actions');b.actions.forEach(validateAction);}
 for(const v of p.variations){if(!p.scenarios.some(s=>s.id===v.scenario))throw Error('Variation references missing scenario');finite(v.weight??1,0,10000,'variation weight');if(!v.overrides||typeof v.overrides!=='object')throw Error('Variation requires overrides');const s=mergeJSON(structuredClone(p.scenarios.find(s=>s.id===v.scenario)),v.overrides);validateNative({...p,variations:[],scenarios:[s]});}
 return p;
}
export function mergeJSON(target,patch){jsonValue(patch);for(const [k,v] of Object.entries(patch)){if(v&&typeof v==='object'&&!Array.isArray(v)){target[k]??={};mergeJSON(target[k],v);}else target[k]=structuredClone(v);}return target;}
export function scenarioFor(p,id,variation){validateNative(p);const s=structuredClone(p.scenarios.find(s=>s.id===id)??p.scenarios[0]);if(variation){const v=p.variations.find(v=>v.id===variation&&v.scenario===s.id);if(!v)throw Error('Missing variation '+variation);mergeJSON(s,v.overrides);}return s;}
export function chooseVariation(p,scenario,seed=1){const entries=p.variations.filter(v=>v.scenario===scenario&&(v.weight??1)>0),total=entries.reduce((s,v)=>s+(v.weight??1),0);let x=((Math.imul(seed^0x9e3779b9,0x85ebca6b)>>>0)/4294967296)*total;return entries.find(v=>(x-=v.weight??1)<0)?.id??null;}
export function applyNativeCommand(project,c){const p=project.game??=nativeProject();let result;
 if(c.op==='game.replace')project.game=structuredClone(c.value);
 else if(c.op.startsWith('game.artwork.'))result=applyGameArtworkCommand(project,c);
 else if(c.op==='game.data'){p.data[c.id]??={};mergeJSON(p.data[c.id],c.values);}
 else if(c.op==='game.data.reset')delete p.data[c.id];
 else if(c.op==='game.cue.add'){const s=p.scenarios.find(s=>s.id===c.scenario)??p.scenarios[0];s.events??=[];result=c.id??'cue-'+s.events.length;s.events.push({id:result,time:c.time??0,action:structuredClone(c.action)});}
 else if(c.op==='game.cue.remove'){const s=p.scenarios.find(s=>s.id===c.scenario)??p.scenarios[0];s.events=s.events.filter(e=>e.id!==c.id);}
 else if(/^game\.(node|scenario|variation|binding)\.(add|update|remove)$/.test(c.op)){const [,kind,op]=c.op.split('.'),key={node:'nodes',scenario:'scenarios',variation:'variations',binding:'bindings'}[kind],list=p[key],item=list.find(x=>x.id===c.id);if(op==='add'){if(item)throw Error('Duplicate '+kind);list.push({id:c.id,...structuredClone(c.values)});result=c.id;}else{if(!item)throw Error('Missing '+kind+' '+c.id);if(op==='remove')list.splice(list.indexOf(item),1);else mergeJSON(item,c.values);}}
 else throw Error('Unknown native command '+c.op);
 validateNative(project.game);return result;
}
export const nativeCapabilities=()=>({format:'little-gods-authoring',version:1,renderModes:RENDER_MODES,effectKinds:EFFECT_KINDS,actions:NATIVE_ACTIONS,commands:['game.artwork.set','game.artwork.import','game.artwork.apply','game.artwork.revert','game.replace','game.data','game.data.reset','game.node.add','game.node.update','game.node.remove','game.scenario.add','game.scenario.update','game.scenario.remove','game.variation.add','game.variation.update','game.variation.remove','game.binding.add','game.binding.update','game.binding.remove','game.cue.add','game.cue.remove'],references:['$camera','$random','$mesh:TARGET','$position:TARGET',{'$vector':[0,1,0]},'$economy','$worker:ID','$node:ID','$event:field','$system:NAME']});
