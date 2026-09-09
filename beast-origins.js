import {ensureBeastLearning} from './ecs/beast-learning.js';
import {ensureActorRomance} from './ecs/actor-romance.js';
import {defineGameData} from './game-data.js';
export const BEAST_ORIGINS=defineGameData('beast-origins.BEAST_ORIGINS',{
 comforter:{label:'Tender spirit',ritual:'Comforter',description:'Gentle, affectionate and easier to soothe.',temperament:'gentle',trust:.65,training:.16,protect:.55,company:.8,lash:.06,romance:.65,socialRate:.9,jealousy:.65,calming:1.4,learning:1.1,ferocity:.8,helpfulness:.08},
 steward:{label:'Steadfast guardian',ritual:'Steward',description:'Patient and protective; often lends its paws to gathering.',temperament:'stubborn',trust:.55,training:.25,protect:.85,company:.45,lash:.1,romance:.4,socialRate:.75,jealousy:.8,calming:1.15,learning:1.15,ferocity:1,helpfulness:.45},
 charismatic:{label:'Radiant companion',ritual:'Charismatic',description:'Playful and romantic; craves company and feels jealousy keenly.',temperament:'playful',trust:.7,training:.1,protect:.55,company:.9,lash:.18,romance:.9,socialRate:1.35,jealousy:1.4,calming:1,learning:1,ferocity:1,helpfulness:.1},
 zealot:{label:'Wild protector',ritual:'Zealot',description:'Fiercely protective, quick to anger and slower to calm.',temperament:'volatile',trust:.4,training:.04,protect:.9,company:.3,lash:.35,romance:.55,socialRate:1,jealousy:1.2,calming:.7,learning:.85,ferocity:1.35,helpfulness:.04}
});
export const beastOrigin=b=>Object.hasOwn(BEAST_ORIGINS,b?.awakeningKind)?b.awakeningKind:'comforter';
export const beastTraits=b=>BEAST_ORIGINS[beastOrigin(b)];
export function initialiseBeastOrigin(b,{newborn=false}={}){
 const p=beastTraits(b);if(b.originTraitsVersion===1)return;
 // A loaded beast keeps learned behaviour, bonds and emotional history.
 // Its immutable ritual still determines its appearance and innate tendencies.
 if(newborn){ensureBeastLearning(b).temperament=p.temperament;ensureBeastLearning(b).trust=p.trust;ensureBeastLearning(b).training=p.training;ensureBeastLearning(b).habits={protect:p.protect,company:p.company,lash:p.lash};ensureActorRomance(b).romanceInterest=p.romance;}
 b.originTraitsVersion=1;b.originName=p.label;
}
