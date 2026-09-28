import {animateTravelButton,animateDeniedButton} from '../experiments/bramble-map/button-feedback.js';
import {MAX_HEARTS} from './encounter.js';
import {HEART_SVG as heart} from '../scene3d/music/heart-art.js';
export function mountHearts(element){element.innerHTML=Array.from({length:MAX_HEARTS},()=>'<span class="heart">'+heart+'<span class="heart-empty">'+heart+'</span></span>').join('');}
export function updateHearts(element,count,{hurt=false,recovered=false,reduced=false}={}){
 const units=Math.max(0,Math.min(MAX_HEARTS*2,Math.round(count*2))),whole=Math.floor(units/2),half=units%2;
 element.setAttribute('aria-label',`${whole}${half?'½':''} of ${MAX_HEARTS} hearts remaining`);element.dataset.remaining=String(units/2);
 [...element.children].forEach((el,i)=>{el.classList.toggle('empty',i>=whole+half);el.classList.toggle('half',i===whole&&half===1);});
 if(!hurt&&!recovered)return;
 const el=element.children[Math.min(MAX_HEARTS-1,whole)];if(!el)return;
 if(recovered){el.animate(reduced?[{opacity:.65},{opacity:1}]:[{transform:'scale(.55,.9)',filter:'brightness(1.4)'},{transform:'translateY(-7px) scale(1.2,1.12)',offset:.35},{transform:'scale(.96,1.05)',offset:.7},{transform:'none'}],{duration:420,easing:'ease-out'});return;}
 el.animate(reduced?[{opacity:.4},{opacity:1}]:[{transform:'scale(1.65,.4)',filter:'brightness(1.6)'},{transform:'translateY(-16px) rotate(-8deg) scale(.58,1.62)',offset:.23},{transform:'translateY(3px) rotate(8deg) scale(1.45,.52)',offset:.46},{transform:'translateY(-6px) rotate(-5deg) scale(.8,1.25)',offset:.65},{transform:'scale(1.12,.88)',offset:.83},{transform:'none'}],{duration:680,easing:'ease-out'});
}
export function tileFeedback(host,element,grade,reduced=false){
 if(!element)return;
 // The spent target is removed immediately. Its short-lived burst lives outside
 // the target stream and can never be mistaken for another incoming note.
 const ghost=document.createElement('span');ghost.className='tile-feedback '+(grade.damage?'negative':grade.tone==='good'?'positive good':'positive perfect');ghost.style.left=element.style.left;ghost.style.width=element.style.width;
 const face=document.createElement('span');face.className='tile-face '+(element.dataset.kind==='heart'?'heart-pickup':element.dataset.kind);face.innerHTML=element.innerHTML;ghost.append(face);host.append(ghost);
 if(grade.damage)animateDeniedButton(face,reduced);else animateTravelButton(face,reduced);
 ghost.animate([{opacity:1},{opacity:1,offset:.45},{opacity:0}],{duration:reduced?120:300,fill:'forwards'}).onfinish=()=>ghost.remove();
}
