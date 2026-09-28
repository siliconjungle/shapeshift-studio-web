import * as THREE from 'three';
import {createArtMesh,loadVectorArt,vectorMaterial} from './vector-art.js';
import {setGroundAnchor} from './ground-depth.js';

// Share the traced artwork; only each leaf's transform and depth anchor differ.
export async function createFallingLeaves(scene,heightAt,{random=Math.random,artIds=['actions/falling-leaf']}={}){
 const templates=new Map(await Promise.all(artIds.map(async id=>{const art=await loadVectorArt(id),template=createArtMesh(art,.2*art.image.width/art.image.height,.2,{anchored:false});template.material.dispose();return [id,{art,geometry:template.geometry}];})));
 const root=new THREE.Group();root.name='falling-leaves';root.userData.noShadow=true;scene.add(root);
 const active=[],pool=[],right=new THREE.Vector3(),up=new THREE.Vector3(),front=new THREE.Vector3();
 let emitted=0;
 function release(index){const leaf=active[index];leaf.mesh.visible=false;pool.push(leaf);active.splice(index,1)}
 return {
  clear(){for(let i=active.length-1;i>=0;i--)release(i);},
  get count(){return active.length},get emitted(){return emitted},
  emit(tree,direction,count=6,fallen=false){
   const template=templates.get(tree.userData.leafArtId)??templates.values().next().value;
   right.set(1,0,0).applyQuaternion(tree.quaternion);up.set(0,1,0).applyQuaternion(tree.quaternion);front.set(0,0,1).applyQuaternion(tree.quaternion);
   const height=tree.userData.base,width=height*tree.userData.art.image.width/tree.userData.art.image.height;
   for(let i=0;i<count;i++){
    if(active.length>=64)release(0);
    let leaf=pool.pop();
    if(!leaf){const mesh=new THREE.Mesh(template.geometry,vectorMaterial());mesh.userData.art=template.art;mesh.renderOrder=11;root.add(mesh);leaf={mesh,origin:new THREE.Vector3(),anchor:new THREE.Vector3()}}
    leaf.mesh.geometry=template.geometry;leaf.mesh.userData.art=template.art;
    const across=(random()-.5)*width*.62,above=height*(.58+random()*.3);
    leaf.origin.copy(tree.position).addScaledVector(right,across).addScaledVector(up,above);
    if(fallen)leaf.origin.copy(tree.position).addScaledVector(right,direction*height*.65+across*.4).addScaledVector(up,.25+random()*.55);
    leaf.anchor.copy(tree.position).addScaledVector(right,across).addScaledVector(front,.12);
    Object.assign(leaf,{age:0,life:3.5+random(),vx:direction*(.15+random()*.22),vz:(random()-.5)*.14,phase:random()*Math.PI*2,size:.9+random()*.65,landAt:null});
    leaf.mesh.visible=true;leaf.mesh.position.copy(leaf.origin);active.push(leaf);emitted++;
   }
  },
  update(dt,camera){
   for(let i=active.length-1;i>=0;i--){
    const leaf=active[i],mesh=leaf.mesh;leaf.age+=dt;
    if(leaf.age>=leaf.life){release(i);continue}
    const t=leaf.age,flutter=Math.sin(t*5+leaf.phase)-Math.sin(leaf.phase);
    const dx=leaf.vx*t+flutter*.12,dz=leaf.vz*t;
    const floor=heightAt(leaf.origin.x+dx,leaf.origin.z+dz)??0;
    const y=leaf.origin.y+.24*(1-Math.exp(-t*6))-.32*t-.36*t*t;
    mesh.position.set(leaf.origin.x+dx,Math.max(floor+.03,y),leaf.origin.z+dz);
    if(y<=floor+.03&&leaf.landAt===null)leaf.landAt=t;
    if(leaf.landAt!==null&&t-leaf.landAt>.45){release(i);continue}
    mesh.quaternion.copy(camera.quaternion);mesh.rotateZ(Math.sin(t*4+leaf.phase)*.65+leaf.phase);
    const settle=Math.min(1,(leaf.life-t)/.35,leaf.landAt===null?1:1-(t-leaf.landAt)/.45);
    mesh.scale.set(leaf.size*(.45+.55*Math.abs(Math.cos(t*5+leaf.phase)))*settle,leaf.size*settle,1);
    setGroundAnchor(mesh,new THREE.Vector3(leaf.anchor.x+dx,floor,leaf.anchor.z+dz));
   }
  }
 };
}
