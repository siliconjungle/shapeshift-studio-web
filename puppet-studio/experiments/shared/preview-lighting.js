import * as THREE from 'three';
export const worldLighting={night:{value:0},tint:{value:new THREE.Color(1,1,1)}};
export const fogUniforms={villageFogEnabled:{value:0},villageFogColumns:{value:null},villageFogColumnAxis:{value:new THREE.Vector2(1,0)},villageFogColumnRange:{value:new THREE.Vector2(0,1)},villageFogMap:{value:null},villageFogOrigin:{value:new THREE.Vector2()},villageFogSize:{value:new THREE.Vector2(1,1)},villageFogTime:{value:0},villageFogTint:{value:new THREE.Color(.09,.15,.16)}};
export const fogGLSL=`
uniform sampler2D villageFogColumns;uniform vec2 villageFogColumnAxis,villageFogColumnRange;
uniform float villageFogEnabled,villageFogTime;uniform sampler2D villageFogMap;uniform vec2 villageFogOrigin,villageFogSize;uniform vec3 villageFogTint;
float veilHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float veilNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(veilHash(i),veilHash(i+vec2(1.,0.)),f.x),mix(veilHash(i+vec2(0.,1.)),veilHash(i+1.),f.x),f.y);}
vec2 villageSight(vec2 p){vec2 uv=(p-villageFogOrigin)/villageFogSize;float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);return texture2D(villageFogMap,uv).rg*inside;}
vec2 villageSkySight(vec2 p){float u=(dot(p,villageFogColumnAxis)-villageFogColumnRange.x)/villageFogColumnRange.y;return texture2D(villageFogColumns,vec2(clamp(u,0.,1.),.5)).rg;}
vec3 villageVeilSight(vec3 color,vec2 sight){
 float known=smoothstep(.08,.92,sight.r),live=smoothstep(.10,.92,sight.g);
 // Solid unexplored black, charcoal remembered terrain, clear current sight.
 // A fixed feather follows the terrain; no drifting coloured smoke.
 vec3 memory=mix(vec3(dot(color,vec3(.3,.59,.11))),color,.55)*.38;
 return mix(vec3(.012,.014,.017),mix(memory,color,live),known);}
vec3 villageVeil(vec3 color,vec2 p){return villageVeilSight(color,villageSight(p));}
float villageCoverage(vec2 pixel){vec2 p=mod(floor(pixel),4.);vec2 b=mod(p,2.),c=floor(p/2.);return ((b.x*2.+b.y*3.-b.x*b.y*4.)*4.+c.x*2.+c.y*3.-c.x*c.y*4.+.5)/16.;}

`;
