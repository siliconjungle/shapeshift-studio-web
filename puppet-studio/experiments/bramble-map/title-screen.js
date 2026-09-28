// The title owns the first gesture, so it cannot also select a map location.
export function mountTitleScreen({audio,onStart,gentle=false}){
 const screen=document.getElementById('title-screen'),button=document.getElementById('title-start'),logo=screen.querySelector('.title-logo'),prompt=document.getElementById('title-prompt'),map=document.querySelector('.map-shell');
 let starting=false,disposed=false,timer;
 button.disabled=false;screen.dataset.state='ready';prompt.textContent='Press any key or click to continue';
 function cleanup(){window.removeEventListener('keydown',key,true);button.removeEventListener('click',start);}
 function start(){
  if(starting||disposed)return;starting=true;cleanup();screen.dataset.state='starting';button.disabled=true;
  audio.startMap();
  logo.animate(gentle?[{opacity:1},{opacity:0}]:[
   {transform:'translateY(0) scale(1,1)',opacity:1,offset:0},
   {transform:'translateY(12px) scale(1.13,.82)',opacity:1,offset:.2},
   {transform:'translateY(-18px) scale(.93,1.13)',opacity:1,offset:.43},
   {transform:'translateY(-7px) scale(1.04,.97)',opacity:.8,offset:.65},
   {transform:'translateY(-24px) scale(1.09,1.04)',opacity:0,offset:1}
  ],{duration:gentle?200:680,easing:'cubic-bezier(.22,.7,.28,1)',fill:'forwards'});
  prompt.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:gentle?'none':'translateY(5px) scale(1.06,.85)'}],{duration:160,fill:'forwards'});
  const fade=screen.animate([{opacity:1},{opacity:0}],{delay:gentle?0:240,duration:gentle?240:560,easing:'ease-in-out',fill:'forwards'});
  // Start drawing the map during the crossfade, with its clock still at zero.
  timer=setTimeout(()=>{if(!disposed)onStart();},gentle?0:240);
  fade.finished.then(()=>{if(disposed)return;screen.hidden=true;screen.dataset.state='finished';map.inert=false;document.getElementById('travel').focus({preventScroll:true});}).catch(()=>{});
 }
 function key(event){
  if(event.repeat||event.metaKey||event.ctrlKey||event.altKey||['Shift','Control','Alt','Meta','CapsLock','Tab'].includes(event.key))return;
  event.preventDefault();event.stopImmediatePropagation();start();
 }
 window.addEventListener('keydown',key,true);button.addEventListener('click',start);
 button.focus({preventScroll:true});
 return{dispose(){disposed=true;clearTimeout(timer);cleanup();}};
}
