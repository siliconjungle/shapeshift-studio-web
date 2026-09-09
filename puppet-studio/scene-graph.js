import {createSceneGraph,sceneNode2d,sceneNode3d,diff,equalsJson} from './frontier-vendor.js';
const radians=Math.PI/180;
function nodes2d(project){return project.joints.map(j=>sceneNode2d(j.id,{
  parent:j.parent,visible:!j.hidden,layer:String(j.layer),
  local:{x:j.rest.x,y:j.rest.y,rotation:j.rest.rotation*radians,scaleX:j.rest.scaleX,scaleY:j.rest.scaleY},
  ...(j.sprite?{bounds:{minX:-j.sprite.width*j.sprite.pivotX,minY:-j.sprite.height*j.sprite.pivotY,maxX:j.sprite.width*(1-j.sprite.pivotX),maxY:j.sprite.height*(1-j.sprite.pivotY)}}:{}),
  userData:{name:j.name,kind:j.sprite?'puppet':'joint'}
}));}
function nodes3d(project){return(project.scene3d?.nodes??[]).map(n=>sceneNode3d(n.id,{
  parent:n.parent,visible:n.visible,
  local:{x:n.position[0],y:n.position[1],z:n.position[2],rotationX:n.rotation[0]*radians,rotationY:n.rotation[1]*radians,rotationZ:n.rotation[2]*radians,scaleX:n.scale[0]*(n.mirror?.[0]?-1:1),scaleY:n.scale[1]*(n.mirror?.[1]?-1:1),scaleZ:n.scale[2]},
  bounds:{minX:-n.dimensions[0]/2,minY:-n.dimensions[1]/2,minZ:-n.dimensions[2]/2,maxX:n.dimensions[0]/2,maxY:n.dimensions[1]/2,maxZ:n.dimensions[2]/2},
  userData:{name:n.name??n.id,kind:n.type}
}));}
// Derived authoring index, never a second writable document. Runtime deformation
// and billboard bounds are deliberately not inferred from these rest bounds.
export class ProjectSceneGraph {
  constructor(project){this.parts=new Map();this.revision=0;this.sync(project);}
  sync(project){
    const changes={};
    for(const [mode,records]of [['2d',nodes2d(project)],['3d',nodes3d(project)]]){
      let part=this.parts.get(mode);const next=new Map(records.map(n=>[n.id,n]));
      if(!part){part={graph:createSceneGraph({nodes:records}),records:next,rows:[]};this.parts.set(mode,part);changes[mode]={structural:true,dirtyNodeIds:records.map(n=>n.id)};}
      else{
        const patch=[];
        for(const id of part.records.keys())if(!next.has(id))patch.push([1,['nodes',id]]);
        for(const [id,n]of next){const old=part.records.get(id);if(!old)patch.push([0,['nodes',id],n]);else for(const op of diff(old,n))patch.push([op[0],['nodes',id,...op[1]],...op.slice(2)]);}
        const order=[...next.keys()];if(!equalsJson([...part.records.keys()],order))patch.push([0,['order'],order]);
        if(patch.length)changes[mode]=part.graph.commit(patch);
        part.records=next;
      }
      if(changes[mode]){
        part.graph.updateWorld();
        const children=new Map();for(const n of records){const key=n.parent??null;if(!children.has(key))children.set(key,[]);children.get(key).push(n);}
        const rows=[];const visit=(parent,depth)=>{for(const n of children.get(parent)??[]){rows.push({id:n.id,parent:n.parent??null,name:n.userData.name,kind:n.userData.kind,depth});visit(n.id,depth+1);}};visit(null,0);part.rows=rows;
      }
    }
    if(Object.keys(changes).length)this.revision++;
    this.lastChanges=changes;return changes;
  }
  rows(mode='2d'){return this.parts.get(mode)?.rows??[];}
  world(id,mode='2d'){const g=this.parts.get(mode)?.graph;return mode==='2d'?g?.readWorld2d(id):g?.readWorldMatrix4(id);}
  inspect(mode){const modes=mode?[mode]:['2d','3d'];return{revision:this.revision,bounds:'authored rest bounds; excludes procedural deformation',scenes:Object.fromEntries(modes.map(mode=>[mode,{units:mode==='2d'?'pixels, Y down':'metres, Y up',nodes:this.rows(mode).map(row=>({...row,world:this.world(row.id,mode).map(v=>v===0?0:v)}))}]))};}
}
