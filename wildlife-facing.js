// A small dead zone holds the chosen view on diagonal routes and when stopped.
export function wildlifeFacing(dx,dz,current='right'){
 if(Math.hypot(dx,dz)<.0005)return current;
 const axial=current==='front'||current==='back',ratio=Math.abs(dz)/Math.max(.000001,Math.abs(dx));
 if(ratio>(axial?.82:1.22))return dz>0?'front':'back';
 return dx>0?'right':'left';
}
