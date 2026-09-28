export function animateTravelButton(button,gentle=false){
 for(const animation of button.getAnimations())animation.cancel();
 button.animate(gentle?[{opacity:.8},{opacity:1}]:[
  {transform:'translateY(2px) scale(1.08,.84)',offset:0},
  {transform:'translateY(-3px) scale(.97,1.08)',offset:.4},
  {transform:'translateY(0) scale(1.02,.98)',offset:.7},
  {transform:'translateY(0) scale(1)',offset:1}
 ],{duration:gentle?100:280,easing:'ease-out'});
 if(gentle)return;
 const parent=button.parentElement,rect=button.getBoundingClientRect(),box=parent.getBoundingClientRect(),cx=rect.left-box.left+rect.width/2,cy=rect.top-box.top+rect.height/2;
 for(let i=0;i<9;i++){
  const particle=document.createElement('i'),angle=i/9*Math.PI*2,dx=Math.cos(angle)*(rect.width*.5+18+Math.random()*14),dy=Math.sin(angle)*(rect.height*.6+18+Math.random()*12);
  particle.className='travel-spark';particle.style.left=cx+'px';particle.style.top=cy+'px';particle.style.borderRadius=i%3?'50%':'2px';parent.append(particle);
  const animation=particle.animate([{opacity:0,transform:`translate(${dx*.35}px,${dy*.35}px) scale(.4)`},{opacity:.95,offset:.16},{opacity:0,transform:`translate(${dx}px,${dy+10}px) rotate(${i*53}deg) scale(.2)`}],{duration:320+Math.random()*100,easing:'cubic-bezier(.16,.7,.3,1)'});
  animation.onfinish=animation.oncancel=()=>particle.remove();
 }
}
export function animateEnterButton(button,gentle=false){
 for(const animation of button.getAnimations())animation.cancel();
 button.animate(gentle?[{opacity:.7},{opacity:1}]:[
  {transform:'scale(1)'},{transform:'translateY(3px) scale(1.09,.82)',offset:.24},
  {transform:'translateY(-5px) scale(.94,1.12)',offset:.62},{transform:'scale(1)'}
 ],{duration:gentle?120:360,easing:'ease-out'});
}
export function animateDeniedButton(button,gentle=false){
 for(const animation of button.getAnimations())animation.cancel();
 button.animate(gentle?[{opacity:.65},{opacity:1}]:[
  {transform:'translateX(0) scale(1.04,.92)',offset:0},
  {transform:'translateX(-6px) rotate(-2deg) scale(.98,1.03)',offset:.18},
  {transform:'translateX(5px) rotate(1.6deg) scale(1.02,.97)',offset:.38},
  {transform:'translateX(-3px) rotate(-1deg) scale(.99,1.01)',offset:.58},
  {transform:'translateX(1px) rotate(.4deg) scale(1)',offset:.78},
  {transform:'translateX(0) rotate(0) scale(1)',offset:1}
 ],{duration:gentle?120:300,easing:'ease-out'});
}
export function travelButtonState(selected,current,travelling,locked=false,destination=selected){
 if(travelling&&selected===destination)return{label:'On our way…',disabled:true,enter:false};
 if(locked)return{label:'Locked',disabled:false,enter:false,locked:true};
 const enter=!travelling&&selected===current;
 return{label:enter?'Enter':'Travel here',disabled:false,enter};
}

// Preserve travelling dots and keep at most one outgoing label on rapid retargets.
export function setTravelButtonLabel(button,label,gentle=false){
 if(button.dataset.label===label)return;
 button.dataset.label=label;
 for(const ghost of button.querySelectorAll('.travel-label.is-leaving')){for(const animation of ghost.getAnimations())animation.cancel();ghost.remove();}
 const previous=button.querySelector('.travel-label');
 if(previous){
  const style=getComputedStyle(previous),opacity=style.opacity,transform=style.transform;
  for(const animation of previous.getAnimations())animation.cancel();
  previous.classList.add('is-leaving');
  const exit=previous.animate([{opacity,transform},{opacity:0,transform:gentle?'none':'translateY(-4px) scale(1.025,.94)'}],{duration:110,easing:'ease-in',fill:'forwards'});
  exit.onfinish=exit.oncancel=()=>previous.remove();
 }else button.replaceChildren();
 const next=document.createElement('span');next.className='travel-label';next.setAttribute('aria-hidden','true');
 if(label!=='On our way…')next.textContent=label;
 else{
  const text=document.createElement('span');text.textContent='On our way';next.append(text);
  const dots=document.createElement('span');dots.className='travel-dots';
  for(let i=0;i<3;i++){const dot=document.createElement('i');dot.style.setProperty('--dot',i);dots.append(dot);}
  next.append(dots);
 }
 button.append(next);
 if(previous)next.animate(gentle?[{opacity:0},{opacity:1}]:[
  {opacity:0,transform:'translateY(5px) scale(.97,1.04)'},
  {opacity:1,transform:'translateY(-.6px) scale(1.006,.995)',offset:.75},
  {opacity:1,transform:'translateY(0) scale(1)'}
 ],{duration:gentle?110:190,delay:gentle?0:25,easing:'cubic-bezier(.2,.7,.25,1)',fill:'backwards'});
}
