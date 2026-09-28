export function mountTrackingEditor(panel,{host,run,save,options,config}){
 const section=document.createElement('details');section.dataset.tracking='';
 section.innerHTML=`<summary>Head, eyes & target tracking</summary><p>Aim any object with smooth motion and limits relative to its authored pose. Parents solve before children.</p><label>Tracker<select data-tracker aria-label="3D tracker"></select></label><button data-new>New tracker</button><label>Driven object<select data-node></select></label><label>Target object<select data-target></select></label><label>Shared aiming origin<select data-origin></select></label><label>Forward axis (local XYZ)<input data-forward value="0, 0, 1"></label><label>Up axis (local XYZ)<input data-up value="0, 1, 0"></label><label>Yaw min, max (degrees)<input data-yaw value="-90, 90"></label><label>Pitch min, max (degrees)<input data-pitch value="-45, 45"></label><label>Maximum turn cone (degrees)<input data-cone type="number" min="0" max="180" value="90"></label><label>Response<input data-response type="number" min=".01" max="100" value="8" step="1"></label><label class="check"><input data-enabled type="checkbox" checked>Enabled</label><button data-save>Apply tracking</button><button data-remove>Release tracking</button>`;
 panel.insertBefore(section,panel.querySelector('[data-status]'));
 const $=key=>section.querySelector('[data-'+key+']');let selected='';
 function refresh(){
  const trackers=config().trackers??[],t=trackers.find(t=>t.id===selected);if(!t)selected='';
  $('tracker').replaceChildren(new Option('New tracker',''),...trackers.map(t=>new Option(t.id,t.id,false,t.id===selected)));
  $('node').innerHTML=options(t?.node??host.selected());$('target').innerHTML=options(t?.target,'Choose target');$('origin').innerHTML=options(t?.origin,'Use driven object centre');
  for(const key of ['forward','up','yaw','pitch']){const value=t?.[key]??{forward:[0,0,1],up:[0,1,0],yaw:[-Math.PI/2,Math.PI/2],pitch:[-Math.PI/4,Math.PI/4]}[key];$(key).value=value.map(v=>['yaw','pitch'].includes(key)?Math.round(v*180/Math.PI*1000)/1000:v).join(', ');}
  $('cone').value=(t?.cone??Math.PI/2)*180/Math.PI;$('response').value=t?.response??8;$('enabled').checked=t?.enabled!==false;$('remove').disabled=!t;
 }
 $('tracker').onchange=()=>{selected=$('tracker').value;refresh();};$('new').onclick=()=>{selected='';refresh();};
 $('save').onclick=run(()=>save(p=>{
  const value={id:selected||'track-'+crypto.randomUUID().slice(0,6),node:$('node').value,target:$('target').value,response:Number($('response').value),cone:Number($('cone').value)*Math.PI/180,enabled:$('enabled').checked};
  if($('origin').value)value.origin=$('origin').value;
  for(const key of ['forward','up','yaw','pitch'])value[key]=$(key).value.split(',').map(v=>Number(v)*(['yaw','pitch'].includes(key)?Math.PI/180:1));
  p.trackers=[...(p.trackers??[]).filter(t=>t.id!==selected),value];selected=value.id;
 }));
 $('remove').onclick=run(()=>save(p=>{p.trackers=(p.trackers??[]).filter(t=>t.id!==selected);selected='';}));
 return {refresh};
}
