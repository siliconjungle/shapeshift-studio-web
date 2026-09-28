import {fetchGameAsset} from './game-assets.js';
import {fogGLSL,fogUniforms,worldLighting} from './preview-lighting.js';
import {localLighting,localLightGLSL} from './local-lighting.js';

import * as THREE from 'three';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {groundDepthGLSL} from './ground-depth.js';
const resolveVectorAsset=asset=>asset;
const cache=new Map(),sharedUVs=new WeakMap();

// Keep the SVG curves as the source of truth. Flatten them to subpixel geometry,
// never to an image. Additional subdivisions also support the animated meshes.
function flatten(path,tolerance=.08){
  const points=[];
  for(const curve of path.curves){
    const a=curve.getPoint(0),b=curve.getPoint(1);
    if(!points.length)points.push(a);
    const visit=(t0,p0,t1,p1,depth)=>{
      const dt=t1-t0,mid=curve.getPoint(t0+dt*.5),q1=curve.getPoint(t0+dt*.25),q3=curve.getPoint(t0+dt*.75);
      const chord=p1.clone().sub(p0),length=chord.length();
      const error=p=>length?Math.abs(chord.x*(p0.y-p.y)-(p0.x-p.x)*chord.y)/length:p.distanceTo(p0);
      if(depth<12&&(Math.max(error(mid),error(q1),error(q3))>tolerance||length>8)){
        visit(t0,p0,t0+dt*.5,mid,depth+1);visit(t0+dt*.5,mid,t1,p1,depth+1);
      }else points.push(p1);
    };
    visit(0,a,1,b,0);
  }
  if(points.length>1&&points[0].distanceToSquared(points.at(-1))<1e-12)points.pop();
  return points;
}
export async function loadVectorArt(asset,options){
  asset=resolveVectorAsset(asset,options?.culture);
  if(!cache.has(asset))cache.set(asset,(async()=>{
    const edited=globalThis.__littleGodsAuthoring?.artwork?.find(entry=>entry.id===asset&&entry.enabled!==false);
    const response=edited?new Response(edited.svg,{headers:{'Content-Type':'image/svg+xml'}}):await fetchGameAsset(`assets/vector/${asset}.svg`);if(!response.ok)throw Error(`Missing SVG: ${asset}`);
    return parseVectorArt(await response.text(),asset);
  })().catch(error=>{cache.delete(asset);throw error}));
  return cache.get(asset);
}
// Uncached SVG input for authoring previews; shares the exact game triangulator.
export function parseVectorArt(svg,asset='inline'){
    const data=new SVGLoader().parse(svg),root=data.xml;
    const box=(root.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number),width=root.hasAttribute('width')?Number(root.getAttribute('width')):box[2],height=root.hasAttribute('height')?Number(root.getAttribute('height')):box[3];
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error(`Invalid SVG dimensions: ${asset}`);
    const minX=box[0]||0,minY=box[1]||0,positions=[],colors=[],layers=[];
    const vertexPositions=[],vertexColors=[],vertexLayers=[],indices=[];
    let layer=0;
    for(const path of data.paths){
      const style=path.userData.style;if(style.fill==='none'||style.fillOpacity===0)continue;
      for(const shape of SVGLoader.createShapes(path)){
        const contour=flatten(shape),holes=shape.holes.map(h=>flatten(h));
        if(contour.length<3)continue;
        const triangles=THREE.ShapeUtils.triangulateShape(contour,holes),vertices=contour.concat(...holes);
        // Reuse each contour vertex within its paint shape. Triangle order,
        // winding, colours and path boundaries stay exactly as triangulated.
        const remap=new Int32Array(vertices.length).fill(-1);
        for(const triangle of triangles)for(const index of triangle){
          const p=vertices[index],x=(p.x-minX)/width,y=(p.y-minY)/height;
          positions.push(x,y,0);colors.push(path.color.r,path.color.g,path.color.b);layers.push(layer);
          if(remap[index]===-1){
            remap[index]=vertexLayers.length;
            vertexPositions.push(x,y,0);vertexColors.push(path.color.r,path.color.g,path.color.b);vertexLayers.push(layer);
          }
          indices.push(remap[index]);
        }
      }
      layer++;
    }
    return {isVectorArt:true,asset,image:{width,height},positions:new Float32Array(positions),colors:new Float32Array(colors),layers:new Float32Array(layers),pathCount:layer,
      indexed:{positions:new Float32Array(vertexPositions),colors:new Float32Array(vertexColors),layers:new Float32Array(vertexLayers),indices:vertexLayers.length<=65535?new Uint16Array(indices):new Uint32Array(indices)}};
}
export function vectorMaterial({transparent=false}={}){
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,depthWrite:true,transparent});
  material.userData.fogMoving={value:0};
  material.userData.fogSky={value:0};
  material.userData.fogIgnore={value:0};
  material.userData.paintBase={value:0};
  material.userData.worldLighting={value:1};
  material.userData.groundAnchor={value:new THREE.Vector3()};
  material.userData.useGroundAnchor={value:0};
  material.userData.groundContactLine={value:0};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,localLighting,fogUniforms);shader.uniforms.fogObjectAnchor=material.userData.groundAnchor;shader.uniforms.fogSky=material.userData.fogSky;shader.uniforms.fogIgnore=material.userData.fogIgnore;shader.uniforms.fogMoving=material.userData.fogMoving;shader.uniforms.fogAnchored=material.userData.useGroundAnchor;
    shader.uniforms.worldLightTint=worldLighting.tint;shader.uniforms.useWorldLighting=material.userData.worldLighting;
    shader.fragmentShader=fogGLSL+'uniform vec3 fogObjectAnchor;uniform float fogMoving,fogAnchored,fogIgnore,fogSky;varying vec2 fogFootprint;\n'+localLightGLSL+'varying vec3 localLightWorld;uniform vec3 worldLightTint;uniform float useWorldLighting;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>','gl_FragColor.rgb*=mix(vec3(1.),worldLightTint+houseLight(localLightWorld),useWorldLighting);\n#include <colorspace_fragment>');
    shader.fragmentShader=shader.fragmentShader.replace(/}\s*$/, 'if(villageFogEnabled>.5&&fogIgnore<.5){if(fogSky>.5){gl_FragColor.rgb=villageVeilSight(gl_FragColor.rgb,villageSkySight(localLightWorld.xz));}else if(fogAnchored>.5){vec2 sight=max(villageSight(fogObjectAnchor.xz),villageSight(fogFootprint));float coverage=smoothstep(0.,.12,fogMoving>.5?sight.g:sight.r);if(coverage<villageCoverage(gl_FragCoord.xy))discard;gl_FragColor.rgb=villageVeilSight(gl_FragColor.rgb,sight);}}\n}');
    shader.uniforms.paintBase=material.userData.paintBase;
    shader.uniforms.groundAnchor=material.userData.groundAnchor;shader.uniforms.useGroundAnchor=material.userData.useGroundAnchor;
    shader.uniforms.groundContactLine=material.userData.groundContactLine;
    shader.vertexShader='uniform vec2 villageFogColumnAxis;varying vec2 fogFootprint;varying vec3 localLightWorld;attribute float paintLayer; uniform float paintBase; uniform vec3 groundAnchor; uniform float useGroundAnchor; uniform float groundContactLine;\n'+groundDepthGLSL+shader.vertexShader;
    // A tiny view-depth bias preserves SVG paint order even on a two-sided card.
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nlocalLightWorld=(modelMatrix*vec4(transformed,1.)).xyz;fogFootprint=groundAnchor.xz+villageFogColumnAxis*dot(localLightWorld.xz-groundAnchor.xz,villageFogColumnAxis);\nif(useGroundAnchor>.5){vec3 right=vec3(modelMatrix[0].x,0.,modelMatrix[0].z);localLightWorld=groundAnchor+normalize(right)*transformed.x*length(modelMatrix[0].xyz)+vec3(0.,transformed.y*length(modelMatrix[1].xyz),0.); }\nif(useGroundAnchor>.5){vec3 contact=groundAnchor+(modelMatrix*vec4(position.x*groundContactLine,0.,0.,0.)).xyz;gl_Position=groundOrderedClip(contact,gl_Position);}\ngl_Position.z -= (paintLayer + paintBase) * 0.0000002 * gl_Position.w;');
  };
  material.customProgramCacheKey=()=> 'inkwell-vector-ground-depth-lighting-fog-v8';
  return material;
}
export function vectorGeometry(asset,{sharedPaint=false}={}){
  const data=asset.indexed??asset,geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(data.positions.slice(),3));
  geometry.setAttribute('color',new THREE.BufferAttribute(sharedPaint?data.colors:data.colors.slice(),3));
  geometry.setAttribute('paintLayer',new THREE.BufferAttribute(sharedPaint?data.layers:data.layers.slice(),1));
  // Share only immutable CPU paint arrays; each geometry still owns its GPU attributes.
  let uv=sharedPaint?sharedUVs.get(data):null;
  if(!uv){uv=new Float32Array(data.layers.length*2);for(let i=0;i<data.layers.length;i++){uv[i*2]=data.positions[i*3];uv[i*2+1]=1-data.positions[i*3+1]}if(sharedPaint)sharedUVs.set(data,uv);}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  if(data.indices)geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
  return geometry;
}
export function createArtMesh(asset,width,height,{anchored=true,sharedPaint=false}={}){
  const geometry=vectorGeometry(asset,{sharedPaint}),pos=geometry.attributes.position;
  let bottom=0;for(let i=0;i<pos.count;i++)bottom=Math.max(bottom,pos.getY(i));
  for(let i=0;i<pos.count;i++)pos.setXYZ(i,(pos.getX(i)-.5)*width,(anchored?bottom-pos.getY(i):.5-pos.getY(i))*height,0);
  const material=vectorMaterial();
  geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,material);mesh.userData.art=asset;return mesh;
}

// Clip vector triangles to a rig's UV triangles and bind each resulting vertex
// with barycentric weights. This preserves sleeve masks and split forearm passes.
export function bindVectorArt(asset,uv,indices){
  const output=[],color=[],layers=[],bindings=[];
  const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  const bary=(p,a,b,c)=>{const den=cross(a,b,c),wb=cross(a,p,c)/den,wc=cross(a,b,p)/den;return [1-wb-wc,wb,wc]};
  for(let t=0;t<indices.length;t+=3){
    const ids=indices.slice(t,t+3),corners=ids.map(i=>uv[i]),sign=Math.sign(cross(...corners));if(!sign)continue;
    const minX=Math.min(...corners.map(p=>p[0]))-1e-8,maxX=Math.max(...corners.map(p=>p[0]))+1e-8,minY=Math.min(...corners.map(p=>p[1]))-1e-8,maxY=Math.max(...corners.map(p=>p[1]))+1e-8;
    for(let i=0;i<asset.positions.length;i+=9){
      let poly=[0,3,6].map(j=>[asset.positions[i+j],asset.positions[i+j+1]]);
      if(Math.max(...poly.map(p=>p[0]))<minX||Math.min(...poly.map(p=>p[0]))>maxX||Math.max(...poly.map(p=>p[1]))<minY||Math.min(...poly.map(p=>p[1]))>maxY)continue;
      for(let e=0;e<3&&poly.length;e++){
        const a=corners[e],b=corners[(e+1)%3],next=[];
        for(let j=0;j<poly.length;j++){
          const p=poly[j],q=poly[(j+1)%poly.length],dp=cross(a,b,p)*sign,dq=cross(a,b,q)*sign;
          if(dp>=-1e-10)next.push(p);
          if((dp>=0)!==(dq>=0)){const k=dp/(dp-dq);next.push([p[0]+(q[0]-p[0])*k,p[1]+(q[1]-p[1])*k])}
        }poly=next;
      }
      for(let j=1;j<poly.length-1;j++)for(const p of[poly[0],poly[j],poly[j+1]]){
        output.push(0,0,0);color.push(...asset.colors.subarray(i,i+3));layers.push(asset.layers[i/3]);bindings.push(...ids,...bary(p,...corners));
      }
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(output,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));geometry.setAttribute('paintLayer',new THREE.Float32BufferAttribute(layers,1));
  return {geometry,bindings:new Float32Array(bindings)};
}
