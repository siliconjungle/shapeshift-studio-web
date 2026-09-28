// Classify an SVG's dark ink palette, including filled internal linework. This
// works before palette reduction can merge an outline with a shaded surface.
// Asset-specific include/exclude overrides resolve ambiguous painted shadows.
export function inkLightness(hex){
 const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const y=c[0]*.2126+c[1]*.7152+c[2]*.0722;
 return 116*(y>.008856?Math.cbrt(y):7.787*y+16/116)-16;
}
const PAINT=/(\b(?:fill|stroke)\s*=\s*["'])(#[0-9a-f]{6})(["'])/gi;
export function identifyInkColours(source,{band=8,maxLightness=40,include=[],exclude=[]}={}){
 const counts=new Map();for(const m of source.matchAll(PAINT)){const c=m[2].toLowerCase();counts.set(c,(counts.get(c)??0)+1);}
 const palette=[...counts].map(([color,paths])=>({color,paths,lightness:inkLightness(color)})).sort((a,b)=>a.lightness-b.lightness);
 const minimum=palette[0]?.lightness??100,omit=new Set(exclude.map(c=>c.toLowerCase())),force=new Set(include.map(c=>c.toLowerCase()));
 const colors=palette.filter(p=>!omit.has(p.color)&&(force.has(p.color)||p.lightness<=Math.min(maxLightness,minimum+band))).map(p=>p.color);
 return{colors,palette,band,maxLightness};
}
// Temporary unique paints survive SVG triangulation; the renderer restores the
// original palette colour and retains a separate per-vertex ink mask.
export function tagInkColours(source,colors){
 const used=new Set([...source.matchAll(PAINT)].map(m=>m[2].toLowerCase())),paints=[];let serial=1;
 for(const color of colors){let tag;do{tag='#'+(0x010000+serial++).toString(16).padStart(6,'0');}while(used.has(tag));used.add(tag);paints.push({color,tag});}
 const tags=new Map(paints.map(p=>[p.color,p.tag]));
 return{svg:source.replace(PAINT,(all,start,color,end)=>start+(tags.get(color.toLowerCase())??color)+end),paints};
}

// Persist the selected ink family in the vector artwork itself. Path geometry,
// transparent openings and non-ink shading are preserved verbatim.
export function recolorInkArtwork(source,ink='#211e1a',options={}){
 if(!/^#[0-9a-f]{6}$/i.test(ink))throw Error('Ink must be a six-digit hex colour');
 const report=identifyInkColours(source,options),selected=new Set(report.colors);let changed=0;
 const svg=source.replace(PAINT,(all,start,color,end)=>{if(!selected.has(color.toLowerCase()))return all;changed++;return start+ink.toLowerCase()+end;});
 return{svg,report:{...report,ink:ink.toLowerCase(),changed}};
}
