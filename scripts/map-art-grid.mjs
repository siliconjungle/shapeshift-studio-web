import sharp from 'sharp';
// Generated sheets need not obey exact thirds. Find the transparent gutters
// near each expected division so adjacent artwork is never cropped into a cell.
export async function atlasGrid(input){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 function cuts(axis){const size=axis==='x'?info.width:info.height,other=axis==='x'?info.height:info.width,result=[0];
  for(let k=1;k<3;k++){const ideal=size*k/3,candidates=[];for(let n=Math.floor(ideal-size*.09);n<=ideal+size*.09;n++){let count=0;for(let q=0;q<other;q++){const x=axis==='x'?n:q,y=axis==='x'?q:n;if(data[(y*info.width+x)*4+3]>=160)count++;}candidates.push({n,count});}candidates.sort((a,b)=>a.count-b.count||Math.abs(a.n-ideal)-Math.abs(b.n-ideal));result.push(candidates[0].n);}
  result.push(size);return result;
 }
 const xs=cuts('x'),ys=cuts('y');return Array.from({length:9},(_,i)=>({left:xs[i%3],top:ys[Math.floor(i/3)],width:xs[i%3+1]-xs[i%3],height:ys[Math.floor(i/3)+1]-ys[Math.floor(i/3)]}));
}
export async function cutoutPNG(input,maxWidth){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=-1,y1=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;if(data[i+3]<160){data.fill(0,i,i+4);continue;}data[i+3]=255;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 if(x1<0)throw Error('Empty generated art cell');
 const cropped=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).png().toBuffer();
 let image=sharp(cropped);if(maxWidth)image=image.resize({width:maxWidth,withoutEnlargement:true});return image.extend({top:6,bottom:6,left:6,right:6,background:'#00000000'}).png().toBuffer();
}
