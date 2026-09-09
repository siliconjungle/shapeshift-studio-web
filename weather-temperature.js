export function ambientTemperature(culture='hearth',hour=12,{rain=0,cover=0}={}){
 const sun=(1+Math.cos((hour-14)*Math.PI/12))/2;
 return (culture==='cryos'?-4+13*sun:culture==='solis'?11+30*sun:7+17*sun)-rain*5-cover*2;
}
