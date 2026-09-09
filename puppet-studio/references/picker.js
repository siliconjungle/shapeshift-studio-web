import {REFERENCE_KINDS,referenceCatalog,resolveReference,referenceIssues} from './catalog.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountReferences({project,navigation,toast}){
 const button=document.createElement('button');button.id='references-open';button.textContent='References';document.getElementById('entities-open').after(button);
 const back=document.createElement('button');back.id='reference-back';back.hidden=true;back.textContent='← Return';document.getElementById('workspace-context').append(back);
 // Workspace breadcrumbs are regenerated; keep the return affordance in the toolbar.
 document.getElementById('entities-open').before(back);
 const panel=document.createElement('aside');panel.id='references-panel';panel.className='author-panel';panel.hidden=true;panel.setAttribute('aria-label','Project references');document.body.append(panel);
 let request=null,query='',kind='',selection=[],returnFocus=null;
 function render(){selection=referenceCatalog(project(),request?.spec??(kind?{kind}:{})).filter(r=>(r.name+' '+r.id+' '+r.kind).toLowerCase().includes(query.toLowerCase()));const missing=referenceIssues(project());
  panel.innerHTML=`<header><strong>${request?'Choose reference':'Project references'}</strong><button data-close aria-label="Close references">×</button></header><label>Search<input data-search value="${esc(query)}" placeholder="Name or ID"></label>${request?'':`<label>Kind<select data-kind><option value="">All references</option>${REFERENCE_KINDS.map(k=>`<option ${k===kind?'selected':''}>${k}</option>`).join('')}</select></label>`}<small>${selection.length} matches${request?' · '+esc(request.spec.kind):''}</small>${request?'<button data-clear>Clear reference</button>':''}<div data-results style="max-height:50vh;overflow:auto">${selection.map((r,i)=>`<div style="border-bottom:1px solid #555;padding:8px 0"><strong>${esc(r.name)}</strong><small>${esc(r.kind)}${r.dimension?' · '+r.dimension+'D':''} · ${esc(r.id)}</small><div class="button-row">${request?`<button data-choose="${i}">Use</button>`:''}<button data-open="${i}">Open</button></div></div>`).join('')||'<p>No matching references.</p>'}</div>${!request&&missing.length?`<details open><summary>${missing.length} missing references</summary>${missing.map((r,i)=>`<p>${esc(r.owner.id)} · ${esc(r.path.join('.'))}<small>${esc(r.kind)}: ${esc(r.id)}</small><button data-owner="${i}">Open owner</button></p>`).join('')}</details>`:''}`;
 }
 const close=()=>{panel.hidden=true;request=null;returnFocus?.focus?.()};
 function pick(spec,current,onSelect){request={spec,current,onSelect};returnFocus=document.activeElement;query='';panel.hidden=false;render();panel.querySelector('[data-search]').focus()}
 panel.oninput=e=>{if(e.target.hasAttribute('data-search')){const start=e.target.selectionStart;query=e.target.value;render();const input=panel.querySelector('[data-search]');input.focus();input.setSelectionRange(start,start)}};
 panel.onchange=e=>{if(e.target.hasAttribute('data-kind')){kind=e.target.value;render()}};
 panel.onclick=async e=>{const b=e.target.closest('button');if(!b)return;try{if(b.hasAttribute('data-close'))close();if(b.hasAttribute('data-clear')){if(request.onSelect('')!==false)close()}if(b.hasAttribute('data-choose')){if(request.onSelect(selection[+b.dataset.choose].id)!==false)close()}if(b.hasAttribute('data-open')){await navigation.open(selection[+b.dataset.open]);panel.hidden=true;}if(b.hasAttribute('data-owner')){await navigation.open(referenceIssues(project())[+b.dataset.owner].owner);panel.hidden=true;}}catch(error){toast(error.message,true)}};
 panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};
 button.onclick=()=>{request=null;query='';panel.hidden=!panel.hidden;render()};back.onclick=()=>navigation.back().catch(e=>toast(e.message,true));
 const refresh=()=>{const stack=navigation.snapshot();back.hidden=!stack.length;back.textContent=stack.length?'← Return ('+stack.length+')':'← Return'};
 const timer=setInterval(refresh,150);
 return{pick,open:r=>navigation.open(r),label:r=>resolveReference(project(),r)?.name??'Missing: '+r.id,refresh,show(){request=null;panel.hidden=false;render()},dispose(){clearInterval(timer);button.remove();panel.remove();back.remove()}};
}
