import {DOMParser} from '@xmldom/xmldom';
import {SVGLoader} from './vendor.js';
import {createVectorGeometry} from './core/vector-art.js';
import {svgGeometry} from './geometry.js';
globalThis.DOMParser=DOMParser;
const parsed=new Map();
self.onmessage=async({data})=>{const {id,src,width,height,detail}=data;try{if(!parsed.has(src)){const r=await fetch(src);if(!r.ok)throw Error('Vector source unavailable');parsed.set(src,new SVGLoader().parse(await r.text()));}const geo=data.illustrated?createVectorGeometry({parsed:parsed.get(src)},data.tolerance,data.illustrated):svgGeometry(parsed.get(src),width,height,detail),attributes={},transfer=[];for(const [name,a]of Object.entries(geo.attributes)){attributes[name]={array:a.array,itemSize:a.itemSize};transfer.push(a.array.buffer);}const index=geo.index.array;transfer.push(index.buffer);self.postMessage({id,attributes,index},transfer);geo.dispose();while(parsed.size>24)parsed.delete(parsed.keys().next().value);}catch(e){self.postMessage({id,error:e.message});}};
