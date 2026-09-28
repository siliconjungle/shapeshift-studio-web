// Opt-in trailer choreography. Only sends normal pointer input; gameplay,
// unlocks, wildlife timing, camera movement and sounds remain owned by the demo.
export async function runTrailerDirector({stop}) {
 const body=document.body, q=s=>document.querySelector(s);
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const vary=(a,b)=>a+Math.random()*(b-a);
 let cursor={x:innerWidth*.46,y:innerHeight*.71},birdHit=false;
 const pointer=(el,type,p=cursor)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:p.x,clientY:p.y,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerdown'?1:0}));
 const center=el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width*.5,y:r.y+r.height*.5};};
 async function click(el,{rapid=false}={}) {
  if(!el)throw new Error('Missing trailer target');
  const start={...cursor},duration=rapid?55:vary(230,390),at=performance.now();
  await new Promise(resolve=>{function frame(now){const t=Math.min(1,(now-at)/duration),k=t*t*(3-2*t),end=center(el);cursor={x:start.x+(end.x-start.x)*k,y:start.y+(end.y-start.y)*k};pointer(el,'pointermove');if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  cursor=center(el);pointer(el,'pointerdown');await sleep(vary(45,70));pointer(el,'pointerup');
  el.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1,clientX:cursor.x,clientY:cursor.y,button:0}));
 }
 async function bird() {
  const el=q('[data-map-bird][data-bird-state="flying"]');if(birdHit||!el)return;
  const p=center(el);if(p.x<innerWidth*.22||p.x>innerWidth*.78)return;
  await click(el);birdHit=el.dataset.birdState==='dead';
 }
 async function until(test,{wildlife=false,timeout=25000}={}) {
  const started=performance.now();while(!test()){if(performance.now()-started>timeout)throw new Error('Trailer timed out at '+body.dataset.director);if(wildlife)await bird();await sleep(70);}
 }
 const phase=name=>{body.dataset.director=name;};
 const select=id=>click(q(`[data-location="${id}"]`));
 async function enter(id){phase('enter-'+id);await click(q('#travel'));await until(()=>!q('.map-iris')||q('.map-iris').hidden);await sleep(vary(420,570));}
 async function travel(id){phase('travel-'+id);await select(id);await sleep(vary(160,240));await click(q('#travel'));await until(()=>q('#travel').getAttribute('aria-label')?.startsWith('Enter '),{wildlife:true});await sleep(vary(180,280));await enter(id);}
 try {
  phase('title');await sleep(1250);await click(q('#title-start'));await until(()=>q('#title-screen').hidden);await sleep(3000);
  phase('tactile');await select('camp');for(let i=0;i<3;i++){await sleep(vary(140,230));await click(q('[data-location="camp"]'),{rapid:true});}
  await select('shop');await sleep(180);await click(q('#travel'));await sleep(240);await click(q('#travel'),{rapid:true});
  phase('scenery');for(const id of ['1','5']){for(let i=0;i<3;i++){await click(q(`[data-scenery="${id}"]`),{rapid:i>0});await sleep(vary(160,240));}await sleep(400);}
  phase('rain');const cloud=q('[data-cloud-id="0"]');for(let i=0;i<7&&cloud.dataset.raining!=='true';i++){await click(cloud,{rapid:i>0});await sleep(vary(180,240));}
  await select('camp');await enter('camp');
  for(const id of ['shop','well','shrine','gate','keep']){await bird();await travel(id);}
  phase('return');await select('camp');await click(q('#travel'));await sleep(850);await select('well');
  await until(()=>q('#announcer').textContent.includes('Arrived at Hearth'),{wildlife:true});
  await sleep(1000);await select('camp');await sleep(1400);
  phase('complete');body.dataset.directorBird=String(birdHit);stop();
 }catch(error){phase('error');body.dataset.directorError=error.message;console.error(error);stop();}
}
