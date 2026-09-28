// Stable actor slots keep every limb together, while local part order stays intact.
export function characterDrawBases(characters){
 return new Map([...characters].sort((a,b)=>a.ground-b.ground||a.id.localeCompare(b.id)).map((actor,index)=>[actor.id,100+index*100]));
}
export const sunflowerMapScale=.21; // ~94 map units tall; traveller is ~93.
