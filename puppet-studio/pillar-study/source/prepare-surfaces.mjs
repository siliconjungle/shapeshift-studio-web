import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'../assets');
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const reports=[];
for(const id of ['hearth','cryos','solis'])for(const face of ['','-top','-bottom']){
 const name=id+face,svg=await fs.readFile(path.join(root,name+'.svg'),'utf8');
 const width=face?768:512,height=face?768:1536,worldWidth=1.3,worldHeight=face?1.3:4.6;
 // As with Watcher, the maps describe material families rather than image
 // brightness alone. Here every glyph is cut stone, never raised gold.
 function family(hex){const [r,g,b]=rgb(hex),max=Math.max(r,g,b);if(max<32)return 'ink';if(id==='cryos'?b>=143:r>=137)return 'cut';return 'stone';}
 const heightSVG=svg.replace(/fill="(#[a-f\d]{6})"/ig,(_,hex)=>{const f=family(hex),tone=Math.max(...rgb(hex))/255;const v=f==='ink'?68:f==='cut'?96:Math.round(128+(tone-.35)*16);return 'fill="#'+v.toString(16).padStart(2,'0').repeat(3)+'"';});
 const roughSVG=svg.replace(/fill="(#[a-f\d]{6})"/ig,(_,hex)=>{const f=family(hex),v=f==='ink'?245:f==='cut'?200:235;return 'fill="#'+v.toString(16).repeat(3)+'"';});
 const hBytes=await sharp(Buffer.from(heightSVG)).resize(width,height).flatten({background:'#808080'}).blur(1.3).greyscale().raw().toBuffer();
 await sharp(hBytes,{raw:{width,height,channels:1}}).png().toFile(path.join(root,name+'-height.png'));
 await sharp(Buffer.from(roughSVG)).resize(width,height).flatten({background:'#ebebeb'}).greyscale().png().toFile(path.join(root,name+'-roughness.png'));
 const normal=Buffer.alloc(width*height*3),ao=Buffer.alloc(width*height);
 const sample=(x,y)=>hBytes[Math.max(0,Math.min(height-1,y))*width+Math.max(0,Math.min(width-1,x))]/255;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  const dx=(sample(x+1,y)-sample(x-1,y))*.045*width/(2*worldWidth),dy=(sample(x,y-1)-sample(x,y+1))*.045*height/(2*worldHeight),length=Math.hypot(dx,dy,1);
  normal[i*3]=Math.round((-dx/length*.5+.5)*255);normal[i*3+1]=Math.round((-dy/length*.5+.5)*255);normal[i*3+2]=Math.round((1/length*.5+.5)*255);
  ao[i]=Math.round(255*(.78+.22*Math.min(1,Math.max(0,(sample(x,y)-.26)/.24))));
 }
 await sharp(normal,{raw:{width,height,channels:3}}).png().toFile(path.join(root,name+'-normal.png'));
 await sharp(ao,{raw:{width,height,channels:1}}).png().toFile(path.join(root,name+'-ao.png'));
 reports.push({name,width,height,maps:['height','roughness','normal','ao'],reliefMetres:.045,minHeight:Math.min(...new Set(hBytes)),maxHeight:Math.max(...new Set(hBytes))});
}
await fs.writeFile(path.join(root,'surface-maps.json'),JSON.stringify(reports,null,2));console.log('Generated height, roughness, tangent normal and occlusion maps for '+reports.length+' SVGs.');
