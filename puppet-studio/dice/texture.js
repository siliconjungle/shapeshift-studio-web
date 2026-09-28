import glyphs from '../scene3d/assets/dice/inkwell/numbers.json' with {type:'json'};
export function diceAtlasSVG(solid,{theme='ivory',numbers=true}={}){
 const size=256,colors={ivory:['#f3dfb5','#142727'],moss:['#789894','#132d32'],ember:['#c96d56','#2c2131']},[base,ink]=colors[theme]??colors.ivory;
 const glyph=(name,x,y,w)=>`<path fill="${ink}" fill-rule="nonzero" transform="translate(${x-w/2} ${y-w/2}) scale(${w/100})" d="${glyphs[name]}"/>`;
 const tiles=Array.from({length:solid.columns*solid.rows},(_,i)=>{
  let marks='';const face=solid.faces.find(f=>f.value===i+1),scale=Math.min(1,(face?.uvRadius??.45)*.84/.3);
  if(i<solid.count&&numbers){const value=i+1;marks=glyph(String(value),128,128,122*scale);if(value===6||value===9)marks+=`<path fill="${ink}" d="M ${128-18*scale} ${128+66*scale} h ${36*scale} v ${4*scale} h ${-36*scale} Z"/>`;}
  return `<g transform="translate(${i%solid.columns*size} ${Math.floor(i/solid.columns)*size})"><path fill="${base}" d="M0 0H256V256H0Z"/>${marks}</g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${solid.columns*size}" height="${solid.rows*size}" viewBox="0 0 ${solid.columns*size} ${solid.rows*size}">${tiles}</svg>`;
}
export async function diceAtlas(solid,options){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(diceAtlasSVG(solid,options));}
