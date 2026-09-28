import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';
const root=path.resolve('puppet-studio/experiments/expressive-character/frog/audio/babble');await fs.mkdir(root+'/source',{recursive:true});
let key=process.env.HUME_API_KEY;
if(!key)throw Error('Existing Hume key unavailable');
if(!process.env.HUME_VOICE_FILE)throw Error('Set HUME_VOICE_FILE to your voice JSON');
const voice=JSON.parse(await fs.readFile(process.env.HUME_VOICE_FILE,'utf8'));
const chunks=[['question','Boh-luma? Meh va-loo?','curious'],['explain','Maba doo-len, vella boo.','composed'],['excited','Ah! Bim-bala, wee-lo!','delight'],['grumble','Mmm-bah. Noh vella.','outraged'],['ponder','Hmmm... boola meli?','curious'],['pleased','Heh! Daba-loo, mhm.','smug']];
function viseme(ipa){if(/[mbp]/.test(ipa))return'MBP';if(/[fv]/.test(ipa))return'FV';if(/[uʊw]/.test(ipa))return'U';if(/[oɔɒ]/.test(ipa))return'O';if(/[aɑæʌɐ]/.test(ipa))return'AI';if(/[eɛiɪəɜ]/.test(ipa))return'E';if(/[ltdnɾ]/.test(ipa))return'L';return'rest';}
const manifest={voice:{...voice,synthesisModel:'Hume Octave 2'},pipeline:'Little Gods existing Hume character voice, new multi-syllable babble chunks, API phoneme timestamps → frog visemes. FFmpeg loudness only; no timing-changing trims.',sourceDocumentation:'https://dev.hume.ai/docs/text-to-speech-tts/timestamps',clips:{}};
for(const [id,text,expression]of chunks){let generation;const meta=root+'/source/'+id+'.json';try{generation=JSON.parse(await fs.readFile(meta,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;
 const body={version:'2',include_timestamp_types:['word','phoneme'],utterances:[{text,voice:{id:voice.id},speed:1.13,trailing_silence:.06}],split_utterances:false,format:{type:'wav'},num_generations:1};
 const response=await fetch('https://api.hume.ai/v0/tts',{method:'POST',headers:{'X-Hume-Api-Key':key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error('Hume generation failed '+response.status+' '+(await response.text()).slice(0,250));
 const result=await response.json(),g=result.generations?.[0];if(!g?.audio)throw Error('No Hume audio for '+id);
 await fs.writeFile(root+'/source/'+id+'.wav',Buffer.from(g.audio,'base64'));
 generation=JSON.parse(JSON.stringify(g,(k,v)=>k==='audio'?undefined:v));generation.request=body;await fs.writeFile(meta,JSON.stringify(generation,null,2));}
 const file='babble/'+id+'.mp3';execFileSync('ffmpeg',['-y','-v','error','-i',root+'/source/'+id+'.wav','-af','loudnorm=I=-20:TP=-2:LRA=9','-ar','48000','-ac','1','-codec:a','libmp3lame','-q:a','2',root+'/'+id+'.mp3']);
 const stamps=(generation.snippets??[]).flat(Infinity).flatMap(s=>s.timestamps??[]),phonemes=stamps.filter(t=>t.type==='phoneme');
 const cues=phonemes.map(t=>({start:t.time.begin/1000,end:t.time.end/1000,pose:viseme(t.text),phoneme:t.text})).filter(t=>t.end>t.start).sort((a,b)=>a.start-b.start);
 const raw=execFileSync('ffmpeg',['-v','error','-i',root+'/'+id+'.mp3','-f','f32le','-ac','1','-ar','16000','-']);const env=[];for(let i=0;i<raw.length;i+=640){let sum=0,n=0;for(let j=i;j<Math.min(raw.length,i+640);j+=4){sum+=raw.readFloatLE(j)**2;n++;}env.push(Math.sqrt(sum/n));}const peak=Math.max(...env);
 for(let i=0;i<cues.length;i++){const c=cues[i],next=cues[i+1]?.start??raw.length/4/16000-.05,vowel=['AI','E','O','U'].includes(c.pose);c.end=Math.max(c.end,Math.min(next-.012,c.start+(vowel?.28:.1)));}
 if(!cues.length)throw Error('Hume returned no phoneme cues for '+id);
 manifest.clips[id]={id,text,expression,file,duration:raw.length/4/16000,cues,envelope:env.map(x=>Math.round(Math.min(1,x/(peak*.5))*1000)/1000),envelopeRate:100,generationId:generation.generation_id};
 await fs.writeFile(root+'/manifest.json',JSON.stringify(manifest,null,2));console.log(id,manifest.clips[id].duration.toFixed(2)+'s',cues.length+' phonemes');
}
