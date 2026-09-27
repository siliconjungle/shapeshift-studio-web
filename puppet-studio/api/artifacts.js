import { trackTask } from './activity.js';
let capture=null;
export async function artifact(content,name,type='application/json'){
 const blob=content instanceof Blob?content:new Blob([content],{type});
 const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
 for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return{name,type:blob.type||type,encoding:'base64',data:btoa(binary)};
}
export function downloadFile(content,name,type='application/json'){
 if(capture){const result=trackTask(artifact(content,name,type));capture.push(result);return result;}
 const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function beginArtifacts(){if(capture)throw Error('An export is already active');capture=[];}
export async function endArtifacts(){const pending=capture??[];capture=null;return Promise.all(pending);}
let answers=null;
export function beginAnswers(values=[]){answers=[...values];}
export function endAnswers(){answers=null;}
export function requestText(message,initial=''){
 if(!answers)return window.prompt(message,initial);
 if(!answers.length)throw Error('This action needs an answer: '+message+'. Pass answers on the API request.');
 const value=answers.shift();return value===null?null:String(value);
}
