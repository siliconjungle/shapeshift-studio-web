const NS='http://www.w3.org/2000/svg';
export function createMapClearFeedback(svg,locations){
 const root=document.createElementNS(NS,'g');root.setAttribute('pointer-events','none');root.setAttribute('aria-hidden','true');root.setAttribute('data-clear-feedback','');root.setAttribute('opacity',0);svg.append(root);
 const particles=Array.from({length:10},(_,i)=>{const n=document.createElementNS(NS,'circle');n.setAttribute('r',i%3?3:4.5);n.setAttribute('fill',i%2?'#fff1bf':'#bba27b');n.setAttribute('stroke','#594839');n.setAttribute('stroke-width','.8');root.append(n);return n;});
 let age=2,target=null;
 return{trigger(id){target=locations.get(id);age=0;root.dataset.clearFeedback=id;},reset(){age=2;root.setAttribute('opacity',0);},tick(dt,gentle){
  age+=dt;if(age>=.9||!target||gentle){root.setAttribute('opacity',0);return;}
  const t=age/.9;root.setAttribute('opacity',Math.min(1,t*12)*(1-t));
  particles.forEach((p,i)=>{const a=i/10*Math.PI*2,d=20+65*Math.sin(t*Math.PI/2);p.setAttribute('cx',target.x+Math.cos(a)*d);p.setAttribute('cy',target.y-target.height*.45+Math.sin(a)*d*.65-t*28);});
 }};
}
