import {noodleExample} from '../puppet-studio/noodle/example.js';
import {loadImages,renderFrame,drawPuppet,poseAt,validateProject} from '../puppet-studio/runtime.js';
import {createScenePlayer} from '../puppet-studio/scene3d/runtime.js';
import {illustratedMaterialInputs as watcherMaterialInputs} from '@shapeshift-labs/studio-core/scene3d/core/materials';
import {bakeNoodleVector} from '../puppet-studio/noodle/commands.js';
import {noodleArtwork} from '../puppet-studio/noodle/render2d.js';
import {gridMesh} from '../puppet-studio/mesh/model.js';
globalThis.__INK_VECTOR_WORKER__=new URL('./scene3d/vector-worker.js',document.baseURI).href;
const status=document.querySelector('#status'),proof=[],assert=(v,msg)=>{if(!v)throw Error(msg);},canvas=()=>Object.assign(document.createElement('canvas'),{width:600,height:500});
const shot=(source,name)=>{const c=canvas();c.getContext('2d').drawImage(source,0,0,600,500);const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=name;figure.append(c,caption);document.querySelector('#frames').append(figure);return c.toDataURL();};
const pixels=c=>{const out=canvas();out.getContext('2d').drawImage(c,0,0,600,500);return out.getContext('2d').getImageData(0,0,600,500).data;};
try{
 const p=noodleExample(2),images=await loadImages(p),clip=p.clips[0],frames=[];
 for(const t of [0,.5,1,1.5,2])frames.push(shot(renderFrame(p,images,clip,t,{width:600,height:500,camera:[.75,0,0,.75,270,320],background:'#edf0dc'}),'Native 2D SVG · '+t+'s'));
 assert(frames[0]!==frames[2],'2D animation changes');assert(frames[0]===frames[4],'2D loop exact');
 const raw=canvas();raw.getContext('2d').translate(300,250);drawPuppet(raw.getContext('2d'),p,images,poseAt(p,clip,1));shot(raw,'Basic 2D player');
 const vector=bakeNoodleVector(p,'noodle',clip,0,true,8);proof.push({mode:'2D',loop:true,vectorFrames:vector.shapes.length/9});
 // Repeated assets must remain independent after one copy has been deformed.
 const copy=structuredClone(p.joints[1]);copy.id='other';copy.rest.x=140;delete copy.noodle;p.joints.push(copy);const withCopy=renderFrame(p,images,clip,1,{width:600,height:500,camera:[1,0,0,1,260,270],background:'#edf0dc'});shot(withCopy,'Independent artwork instances');p.joints.pop();
 p.joints[1].sprite.mesh=gridMesh(6,12);const meshFrame=renderFrame(p,images,clip,1,{width:600,height:500,camera:[.75,0,0,.75,270,320],background:'#edf0dc'});const data=pixels(meshFrame);assert(data.some((v,i)=>i%4===0&&v>100&&v<230),'Artwork mesh is visible');shot(meshFrame,'2D artwork mesh + Noodle');
 for(const pipeline of ['standard','illustrated']){status.textContent='Checking '+pipeline;const p=noodleExample(3);if(pipeline==='illustrated')p.scene3d.rendering={pipeline,inputs:watcherMaterialInputs};validateProject(p);const c=canvas(),player=await createScenePlayer(c,p,{width:600,height:500}),frames=[],geometry=[];for(const t of [0,.5,1,1.5,2]){player.seek(t,'bounce');player.scene.render(true);frames.push(shot(c,pipeline+' 3D · '+t+'s'));geometry.push(Array.from(player.scene.pickables[0].geometry.attributes.position.array));assert(player.scene.freehand.stats.contours>0,'3D silhouette missing');}assert(frames[0]!==frames[2],pipeline+' animation');assert(frames[0]===frames[4],pipeline+' loop');assert(JSON.stringify(geometry[0])!==JSON.stringify(geometry[2]),'Actual vertices must move');let face;player.scene.world.traverse(m=>{if(m.userData.face)face=m;});assert(face,'Attached SVG present');proof.push({pipeline,loop:true,vertices:geometry[0].length/3,artwork:true});player.dispose();}
 status.textContent='PASS · native 2D, SVG baking, mesh artwork, both 3D pipelines, attached art and exact loops';document.querySelector('#result').textContent=JSON.stringify(proof,null,2);document.body.dataset.result='pass';
}catch(e){status.textContent='FAIL · '+e.stack;document.body.dataset.result='fail';console.error(e);}
