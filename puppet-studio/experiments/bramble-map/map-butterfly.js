import {sampleButterflyPositions,BUTTERFLY_RULES} from '../shared/butterflies.js';
import * as T from 'three';
import {vectorMaterial} from '../shared/vector-art.js';
export const butterflyAssets=['left','body','right'].map(p=>'map-butterfly-'+p);
export class MapButterfly{
 constructor(scene,assets,random=Math.random){
  this.random=random;this.root=new T.Group();this.root.scale.setScalar(48);this.root.visible=false;scene.add(this.root);this.next=6+random()*4;this.active=null;
  const part=(name,width,order)=>{const a=assets.get('map-butterfly-'+name),h=width*a.data.image.height/a.data.image.width,g=a.geometry.clone(),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-.5)*width,(.5-p.getY(i))*h,0);const m=new T.Mesh(g,vectorMaterial({transparent:true}));m.material.depthTest=false;m.material.depthWrite=false;m.renderOrder=1240+order;m.frustumCulled=false;return m;};
  this.wings=[-1,1].map(sign=>{const pivot=new T.Group(),mesh=part(sign<0?'left':'right',.44,1);mesh.position.x=sign*.215;pivot.position.x=sign*.035;pivot.add(mesh);this.root.add(pivot);return pivot;});
  const body=part('body',.18,2);this.root.add(body);
 }
 tick(time,gentle,visit){
  this.root.visible=!gentle&&visit?.kind==='butterfly';if(!this.root.visible)return;
  if(this.active!==visit){this.active=visit;this.field={culture:'hearth',depot:{x:(visit.side<0?8.5:2.7)-3,z:(3.4+visit.seed*3.8)-2},nodes:[],heightAt:()=>0};}
  const age=time-visit.at,p=sampleButterflyPositions(this.field,BUTTERFLY_RULES.firstVisit+age)[0];
  if(!p){this.root.visible=false;return;}
  this.root.position.set(p.x*100,-p.z*100+p.y*100,0);this.root.userData.flightPosition={x:p.x*100,z:p.z*100,height:p.y*100};this.root.rotation.z=Math.sin(age*.62)*.3;
  this.root.scale.setScalar(48);this.root.traverse(n=>{if(n.isMesh){n.material.opacity=p.alpha;n.userData.partOrder??=n.renderOrder-1240;n.renderOrder=100+p.z*50+p.y*.01+n.userData.partOrder*.001;}});
  this.wings.forEach((wing,i)=>{wing.scale.x=.16+.84*Math.abs(Math.sin(time*16+i*.12));wing.rotation.z=(i?1:-1)*.12*Math.cos(time*16);});
 }
}
