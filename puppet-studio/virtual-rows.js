import {createFixedLayout,virtualize} from './frontier-vendor.js';
// One bounded window shared by hierarchy, timeline and asset rows. The scroller
// owns its height; content/spacers own document height. Arrow navigation can reach
// rows that have not been mounted yet.
export function mountVirtualRows(container,{scroller=container,rowHeight=32,overscan=4,render,header='',footer='',onRendered=()=>{}}={}){
 const layout=createFixedLayout(rowHeight);let rows=[],prefix=0,suffix=0,signature='',activeIndex=0,disposed=false;
 container.classList.add('virtual-rows');scroller.tabIndex=scroller.tabIndex<0?0:scroller.tabIndex;
 function paint(force=false){
  if(disposed)return;force=force===true;const window=virtualize({items:rows,keyBy:'id',layout,viewport:{offset:Math.max(0,scroller.scrollTop-prefix),size:scroller.clientHeight||rowHeight*8},overscan});
  const next=window.startIndex+':'+window.endIndex;if(!force&&next===signature)return;signature=next;
  const focused=container.contains(document.activeElement)?document.activeElement.closest('[data-virtual-index]'):null,focusIndex=focused?Number(focused.dataset.virtualIndex):null;
  container.innerHTML=`${header}<div class="virtual-space" style="height:${rows.length*rowHeight}px"><div class="virtual-window" style="transform:translateY(${window.items[0]?.offset??0}px)">${window.items.map(item=>`<div class="virtual-row" data-virtual-index="${item.index}" style="height:${rowHeight}px">${render(item.value,item.index)}</div>`).join('')}</div></div>${footer}`;
  container.dataset.virtualTotal=String(rows.length);container.dataset.virtualMounted=String(window.items.length);
  if(focusIndex!==null){const el=container.querySelector(`[data-virtual-index="${focusIndex}"] button`);(el??scroller).focus({preventScroll:true});}
  onRendered();
 }
 function reveal(index){activeIndex=Math.max(0,Math.min(rows.length-1,index));const top=prefix+activeIndex*rowHeight,bottom=top+rowHeight;if(top<scroller.scrollTop)scroller.scrollTop=top;else if(bottom>scroller.scrollTop+scroller.clientHeight)scroller.scrollTop=bottom-scroller.clientHeight;paint(true);}
 function keydown(e){if(e.target.matches('input,textarea,select')||!rows.length)return;const item=e.target.closest('[data-virtual-index]');if(item)activeIndex=Number(item.dataset.virtualIndex);let index;
  if(e.key==='ArrowDown')index=activeIndex+1;else if(e.key==='ArrowUp')index=activeIndex-1;else if(e.key==='Home')index=0;else if(e.key==='End')index=rows.length-1;else return;
  e.preventDefault();reveal(index);container.querySelector(`[data-virtual-index="${activeIndex}"] button, [data-virtual-index="${activeIndex}"] [tabindex]`)?.focus({preventScroll:true});
 }
 scroller.addEventListener('scroll',paint);scroller.addEventListener('keydown',keydown);
 const observer=new ResizeObserver(()=>paint(true));observer.observe(scroller);
 return{set(next,{header:head=header,footer:foot=footer,top=0,bottom=0,reset=false}={}){const anchorIndex=Math.max(0,Math.floor((scroller.scrollTop-prefix)/rowHeight)),anchor=rows[anchorIndex]?.id,inside=scroller.scrollTop-prefix-anchorIndex*rowHeight;rows=next;header=head;footer=foot;prefix=top;suffix=bottom;if(reset)scroller.scrollTop=0;else if(anchor!==undefined){const index=rows.findIndex(r=>r.id===anchor);if(index>=0)scroller.scrollTop=Math.max(0,prefix+index*rowHeight+inside);}const max=Math.max(0,prefix+rows.length*rowHeight+suffix-scroller.clientHeight);if(scroller.scrollTop>max)scroller.scrollTop=max;paint(true);},reveal,refresh:()=>paint(true),dispose(){disposed=true;observer.disconnect();scroller.removeEventListener('scroll',paint);scroller.removeEventListener('keydown',keydown);}};
}
