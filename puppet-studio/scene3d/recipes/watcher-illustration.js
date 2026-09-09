import manifest from './watcher-resources.json' with {type:'json'};
import {watcherController} from './watcher-controller.js';
import {watcherMaterialInputs} from './watcher-render.js';
import {watcherEye} from './watcher-eye.js';
import {watcherShadow} from './watcher-shadow.js';
import {watcherGround,watcherVectorAssets} from './watcher-assets.js';
import {watcherEffects} from './watcher-effects.js';
import {watcherAudio} from './watcher-audio.js';
import {watcherLanding,watcherLaserContact} from './watcher-decals.js';
// Ordinary project resources and controller/material definitions. Nothing in
// the runtime depends on this recipe's object IDs, action names or artwork.
export async function watcherIllustrationCommands(scene,{base='./scene3d/assets/'}={}){
 const [parts,marks]=await Promise.all([fetch(base+'landing-sprite-parts.json').then(r=>r.json()),fetch(base+'front-landmarks.json').then(r=>r.json())]);
 const resources=manifest.files.filter(([,file])=>!file.includes('seamless-floor/')||/-height\.png$|-roughness\.png$/.test(file)).map(([id,file])=>({id,src:base+file}));
 const vectorDefinition={...watcherVectorAssets,manifest:'vector-lods/manifest.json',base:'vector-lods/',sourceHashes:manifest.sourceHashes,sources:{face:'watcher-side',front:'watcher-front',iris:'watcher-iris'}};
 const ground={...watcherGround,paletteMaterial:'ink',manifest:'ground-lods/manifest.json',maps:'seamless-floor/',paint:'ground-lods/'};
 const presentation={effectLibrary:'watcher-energy',audioLibrary:'watcher-voice',eyeDepth:1.17,burstDepth:1.2,chargeSpin:3,landing:{asset:'watcher-impact-art',parts,vector:watcherLanding,contact:watcherLaserContact}};
 const current=scene.materials.find(m=>m.id==='ink');const biome=current?.palette[0]==='#3e3056'?'void':current?.palette[0]==='#aa542e'?'solis':'hearth';const palettes={hearth:{colors:['#344c40','#c5973e','#eee0b4','#080e0b'],energy:'#f0bf4b'},solis:{colors:['#ad623e','#dfb347','#fbebc6','#080e0b'],energy:'#ff923e'},void:{colors:['#382f53','#b18bce','#d4d8ed','#080e0b'],energy:'#b18bff'}};
 const commands=[{op:'scene3d.material.update',id:'ink',values:{palette:palettes[biome].colors,relief:.025,sheen:.35,scribble:.18}},{op:'scene3d.settings',values:{resources,controllerLibraries:{watcher:watcherController},rendering:{pipeline:'illustrated',inputs:watcherMaterialInputs,tileSize:6,resources:manifest.resources,vectorLibraries:{watcher:vectorDefinition},palettes:{hearth:{colors:['#344c40','#c5973e','#eee0b4','#080e0b'],energy:'#f0bf4b'},solis:{colors:['#ad623e','#dfb347','#fbebc6','#080e0b'],energy:'#ff923e'},void:{colors:['#382f53','#b18bce','#d4d8ed','#080e0b'],energy:'#b18bff'}}},effectLibraries:{'watcher-energy':watcherEffects},audioLibraries:{'watcher-voice':watcherAudio},controllerPlayback:{procedure:'play'},watcherIllustrationVersion:1,watcherPlacementVersion:1}},
 {op:'scene3d.node.update',id:'watcher',values:{segments:40,ground:-1.5,position:[0,-.35,0],illustration:{eyeGeometry:watcherEye.geometry,solidFront:2,faceOrder:['right','left','top','back','bottom','front'],strokeWidth:.45,vectorLibrary:'watcher',vectorNames:{front:'front',back:'face',left:'face',right:'face',top:'face',bottom:'face'},irisName:'iris',shadow:watcherShadow},controller:{library:'watcher',parameters:{floor:-1.5},presentation},facial:{response:0,gaze:{mode:'pointer'}}}},
 {op:'scene3d.node.update',id:'floor',values:{dimensions:[96,96,.1],position:[0,-1.5,0],illustration:{ground}}}];
 const front=scene.nodes.find(n=>n.id==='watcher').surfaces.front;
 commands.push({op:'scene3d.surface.set',id:'watcher',face:'front',value:{...front,eye:{...front.eye,center:marks.eye.centerWorld,bounds:[marks.eye.halfWidth,marks.eye.halfHeight]}}});
 for(const clip of scene.clips){const action={laser:'beam',slam:'slam',hurt:'hurt',roll:'roll',spin:'spin'}[clip.id];commands.push({op:'scene3d.clip.update',id:clip.id,values:{tracks:clip.tracks.map(t=>({...t,controllerOwned:true})),controllerActions:action?[{node:'watcher',procedure:'trigger',args:{action}}]:[],loop:false}});}
 // The source camera's zoom participates in vector-detail selection.
 commands.push({op:'scene3d.settings',values:{camera:{type:'orthographic',position:[18.8,17.6,26.4],target:[1.1,-.1,.3],size:6.7,zoom:.54,fov:40,near:.1,far:160},environment:{lightColor:palettes[biome].energy,background:'#101813',inkWeight:1}}});
 return commands;
}
