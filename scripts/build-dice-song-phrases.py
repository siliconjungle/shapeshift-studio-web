"""Reduce cached Basic Pitch notes to two monophonic MIDI parts and playable phrases.
Run with the RIFT workflow Python after scripts/transcribe-dice-songs.py.
The inputs are automatic full-mix transcriptions, not hand-corrected scores.
"""
from pathlib import Path
import json,math
import pretty_midi
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'puppet-studio/scene3d/assets/dice/music'
allpieces=[];sources=[]
for slug,title in [('descent','Descent I'),('descent-ii','Descent II')]:
 work=ROOT/'output/dice-music'/slug;meta=json.loads((work/'analysis.json').read_text());raw=json.loads((work/'notes.json').read_text())
 bpm=meta['bpm'];spb=60/bpm;origin=meta['beatTimes'][0];totalbeats=(meta['duration']-origin)/spb
 parts={}
 for role,lo,hi in [('melody',55,88),('bass',33,54)]:
  groups={}
  for n in raw:
   if not lo<=n['pitch']<=hi or n['confidence']<.3 or n['end']-n['start']<.18:continue
   onset=max(0,round((n['start']-origin)/spb*2)/2)
   if onset not in groups or n['confidence']*min(1,n['end']-n['start'])>groups[onset]['confidence']*min(1,groups[onset]['end']-groups[onset]['start']):groups[onset]=n
  notes=[];ordered=sorted(groups.items())
  for i,(beat,n) in enumerate(ordered):
   duration=min(4,max(.5,round((n['end']-n['start'])/spb*2)/2))
   if i+1<len(ordered):duration=min(duration,ordered[i+1][0]-beat)
   notes.append({'beat':beat,'duration':duration,'midi':n['pitch'],'velocity':max(42,min(100,round(n['confidence']*100))), 'confidence':n['confidence']})
  parts[role]=notes
 midi=pretty_midi.PrettyMIDI(initial_tempo=bpm)
 for role,program in [('melody',80),('bass',33)]:
  ins=pretty_midi.Instrument(program=program,name=title+' / '+role)
  for n in parts[role]:ins.notes.append(pretty_midi.Note(n['velocity'],n['midi'],origin+n['beat']*spb,origin+(n['beat']+n['duration']*.9)*spb))
  midi.instruments.append(ins)
 midi.write(str(OUT/(slug+'-simplified.mid')))
 # Choose one distinct, strong two/four-bar motif per quarter of the recording.
 windows=[]
 for start in range(0,int(totalbeats)-16,16):
  lead=[n for n in parts['melody'] if start<=n['beat']<start+16];selected=[]
  for n in lead:
   offset=n['beat']-start
   if offset>14.5:continue
   if not selected or offset-selected[-1]['beat']>=1.5:selected.append({**n,'beat':offset})
  if len(selected)<4:continue
  score=sum(n['confidence'] for n in selected)+len(set(n['midi'] for n in selected))*.2
  windows.append((start,selected,score))
 chosen=[]
 for quarter in range(4):
  candidates=[w for w in windows if quarter*totalbeats/4<=w[0]<(quarter+1)*totalbeats/4]
  if candidates:chosen.append(max(candidates,key=lambda w:w[2]))
 for index,(start,lead,_) in enumerate(chosen):
  bass=[]
  for n in lead:
   active=[b for b in parts['bass'] if b['beat']<=start+n['beat']]
   # If the opening has no bass, use the first extracted bass note.
   bass.append((active[-1] if active else parts['bass'][0])['midi'])
  allpieces.append({'name':title+' · '+str(index+1),'beats':16,'offsets':[n['beat'] for n in lead],'melody':[n['midi'] for n in lead],'bass':bass,'source':slug,'sourceStartSeconds':round(origin+start*spb,3)})
 sources.append({**meta,'midi':slug+'-simplified.mid','noteCounts':{k:len(v) for k,v in parts.items()}})
(OUT/'songs-source.json').write_text(json.dumps({'sources':sources,'note':'Automatic simplified transcription: melody and bass only; review for pitch/onset errors. Game phrases thin melody attacks to at least 1.5 beats and play at the game tempo.'},indent=2)+'\n')
(ROOT/'puppet-studio/scene3d/music/descent-phrases.js').write_text('// Generated from the two supplied recordings by scripts/build-dice-song-phrases.py.\nexport const DESCENT_PIECES='+json.dumps(allpieces,indent=1)+';\n')
print(json.dumps({'sources':[{k:s[k] for k in ['source','bpm','noteCounts']} for s in sources],'pieces':len(allpieces)},indent=2))
