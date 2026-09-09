import {resolveCulture,CRYOS_NAMES,SOLIS_NAMES} from './village-cultures.js';
// A shared woodland name pool: names carry no job or gender restrictions.
export const VILLAGER_NAMES=Object.freeze([
 'Fern','Rowan','Moss','Iris','Ash','Clover','Pip','Wren','Bramble','Hazel',
 'Alder','Aspen','Birch','Briar','Cedar','Elm','Hawthorn','Holly','Juniper','Laurel',
 'Linden','Maple','Oak','Olive','Pine','Reed','Saffron','Sage','Sorrel','Willow',
 'Aster','Basil','Bay','Bluebell','Bloom','Blossom','Buttercup','Camellia','Cassia','Cherry',
 'Clementine','Cress','Dahlia','Daisy','Dandelion','Delphine','Eglantine','Fennel','Flora','Foxglove',
 'Ginger','Heather','Hyacinth','Ivy','Jasmine','Lavender','Lilac','Lily','Lotus','Marigold',
 'Meadow','Mimosa','Myrtle','Nettle','Orchid','Peony','Poppy','Primrose','Rose','Rosemary',
 'Rue','Snowdrop','Sprig','Tansy','Thistle','Thyme','Tulip','Verbena','Violet','Yarrow',
 'Acorn','Apple','Apricot','Barley','Bean','Berry','Buckwheat','Chestnut','Cobnut','Cocoa',
 'Coffee','Cornflower','Cotton','Fig','Flax','Gooseberry','Huckleberry','Lemon','Lentil','Mango',
 'Mulberry','Nectar','Nori','Oat','Peach','Peanut','Pear','Pepper','Persimmon','Plum',
 'Pollen','Pumpkin','Quince','Raisin','Raspberry','Rhubarb','Rye','Sesame','Sprout','Walnut',
 'Amber','Amethyst','Beryl','Flint','Garnet','Jasper','Jade','Opal','Onyx','Pearl',
 'Pebble','Quartz','Ruby','Slate','Stone','Topaz','Copper','Goldie','Silver','Mica',
 'Autumn','Breeze','Brook','Cloud','Dawn','Dew','Dusk','Ember','Frost','Gale',
 'Glen','Haven','Lake','Mist','Moon','Rain','River','Sky','Snow','Sol',
 'Star','Storm','Summer','Sunny','Vale','Winter','Zephyr','Aurora','Cove','Fable',
 'Finch','Robin','Lark','Linnet','Sparrow','Swift','Dove','Magpie','Kestrel','Heron',
 'Cricket','Otter','Badger','Fawn','Fox','Hare','Lynx','Moth','Newt','Sable',
 'Tilly','Toby','Remy','Rory','Quinn','Ellis','Avery','Arlo','Milo','Nell'
]);

export function createVillageNamePool({random=Math.random,reserved=[],culture='hearth'}={}){
 const names=resolveCulture(culture).id==='cryos'?CRYOS_NAMES:culture==='solis'?SOLIS_NAMES:VILLAGER_NAMES;
 const used=new Set(reserved.filter(n=>typeof n==='string').map(n=>n.trim().toLowerCase()));
 const remaining=names.filter(n=>!used.has(n.toLowerCase()));
 const index=length=>Math.min(length-1,Math.floor(random()*length));
 return {take(){
  let name;
  if(remaining.length)name=remaining.splice(index(remaining.length),1)[0];
  else{
   // The current village is much smaller than the pool. Keep names unique if
   // its population limit later grows beyond 200 or named villagers are loaded.
   const base=names[index(names.length)];let suffix=2;
   do{name=base+' '+suffix++}while(used.has(name.toLowerCase()));
  }
  used.add(name.toLowerCase());return name;
 }};
}
