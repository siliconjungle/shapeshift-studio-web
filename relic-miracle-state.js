import {relicCondition,relicCustody,relicProvenance} from './ecs/relic-entities.js';
import {RELIC_MIRACLES,relicChoices} from './relic-miracle-catalog.js';
const local=(e,id)=>(e.workers??[]).some(w=>w.id===id&&!w.exiled&&!w.gone);
export function holdsRelicKind(e,kind){
 return (e.relics?.items??[]).some(r=>r.kind===kind&&!relicCondition(r).destroyed&&!relicCustody(r).custodyCulture&&
  (relicCustody(r).holderId!=null?local(e,relicCustody(r).holderId):local(e,relicCustody(r).ownerId??relicProvenance(r).discoveredBy)));
}
export function relicMiracleAvailable(e,id){
 const card=RELIC_MIRACLES[id];
 return !card||e.belief?.relicChoices?.[card.relic]===id&&holdsRelicKind(e,card.relic);
}
export function syncRelicOffers(e){
 const b=e.belief;if(!b)return;
 b.relicChoices??={};
 b.offers=b.offers.filter(o=>o.source!=='relic'||holdsRelicKind(e,o.relic)&&!b.relicChoices[o.relic]);
 for(const kind of ['hungry-idol','whispering-mask','winter-lantern']){
  if(!holdsRelicKind(e,kind)||b.relicChoices[kind]||b.offers.some(o=>o.source==='relic'&&o.relic===kind))continue;
  b.offers.push({id:'belief-'+b.nextOffer++,source:'relic',relic:kind,level:b.level,options:relicChoices(kind).map(id=>({id,mode:'learn'}))});
 }
}
export function validRelicChoices(b){
 const choices=b.relicChoices;if(choices===undefined)return true;
 return choices&&typeof choices==='object'&&!Array.isArray(choices)&&Object.entries(choices).every(([kind,id])=>relicChoices(kind).includes(id)&&b.known.includes(id));
}
