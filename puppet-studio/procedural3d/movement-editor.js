export function mountMovementEditor(panel,{host,run,save,options,config}){
 const section=document.createElement('details');section.dataset.movement='';
 section.innerHTML=`<summary>Move toward a target</summary><p>Approach when far away, back away when too close, and turn before moving. Legs react to the resulting body motion.</p><label>Movement controller<select data-mover aria-label="3D movement controller"></select></label><button data-new>New movement controller</button><label>Driven body / root<select data-node></select></label><label>Target object<select data-target></select></label><label>Forward axis (local XYZ)<input data-forward value="0, 0, 1"></label><label>Movement plane up (world XYZ)<input data-up value="0, 1, 0"></label>${[['Minimum distance','minDistance',2],['Maximum distance','maxDistance',3],['Speed (metres / second)','moveSpeed',1],['Move response','moveResponse',6],['Turn speed (degrees / second)','turnSpeed',115],['Turn response','turnResponse',8],['Turn tolerance (degrees)','turnTolerance',6],['Move within facing angle (degrees)','moveAngle',90]].map(([label,key,value])=>`<label>${label}<input data-${key} type="number" step=".1" value="${value}"></label>`).join('')}<label class="check"><input data-enabled type="checkbox" checked>Enabled</label><button data-save>Apply movement</button><button data-remove>Release movement</button>`;
 panel.insertBefore(section,panel.querySelector('[data-status]'));
 const $=key=>section.querySelector('[data-'+key+']'),angles=new Set(['turnSpeed','turnTolerance','moveAngle']),defaults={minDistance:2,maxDistance:3,moveSpeed:1,moveResponse:6,turnSpeed:2,turnResponse:8,turnTolerance:.1,moveAngle:Math.PI/2};let selected='';
 function refresh(){
  const movers=config().movers??[],m=movers.find(m=>m.id===selected);if(!m)selected='';
  $('mover').replaceChildren(new Option('New movement controller',''),...movers.map(m=>new Option(m.id,m.id,false,m.id===selected)));
  $('node').innerHTML=options(m?.node??host.selected());$('target').innerHTML=options(m?.target,'Choose target');
  $('forward').value=(m?.forward??[0,0,1]).join(', ');$('up').value=(m?.up??[0,1,0]).join(', ');
  for(const [key,value]of Object.entries(defaults))$(key).value=Math.round((m?.[key]??value)*(angles.has(key)?180/Math.PI:1)*1000)/1000;
  $('enabled').checked=m?.enabled!==false;$('remove').disabled=!m;
 }
 $('mover').onchange=()=>{selected=$('mover').value;refresh();};$('new').onclick=()=>{selected='';refresh();};
 $('save').onclick=run(()=>save(p=>{
  const value={id:selected||'move-'+crypto.randomUUID().slice(0,6),node:$('node').value,target:$('target').value,enabled:$('enabled').checked};
  for(const key of ['forward','up'])value[key]=$(key).value.split(',').map(Number);
  for(const key of Object.keys(defaults))value[key]=Number($(key).value)*(angles.has(key)?Math.PI/180:1);
  p.movers=[...(p.movers??[]).filter(m=>m.id!==selected),value];selected=value.id;
 }));
 $('remove').onclick=run(()=>save(p=>{p.movers=(p.movers??[]).filter(m=>m.id!==selected);selected='';}));
 return {refresh};
}
