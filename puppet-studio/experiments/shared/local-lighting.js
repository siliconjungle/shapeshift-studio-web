import * as THREE from 'three';
export const MAX_HOUSE_LIGHTS=80;
export const localLighting={
 waysidePower:{value:0},waysidePosition:{value:new THREE.Vector4(0,0,0,4.8)},
 campfirePower:{value:0},campfirePosition:{value:new THREE.Vector4(0,0,0,4.8)},
 lampCount:{value:0},lampPower:{value:0},
 fireflyCount:{value:0},fireflyPositions:{value:Array.from({length:8},()=>new THREE.Vector4())},
 fireflyPowers:{value:Array(8).fill(0)},
 lampPositions:{value:Array.from({length:MAX_HOUSE_LIGHTS},()=>new THREE.Vector4())},
 lampColours:{value:Array.from({length:MAX_HOUSE_LIGHTS},()=>new THREE.Vector4())}
};
export function lampSwitch(night){const t=THREE.MathUtils.clamp((night-.12)/.68,0,1);return t*t*(3-2*t)}
export const localLightGLSL=`
uniform float waysidePower;uniform vec4 waysidePosition;
uniform float campfirePower;uniform vec4 campfirePosition;
uniform int fireflyCount;uniform vec4 fireflyPositions[8];uniform float fireflyPowers[8];
uniform int lampCount;uniform float lampPower;
uniform vec4 lampPositions[${MAX_HOUSE_LIGHTS}],lampColours[${MAX_HOUSE_LIGHTS}];
vec3 houseLight(vec3 p){
 if(lampPower<=0. && fireflyCount==0 && campfirePower<=0. && waysidePower<=0.)return vec3(0.);
 vec3 result=vec3(0.);
 for(int i=0;i<${MAX_HOUSE_LIGHTS};i++){
  if(i>=lampCount)break;
  vec3 d=p-lampPositions[i].xyz;
  float reach=max(0.,1.-length(d)/lampPositions[i].w);
  // Fixtures face into the village; avoid lighting through the rear wall.
  float front=smoothstep(-.45,.15,d.z);
  result+=lampColours[i].rgb*lampColours[i].a*reach*reach*front;
 }
 result*=lampPower;
 for(int i=0;i<8;i++){
  if(i>=fireflyCount)break;
  float reach=max(0.,1.-distance(p,fireflyPositions[i].xyz)/fireflyPositions[i].w);
  result+=vec3(1.,.68,.16)*fireflyPowers[i]*reach*reach;
 }
 float fireReach=max(0.,1.-distance(p,campfirePosition.xyz)/campfirePosition.w);
 result+=vec3(1.,.39,.085)*campfirePower*fireReach*fireReach;
 float waysideReach=max(0.,1.-distance(p,waysidePosition.xyz)/waysidePosition.w);
 result+=vec3(1.,.39,.085)*waysidePower*waysideReach*waysideReach;
 return result;
}
`;
