import {mountCatalogue} from './view.js';
export function mountFeatureCatalogue({api,toast}){
 const button=document.createElement('button');button.id='features-open';button.textContent='Features';button.title='Search all tools, examples and agent recipes';document.getElementById('help').before(button);
 const dialog=document.createElement('dialog');dialog.id='feature-catalogue-dialog';dialog.setAttribute('aria-label','Feature catalogue');
 const close=document.createElement('button');close.className='fc-close';close.type='button';close.textContent='Close';close.setAttribute('aria-label','Close feature catalogue');close.onclick=()=>dialog.close();dialog.append(close);
 const content=document.createElement('section');dialog.append(content);document.body.append(dialog);
 const catalogue=mountCatalogue(content,{siteRoot:new URL('../',document.baseURI),onOpen:async feature=>{dialog.close();const response=await api.call(feature.panel==='behaviours'?{op:'editor.invoke',args:{target:'behaviours',method:'show'}}:{op:'panel.set',args:{panel:feature.panel,open:true}});if(!response.ok)toast(response.error.message,true);}});
 function show(id){if(id)catalogue.select(id);if(!dialog.open)dialog.showModal();catalogue.focus();}button.onclick=()=>show();
 const initial=new URLSearchParams(location.search).get('features');if(initial)show(initial);
 return{show,hide:()=>dialog.close()};
}
