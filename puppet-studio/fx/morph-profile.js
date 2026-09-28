// Normalized sprite coordinates. Positive inflate bulges the middle; negative
// values pinch it. Endpoints stay fixed. Used by the canvas and vector adapters.
export const morphWidth=(u,inflate=0,taper=0)=>Math.max(.1,1+inflate*Math.sin(u*Math.PI)+taper*(u-.5));
export const morphOffset=(u,bend=0)=>bend*Math.sin(u*Math.PI);
export const spriteMorphGLSL=`
vec2 spriteMorph(vec2 p,float inflate,float taper,float bend){
 float bulge=sin(p.y*3.141592653589793);
 float width=max(.1,1.+inflate*bulge+taper*(p.y-.5));
 return vec2(.5+(p.x-.5)*width+bend*bulge,p.y);
}`;
