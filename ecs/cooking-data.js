// A saved cooking record has no behaviour. Its wire representation remains plain data.
export class VillageCooking {}
export function validCooking(row){return row instanceof VillageCooking&&row.economy&&typeof row.economy==='object'&&typeof row.placed==='boolean'&&(row.cookId===null||Number.isSafeInteger(row.cookId)&&row.cookId>=0)&&['ingredients','progress','servings','batches','meals','after','nextSound','readyAt'].every(k=>Number.isFinite(row[k])&&row[k]>=0)&&(row.potDrop===null||row.potDrop&&[row.potDrop.x,row.potDrop.z].every(Number.isFinite));}
// Fire membership and village ownership are identity, fixed for this pot's lifetime.
export const Cooking={name:'Cooking',replaceable:false,validate:validCooking,prepare:row=>{for(const key of ['economy','fire'])if(Object.hasOwn(row,key))Object.defineProperty(row,key,{value:row[key],writable:false,enumerable:true,configurable:false});}};
