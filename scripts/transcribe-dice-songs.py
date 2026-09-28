import os,sys,json,hashlib,subprocess
from pathlib import Path
sys.modules['tensorflow']=None
os.environ['OMP_NUM_THREADS']='2'
os.environ['OPENBLAS_NUM_THREADS']='2'
import numpy as np,librosa,pretty_midi
from basic_pitch.inference import predict,Model
import basic_pitch
root=Path(__file__).resolve().parents[1]/'output/dice-music'
root.mkdir(parents=True,exist_ok=True)
model=Model(Path(basic_pitch.__file__).parent/'saved_models/icassp_2022/nmp.onnx')
if len(sys.argv)<2: raise SystemExit('Usage: python transcribe-dice-songs.py AUDIO_FILE [AUDIO_FILE ...]')
for filename in sys.argv[1:]:
 source=Path(filename).resolve();name=source.name;slug=source.stem;out=root/slug;out.mkdir(exist_ok=True)
 wav=out/'reference.wav'
 if not wav.exists():subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-ar','22050','-ac','1',str(wav)],check=True)
 raw=out/'notes.json'
 if not raw.exists():
  print('Transcribing',name,flush=True)
  _,_,notes=predict(wav,model,onset_threshold=.5,frame_threshold=.3,minimum_note_length=180,minimum_frequency=55,maximum_frequency=1500,melodia_trick=True)
  raw.write_text(json.dumps([{'start':float(s),'end':float(e),'pitch':int(p),'confidence':float(c)} for s,e,p,c,_ in notes]))
 y,sr=librosa.load(wav,sr=22050);tempo,frames=librosa.beat.beat_track(y=y,sr=sr);bpm=float(np.asarray(tempo).flat[0]);beats=librosa.frames_to_time(frames,sr=sr)
 (out/'analysis.json').write_text(json.dumps({'source':name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'duration':len(y)/sr,'bpm':bpm,'beatTimes':beats.tolist(),'method':'Basic Pitch ONNX full-mix automatic approximation; quantized monophonic lead and bass'}))
 print('Ready',slug,bpm,len(json.loads(raw.read_text())),flush=True)
