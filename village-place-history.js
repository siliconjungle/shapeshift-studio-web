import {exploredAt} from './village-exploration.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function rememberPlace(e,point,kind,ids=[]){
 if(!point||![point.x,point.z].every(Number.isFinite)||!['gathering','reconciliation','camp','danger'].includes(kind))return null;
 const list=e.placeHistory??=[],old=list.find(p=>p.kind===kind&&distance(p,point)<5);
 const p=old??{x:point.x,z:point.z,kind,visits:0,at:e.time,people:[]};p.visits=Math.min(99,p.visits+1);p.at=e.time;p.people=[...new Set([...ids,...p.people])].slice(0,24);
 e.placeHistory=[p,...list.filter(q=>q!==p)].slice(0,32);return p;
}
export function placeBias(e,w,point,kind='social'){
 return (e.placeHistory??[]).filter(p=>distance(p,point)<7).reduce((v,p)=>{
 const strength=Math.min(1,p.visits/3)*Math.pow(.5,(e.time-p.at)/1800),personal=p.people.includes(w.id)?1:.45;
 return v+strength*personal*(p.kind==='danger'?-35:kind==='social'?18: p.kind==='camp'?8:0);
 },0);
}
export function rememberedSocialSpots(e,w){return (e.placeHistory??[]).filter(p=>p.kind!=='danger'&&p.visits>=2&&distance(p,w)<20&&exploredAt(e,p.x,p.z)&&placeBias(e,w,p)>0).sort((a,b)=>placeBias(e,w,b)-placeBias(e,w,a)).slice(0,3).map(p=>({x:p.x,z:p.z}));}
export function noticePlaceEvent(e,v){
 const w=e.workers.find(w=>w.id===v.workerId);if(!w)return;
 if(v.type==='social-finish'&&v.kind!=='argument')rememberPlace(e,w,v.reconciled?'reconciliation':'gathering',[w.id,v.partnerId]);
 if(v.type==='hurt'&&['attack','lightning','fire'].includes(v.cause)){
  if((w.placeDangerAfter??0)>e.time)return;w.placeDangerAfter=e.time+30;rememberPlace(e,w,'danger',[w.id]);
 }
}
export function validPlaceHistory(e){return e.placeHistory===undefined||Array.isArray(e.placeHistory)&&e.placeHistory.length<=32&&e.placeHistory.every(p=>p&&['gathering','reconciliation','camp','danger'].includes(p.kind)&&[p.x,p.z,p.at].every(Number.isFinite)&&p.at>=0&&Number.isInteger(p.visits)&&p.visits>=1&&p.visits<=99&&Array.isArray(p.people)&&p.people.length<=24&&p.people.every(Number.isSafeInteger));}
