// One occasional bird with a fresh random quiet interval after each visit.
export class WildlifeVisits{
 constructor(random=Math.random){this.random=random;this.next=18+random()*27;this.active=null;this.lastTime=0;}
 tick(time,gentle=false){
  if(time<this.lastTime){this.active=null;this.next=time+18+this.random()*27;}this.lastTime=time;
  if(gentle){this.active=null;this.next=time+25;return null;}
  if(this.active&&time>=this.active.until){this.active=null;this.next=time+25+this.random()*45;}
  if(!this.active&&time>=this.next){const kind='bird';this.active={kind,at:time,until:time+14,seed:this.random(),side:this.random()<.5?-1:1};}
  return this.active;
 }
}
