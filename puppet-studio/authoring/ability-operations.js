import {DOMAIN_OPERATIONS,validateDomainStep} from '../../gameplay-effects/domain-catalog.js';
export const OPERATION_NAMES=['damage','heal','restore','kill','ignite','apply','dispel'];
export const operationNames=(integration=false)=>integration?[...OPERATION_NAMES,...Object.keys(DOMAIN_OPERATIONS)]:OPERATION_NAMES;
export function operationDefaults(op,definitions=[],integration=false){
 if(!operationNames(integration).includes(op))throw Error('Unknown operation '+op);
 const step={op};if(['damage','heal'].includes(op))step.amount=10;
 if(['apply','ignite'].includes(op)){const effect=definitions.find(d=>d.type==='effect'&&(op!=='ignite'||d.id==='burning'))??definitions.find(d=>d.type==='effect');if(!effect)throw Error('Create an effect first');step.effect=effect.id}
 if(DOMAIN_OPERATIONS[op])step.wish=DOMAIN_OPERATIONS[op][0];return step;
}
export function editOperation(definition,index,field,value,definitions=[],integration=false){
 const d=structuredClone(definition),key=d.type==='effect'?'tick':'steps',steps=d[key]??=[];
 if(!Number.isInteger(index)||index<0||index>=steps.length)throw Error('Missing operation');
 if(field==='op')steps[index]=operationDefaults(value,definitions,integration);
 else if(field==='remove')steps.splice(index,1);
 else if(field==='amount'||field==='delay')steps[index][field]=Number(value);
 else if(field==='effect'||field==='wish')steps[index][field]=value;
 else if(field==='from')steps[index].select={...steps[index].select,from:value};
 else if(field==='radius'){steps[index].select={...steps[index].select};if(value==='')delete steps[index].select.radius;else steps[index].select.radius=Number(value)}
 else throw Error('Unknown operation field');
 if(integration&&steps[index])validateDomainStep(steps[index]);return d;
}
export {DOMAIN_OPERATIONS};
