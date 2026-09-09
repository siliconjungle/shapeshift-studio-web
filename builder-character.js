import {actorPerformanceCareer} from './ecs/performance-actors.js';
import {personAge} from './ecs/person-age.js';
import {CRYOS_CHARACTER_LAYOUTS} from './cryos-character-layouts.js';
import {defineGameData} from './game-data.js';
// Character identity is separate from the shared builder's motion and props.
import {resolveCulture,voiceForWorker} from './village-cultures.js';
const originalArt=(view,part)=>view==='side'||['hammer','impact','smear'].includes(part)?'sprites/'+part:'directions/'+view+'/'+part;
export const ORIGINAL_BUILDER={
 id:'original',label:'Original builder',voice:'v3',art:originalArt,
 face:(view)=>'faces/'+view+'/base',landmarks:'assets/vector/faces/landmarks.json',rigs:{}
};
export const FEMALE_BUILDER={
 id:'female',label:'Female builder',voice:'female-v1',
 art:(view,part)=>['head','body'].includes(part)?`characters/female-builder/${view}/${part}`:originalArt(view,part),
 face:view=>`characters/female-builder/${view}/head`,landmarks:'assets/characters/female-builder/landmarks.json',
 rigs:{
  side:{bodyWidth:151,bodyHeight:150,headWidth:235,sockets:[[.14,.35],[.90,.30]],sleeves:[[[.025,.28],[.14,.13],[.34,.27],[.255,.47],[.21,.43],[.045,.32]],[[.80,.13],[1,.24],[.96,.36],[.91,.38],[.85,.24]]]},
  front:{bodyWidth:151,bodyHeight:150,sockets:[[.10,.34],[.90,.34]]},
  back:{bodyWidth:151,bodyHeight:150,sockets:[[.12,.33],[.88,.33]]}
 }
};
function spiritualLeader(sex){
 const female=sex==='female',base=female?FEMALE_BUILDER:ORIGINAL_BUILDER;
 const shape={bodyWidth:female?164:178,bodyHeight:155,headWidth:232,headHeight:female?320:295,headBottom:female?-130:-155};
 return {
  id:`spiritual-leader-${sex}`,label:`${female?'Female':'Male'} spiritual leader`,voice:base.voice,item:'leaf-staff',
  art:(view,part)=>['head','body'].includes(part)?`characters/spiritual-leader-${sex}/${view}/${part}`:originalArt(view,part),
  face:view=>`characters/spiritual-leader-${sex}/${view}/head`,landmarks:`assets/characters/spiritual-leader-${sex}/landmarks.json`,
  rigs:{
   // The female side mask was drawn facing left; the shared side rig faces right.
   side:{...shape,headFlipX:female?-1:1,sockets:[[.15,.50],[.90,.46]],sleeves:[[[.02,.43],[.18,.28],[.35,.41],[.28,.58],[.08,.51]],[[.79,.29],[.98,.43],[.97,.49],[.88,.45]]]},
   front:{...shape,sockets:[[.12,.50],[.88,.50]]},
   back:{...shape,sockets:[[.12,.49],[.88,.49]]}
  }
 };
}
export const MALE_SPIRITUAL_LEADER=spiritualLeader('male');
export const FEMALE_SPIRITUAL_LEADER=spiritualLeader('female');
function solisBuilder(sex){
 const id=`solis-${sex}`,shape={bodyWidth:sex==='female'?168:178,bodyHeight:130,bodyCenterY:-110,torsoTop:-158,headWidth:185,headHeight:190,headBottom:-143,hoodCollarV:.20,hoodOverlap:16,handRotation:Math.PI,minimumHoodOverlap:12,compactArms:true,armWidth:30,feetSpacing:28,footHeight:52,footCuff:[.5,.1],pairedBoots:true};
 return {id,label:`${sex==='female'?'Female':'Male'} Solis villager`,culture:'solis',voice:voiceForWorker({culture:'solis',sex}),
  art:(view,part)=>part==='impact'?`characters/${id}/${view}/hand`:['head','body','arm','hand','boot'].includes(part)?`characters/${id}/${view}/${part}`:originalArt(view,part),
  face:view=>`characters/${id}/${view}/head`,landmarks:`assets/characters/${id}/landmarks.json`,
  rigs:{side:{...shape,feetSpacing:25,footHeight:56,footCuff:[.40,.1],bodyWidth:sex==='female'?142:150,headWidth:174,headNeckU:sex==='female'?.59:.57,sockets:[[.14,.32],[.88,.29]],sleeves:[[[.02,.28],[.14,.10],[.30,.24],[.26,.37],[.10,.36]],[[.80,.13],[.97,.23],[.92,.33],[.82,.29]]]},front:{...shape,headNeckU:sex==='female'?.53:.50,sockets:[[.13,.30],[.87,.30]]},back:{...shape,headNeckU:.50,sockets:[[.13,.30],[.87,.30]]}}
 };
}
export const SOLIS_MALE=solisBuilder('male'),SOLIS_FEMALE=solisBuilder('female');
function solisLeader(sex){
 const base=sex==='female'?SOLIS_FEMALE:SOLIS_MALE,id=`solis-leader-${sex}`,shape={bodyWidth:sex==='female'?174:186,bodyHeight:136,bodyCenterY:-113,torsoTop:-164,headWidth:185,headHeight:224,headBottom:-147,hoodCollarV:.20,hoodOverlap:16,handRotation:Math.PI,minimumHoodOverlap:12,compactArms:true,armWidth:30,feetSpacing:28,footHeight:52,footCuff:[.5,.1],pairedBoots:true};
 return {...base,id,label:`${sex==='female'?'Female':'Male'} Sunkeeper`,item:'sun-staff',
  art:(view,part)=>['head','body'].includes(part)?`characters/${id}/${view}/${part}`:base.art(view,part),
  face:view=>`characters/${id}/${view}/head`,landmarks:`assets/characters/${id}/landmarks.json`,
  rigs:{side:{...shape,feetSpacing:25,footHeight:56,footCuff:[.40,.1],bodyWidth:sex==='female'?148:158,headWidth:174,headNeckU:sex==='female'?.61:.59,sockets:[[.13,.40],[.88,.37]],sleeves:[[[.02,.29],[.13,.16],[.31,.30],[.25,.40],[.09,.38]],[[.79,.18],[.98,.26],[.94,.38],[.83,.33]]]},front:{...shape,headNeckU:sex==='female'?.53:.50,sockets:[[.12,.40],[.88,.40]]},back:{...shape,headNeckU:.50,sockets:[[.12,.40],[.88,.40]]}}
 };
}
export const SOLIS_MALE_LEADER=solisLeader('male'),SOLIS_FEMALE_LEADER=solisLeader('female');
function cryosBuilder(sex,leader=false){
 const base=leader?solisLeader(sex):solisBuilder(sex),id=`cryos-${leader?'leader-':''}${sex}`,bodyId=`cryos-${sex}`;
 const art=(view,part)=>['head','body','arm','hand','boot'].includes(part)?`characters/${leader&&!['head','body'].includes(part)?bodyId:id}/${view}/${part}`:part==='impact'?`characters/${bodyId}/${view}/hand`:originalArt(view,part);
 return {...base,id,culture:'cryos',label:`${sex==='female'?'Female':'Male'} ${leader?'Frostkeeper':'Cryos villager'}`,voice:voiceForWorker({culture:'cryos',sex}),item:leader?'frost-staff':undefined,art,face:view=>art(view,'head'),landmarks:`assets/characters/${id}/landmarks.json`,rigs:Object.fromEntries(['front','side','back'].map(view=>[view,{...base.rigs[view],...CRYOS_CHARACTER_LAYOUTS[id]?.[view]}]))};
}
export const CRYOS_MALE=cryosBuilder('male'),CRYOS_FEMALE=cryosBuilder('female'),CRYOS_MALE_LEADER=cryosBuilder('male',true),CRYOS_FEMALE_LEADER=cryosBuilder('female',true);
function mageBuilder(culture,sex){
 const base=culture==='solis'?(sex==='female'?SOLIS_FEMALE:SOLIS_MALE):culture==='cryos'?(sex==='female'?CRYOS_FEMALE:CRYOS_MALE):(sex==='female'?FEMALE_BUILDER:ORIGINAL_BUILDER);
 const id=`mage-${culture}-${sex}`,artId=`mage-${culture}`;
 const shape={bodyWidth:172,bodyHeight:143,bodyCenterY:-113,torsoTop:-167.5,compactArms:true,headWidth:culture==='hearth'?225:205,headHeight:culture==='solis'?275:235,headBottom:-146,headNeckU:.5,hoodCollarV:.16,hoodOverlap:16,minimumHoodOverlap:12};
 return {...base,id,culture,label:`${culture==='hearth'?'Grove':culture==='solis'?'Sun':'Frost'} mage`,item:undefined,
  art:(view,part)=>['head','body'].includes(part)?`characters/${artId}/${view}/${part}`:base.art(view,part),
  face:view=>`characters/${artId}/${view}/head`,landmarks:`assets/characters/${artId}/landmarks.json`,
  rigs:Object.fromEntries(['front','side','back'].map(view=>[view,{...base.rigs[view],...shape,headFlipX:culture==='cryos'&&view==='side'?-1:1,headNeckU:view==='side'?(culture==='hearth'?.62:culture==='solis'?.64:.58):.5,sockets:[[.13,.43],[.87,.43]],sleeves:null}]))};
}
export const MAGE_BUILDERS=Object.fromEntries(['hearth','solis','cryos'].flatMap(c=>['male','female'].map(sex=>{const b=mageBuilder(c,sex);return [b.id,b]})));
function actorBuilder(culture,sex){
 const base=culture==='solis'?(sex==='female'?SOLIS_FEMALE:SOLIS_MALE):culture==='cryos'?(sex==='female'?CRYOS_FEMALE:CRYOS_MALE):(sex==='female'?FEMALE_BUILDER:ORIGINAL_BUILDER),id=`actor-${culture}-${sex}`;
 const shape={bodyWidth:sex==='female'?166:178,bodyHeight:145,bodyCenterY:-115,torsoTop:-170.5,headWidth:224,headHeight:224,headBottom:-146,headNeckU:.5,hoodCollarV:.17,hoodOverlap:15,minimumHoodOverlap:12,compactArms:true,armWidth:30};
 return {...base,id,culture,label:`${sex==='female'?'Female':'Male'} ${culture==='hearth'?'Grove':culture==='solis'?'Sun':'Frost'} actor`,item:undefined,
 art:(view,part)=>['head','body'].includes(part)?`characters/${id}/${view}/${part}`:base.art(view,part),face:view=>`characters/${id}/${view}/head`,landmarks:`assets/characters/${id}/landmarks.json`,
 rigs:Object.fromEntries(['front','side','back'].map(view=>[view,{...base.rigs[view],...shape,headNeckU:view==='side'?.62:view==='back'?.5:.55,sockets:[[.13,.43],[.87,.43]],sleeves:null}]))};
}
export const ACTOR_BUILDERS=Object.fromEntries(['hearth','solis','cryos'].flatMap(c=>['male','female'].map(sex=>{const b=actorBuilder(c,sex);return [b.id,b]})));
export const BUILDERS={...ACTOR_BUILDERS,...MAGE_BUILDERS,[CRYOS_MALE.id]:CRYOS_MALE,[CRYOS_FEMALE.id]:CRYOS_FEMALE,[CRYOS_MALE_LEADER.id]:CRYOS_MALE_LEADER,[CRYOS_FEMALE_LEADER.id]:CRYOS_FEMALE_LEADER,original:ORIGINAL_BUILDER,female:FEMALE_BUILDER,[MALE_SPIRITUAL_LEADER.id]:MALE_SPIRITUAL_LEADER,[FEMALE_SPIRITUAL_LEADER.id]:FEMALE_SPIRITUAL_LEADER,[SOLIS_MALE.id]:SOLIS_MALE,[SOLIS_FEMALE.id]:SOLIS_FEMALE,[SOLIS_MALE_LEADER.id]:SOLIS_MALE_LEADER,[SOLIS_FEMALE_LEADER.id]:SOLIS_FEMALE_LEADER};
for(const character of Object.values(BUILDERS))character.rigs=defineGameData('rig.'+character.id,character.rigs);
function baseBuilderForWorker(w){
 if(w.role==='actor'&&actorPerformanceCareer(w)?.specialization&&!personAge(w)?.child&&!w.mage)return ACTOR_BUILDERS[`actor-${resolveCulture(w.culture).id}-${w.sex==='female'?'female':'male'}`];
 if(w.mage&&!(personAge(w)?.child))return MAGE_BUILDERS[`mage-${resolveCulture(w.culture).id}-${w.sex==='female'?'female':'male'}`];
 if(resolveCulture(w.culture).id==='cryos')return !(personAge(w)?.child)&&['spiritual-leader','former-leader'].includes(w.role)?(w.sex==='female'?CRYOS_FEMALE_LEADER:CRYOS_MALE_LEADER):(w.sex==='female'?CRYOS_FEMALE:CRYOS_MALE);
 if(resolveCulture(w.culture).id==='solis')return !(personAge(w)?.child)&&['spiritual-leader','former-leader'].includes(w.role)?(w.sex==='female'?SOLIS_FEMALE_LEADER:SOLIS_MALE_LEADER):(w.sex==='female'?SOLIS_FEMALE:SOLIS_MALE);
 return !(personAge(w)?.child)&&['spiritual-leader','former-leader'].includes(w.role)?(w.sex==='female'?FEMALE_SPIRITUAL_LEADER:MALE_SPIRITUAL_LEADER):(w.sex==='female'?FEMALE_BUILDER:ORIGINAL_BUILDER);
}

const elderBuilders=new Map();
export function builderForWorker(w){const base=baseBuilderForWorker(w);if(!(personAge(w)?.elder)||(personAge(w)?.child))return base;let elder=elderBuilders.get(base.id);if(!elder){elder={...base,id:base.id+'-elder',elder:true,item:base.item??(base.culture==='cryos'?'cryos-elder-staff':'elder-staff')};elderBuilders.set(base.id,elder);}return elder;}
