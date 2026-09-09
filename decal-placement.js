// A ground illustration belongs to one uninterrupted horizontal surface.
export function flatDecalHeight(heightAt,{x,z,width,height,yaw=0}){
  const elevation=heightAt(x,z),c=Math.cos(yaw),s=Math.sin(yaw);
  if(elevation===null)return null;
  for(let row=0;row<=8;row++)for(let col=0;col<=8;col++){
    const u=(col/8-.5)*width,v=(row/8-.5)*height;
    const sample=heightAt(x+c*u-s*v,z-s*u-c*v);
    if(sample===null||Math.abs(sample-elevation)>.015)return null;
  }
  return elevation;
}
