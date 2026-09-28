import {WISH_SOUNDS,playWishSound} from './god-wish-audio.js';
import {defineGameData} from './game-data.js';
export const ACTION_SOUND_IDS=['plant-soil','plant-finished','bird-hearth','bird-solis','bird-cryos','mage-cast','skill-level-up','arrow-shot','arrow-hit','watchtower-alarm','god-level-up','belief-choice','belief-discovery','pot-place','pot-add','pot-stir','stew-ready','bowl','clay-break','leader-promoted','ritual-ignite','staff-hit','leader-lost','treasure-open','offering','step','repair','wood','chop','pull','complete','fall','mine','slime-move','slime-hit','slime-split','slime-land',...WISH_SOUNDS];
function original(kind,sand,stepIndex){const layers=[];const tone=(...args)=>layers.push({type:'tone',args}),noise=(...args)=>layers.push({type:'noise',args});
  if(kind==='plant-soil'){noise(.13,.022,650);tone(150,65,.09,.014,'triangle');}
  if(kind==='plant-finished'){noise(.16,.012,850);tone(392,523,.22,.012,'sine');}
  if(kind==='bird-hearth'){tone(460,270,.17,.015,'sawtooth');noise(.12,.008,950);tone(510,290,.13,.010,'triangle',.22);}
  if(kind==='bird-solis'){tone(2100,3100,.09,.016,'sine');tone(2900,1750,.12,.011,'sine',.13);}
  if(kind==='bird-cryos'){tone(1350,1900,.16,.014,'sine');tone(1750,1200,.18,.011,'sine',.18);}
  if(kind==='arrow-shot'){tone(360,130,.10,.035,'triangle');noise(.11,.018,3800);}
  if(kind==='arrow-hit'){noise(.045,.035,1600);tone(200,80,.08,.025,'triangle');}
  if(kind==='watchtower-alarm'){for(const delay of [0,.32,.64]){tone(784,784,.6,.04,'sine',delay);tone(1190,1190,.4,.016,'sine',delay);}}
  if(kind==='mage-cast'){tone(392,784,.32,.018,'sine');tone(1175,880,.4,.01,'sine',.1);}
  if(kind==='skill-level-up'){tone(523,523,.24,.018,'sine');tone(659,659,.28,.017,'sine',.075);tone(1046,1046,.45,.012,'sine',.16);}
  if(kind==='god-level-up'){for(const [i,n]of [392,523,659,784,1046,1568].entries())tone(n,n,1.25,.024,'sine',i*.11);tone(131,262,.8,.02,'triangle');}
  if(kind==='belief-choice'){tone(659,659,.35,.027);tone(988,1318,.5,.022,'sine',.09);}
  if(kind==='belief-discovery'){for(const [i,n]of [523,784,1046].entries())tone(n,n,.8,.024,'sine',i*.12);}
  if(kind==='leader-promoted'){for(const [i,n]of [392,523,659,784,1046].entries())tone(n,n,1.2,.027,'sine',i*.12);tone(196,392,.6,.026,'triangle');noise(.5,.018,2200);}
  if(kind==='leader-lost'){tone(196,147,1.1,.024);tone(294,220,1.3,.015,'sine',.18);}
  if(kind==='ritual-ignite'){noise(.8,.07,1100);tone(120,50,.4,.035);noise(.18,.025,3200,.1);}
  if(kind==='staff-hit'){tone(420,125,.11,.06,'triangle');noise(.08,.045,1500);tone(784,659,.22,.015);}
  if(kind==='treasure-open'){noise(.07,.035,1300);tone(190,90,.13,.028,'triangle');for(const [i,n] of [523,659,1046].entries())tone(n,n,.35,.032,'sine',.06+i*.07)}
  if(kind==='offering'){tone(523,523,.4,.025);tone(784,784,.55,.018,'sine',.12)}
  if(kind==='step'){stepIndex++;tone(stepIndex%2?145:125,65,.065,sand?.014:.027);noise(sand?.095:.055,sand?.029:.035,sand?2100:1100)}
  if(kind==='clay-break'){noise(.16,.07,3100);tone(380,145,.095,.038,'triangle');for(const [i,n]of [1300,920,1670,660].entries()){tone(n,n*.55,.065,.021,'triangle',.06+i*.055);noise(.045,.018,2400,.08+i*.06)}}
  if(kind==='pot-place'){tone(235,115,.13,.04,'triangle');tone(670,580,.2,.02);noise(.065,.025,950)}
  if(kind==='pot-add'){noise(.17,.023,700);tone(290,110,.10,.024);tone(370,160,.08,.016,'sine',.1)}
  if(kind==='pot-stir'){noise(.22,.009,420);tone(190,310,.10,.008);tone(240,360,.08,.009,'sine',.18)}
  if(kind==='stew-ready'){tone(880,880,.45,.023);tone(1320,1320,.35,.012,'sine',.12)}
  if(kind==='bowl'){tone(720,500,.12,.017);noise(.04,.012,1800)}
  if(kind==='repair'){tone(540,300,.055,.028,'triangle');noise(.025,.018,1300)}
  if(kind==='wood'||kind==='chop'){tone(kind==='chop'?390:510,150,.085,.075,'triangle');noise(.055,.10,kind==='chop'?2500:1800);tone(100,45,.17,.06)}
  if(kind==='mine'){tone(1700,790,.11,.044,'triangle');tone(2500,1400,.065,.019);noise(.09,.075,3800);tone(160,65,.12,.045)}
  if(kind==='pull'){noise(.10,.055,1300);tone(220,480,.075,.035,'triangle');noise(.12,.035,2800,.05)}
  if(kind==='complete'){tone(440,440,.16,.026,'triangle');tone(660,880,.22,.022,'sine',.08)}
  if(kind==='fall'){noise(.6,.09,900);tone(125,38,.45,.09);noise(.16,.07,1800,.12)}
  if(kind==='slime-move'){tone(170,65,.14,.022);noise(.07,.015,650)}
  if(kind==='slime-hit'){tone(290,80,.14,.045);noise(.12,.035,1200);tone(95,48,.2,.024)}
  if(kind==='slime-split'){tone(310,85,.22,.042);tone(235,60,.24,.027,'sine',.065);noise(.18,.035,850)}
  if(kind==='slime-land'){tone(140,48,.2,.032);noise(.12,.023,650)}
  if(kind.startsWith('wish-'))playWishSound(kind,{tone,noise});
return layers;}
export const ACTION_SOUND_RECIPES=defineGameData('audio.recipes',Object.fromEntries(ACTION_SOUND_IDS.map(kind=>[kind,{pitch:[.94,1.06],variants:[original(kind,false,0),original(kind,false,1),original(kind,true,0),original(kind,true,1)]}])));
export const CRYOS_SOUND_RECIPES=defineGameData('audio.cryos', {step:{pitch:[.94,1.06],layers:[{type:'noise',args:[.13,.055,2400]},{type:'noise',args:[.075,.018,4800,.035]},{type:'tone',args:[115,58,.07,.014,'sine']}]},mine:{pitch:[.96,1.04],layers:[{type:'tone',args:[2100,1500,.18,.025,'sine']},{type:'noise',args:[.08,.06,3300]},{type:'tone',args:[140,65,.11,.035,'triangle']}]}});
export function soundRecipe(kind,{sand=false,snow=false,step=0}={}){if(snow&&CRYOS_SOUND_RECIPES[kind])return CRYOS_SOUND_RECIPES[kind];const recipe=ACTION_SOUND_RECIPES[kind];if(!recipe)throw Error('Unknown action sound '+kind);return {pitch:recipe.pitch,layers:recipe.variants[(sand?2:0)+(step%2)]};}
