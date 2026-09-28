// Individual slow, continuous paths. Fixed heights keep clouds calm; shallow
// depth meanders prevent them moving like one rigid sheet. No wraps or respawns.
export const CLOUDS=[
  {art:'cumulus',x:-5.1,y:8.2,z:-5.1,width:4.4,drift:2.2,period:370,phase:.2,meander:.32},
  {art:'wisp',x:.3,y:9.2,z:-7.5,width:4.6,drift:2.7,period:460,phase:1.1,meander:.42},
  {art:'pufflet',x:6.8,y:8.8,z:-6,width:2.2,drift:1.8,period:330,phase:2.2,meander:.25},
  {art:'twins',x:-10,y:9.2,z:-5.2,width:3.8,drift:2.5,period:510,phase:3.4,meander:.4},
  {art:'tower',x:10.5,y:10.2,z:-8,width:2.7,drift:1.9,period:420,phase:4.6,meander:.3},
  {art:'cushion',x:-1.7,y:10.5,z:-12,width:4.1,drift:3.1,period:590,phase:.7,meander:.5},
  {art:'clover',x:-14,y:8.8,z:-9,width:3.1,drift:2.3,period:480,phase:2.8,meander:.35},
  {art:'patchwork',x:13.5,y:9,z:-3.5,width:4,drift:2.8,period:540,phase:5.3,meander:.45},
  {art:'dumpling',x:-7.5,y:8.8,z:.5,width:2.6,drift:1.7,period:390,phase:1.8,meander:.28},
];
// Keep the original bounded paths, but make their calm drift perceptible.
export const CLOUD_DRIFT_RATE=1.6;
export function sampleCloudMotion(cloud,time,out={}){
  const angle=time*CLOUD_DRIFT_RATE*Math.PI*2/cloud.period,phase=cloud.phase;
  out.x=cloud.x+cloud.drift*(Math.sin(angle+phase)-Math.sin(phase));
  out.y=cloud.y;
  out.z=cloud.z+cloud.meander*(Math.sin(angle*.73+phase*1.6)-Math.sin(phase*1.6));
  return out;
}

// Seeded, uneven spacing across the expanded environment. The field continues
// past the near edge: elevated clouds otherwise all project into the top half.
// These are fixed world positions, never attached to the camera.
