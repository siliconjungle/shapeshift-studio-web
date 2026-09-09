import {beastLabel} from './village-cultures.js';
import {BEAST_HEAD_LAYOUTS} from './beast-head-layouts.js';
import {beastOrigin,BEAST_ORIGINS} from './beast-origins.js';
// Shared villager rigs and expressions, with a compatible broad beast skeleton.
const shape={bodyWidth:240,bodyHeight:190,bodyCenterY:-150,torsoTop:-235,headWidth:225,headHeight:190,headBottom:-212,headNeckU:.5,handRotation:Math.PI,compactArms:true,minimumHoodOverlap:16,armWidth:70,wholeArm:true,handHeight:65,footHeight:90,footWidth:83,feetSpacing:52,sockets:[[.18,.25],[.82,.25]],sleeves:[[],[]]};
export function beastCharacter(culture='hearth',origin='comforter'){
 const base='beast-'+culture,kind=beastOrigin({awakeningKind:origin}),id=base+(kind==='comforter'?'':'-'+kind);
 return {id,culture,unarmed:true,label:beastLabel(culture)+' · '+BEAST_ORIGINS[kind].ritual,
  art:(view,part)=>['head','body','arm','hand','boot'].includes(part)?`characters/${part==='head'?id:base}/${view}/${part}`:part==='impact'?`characters/${base}/${view}/hand`:'sprites/'+part,
  face:view=>`characters/${id}/${view}/head`,landmarks:`assets/characters/${id}/landmarks.json`,
  rigs:{front:{...shape,...BEAST_HEAD_LAYOUTS[id]?.front},back:{...shape,...BEAST_HEAD_LAYOUTS[id]?.back},side:{...shape,...BEAST_HEAD_LAYOUTS[id]?.side,bodyWidth:210,headWidth:207,headNeckU:.55,sockets:[[.18,.25],[.82,.25]]}}
 };
}
