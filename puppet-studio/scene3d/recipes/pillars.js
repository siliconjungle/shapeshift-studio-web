import {materialDefaults} from '../schema.js';
import {watcherShadow} from './watcher-shadow.js';

export const PILLAR_THEMES={
 hearth:{name:'Hearth',watcher:['#344c40','#c5973e','#eee0b4','#080e0b'],stone:'#394630',energy:'#f0bf4b',background:'#18231c'},
 cryos:{name:'Cryos',watcher:['#344657','#7b9bb4','#d0e3e6','#0a111b'],stone:'#344657',energy:'#a1d7ed',background:'#192431'},
 solis:{name:'Solis',watcher:['#ad623e','#dfb347','#fbebc6','#160e09'],stone:'#70452b',energy:'#ffb268',background:'#302319'}
};
const kinds=['art','height','roughness','normal','ao'],sides=['front','top','bottom'];
export function pillarAssets({base='./scene3d/assets/pillars/'}={}){
 const commands=[];
 for(const theme of Object.keys(PILLAR_THEMES))for(const side of sides)for(const kind of kinds){const file=theme+(side==='front'?'':'-'+side)+(kind==='art'?'.svg':'-'+kind+'.png');commands.push({op:'scene3d.asset.add',id:`pillar-${theme}-${side}-${kind}`,src:base+file});if(theme==='hearth')commands.push({op:'scene3d.asset.add',id:`pillar-${side}-${kind}`,src:base+file});}
 commands.push({op:'scene3d.material.add',id:'pillar-stone',values:{...materialDefaults('pillar-stone'),name:'Carved pillar stone',palette:['#394630','#b3af8f','#d3c7a2','#080e0b'],paintMode:'source',relief:.045,roughness:.92,sheen:.25,ink:1.5}});
 for(const [name,c]of Object.entries(PILLAR_THEMES)){
  const colors=Object.fromEntries(['stone','accent','paper','ink'].map((role,i)=>['watcher-'+role,c.watcher[i]]));Object.assign(colors,{'watcher-energy':c.energy,'pillar-stone':c.stone,'ward-background':c.background});
  const assets=Object.fromEntries(sides.flatMap(side=>kinds.map(kind=>[`pillar-${side}-${kind}`,`pillar-${name}-${side}-${kind}`])));
  // Colour roles are declared before variants so every binding validates.
  if(name==='hearth')commands.push({op:'appearance.role',id:'pillar-stone',name:'Pillar stone',color:c.stone},{op:'appearance.role',id:'ward-background',name:'Sanctuary background',color:c.background});
  commands.push({op:'appearance.variant',id:'ward-'+name,name:c.name,colors,assets});
 }
 commands.push({op:'appearance.bind',id:'pillar-body',role:'pillar-stone',target:{kind:'material',id:'pillar-stone',slot:0}},{op:'appearance.bind',id:'ward-background',role:'ward-background',target:{kind:'environment',channel:'background'}});
 return commands;
}
export function pillarNode(id,position,name='Carved pillar'){
 const surfaces=Object.fromEntries(['front','back','left','right','top','bottom'].map(face=>{const side=['top','bottom'].includes(face)?face:'front',prefix='pillar-'+side;return[face,{asset:prefix+'-art',heightMap:prefix+'-height',roughnessMap:prefix+'-roughness',normalMap:prefix+'-normal',occlusionMap:prefix+'-ao'}];}));
 return {op:'scene3d.node.add',id,type:'box',values:{name,position,dimensions:[1.3,4.6,1.3],ground:-1.5,radius:.055,material:'pillar-stone',surfaces,illustration:{chamfer:.055,shadow:{...watcherShadow,resolution:512}}}};
}
