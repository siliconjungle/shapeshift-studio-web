import {watcherCommands} from '../examples.js';
import {pillarAssets,pillarNode} from './pillars.js';
// A regular Studio command recipe: all objects, assets, materials, maps and
// appearance variants remain editable and are included in saved projects.
export async function watcherSanctuaryCommands(options={}){
 const commands=await watcherCommands(options);
 commands.push(...pillarAssets(options.pillars));
 commands.push(pillarNode('pillar-west',[-3.15,.8,-1.3],'West pillar'),pillarNode('pillar-east',[3.15,.8,-1.3],'East pillar'),pillarNode('pillar-rear',[0,.8,-4.3],'Rear pillar'));
 commands.push({op:'scene3d.settings',values:{name:'Watcher sanctuary',paletteVariants:['ward-hearth','ward-cryos','ward-solis'],camera:{type:'orthographic',position:[7.5,4.5,13],target:[0,.15,-1.4],size:9.8,zoom:1,near:.1,far:160}}},{op:'appearance.select',id:'ward-hearth'});
 return commands;
}
