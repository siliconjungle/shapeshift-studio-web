// Native Little Gods cues, balanced to similar loudness within each family.
const families={
 enter:[['pot-add',.32],['bowl',.42],['pot-place',.3]],
 clear:[['skill-level-up',.55],['belief-discovery',.42],['offering',.42]],
};
export function createLevelAudioVariants(random=Math.random){
 const previous={};
 return function next(family){
  const pool=families[family].filter(([kind])=>kind!==previous[family]);
  const [kind,base]=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  previous[family]=kind;
  return{kind,level:base*(.92+random()*.16)};
 };
}
