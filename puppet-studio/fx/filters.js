import {clamp,rgb,random,hash,parameter} from './math.js';
import {NODE_TYPES} from './schema.js';
export function surface(w,h){const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(Math.max(1,Math.ceil(w)),Math.max(1,Math.ceil(h))):Object.assign(document.createElement('canvas'),{width:Math.max(1,Math.ceil(w)),height:Math.max(1,Math.ceil(h))});return c;}
const copy=c=>{const o=surface(c.width,c.height);o.getContext('2d').drawImage(c,0,0);return o;};
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export function filterImage(type,source,options={},second=null,time=0,images=new Map()){
 const w=source.width,h=source.height,out=surface(w,h),ctx=out.getContext('2d'),p={...NODE_TYPES[type]?.params,...options};for(const [k,v]of Object.entries(p))if(Array.isArray(v)&&v[0]?.time!==undefined)p[k]=parameter(v,time);
 const draw=()=>ctx.drawImage(source,0,0);
 if(['scene','output'].includes(type))return source;
 if(type==='image'){const image=images.get(p.asset);if(image)ctx.drawImage(image,0,0,w,h);return out;}
 if(type==='solid'){ctx.fillStyle=p.color;ctx.fillRect(0,0,w,h);return out;}
 if(type==='gradient'){const a=p.angle*Math.PI/180,g=ctx.createLinearGradient(w/2-Math.cos(a)*w/2,h/2-Math.sin(a)*h/2,w/2+Math.cos(a)*w/2,h/2+Math.sin(a)*h/2);g.addColorStop(0,p.color);g.addColorStop(1,p.color2);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);return out;}
 if(type==='checker'){const size=Math.max(1,p.size);for(let y=0;y<h;y+=size)for(let x=0;x<w;x+=size){ctx.fillStyle=(Math.floor(x/size)+Math.floor(y/size))%2?p.color:p.color2;ctx.fillRect(x,y,size,size);}return out;}
 if(type==='blend'){draw();ctx.globalAlpha=clamp(p.amount);ctx.globalCompositeOperation=p.mode;if(second)ctx.drawImage(second,0,0,w,h);return out;}
 if(type==='mask'){draw();ctx.globalCompositeOperation=p.invert?'destination-out':'destination-in';if(second)ctx.drawImage(second,0,0,w,h);return out;}
 if(type==='transform'){ctx.translate(w/2+p.x,h/2+p.y);ctx.rotate(p.rotation*Math.PI/180);ctx.scale(p.scale,p.scale);ctx.drawImage(source,-w/2,-h/2);return out;}
 if(type==='crop'){ctx.beginPath();ctx.rect(p.x,p.y,p.width,p.height);ctx.clip();draw();return out;}
 if(type==='tile'){const n=Math.max(1,Math.min(32,Math.round(p.count)));for(let x=0;x<n;x++)for(let y=0;y<n;y++)ctx.drawImage(source,x*w/n,y*h/n,w/n,h/n);return out;}
 if(type==='mirror'){ctx.translate(p.x?w:0,p.y?h:0);ctx.scale(p.x?-1:1,p.y?-1:1);draw();return out;}
 if(type==='pixelate'){const s=Math.max(1,p.size),small=surface(w/s,h/s);small.getContext('2d').drawImage(source,0,0,small.width,small.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,w,h);return out;}
 if(type==='outline'||type==='glow'||type==='shadow'){
  const mask=copy(source),m=mask.getContext('2d');m.globalCompositeOperation='source-in';m.fillStyle=p.color;m.fillRect(0,0,w,h);
  if(type==='outline'){const r=Math.min(64,Math.max(0,p.width));for(let i=0;i<24;i++){const a=i/24*Math.PI*2;ctx.drawImage(mask,Math.cos(a)*r,Math.sin(a)*r);}}
  if(type==='glow'){ctx.filter=`blur(${Math.max(0,p.radius)}px)`;ctx.globalAlpha=clamp(p.strength);for(let i=0;i<Math.ceil(Math.min(8,p.strength));i++)ctx.drawImage(mask,0,0);ctx.globalAlpha=1;ctx.filter='none';}
  if(type==='shadow'){ctx.filter=`blur(${Math.max(0,p.blur)}px)`;ctx.drawImage(mask,p.x,p.y);ctx.filter='none';}draw();return out;
 }
 const css={blur:`blur(${Math.max(0,p.radius??0)}px)`,hue:`hue-rotate(${p.degrees}deg)`,saturation:`saturate(${p.amount})`,brightness:`brightness(${p.amount})`,contrast:`contrast(${p.amount})`,grayscale:'grayscale(1)',sepia:`sepia(${p.amount})`,invert:'invert(1)'};
 if(css[type]){ctx.filter=css[type];draw();return out;}
 if(type==='opacity'){ctx.globalAlpha=clamp(p.amount);draw();return out;}
 draw();const data=ctx.getImageData(0,0,w,h),d=data.data,original=new Uint8ClampedArray(d),other=second?.getContext('2d').getImageData(0,0,w,h).data,tint=rgb(p.color),palette=(p.colors??[]).map(rgb),excluded=(p.excluded??[]).map(rgb),r=random(hash(p.seed,Math.floor(time*(p.speed??1)))),noise=new Map();
 const randCell=(x,y,size)=>{const key=Math.floor(x/size)+','+Math.floor(y/size);if(!noise.has(key))noise.set(key,random(hash(p.seed,key,Math.floor(time*(p.speed??1))))());return noise.get(key);};
 const pixel=(x,y,c)=>x<0||x>=w||y<0||y>=h?0:original[(Math.floor(y)*w+Math.floor(x))*4+c];
 let pattern;if(p.patternAsset&&images.has(p.patternAsset)){const pc=surface(8,8);pc.getContext('2d').drawImage(images.get(p.patternAsset),0,0,8,8);pattern=pc.getContext('2d').getImageData(0,0,8,8).data;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;
  if(type==='noise'){const v=randCell(x,y,Math.max(1,p.scale))*255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
  if(type==='tint')for(let c=0;c<3;c++)d[i+c]=original[i+c]*(1-p.amount)+tint[c]*p.amount;
  if(type==='gamma')for(let c=0;c<3;c++)d[i+c]=255*(original[i+c]/255)**(1/Math.max(.01,p.amount));
  if(type==='posterize')for(let c=0;c<3;c++){const n=Math.max(2,p.levels)-1;d[i+c]=Math.round(original[i+c]/255*n)/n*255;}
  if(type==='threshold'){const v=(original[i]*.2126+original[i+1]*.7152+original[i+2]*.0722)/255>=p.level?255:0;d[i]=d[i+1]=d[i+2]=v;}
  if(type==='vignette'){const f=1-clamp(Math.hypot((x-w/2)/(w/2),(y-h/2)/(h/2))**2*p.amount);for(let c=0;c<3;c++)d[i+c]*=f;}
  if(type==='palette'&&palette.length&&!excluded.some(c=>c.every((v,k)=>Math.abs(v-original[i+k])<8))){const noise=pattern?pattern[((y%8)*8+x%8)*4]/255-.5:p.pattern==='noise'?r()-.5:(bayer[(y%4)*4+x%4]+.5)/16-.5,values=[0,1,2].map(c=>clamp(original[i+c]+noise*p.dither*128,0,255));let nearest=palette[0],best=Infinity;for(const color of palette){const distance=color.reduce((sum,v,c)=>sum+(v-values[c])**2,0);if(distance<best){best=distance;nearest=color;}}for(let c=0;c<3;c++)d[i+c]=nearest[c];}
  if(type==='sharpen'||type==='denoise'){for(let c=0;c<3;c++){let sum=0,n=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if(x+xx>=0&&x+xx<w&&y+yy>=0&&y+yy<h){sum+=pixel(x+xx,y+yy,c);n++;}const avg=sum/n;d[i+c]=type==='sharpen'?original[i+c]+(original[i+c]-avg)*p.amount:original[i+c]*(1-clamp(p.amount))+avg*clamp(p.amount);}}
  if(type==='dissolve'){const n=randCell(x,y,Math.max(1,p.scale));if(n<p.progress)d[i+3]=0;else if(n<p.progress+p.edge)for(let c=0;c<3;c++)d[i+c]=tint[c];}
  if(['wave','displace','ripple','twirl','glitch','chromatic'].includes(type)){
   let sx=x,sy=y;
   if(type==='wave'){const offset=Math.sin((p.axis==='y'?x/w:y/h)*Math.PI*2*p.frequency+time*p.speed*Math.PI*2)*p.amplitude;if(p.axis==='y')sy+=offset;else sx+=offset;}
   if(type==='displace'&&other){sx+=(other[i]/255-.5)*p.amount;sy+=(other[i+1]/255-.5)*p.amount;}
   if(type==='ripple'){const dx=x-w/2,dy=y-h/2,len=Math.hypot(dx,dy)||1,offset=Math.sin(len/Math.max(w,h)*p.frequency*Math.PI*2-time*p.speed)*p.amplitude;sx+=dx/len*offset;sy+=dy/len*offset;}
   if(type==='twirl'){const dx=(x-w/2),dy=(y-h/2),radius=Math.max(1,p.radius*Math.min(w,h)),len=Math.hypot(dx,dy),a=Math.atan2(dy,dx)+Math.max(0,1-len/radius)**2*p.amount;sx=w/2+Math.cos(a)*len;sy=h/2+Math.sin(a)*len;}
   if(type==='glitch')sx+=(randCell(0,y,Math.max(1,h/Math.max(1,p.lines)))-.5)*p.amount;
   for(let c=0;c<4;c++)d[i+c]=pixel(sx+(type==='chromatic'?(c===0?p.offset:c===2?-p.offset:0):0),sy,c);
  }
 }
 ctx.putImageData(data,0,0);return out;
}
export function composite(scene,fx,images,time){if(!fx?.nodes?.length)return scene;const map=new Map(fx.nodes.map(n=>[n.id,n])),memo=new Map();function render(id){if(memo.has(id))return memo.get(id);const n=map.get(id);if(!n||n.enabled===false)return n?.inputs[0]?render(n.inputs[0]):scene;const a=n.inputs[0]?render(n.inputs[0]):scene,b=n.inputs[1]?render(n.inputs[1]):null,result=n.type==='scene'?scene:filterImage(n.type,a,n.params,b,time,images);memo.set(id,result);return result;}return render(fx.output);}
