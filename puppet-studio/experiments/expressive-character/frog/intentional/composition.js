export const bounds=s=>{const x=s.points.filter((_,i)=>i%2===0),y=s.points.filter((_,i)=>i%2);return [Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)];};
export function makeComposition(drawings){
 const skin=new Set(['#548f99','#69aaaf','#397684','#285360','#87bab6']);
 const masks=Object.fromEntries(Object.entries(drawings).map(([id,d])=>[id,d.shapes.filter(s=>skin.has(s.fill)||(s.fill==='#ffbf50'&&bounds(s)[3]<400))]));
 const background=drawings.composed.shapes.map(s=>({...s}));
 for(const index of [2,4,5]){const s=drawings.composed.shapes.find(s=>s.id==='composed-'+index);background.push({...s,id:'clean-plate-'+index,fill:'#231f25',stroke:'#231f25',strokeWidth:16,insideBody:true});}
 const cloth=(id,commands,points,fill)=>({id,name:id,commands:commands.split(''),points,fill,stroke:'none',strokeWidth:0,opacity:1,insideBody:true});
 background.push(cloth('cowl-front','MCCLLZ',[211,485,267,506,345,483,394,479,405,522,415,560,426,610,206,610,211,485],'#37303a'));
 background.push(cloth('cowl-fold-top','MCCCZ',[212,496,276,518,341,500,398,493,373,516,282,544,211,517,212,511,212,502,212,496],'#231f25'));
 background.push(cloth('cowl-fold-low','MCCCZ',[213,542,280,564,352,540,411,524,372,553,286,590,210,565,211,555,212,548,213,542],'#504450'));
 for(const s of drawings.composed.shapes){const b=bounds(s);if(b[0]>174&&b[2]<233&&b[1]>499&&b[3]<565)background.push({...s,id:'fixed-brooch-'+s.id});}
 const brim={id:'hat-brim-clip',commands:['M','L','L','C','C','C','L','Z'],points:[0,0,640,0,640,380,584,368,516,297,434,263,368,234,311,216,247,230,185,243,123,277,68,327,0,380]};
 return {background,masks,body:drawings.composed.shapes[0],brim,hat:drawings.composed.shapes.filter(s=>bounds(s)[1]<=380)};
}
export function eyelidDrawing(index,amount){
 const left=index===5?157:375,right=index===5?272:488,top=index===5?260:270,bottom=index===5?300:312,y=top+(bottom-top)*amount;
 return [
  {id:'lid-cap-'+index,name:'Upper eyelid '+index,commands:['M','L','L','C','Z'],points:[left,top-30,right,top-30,right,y,right-28,y-1,left+28,y-7,left,y-4],fill:'#548f99',stroke:'none',strokeWidth:0},
  {id:'lid-line-'+index,name:'Eyelid ink '+index,commands:['M','C'],points:[left,y-4,left+28,y-7,right-28,y-1,right,y],fill:'none',stroke:'#231f25',strokeWidth:6},
 ].map(s=>({...s,opacity:amount>0?1:0,clip:'composed-'+index}));
}
