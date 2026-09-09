import {identity} from '../runtime.js';
import {svgText} from '../vector/model.js';
import {appearanceDefaults} from './appearance.js';
// A small, editable piece of artwork, independent of any game or asset pack.
export function starterProject(){
 const vector={version:1,viewBox:[0,0,200,200],duration:2,loop:true,tracks:[],swatches:[],shapes:[{id:'body',name:'Body',commands:['M','C','C','C','C','Z'],points:[100,18,148,18,182,52,182,100,182,148,148,182,100,182,52,182,18,148,18,100,18,52,52,18,100,18],fill:'#bc9260',stroke:'#181a20',strokeWidth:7,opacity:1,hidden:false,locked:false,fillRule:'nonzero',lineCap:'round',lineJoin:'round'}]};
 const p={format:'inkwell-puppet',version:1,name:'Untitled',assets:[{id:'artwork',name:'Artwork',src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText(vector)),vector}],joints:[{id:'root',name:'Origin',parent:null,rest:identity(),layer:0},{id:'body',name:'Body',parent:'root',rest:identity(),layer:1,sprite:{asset:'artwork',width:180,height:180,pivotX:.5,pivotY:.5}}],clips:[{id:'idle',name:'Idle',duration:2,fps:30,loop:true,tracks:{}}]};p.appearance=appearanceDefaults(p);p.appearance.bindings=[{id:'body-fill',role:'accent',target:{kind:'shape',asset:'artwork',shape:'body',channel:'fill'}},{id:'body-stroke',role:'ink',target:{kind:'shape',asset:'artwork',shape:'body',channel:'stroke'}}];return p;
}
