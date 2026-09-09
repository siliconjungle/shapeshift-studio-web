// Compatibility for projects authored before styles were project data.
// Names and values belong to this integration, never the renderer or colour UI.
import {GRADING_PRESETS as legacyGrades} from '../../../color-grading.js';
import {appearanceDefaults} from '../../authoring/appearance.js';
const energy={hearth:'#f0bf4b',solis:'#ffab43',cryos:'#75d9ec',void:'#b79aff'};
export function migrateLegacyAppearance(p){
 const s=p.scene3d,g=p.grading??p.game?.grading,legacy=g?.preset==='auto'||Object.hasOwn(legacyGrades,g?.preset??'')&&g?.preset!=='neutral'||!!s?.environment?.biome||!!s?.rendering?.palettes;
 if(!p.appearance&&legacy){
  const a=p.appearance=appearanceDefaults(p),active=s?.environment?.biome??p.game?.culture??'hearth',palettes=s?.rendering?.palettes??{},current=a.variants[0];
  a.grades=Object.entries(legacyGrades).filter(([id])=>id!=='neutral').map(([id,values])=>({id,name:id[0].toUpperCase()+id.slice(1),values:{...values}}));
  current.name='Imported appearance';current.grading={...(legacyGrades[active]??legacyGrades.neutral)};
  for(const [id,definition]of Object.entries(palettes)){const palette=definition.colors??definition;if(!Array.isArray(palette)||palette.length!==4)continue;a.variants.push({id,name:id[0].toUpperCase()+id.slice(1),colors:{base:palette[0],accent:palette[1],paper:palette[2],ink:palette[3],energy:definition.energy??energy[id]??s.environment.lightColor},grading:{...(legacyGrades[id]??legacyGrades.neutral)}});}
  if(Object.keys(palettes).length){a.bindings=s.materials.filter(m=>m.id!=='floor').flatMap(m=>[0,1,2,3].map(slot=>({id:m.id+'-'+slot,role:a.roles[slot].id,target:{kind:'material',id:m.id,slot}})));a.bindings.push({id:'energy-environment',role:'energy',target:{kind:'environment',channel:'lightColor'}});}
  // Keep the exact saved material values active, even if they were customised.
  if(g)p.grading={...g};
 }
 if(s?.environment)delete s.environment.biome;
 for(const n of [...(p.joints??[]),...(s?.nodes??[])])for(const key of ['light','coloring'])if(n[key]?.colorMode==='biome')n[key].colorMode='environment';
 return p;
}
