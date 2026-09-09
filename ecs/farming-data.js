const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=v=>Number.isFinite(v)&&v>=0,integer=v=>Number.isSafeInteger(v)&&v>=0;
const optional=(r,k,test)=>r[k]===undefined||test(r[k]);
const strict=(owner,fields,test)=>r=>record(r)&&record(r[owner])&&Object.keys(r).every(k=>k===owner||fields.includes(k))&&test(r);
export const PlotPreparation={name:'PlotPreparation',validate:strict('plot',['state','passes','reservedBy','visible'],r=>['ready','planned','preparing','planting'].includes(r.state)&&integer(r.passes)&&(r.reservedBy===null||integer(r.reservedBy))&&optional(r,'visible',v=>typeof v==='boolean'))};
export const FarmingSchedule={name:'FarmingSchedule',validate:strict('farming',['shortage','nextCheck'],r=>finite(r.shortage)&&finite(r.nextCheck))};
export const FarmingHistory={name:'FarmingHistory',validate:strict('farming',['completed'],r=>integer(r.completed))};
export const FarmingSites={name:'FarmingSites',validate:strict('farming',['sites'],r=>Array.isArray(r.sites)&&new Set(r.sites.map(s=>s?.id)).size===r.sites.length&&r.sites.every(s=>record(s)&&typeof s.id==='string'&&Number.isFinite(s.x)&&Number.isFinite(s.z)))};
export const ActorFarmingTask={name:'ActorFarmingTask',validate:strict('person',['plotId','retryAt'],r=>optional(r,'plotId',v=>v===null||typeof v==='string')&&optional(r,'retryAt',finite))};
export const farmingDomains=[
 {definition:PlotPreparation,key:'plotPreparations',owner:'plot',kind:'FarmPlot',fields:['state','passes','reservedBy','visible']},
 {definition:FarmingSchedule,key:'farmingSchedules',owner:'farming',kind:'Farming',fields:['shortage','nextCheck']},
 {definition:FarmingHistory,key:'farmingHistories',owner:'farming',kind:'Farming',fields:['completed']},
 {definition:FarmingSites,key:'farmingSites',owner:'farming',kind:'Farming',fields:['sites']}
];
export function farmingInput(value,kind){return farmingDomains.filter(s=>s.kind===kind).flatMap(spec=>{const keys=spec.fields.filter(k=>Object.hasOwn(value,k));if(!keys.length)return [];const row={[spec.owner]:value};for(const k of keys)row[k]=value[k];if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');return [{...spec,row,keys}];});}
export function farmingTaskInput(person){const fields={farmPlotId:'plotId',farmRetryAt:'retryAt'},keys=Object.keys(fields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];const row={person};for(const k of keys)row[fields[k]]=person[k];if(!ActorFarmingTask.validate(row))throw Error('Invalid ActorFarmingTask input');return [{definition:ActorFarmingTask,row,keys}];}
