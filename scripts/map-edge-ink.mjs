import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {silhouetteInkBands,inkBandPath} from '@shapeshift-labs/studio-core/video-vectorizer/silhouette-ink';
// Paint real vector bands only along alpha boundaries, preserving every original
// interior fill. Both exterior loops and transparent openings are included.
export function paintSilhouetteInk(source,loops,{ink='#211e1a',displayWidth=240,bandWidth=3.8,detail=false,canvasScale=1}={}){
 const box=source.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
 const paths=silhouetteInkBands(loops,{box,displayWidth,bandWidth,detail}).map(stroke=>'<path d="'+inkBandPath(stroke)+'"/>');
 // Pad after tracing so normalized alpha contours still refer to original art.
 // Match width/height to viewBox for both SVG and Little Gods mesh rendering.
 if(canvasScale>1){const w=box[2]*canvasScale,h=box[3]*canvasScale;
  source=source.replace(/<svg\b[^>]*>/,tag=>tag.replace(/viewBox="[^"]*"/,`viewBox="${box[0]-(w-box[2])/2} ${box[1]-(h-box[3])/2} ${w} ${h}"`).replace(/\bwidth="[^"]*"/,`width="${w}"`).replace(/\bheight="[^"]*"/,`height="${h}"`));
 }
 return{svg:source.replace('</svg>','<g data-ink-edge="true" fill="'+ink+'">'+paths.join('')+'</g>\n</svg>'),bands:paths.length};
}

// Durable derived-asset cache: source art, contours, style, bake implementation,
// and Perfect Freehand version must match. Verify the output too, so replacing
// a generated SVG cannot accidentally reuse a stale manifest entry.
const hash=value=>createHash('sha256').update(value).digest('hex');
const implementation=hash(readFileSync(new URL(import.meta.url)) +
 readFileSync(new URL(import.meta.resolve('@shapeshift-labs/studio-core/video-vectorizer/silhouette-ink'))) +
 readFileSync(new URL(import.meta.resolve('@shapeshift-labs/studio-core/package.json'))));
export function bakeSilhouetteInk(source,loops,options,previous,current){
 const cacheKey=hash(JSON.stringify({source,loops,options,implementation}));
 if(previous?.cacheKey===cacheKey&&current&&previous.outputHash===hash(current))
  return{svg:current,...previous,cached:true};
 const {svg,bands}=paintSilhouetteInk(source,loops,options);
 return{svg,bands,cacheKey,outputHash:hash(svg),cached:false};
}
