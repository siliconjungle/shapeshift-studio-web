import {slicingDefaults,validateSlicing} from './model.js';
export function slicingFields(value,size){
 const on=!!value?.enabled;
 return `<details class="property-section slicing-properties" ${on?'open':''}><summary>N-slicing</summary><label><input type="checkbox" data-slicing="enabled" ${on?'checked':''}> Preserve fixed bands when resizing</label>${on?`
 <p>Resize ${size.length===3?'Dimensions':'Image width / height'} to stretch selected bands. Scale transforms the whole object.</p>
 <p>Reference size: ${value.sourceSize.map(n=>Number(n.toFixed(3))).join(' × ')}</p>
 ${value.axes.map((axis,i)=>{const cuts=[0,...axis.cuts,1];return `<fieldset><legend>${['X · Width','Y · Height','Z · Depth'][i]}</legend><label class="field">Cuts (%)<input data-slicing="cuts" data-axis="${i}" aria-label="${'XYZ'[i]} slicing cuts" value="${axis.cuts.map(n=>Number((n*100).toFixed(4))).join(', ')}" placeholder="e.g. 20, 80"></label><div class="slicing-bands">${axis.fixed.map((fixed,j)=>`<button type="button" data-slicing-band="${i}:${j}" aria-label="${'XYZ'[i]} band ${j+1}: ${fixed?'fixed':'stretch'}" title="${Number((cuts[j]*100).toFixed(2))}–${Number((cuts[j+1]*100).toFixed(2))}% · click to change" style="flex:${cuts[j+1]-cuts[j]};padding:3px 1px;background:${fixed?'#516674':'#806531'}">${fixed?'Fixed':'Stretch'}</button>`).join('')}</div></fieldset>`;}).join('')}
 <p>Enter any number of cut positions, separated by commas. Click bands to switch Fixed / Stretch. At least one band must stretch on each axis.</p><p>Below the combined fixed size, fixed bands shrink together and stretch bands collapse.</p>
 <button type="button" data-slicing-reset>${size.length===3?'Reset to pillar bands':'Reset to border bands'}</button>`:''}</details>`;
}
export function slicingEdit(value,size,element){
 const next=structuredClone(value??slicingDefaults(size)),kind=element.dataset.slicing;
 if(kind==='enabled')next.enabled=element.checked;
 else if(kind==='cuts'){const i=Number(element.dataset.axis),text=element.value.trim(),cuts=text?text.split(',').map(s=>s.trim()===''?NaN:Number(s.trim())/100):[];next.axes[i]={cuts,fixed:cuts.length?Array.from({length:cuts.length+1},(_,j)=>j%2===0):[false]};}
 else if(element.dataset.slicingBand){const [axis,band]=element.dataset.slicingBand.split(':').map(Number);next.axes[axis].fixed[band]=!next.axes[axis].fixed[band];}
 else if(element.hasAttribute('data-slicing-reset'))return slicingDefaults(size);
 validateSlicing(next,size.length);return next;
}
