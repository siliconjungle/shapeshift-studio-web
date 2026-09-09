const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>Number.isFinite(v)&&v>=0;
const id=v=>Number.isSafeInteger(v)&&v>=0;
const person=v=>v===null||id(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const cultures=['hearth','solis','cryos'];
const base=r=>record(r)&&record(r.relic);
const memory=m=>record(m)&&typeof m.text==='string'&&finite(m.at);
export const Relic={name:'Relic',replaceable:false,validate:r=>record(r)&&typeof r.id==='string'&&/^relic-\d+$/.test(r.id)&&['hungry-idol','whispering-mask','winter-lantern'].includes(r.kind)&&cultures.includes(r.culture),prepare:r=>{for(const key of ['id','kind','culture'])Object.defineProperty(r,key,{value:r[key],writable:false,enumerable:true,configurable:false});}};
export const RelicsRuntime={name:'RelicsRuntime',replaceable:false,validate:r=>record(r)&&r.version===1&&id(r.nextId)&&finite(r.nextCheck)&&optional(r,'politicsAt',finite)};
export const RelicMember={name:'RelicMember',validate:r=>record(r)&&id(r.order)};
export const RelicSpatial={name:'RelicSpatial',validate:r=>base(r)&&Number.isFinite(r.x)&&Number.isFinite(r.z)};
export const RelicCustody={name:'RelicCustody',validate:r=>base(r)&&person(r.ownerId)&&person(r.holderId)&&optional(r,'custodyCulture',v=>v===null||cultures.includes(v))};
export const RelicCondition={name:'RelicCondition',validate:r=>base(r)&&typeof r.destroyed==='boolean'&&(r.destroyedAt===null||finite(r.destroyedAt))};
export const RelicInfluence={name:'RelicInfluence',validate:r=>base(r)&&typeof r.hungry==='boolean'&&id(r.foodEaten)&&finite(r.nextFoodAt)};
const owner=o=>record(o)&&id(o.id)&&typeof o.name==='string'&&cultures.includes(o.culture)&&finite(o.at)&&['discovered','carried','stolen','traded','inherited'].includes(o.reason);
export const RelicProvenance={name:'RelicProvenance',validate:r=>base(r)&&person(r.discoveredBy)&&finite(r.discoveredAt)&&Array.isArray(r.history)&&r.history.length<=8&&r.history.every(memory)&&optional(r,'owners',v=>Array.isArray(v)&&v.length<=24&&v.every(owner))};
const politics=p=>record(p)&&finite(p.nextPlot)&&finite(p.homeAt)&&Array.isArray(p.rumours)&&p.rumours.length<=2&&new Set(p.rumours.map(r=>r?.culture)).size===p.rumours.length&&p.rumours.every(r=>record(r)&&cultures.includes(r.culture)&&id(r.witnessId)&&finite(r.at)&&finite(r.nextAt)&&typeof r.claim==='string');
export const RelicPolitics={name:'RelicPolitics',validate:r=>base(r)&&optional(r,'politics',politics)};
export const relicDomains=Object.freeze([
 {definition:RelicSpatial,key:'relicSpatial',access:'relicSpatial',fields:['x','z'],required:true},
 {definition:RelicCustody,key:'relicCustody',access:'relicCustody',fields:['ownerId','holderId','custodyCulture'],required:true},
 {definition:RelicCondition,key:'relicConditions',access:'relicCondition',fields:['destroyed','destroyedAt'],required:true},
 {definition:RelicInfluence,key:'relicInfluences',access:'relicInfluence',fields:['hungry','foodEaten','nextFoodAt'],required:true},
 {definition:RelicProvenance,key:'relicProvenance',access:'relicProvenance',fields:['discoveredBy','discoveredAt','history','owners'],required:true},
 {definition:RelicPolitics,key:'relicPolitics',access:'relicPoliticsData',fields:['politics'],required:false}
]);
export function relicInput(relic){return relicDomains.flatMap(spec=>{
 const keys=spec.fields.filter(k=>Object.hasOwn(relic,k));if(!keys.length)return [];
 const row={relic};for(const key of keys)row[key]=relic[key];
 if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');return [{...spec,row,keys}];
});}
