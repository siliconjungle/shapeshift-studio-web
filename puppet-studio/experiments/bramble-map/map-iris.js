// One transient fullscreen shader covers the WebGL art, live SVG labels and UI.
// It renders only during Enter; no scene copy, post-process target or idle draw.
export function createMapIris(){
 const overlay=document.createElement('div');overlay.className='map-iris';overlay.tabIndex=-1;overlay.setAttribute('aria-label','Entering location');overlay.hidden=true;
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');overlay.append(canvas);document.body.append(overlay);
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});
 let program,buffer,uniforms;
 if(gl){
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}');
  const fragment=shader(gl.FRAGMENT_SHADER,'precision highp float; uniform vec2 center; uniform float radius,fade,coverage,time; void main(){vec2 delta=gl_FragCoord.xy-center;float angle=atan(delta.y,delta.x);float wobble=(.018*sin(angle*3.+time*7.)+.01*sin(angle*5.-time*5.))*sin(coverage*3.14159);float edge=radius*(1.+wobble);float ink=smoothstep(edge-1.5,edge+1.5,length(delta));gl_FragColor=vec4(0.,0.,0.,mix(ink,coverage,fade));}');
  program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(vertex);gl.deleteShader(fragment);
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  uniforms=Object.fromEntries(['center','radius','fade','coverage','time'].map(n=>[n,gl.getUniformLocation(program,n)]));
 }
 return{
  show(){overlay.hidden=false;overlay.focus({preventScroll:true});},
  draw(coverage,x,y,gentle,time=0){
   overlay.dataset.coverage=coverage.toFixed(3);
   if(!gl){overlay.style.background=`rgba(0,0,0,${coverage})`;return;}
   const ratio=Math.min(devicePixelRatio,1.5),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   const cx=x*ratio,cy=h-y*ratio,maxRadius=Math.max(Math.hypot(cx,cy),Math.hypot(w-cx,cy),Math.hypot(cx,h-cy),Math.hypot(w-cx,h-cy))+3;
   gl.viewport(0,0,w,h);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const p=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
   gl.uniform2f(uniforms.center,cx,cy);gl.uniform1f(uniforms.radius,maxRadius*(1-coverage)-3*coverage);gl.uniform1f(uniforms.fade,gentle?1:0);gl.uniform1f(uniforms.coverage,coverage);gl.uniform1f(uniforms.time,time);gl.drawArrays(gl.TRIANGLES,0,6);
  },
  hide(){overlay.hidden=true;overlay.dataset.phase='idle';},
  phase(phase){overlay.dataset.phase=phase;},
  dispose(){if(gl){gl.deleteBuffer(buffer);gl.deleteProgram(program);}overlay.remove();}
 };
}
