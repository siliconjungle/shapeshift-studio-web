// Landmarks in the existing 260 × 640 stake artwork. Remove the authored
// crossbar's perspective slope once, then fit the actor to the same points.
export const RITUAL_POSE={height:2.15,lift:.755,scale:.5,centerX:127.5,barY:199,slope:28/165,widthScale:1.75,wristX:[45,210]};
export function ritualArtPose(art){
 if(!art.asset?.startsWith('biomes/solis/'))return RITUAL_POSE;
 const {width,height}=art.image;
 return {...RITUAL_POSE,centerX:width*.51,barY:height*.23,slope:.12,widthScale:1.35,wristX:[width*.13,width*.89],beamMargin:width*.14};
}
export function ritualPostPoint(ritual,index=0){return {x:ritual.x+(index-(ritual.victimIds.length-1)/2)*.7,z:ritual.z};}
export function ritualStrugglePose(worker,time,vitality={}){
 if(worker.state!=='ritual-bound'||vitality.dead)return {angle:0,effort:0,kick:0};
 const age=Math.max(0,time-(worker.ritualBoundAt??time)),phase=(age+worker.id*.37)%3.4;
 const pulse=phase<1.05?Math.sin(phase/1.05*Math.PI)**2:0;
 return {angle:Math.sin(phase*24)*.025*pulse,effort:pulse,kick:Math.sin(phase*17)*pulse};
}
export function ritualStakeLayout(art){
 const r=ritualArtPose(art),unit=r.height/art.image.height;
 let bottom=0;for(let i=1;i<art.positions.length;i+=3)bottom=Math.max(bottom,art.positions[i]);
 const barHeight=(bottom*art.image.height-r.barY)*unit;
 const wrists=r.wristX.map(x=>({x:(x-r.centerX)*unit*r.widthScale,y:barHeight}));
 return {barHeight,wrists,hands:wrists.map(p=>[p.x*100/r.scale,-(p.y-r.lift)*100/r.scale])};
}
export function straightenRitualStake(mesh,art){
 const r=ritualArtPose(art),unit=r.height/art.image.height,pos=mesh.geometry.attributes.position;
 const centerOffset=(art.image.width/2-r.centerX)*unit;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i)+centerOffset;
  // Lengthen the exposed beam between the upright and wrist knots, preserving
  // the upright's thickness and the knots/loops' original proportions.
  const margin=r.beamMargin??35,t=Math.max(0,Math.min(1,(Math.abs(x)/unit-margin)/margin));
  const spread=Math.sign(x)*(r.wristX[1]-r.centerX)*unit*(r.widthScale-1)*t*t*(3-2*t);
  pos.setXY(i,x+spread,pos.getY(i)+x*r.slope);
 }
 pos.needsUpdate=true;mesh.geometry.computeBoundingSphere();
 return ritualStakeLayout(art);
}
