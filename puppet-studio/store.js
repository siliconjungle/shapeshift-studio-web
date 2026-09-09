import {clone,validateProject} from './runtime.js';
import {diff,applyPatch} from './frontier-vendor.js';
import {projectChanges} from './changes.js';
import {ProjectSceneGraph} from './scene-graph.js';
// Durable project data only. Selection, playhead and sampled poses stay outside.
// Existing mutator/drag callers remain supported; committed history is reversible
// patches, so embedded artwork is not retained once per transform edit.
export class ProjectStore {
  constructor(project,onChange=()=>{}){
    this.project=validateProject(project);this.undoStack=[];this.redoStack=[];
    this.onChange=onChange;this.pending=null;this.revision=0;this.lastChange=null;
    this.graph=new ProjectSceneGraph(this.project);
  }
  begin(){if(!this.pending)this.pending=clone(this.project);}
  preview(edit){this.begin();try{edit(this.project);this.onChange('preview');}catch(e){this.cancel();throw e;}}
  prepareChange(before,patch){
    try{const change={...projectChanges(before,this.project,patch),revision:this.revision+1,patch};change.graph=this.graph.sync(this.project);return change;}
    catch(e){this.project=before;this.graph=new ProjectSceneGraph(before);this.pending=null;this.onChange('rollback');throw e;}
  }
  publish(reason,change){this.revision=change.revision;this.lastChange=change;this.onChange(reason,change);}
  notify(reason,before,patch){this.publish(reason,this.prepareChange(before,patch));}
  commit(){
    if(!this.pending)return;const before=this.pending;
    let next,forward,inverse;
    try{next=validateProject(this.project);forward=diff(before,next);inverse=forward.length?diff(next,before):[];}
    catch(e){this.cancel();throw e;}
    this.pending=null;this.project=next;
    if(!forward.length)return;
    const change=this.prepareChange(before,forward);
    this.undoStack.push({forward,inverse});if(this.undoStack.length>60)this.undoStack.shift();this.redoStack=[];
    this.publish('commit',change);
  }
  cancel(){if(this.pending){const before=this.project;this.project=this.pending;this.pending=null;this.notify('rollback',before,diff(before,this.project));}}
  edit(fn){this.begin();try{const result=fn(this.project);this.commit();return result;}catch(e){this.cancel();throw e;}}
  replace(project){const next=validateProject(project);this.edit(()=>{this.project=next;});}
  replay(from,to,direction,reason){
    this.cancel();if(!from.length)return;
    const entry=from.at(-1),before=this.project,patch=entry[direction];
    // Validate a private candidate first; failed replay cannot corrupt either stack.
    const next=validateProject(applyPatch(clone(before),patch));
    this.project=next;const change=this.prepareChange(before,patch);from.pop();to.push(entry);this.publish(reason,change);
  }
  undo(){this.replay(this.undoStack,this.redoStack,'inverse','undo');}
  redo(){this.replay(this.redoStack,this.undoStack,'forward','redo');}
}
