export function timingAt(seconds){return (Math.sin(seconds*3.4-Math.PI/2)+1)/2;}
export function timingGrade(position){const error=Math.abs(position-.72);return error<=.045+1e-12?{name:'Perfect',bonus:2,tone:'perfect'}:error<=.14+1e-12?{name:'Good',bonus:1,tone:'good'}:{name:'Miss',bonus:-1,tone:'miss'};}
export function rollValue(sides,random){if(!Number.isInteger(sides)||sides<3||sides>20)throw Error('Invalid die');if(random){const r=random();if(!(r>=0&&r<1))throw Error('Random sample outside [0,1)');return 1+Math.floor(r*sides);}const values=new Uint32Array(1),limit=4294967296-4294967296%sides;do{crypto.getRandomValues(values);}while(values[0]>=limit);return 1+values[0]%sides;}
export function resolveRoll(raw,{sides,modifier=0,bonus=0,target}){if(!Number.isInteger(raw)||raw<1||raw>sides||![modifier,bonus,target].every(Number.isInteger))throw Error('Invalid roll');const total=raw+modifier+bonus;return{raw,modifier,bonus,total,target,success:total>=target,sides};}
export function successChance(sides,modifier,bonus,target){let n=0;for(let raw=1;raw<=sides;raw++)if(raw+modifier+bonus>=target)n++;return n/sides;}

// One sweep: the gold center coincides with the first physical table contact.
export function landingProgress(elapsed,contactTime){return Math.min(1,Math.max(0,elapsed/Math.max(.01,contactTime)*.72));}
export function landingGrade(elapsed,contactTime){return timingGrade(landingProgress(elapsed,contactTime));}

export const rollTarget=sides=>Math.floor(sides/2)+1;
export function scoreRoll(raw,{sides,bonus=0,valid=true}){
 const target=rollTarget(sides);
 if(!valid)return{total:null,target,success:false,points:0};
 const result=resolveRoll(raw,{sides,bonus,target});
 return{...result,points:result.success?result.total:0};
}
// The strike line stays at 22%; the original timing windows approach from the right.
export const incomingOffset=progress=>(.22-progress)*100;
