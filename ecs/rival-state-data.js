const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=v=>Number.isFinite(v)&&v>=0,id=v=>Number.isSafeInteger(v)&&v>=0;
export const RivalSettlement={name:'RivalSettlement',replaceable:false,validate:s=>record(s)&&['hearth','solis','cryos'].includes(s.culture)};
export const RivalVisit={name:'RivalVisit',replaceable:false,validate:record};
export const RivalVisitOwner={name:'RivalVisitOwner',validate:r=>record(r)&&record(r.person)};
export const RelicMission={name:'RelicMission',validate:r=>record(r)&&record(r.visit)&&(r.mission===undefined||record(r.mission)&&/^relic-\d+$/.test(r.mission.id)&&['recover','offer','claim','cleanse','steal'].includes(r.mission.intent)&&['approach','request','rite','attack'].includes(r.mission.phase)&&finite(r.mission.until))};
export const SettlementRelicIntent={name:'SettlementRelicIntent',validate:r=>record(r)&&record(r.settlement)&&(r.bearerId==null||id(r.bearerId))};
export function visitMissionInput(visit){if(!Object.hasOwn(visit,'relicMission'))return null;const row={visit,mission:visit.relicMission};if(!RelicMission.validate(row))throw Error('Invalid RelicMission input');return row;}
export function settlementRelicInput(settlement){if(!Object.hasOwn(settlement,'relicBearerId'))return null;const row={settlement,bearerId:settlement.relicBearerId};if(!SettlementRelicIntent.validate(row))throw Error('Invalid SettlementRelicIntent input');return row;}
