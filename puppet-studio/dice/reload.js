import {speedForCombo} from './gameplay.js';
const layouts=[
 [{kind:'skull',center:.20,width:.14},{kind:'shield',center:.40,width:.24},{kind:'sword',center:.74,width:.24,primary:true}],
 [{kind:'heart',center:.16,width:.13},{kind:'skull',center:.34,width:.12},{kind:'shield',center:.52,width:.20},{kind:'sword',center:.80,width:.16,primary:true}],
 [{kind:'skull',center:.14,width:.10},{kind:'shield',center:.32,width:.22},{kind:'sword',center:.57,width:.16},{kind:'sword',center:.84,width:.18,primary:true}],
 [{kind:'heart',center:.18,width:.16},{kind:'sword',center:.52,width:.24,primary:true},{kind:'sword',center:.82,width:.16}],
 [{kind:'shield',center:.27,width:.26},{kind:'shield',center:.73,width:.26}],
 [{kind:'skull',center:.27,width:.18},{kind:'sword',center:.74,width:.26,primary:true}]
];
export function reloadLayout(index=0){return layouts[index%layouts.length].map((tile,i)=>({...tile,id:'tile-'+i}));}
export function judgeReload(tiles,position,pressed=true){
 if(!pressed)return{kind:'skip',name:'Skipped',bonus:0,tone:'skip',damage:0,delay:.3,slowRolls:1};
 const tile=tiles.find(t=>Math.abs(position-t.center)<=t.width/2+1e-12);
 if(!tile)return{kind:'empty',name:'Miss',bonus:-1,tone:'miss',damage:0,delay:.95,slowRolls:3};
 if(tile.kind==='skull')return{kind:'skull',name:'Skull',bonus:-1,tone:'skull',damage:1,delay:.65,slowRolls:2,tileId:tile.id};
 if(tile.kind==='shield')return{kind:'shield',name:'Shield',bonus:0,tone:'shield',damage:0,delay:.18,slowRolls:0,tileId:tile.id};
 if(tile.kind==='heart')return{kind:'heart',name:'Heart',bonus:0,tone:'heart',damage:0,heal:.5,delay:.12,slowRolls:0,tileId:tile.id};
 const perfect=Math.abs(position-tile.center)<=tile.width*.16+1e-12;
 return{kind:'sword',name:perfect?'Perfect':'Good',bonus:perfect?2:0,tone:perfect?'perfect':'good',damage:0,delay:perfect?.1:.14,slowRolls:0,tileId:tile.id};
}
export class ReloadPace{
 constructor(){this.reset();}
 reset(){this.cleanHits=0;this.slowRolls=0;}
 get speed(){return this.slowRolls>0?1:speedForCombo(this.cleanHits);}
 get duration(){return 1.55/this.speed;}
 resolve(grade){if(grade.kind==='sword'||grade.kind==='heart'){this.cleanHits++;this.slowRolls=Math.max(0,this.slowRolls-1);}else{this.cleanHits=0;this.slowRolls=grade.slowRolls;}}
}
