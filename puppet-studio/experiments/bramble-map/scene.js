import {journeyBeat} from './motion.js';
export const mapScene={
 version:3,title:'Little Gods',
 locations:[
  {id:'camp',name:'Hearth Village',kind:'Home',description:'Leaf-roofed homes gathered around a quiet courtyard.',x:235,y:605,width:240,asset:'camp'},
  {id:'shop',name:'Warden’s Grove',kind:'The threshold',description:'A little lantern beneath an ancient tree.',x:490,y:340,width:240,asset:'shop'},
  {id:'well',name:'Solis Village',kind:'The sun court',description:'A village beneath the Unblinking Sun.',x:805,y:440,width:240,asset:'well'},
  {id:'shrine',name:'Fallen Shrine',kind:'The trial',description:'Crumbling walls and worn steps on an older road.',x:610,y:800,width:220,asset:'shrine'},
  {id:'gate',name:'Cryos Pass',kind:'The crossing',description:'Shelter beneath the frost crown.',x:1070,y:770,width:250,asset:'gate'},
  {id:'keep',name:'Old Sanctuary',kind:'The return',description:'Three marks, and a place to begin again.',x:1200,y:350,width:245,asset:'keep'}
 ],
 routes:[
  {id:'hearth-warden',from:'camp',to:'shop',points:[[0,0],[325,525],[370,450],[440,400],[0,0]]},
  {id:'warden-solis',from:'shop',to:'well',points:[[0,0],[595,390],[670,460],[765,490],[0,0]]},
  {id:'solis-fallen',from:'well',to:'shrine',points:[[0,0],[840,545],[745,580],[700,700],[0,0]]},
  {id:'fallen-cryos',from:'shrine',to:'gate',points:[[0,0],[780,855],[885,825],[1020,820],[0,0]]},
  {id:'cryos-sanctuary',from:'gate',to:'keep',points:[[0,0],[1230,755],[1310,640],[1270,490],[0,0]]}
 ],
 scenery:[['pine',145,335,156,-3],['oak',305,885,164,4],['rocks',725,158,120,-3],['pine',1310,910,150,3],['oak',955,235,144,-3],['rocks',915,912,120,2]]
};
export function scheduleMapReveal(scene,random=Math.random){
 scene.locations[0].reveal=journeyBeat.start;
 for(const [i,route]of scene.routes.entries()){
  route.start=scene.locations[i].reveal+journeyBeat.pop;
  route.duration=journeyBeat.path+(random()-.5)*.24;
  // The destination and its sound begin when the path reaches it.
  scene.locations[i+1].reveal=route.start+route.duration;
 }
}
scheduleMapReveal(mapScene,()=>.5);

// Props inherit the closest location's region, so moving them updates their art.
export function nearestSceneryRegion(x,y){
 return mapScene.locations.reduce((nearest,n)=>Math.hypot(x-n.x,y-n.y)<Math.hypot(x-nearest.x,y-nearest.y)?n:nearest).id;
}
const regionalProps={well:{tree:'solis-tree',rocks:'solis-rocks'},gate:{tree:'cryos-pine',rocks:'cryos-rocks'}};
mapScene.scenery=mapScene.scenery.map(([asset,x,y,width,rotation])=>{
 const region=nearestSceneryRegion(x,y),variant=regionalProps[region]?.[asset==='rocks'?'rocks':'tree']??asset;
 return [variant,x,y,width,rotation,region];
});
