import {resourceWoodland} from "../resource-state.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {RESOURCE_RULES} from '../../resource-rules.js';
import {isForage,forageRules} from '../../village-foraging.js';
import {resourceEntities} from '../resource-entities.js';

export function updateResourceGrowth(world){
 const e=world.resource('Village'),resources=resourceEntities(e);
 const store=world.store('ResourceNode');
 // Membership/order is retained until a structural list change. Never sort
 // by swap-removal order: ready events can trigger other gameplay observers.
 for(const id of resources.ids){
  const node=store.get(id);
  const rules=isForage(node)?forageRules(node):RESOURCE_RULES[node.kind];
  if(node.ecologyId!==undefined||rules.regrow===null||resourceWoodland(node)?.woodland&&resourceWoodland(node)?.ecoBornAt!==undefined||resourceGrowth(node)?.state==='depleted'&&resourceGrowth(node)?.readyAt===null)continue;
  if(resourceGrowth(node)?.state==='depleted'&&e.time>=resourceGrowth(node)?.readyAt-rules.grow){resourceGrowth(node).state='growing';e.emit('regrow',null,node);}
  if(resourceGrowth(node)?.state==='growing'){
   resourceGrowth(node).growth=Math.max(.08,1-(resourceGrowth(node)?.readyAt-e.time)/(resourceGrowth(node)?.initialGrow??rules.grow));
   if(e.time>=resourceGrowth(node)?.readyAt){resourceGrowth(node).state='ready';resourceGrowth(node).growth=1;resourceHarvest(node).hits=0;delete resourceGrowth(node)?.initialGrow;e.emit('ready',null,node);}
 }
 }
}
