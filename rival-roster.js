// Settlement state stays plain and serializable. The original rival remains the
// primary neighbour for older saves and tools; world readers use the full roster.
export const rivalSettlements=e=>Array.isArray(e?.rivals)&&e.rivals.length?e.rivals:e?.rival?[e.rival]:[];
export const rivalPeople=e=>rivalSettlements(e).flatMap(s=>s.people??[]);
export const rivalBeasts=e=>rivalSettlements(e).map(s=>s.beast).filter(Boolean);
export const rivalFor=(e,person)=>person==null?null:rivalSettlements(e).find(s=>typeof person==='string'?s.culture===person:s.beast===person||s.people?.includes(person))??null;
export function withRival(e,settlement,run){const previous=e.rival;e.rival=settlement;try{return run()}finally{e.rival=previous}}
